```dataviewjs
// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------
// Point this to the FOLDER containing your daily agenda files
const AGENDA_FOLDER = "0-Vault/02-Areas/02-Agenda/2025/12-December";

const SCALE = 0.5;        
const OFFSET_Y = 100;    
const PIXELS_PER_MIN = 3;
const COL_SPACING = 340; 
const TEXT_HEIGHT_THRESHOLD = 30; 

// ---------------------------------------------------------
// CSS STYLES 
// ---------------------------------------------------------
const containerStyle = `
  position: relative;
  width: 100%;
  height: ${1440 * PIXELS_PER_MIN * SCALE}px; 
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  overflow: hidden;
  font-family: var(--font-interface);
  margin-top: 10px;
`;

const controlStyle = `
  display: flex; 
  gap: 10px; 
  margin-bottom: 5px; 
  align-items: center;
  font-family: var(--font-interface);
`;

const gridLineStyle = `
  position: absolute;
  left: 50px; right: 0;
  border-top: 1px solid var(--background-modifier-border);
  opacity: 0.3;
  pointer-events: none;
`;

const timeLabelStyle = `
  position: absolute;
  left: 4px;
  width: 40px;
  text-align: right;
  font-size: 10px;
  color: var(--text-muted);
  transform: translateY(-50%);
`;

const blockStyle = (y, h, color, colIndex) => `
  position: absolute;
  left: ${(colIndex * COL_SPACING * SCALE) + 60}px; 
  top: ${(y - OFFSET_Y) * SCALE}px;
  width: ${320 * SCALE}px;
  height: ${h * SCALE}px;
  background-color: ${color}33; 
  border-left: 3px solid ${color};
  padding: 4px;
  font-size: ${12 * (SCALE < 0.6 ? 0.8 : 1)}px;
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  color: var(--text-normal);
  line-height: 1.2;
  white-space: nowrap; 
  text-overflow: ellipsis;
  z-index: 5;
`;

// ---------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------
function minutesToTime(totalMins) {
    const h = Math.floor(totalMins / 60);
    const m = Math.floor(totalMins % 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function parseTime(str) {
    if (!str || str.includes("<")) return null; 
    const parts = str.split(":");
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// ---------------------------------------------------------
// UI LAYOUT
// ---------------------------------------------------------
const mainContainer = this.container.createEl("div");

// 1. Controls (Dropdown)
const controls = mainContainer.createEl("div");
controls.style.cssText = controlStyle;
const fileSelector = controls.createEl("select");
fileSelector.style.padding = "4px";
fileSelector.style.fontSize = "14px";
fileSelector.style.maxWidth = "300px";

// 2. Viewport (Grid + Blocks)
const viewport = mainContainer.createEl("div");
viewport.style.cssText = containerStyle;

// 3. Draw Static Grid (Once)
for (let h = 0; h < 24; h++) {
    const mins = h * 60;
    const y = mins * PIXELS_PER_MIN; 
    
    const line = viewport.createEl("div");
    line.style.cssText = gridLineStyle;
    line.style.top = `${y * SCALE}px`;

    const label = viewport.createEl("div", {text: `${h}:00`});
    label.style.cssText = timeLabelStyle;
    label.style.top = `${y * SCALE}px`;
}

// 4. Current Time Line (Static layer, updated visually if needed but position is fixed to NOW)
const now = new Date();
const nowMins = now.getHours() * 60 + now.getMinutes();
const nowY = nowMins * PIXELS_PER_MIN;
const nowLine = viewport.createEl("div");
nowLine.style.cssText = `
    position: absolute; left: 50px; right: 0; 
    top: ${nowY * SCALE}px; border-top: 2px solid red; z-index: 10; pointer-events: none;
`;

// 5. Container for Dynamic Blocks
const blockLayer = viewport.createEl("div");
blockLayer.style.position = "absolute";
blockLayer.style.inset = "0";
blockLayer.style.zIndex = "5";

// ---------------------------------------------------------
// CORE LOGIC
// ---------------------------------------------------------
async function renderAgenda(file) {
    // Clear previous blocks
    blockLayer.empty();
    
    if(!file) return;
    
    const content = await app.vault.read(file);

    // --- PARSE ---
    const tableRegex = /\|\s*\d+\s*\|\s*(.*?)\s*\|\s*(\d{2}:\d{2}|<.*?>)\s*\|\s*(\d{2}:\d{2}|<.*?>)\s*\|/g;
    let match;
    const nodes = [];

    while ((match = tableRegex.exec(content)) !== null) {
        const activityRaw = match[1].trim();
        const startStr = match[2];
        const endStr = match[3];

        const startMins = parseTime(startStr);
        let endMins = parseTime(endStr);

        // Ongoing Logic
        if (startMins !== null && endMins === null && endStr.includes("<")) {
            // Check if this file is actually "Today", otherwise ongoing logic might be weird for past dates
            // But usually safe to assume open end means "until now" or "undefined duration"
            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();
            if (startMins < currentMins) {
                 endMins = Math.max(currentMins, startMins + 30);
            }
        }

        if (startMins !== null && endMins !== null) {
            const duration = endMins - startMins;
            const displayTitle = activityRaw
                .replace(/\[\[.*?\|(.*?)\]\]/, '$1') 
                .replace(/\[\[(.*?)\]\]/, '$1') 
                .replace(/^[#\s]+/, '')
                .replace(/<.*?>/, '???'); 

            if (duration > 0) {
                nodes.push({
                    text: displayTitle,
                    y: (startMins * PIXELS_PER_MIN) + OFFSET_Y, 
                    height: duration * PIXELS_PER_MIN,
                    color: "#54B5FB", 
                    colIndex: 0 
                });
            }
        }
    }

    // --- DISTRIBUTE (Max Gap) ---
    nodes.sort((a, b) => a.y - b.y);
    const colEnds = [0, 0, 0, 0]; 

    nodes.forEach(node => {
        let bestCol = 0;
        let maxGap = -1;
        let foundValid = false;

        for(let i=0; i<4; i++) {
            if (node.y >= colEnds[i] - 5) {
                const gap = node.y - colEnds[i];
                if (gap > maxGap) {
                    maxGap = gap;
                    bestCol = i;
                    foundValid = true;
                }
            }
        }

        if (!foundValid) {
            let minEnd = colEnds[0];
            for(let i=1; i<4; i++) {
                if(colEnds[i] < minEnd) {
                    minEnd = colEnds[i];
                    bestCol = i;
                }
            }
        }

        node.colIndex = bestCol;
        colEnds[bestCol] = node.y + node.height;
    });

    // --- RENDER BLOCKS ---
    nodes.forEach(node => {
        const renderHeight = node.height * SCALE;
        const block = blockLayer.createEl("div");
        block.style.cssText = blockStyle(node.y, node.height, node.color, node.colIndex);
        block.title = node.text; 

        // Time calculations
        const startMins = (node.y - OFFSET_Y) / PIXELS_PER_MIN;
        const durationMins = node.height / PIXELS_PER_MIN;
        const endMins = startMins + durationMins;
        
        const timeStr = `${minutesToTime(startMins)} - ${minutesToTime(endMins)}`;
        const durationStr = `${Math.round(durationMins)} min`;

        if (renderHeight >= TEXT_HEIGHT_THRESHOLD) {
            block.innerHTML = `
                <strong>${node.text}</strong><br>
                <span style="opacity:0.8; font-size:0.9em">${timeStr}</span><br>
                <span style="opacity:0.6; font-size:0.8em">${durationStr}</span>
            `;
        } else {
             block.style.opacity = "0.6";
        }
        
        block.style.cursor = "pointer";
        block.onclick = async () => {
            const leaf = app.workspace.getLeaf('tab');
            await leaf.openFile(file);
        };
    });
}

// ---------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------
(async () => {
    // 1. Get files from folder
    const folder = app.vault.getAbstractFileByPath(AGENDA_FOLDER);
    if (!folder || !folder.children) {
        controls.createEl("div", {text: `Folder not found: ${AGENDA_FOLDER}`, color: 'red'});
        return;
    }

    // Filter Markdown files & Sort (Newest first)
    const files = folder.children
        .filter(f => f.extension === 'md')
        .sort((a, b) => b.name.localeCompare(a.name)); // Descending name sort (usually date)

    // 2. Populate Dropdown
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    let defaultFile = files[0]; // Default to newest if today not found

    files.forEach(f => {
        const opt = fileSelector.createEl("option");
        opt.value = f.path;
        opt.text = f.name.replace(".md", "");
        
        // Select today if name contains YYYY-MM-DD
        if (f.name.includes(todayStr)) {
            opt.selected = true;
            defaultFile = f;
        }
    });

    // 3. Event Listener
    fileSelector.addEventListener("change", async (e) => {
        const selectedPath = e.target.value;
        const selectedFile = app.vault.getAbstractFileByPath(selectedPath);
        await renderAgenda(selectedFile);
    });

    // 4. Initial Render
    if (defaultFile) {
        // Ensure dropdown matches default (if we forced it via logic vs option attribute)
        fileSelector.value = defaultFile.path; 
        await renderAgenda(defaultFile);
    }
})();
```
| 1 | Planning | 13:28 | - | Active |
