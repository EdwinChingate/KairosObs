```dataviewjs
// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------
const AGENDA_FOLDER = "0-Vault/02-Areas/02-Agenda/2026"; 
const OFFSET_Y = 100;    
const PIXELS_PER_MIN = 3;
const COL_SPACING = 340; 
const TEXT_HEIGHT_THRESHOLD = 30; 

// State Management
let state = {
    scale: 0.5, 
    currentDate: null,
    nodes: [] 
};

// ---------------------------------------------------------
// CSS STYLES 
// ---------------------------------------------------------
const containerStyle = `
  position: relative;
  width: 100%;
  height: 600px; 
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  overflow: auto;
  font-family: var(--font-interface);
  margin-top: 10px;
`;

const controlStyle = `
  display: flex; 
  gap: 15px; 
  margin-bottom: 8px; 
  align-items: center;
  font-family: var(--font-interface);
  background: var(--background-secondary);
  padding: 8px;
  border-radius: 8px;
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
  left: ${(colIndex * COL_SPACING * state.scale) + 60}px; 
  top: ${(y - OFFSET_Y) * state.scale}px;
  width: ${320 * state.scale}px;
  height: ${h * state.scale}px;
  background-color: ${color}33; 
  border-left: 3px solid ${color};
  padding: 4px;
  font-size: ${12 * (state.scale < 0.6 ? 0.8 : 1)}px;
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
    if (!str) return null;
    const match = str.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null; 
    return parseInt(match[1]) * 60 + parseInt(match[2]);
}

// ---------------------------------------------------------
// UI LAYOUT
// ---------------------------------------------------------
const mainContainer = this.container.createEl("div");

// Controls
const controls = mainContainer.createEl("div");
controls.style.cssText = controlStyle;

const dateSelector = controls.createEl("select");
dateSelector.style.padding = "4px";
dateSelector.style.fontSize = "14px";
dateSelector.style.maxWidth = "200px";

controls.createEl("span", { text: "Zoom:" }).style.fontSize = "12px";

const zoomSlider = controls.createEl("input");
zoomSlider.type = "range";
zoomSlider.min = "0.2";
zoomSlider.max = "1.5";
zoomSlider.step = "0.05";
zoomSlider.value = state.scale;
zoomSlider.style.width = "150px";
zoomSlider.style.cursor = "pointer";

// Viewport
const viewport = mainContainer.createEl("div");
viewport.style.cssText = containerStyle;

// ---------------------------------------------------------
// LOGIC: Data Processing (The "Latest Entry" Logic)
// ---------------------------------------------------------
async function loadDataForDate(dateStr) {
    state.currentDate = dateStr;
    state.nodes = []; 

    const folder = app.vault.getAbstractFileByPath(AGENDA_FOLDER);
    if (!folder || !folder.children) return;

    // 1. Identify ALL relevant files
    const files = folder.children.filter(f => 
        f.extension === 'md' && f.name.includes(dateStr)
    );
    if (files.length === 0) return;

    // 2. Data Collection (Gather all candidates)
    // Key: ActID, Value: Array of { data, timestamp, source }
    const candidates = new Map();

    // Regex for Standard Agenda
    const regexAgenda = /\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/;
    // Regex for EdLog: | LogID | ActID | Date | Time | Activity | Start | End |
    const regexLog = /\|\s*\d+\s*\|\s*(\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(\d{2}:\d{2})\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/;

    for (const file of files) {
        const isLog = file.name.includes("EdLog");
        const isMobile = file.name.includes("_m") || file.name.includes("Mobile");
        const content = await app.vault.read(file);
        const lines = content.split('\n');

        for (const line of lines) {
            let actId, activityRaw, startStr, endStr, timestamp;
            
            if (isLog) {
                const match = regexLog.exec(line);
                if (!match) continue;
                actId = match[1].trim();
                const datePart = match[2];
                const timePart = match[3];
                activityRaw = match[4].trim();
                startStr = match[5].trim();
                endStr = match[6].trim();
                
                // Create Unix Timestamp for comparison
                timestamp = new Date(`${datePart}T${timePart}`).getTime();
            } else {
                const match = regexAgenda.exec(line);
                if (!match) continue;
                actId = match[1].trim();
                activityRaw = match[2].trim();
                startStr = match[3].trim();
                endStr = match[4].trim();
                
                // Agenda files have no row-level timestamp, assign 0 (Baseline)
                timestamp = 0;
            }

            const startMins = parseTime(startStr);
            const endMins = parseTime(endStr);

            // Clean Title
            const displayTitle = activityRaw
                .replace(/\[\[.*?\|(.*?)\]\]/, '$1') 
                .replace(/\[\[(.*?)\]\]/, '$1') 
                .replace(/^[#\s]+/, '')
                .replace(/<.*?>/, '???'); 

            if (startMins !== null) {
                if (!candidates.has(actId)) candidates.set(actId, []);
                candidates.get(actId).push({
                    id: actId,
                    text: displayTitle,
                    startMins: startMins,
                    endMins: endMins,
                    timestamp: timestamp,
                    source: isLog ? "Log" : (isMobile ? "Mobile" : "Desktop"),
                    file: file
                });
            }
        }
    }

    // 3. Conflict Resolution (Pick the Winner)
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentMins = now.getHours() * 60 + now.getMinutes();

    candidates.forEach((entries, actId) => {
        // Sort Descending by Timestamp
        entries.sort((a, b) => b.timestamp - a.timestamp);
        
        // The winner is the first one (Latest)
        const winner = entries[0];
        
        let finalEnd = winner.endMins;

        // Ongoing Logic (Applied to the Winner)
        if (finalEnd === null) {
            if (dateStr === todayStr && winner.startMins < currentMins) {
                finalEnd = Math.max(currentMins, winner.startMins + 30);
            } else {
                finalEnd = winner.startMins + 60; // Future default
            }
        }

        const duration = finalEnd - winner.startMins;

        if (duration > 0) {
            // Color Coding Source
            let blockColor = "#54B5FB"; // Default Blue (Desktop/Agenda)
            if (winner.source === "Log") blockColor = "#FFB86C"; // Orange (Log Override)
            else if (winner.source === "Mobile") blockColor = "#bd93f9"; // Purple (Mobile Agenda)

            state.nodes.push({
                id: winner.id,
                text: winner.text,
                y: (winner.startMins * PIXELS_PER_MIN) + OFFSET_Y,
                height: duration * PIXELS_PER_MIN,
                color: blockColor,
                colIndex: 0,
                sourceFile: winner.file,
                sourceType: winner.source
            });
        }
    });

    // 4. Distribute Columns (Max Gap)
    state.nodes.sort((a, b) => a.y - b.y);
    const colEnds = [0, 0, 0, 0]; 

    state.nodes.forEach(node => {
        let bestCol = 0;
        let maxGap = -1;
        let foundValid = false;

        for(let i=0; i<4; i++) {
            if (node.y >= colEnds[i] - 5) {
                const gap = node.y - colEnds[i];
                if (gap > maxGap) { maxGap = gap; bestCol = i; foundValid = true; }
            }
        }

        if (!foundValid) {
            let minEnd = colEnds[0];
            for(let i=1; i<4; i++) { if(colEnds[i] < minEnd) { minEnd = colEnds[i]; bestCol = i; } }
        }
        node.colIndex = bestCol;
        colEnds[bestCol] = node.y + node.height;
    });

    drawView(); 
}

// ---------------------------------------------------------
// LOGIC: Drawing
// ---------------------------------------------------------
function drawView() {
    viewport.empty();
    
    const totalHeight = 1440 * PIXELS_PER_MIN * state.scale;
    const contentWrapper = viewport.createEl("div");
    contentWrapper.style.height = `${totalHeight}px`;
    contentWrapper.style.position = "relative";
    contentWrapper.style.minWidth = `${(4 * COL_SPACING * state.scale) + 100}px`; 

    // Grid
    for (let h = 0; h < 24; h++) {
        const mins = h * 60;
        const y = mins * PIXELS_PER_MIN; 
        
        const line = contentWrapper.createEl("div");
        line.style.cssText = gridLineStyle;
        line.style.top = `${y * state.scale}px`;

        const label = contentWrapper.createEl("div", {text: `${h}:00`});
        label.style.cssText = timeLabelStyle;
        label.style.top = `${y * state.scale}px`;
    }

    // Now Line
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const nowY = nowMins * PIXELS_PER_MIN;
    const nowLine = contentWrapper.createEl("div");
    nowLine.style.cssText = `
        position: absolute; left: 50px; right: 0; 
        top: ${nowY * state.scale}px; border-top: 2px solid red; z-index: 10; pointer-events: none;
    `;

    // Nodes
    if (state.nodes.length === 0) {
        contentWrapper.createEl("div", {text: "No activities found."}).style.padding = "50px";
    }

    state.nodes.forEach(node => {
        const renderHeight = node.height * state.scale;
        const block = contentWrapper.createEl("div");
        block.style.cssText = blockStyle(node.y, node.height, node.color, node.colIndex);
        block.title = `${node.text} (Source: ${node.sourceType})`;

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
            await leaf.openFile(node.sourceFile);
        };
    });
}

// ---------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------
(async () => {
    const folder = app.vault.getAbstractFileByPath(AGENDA_FOLDER);
    if (!folder || !folder.children) {
        viewport.createEl("div", {text: `Folder not found: ${AGENDA_FOLDER}`, color: 'red'});
        return;
    }

    // Extract Dates
    const dateSet = new Set();
    const dateRegex = /\d{4}-\d{2}-\d{2}/;
    folder.children.forEach(f => {
        if (f.extension !== 'md') return;
        const m = f.name.match(dateRegex);
        if (m) dateSet.add(m[0]);
    });
    const sortedDates = Array.from(dateSet).sort().reverse();

    // Controls
    const todayStr = new Date().toISOString().slice(0, 10); 
    let defaultDate = sortedDates[0]; 

    sortedDates.forEach(dateStr => {
        const opt = dateSelector.createEl("option");
        opt.value = dateStr;
        opt.text = dateStr;
        if (dateStr === todayStr) { opt.selected = true; defaultDate = dateStr; }
    });

    dateSelector.addEventListener("change", (e) => loadDataForDate(e.target.value));
    zoomSlider.addEventListener("input", (e) => {
        state.scale = parseFloat(e.target.value);
        drawView();
    });

    if (defaultDate) {
        dateSelector.value = defaultDate; 
        loadDataForDate(defaultDate);
    }
})();
```
