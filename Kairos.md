```dataviewjs
/********************************************************************
********************************************************************/
const { MarkdownRenderer } = require("obsidian");

/* ---------- CONFIGURATION ---------- */
const FORCE_MOBILE_MODE = false; 

/* ---------- UTILS ---------- */
const pad = n=>String(n).padStart(2,"0");
const now_date = ()=>{ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const now_today = ()=>{ const d=new Date(); return `${pad(d.getDate())}`; };
const now_time = ()=>{ const d=new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const TimeToMins = (t) => { const p=t.split(':').map(Number); return p[0]*60 + p[1]; };
const MinsToTime = (m) => { let h=Math.floor(m/60), min=m%60; if(h>23)h-=24; return `${pad(h)}:${pad(min)}`; };
const GetUnixFromString = (t) => { const d = new Date(); const [h,m] = t.split(':').map(Number); d.setHours(h, m, 0, 0); return d.getTime(); };

/* ---------- STATE MANAGEMENT ---------- */
let currentPlannerDate = now_date(); 

// PATHS
const MAIN_LOG_FOLDER = '0-Vault/02-Areas/04-Thoughts_and_Observations/';
const LOG_PROJECT_NAME = '2026';
const FULL_LOG_FOLDER = MAIN_LOG_FOLDER + LOG_PROJECT_NAME;

const AGENDA_BASE_PATH = '0-Vault/02-Areas/02-Agenda/2026/';
const CONSUMPTION_BASE_PATH = '0-Vault/02-Areas/06-Body-Mind/Health/Piled_up/';

const ACTIVITY_LIST_PATH = '0-Vault/02-Areas/11-Gardening/Planning/RelevantInformation/Activity_List.md';
const CONSUMPTION_LIST_PATH = '0-Vault/02-Areas/11-Gardening/Planning/RelevantInformation/Consumption_List.md';
const RELATED_FILES_PATH = '0-Vault/02-Areas/11-Gardening/Planning/RelevantInformation/related_files.md'; 

const PROMPT_SINGLE = ['Tyrosine', 'Tryptophan'];
const PROMPT_DOUBLE = ['Beer','Wine'];

/* ---------- CALENDAR VIEW CONFIG ---------- */
const OFFSET_Y = 100;     
const PIXELS_PER_MIN = 3;
const COL_SPACING = 340; 
const TEXT_HEIGHT_THRESHOLD = 30; 

let calState = {
    scale: 0.5, 
    currentDate: null,
    nodes: [] 
};

/* ---------- CSS STYLES ---------- */
const cvContainerStyle = `
  position: relative;
  width: 100%;
  height: 600px; 
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  overflow: auto;
  font-family: var(--font-interface);
  margin-top: 5px;
`;

const cvControlStyle = `
  display: flex; 
  gap: 15px; 
  margin-bottom: 5px; 
  align-items: center;
  font-family: var(--font-interface);
  background: var(--background-secondary);
  padding: 8px;
  border-radius: 8px;
`;

const cvGridLineStyle = `
  position: absolute;
  left: 50px; right: 0;
  border-top: 1px solid var(--background-modifier-border);
  opacity: 0.3;
  pointer-events: none;
`;

const cvTimeLabelStyle = `
  position: absolute;
  left: 4px;
  width: 40px;
  text-align: right;
  font-size: 10px;
  color: var(--text-muted);
  transform: translateY(-50%);
`;

const cvBlockStyle = (y, h, color, colIndex) => `
  position: absolute;
  left: ${(colIndex * COL_SPACING * calState.scale) + 60}px; 
  top: ${(y - OFFSET_Y) * calState.scale}px;
  width: ${320 * calState.scale}px;
  height: ${h * calState.scale}px;
  background-color: ${color}33; 
  border-left: 3px solid ${color};
  padding: 4px;
  font-size: ${12 * (calState.scale < 0.6 ? 0.8 : 1)}px;
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  color: var(--text-normal);
  line-height: 1.2;
  white-space: nowrap; 
  text-overflow: ellipsis;
  z-index: 5;
`;

/* ---------- DEVICE DETECTION ---------- */
function detectMobile(){
  if (FORCE_MOBILE_MODE) return true;
  try {
      if (typeof app !== 'undefined' && app.isMobile) return true;
      if (window.matchMedia("(max-width: 768px)").matches) return true;
  } catch(e) {}
  return false;
}
const IS_MOBILE = detectMobile();
const SUFFIX = IS_MOBILE ? "_m" : "";

/* ---------- DYNAMIC PATHS ---------- */
const getThoughtsFile = (d) => `${FULL_LOG_FOLDER}/${d}-Thoughts_and_Observations${SUFFIX}.md`;
const getMetaLogFile = (d) => `${FULL_LOG_FOLDER}/meta_log/${d}${SUFFIX}.md`;
const getPrimaryAgendaFile = (d) => `${AGENDA_BASE_PATH}${d}-Agenda${SUFFIX}.md`;
const getConsumptionLogFile = (d) => { const [yy, mm] = String(d).split('-'); return `${CONSUMPTION_BASE_PATH}${yy}_${mm}${SUFFIX}.md`; };
const getEdLogFile = (d) => `${AGENDA_BASE_PATH}EdLog/${d}_EdLog${SUFFIX}.md`;

let PRIMARY_AGENDA_FILE = getPrimaryAgendaFile(currentPlannerDate);
let CONSUMPTION_LOG_FILE = getConsumptionLogFile(currentPlannerDate);

/* ---------- SAFE FILE READING ---------- */
async function resolveVaultPath(targetPath){
  try{
    const tp = String(targetPath || "").replace(/\\/g,'/');
    const lc = tp.toLowerCase();
    const files = app.vault.getFiles();
    const hit = files.find(f => f.path.replace(/\\/g,'/').toLowerCase() === lc);
    if (hit) return hit.path;
  }catch(e){}
  return targetPath;
}

const appendToFile = async (path, text)=>{ 
    try {
        const folder = path.substring(0, path.lastIndexOf("/"));
        if (!await app.vault.adapter.exists(folder)) await app.vault.adapter.mkdir(folder);
        await app.vault.adapter.append(path, text); 
    } catch(e) { console.error("Append Error:", e); }
};

async function getDailyAgendaFiles(dateStr) {
    try {
        const cleanPath = AGENDA_BASE_PATH.endsWith('/') ? AGENDA_BASE_PATH.slice(0, -1) : AGENDA_BASE_PATH;
        const folder = app.vault.getAbstractFileByPath(cleanPath);
        if (!folder || !folder.children) return [getPrimaryAgendaFile(dateStr)];

        const primary = getPrimaryAgendaFile(dateStr);
        const matches = folder.children
            .filter(f => f.name.startsWith(dateStr) && f.name.includes("Agenda") && f.extension === 'md')
            .map(f => f.path)
            .sort((a, b) => {
                if (a === primary) return 1;
                if (b === primary) return -1;
                return a.localeCompare(b);
            });
            
        return matches.length > 0 ? matches : [primary];
    } catch(e) { return [getPrimaryAgendaFile(dateStr)]; }
}

async function GetUnifiedActivityMap() {
    const unifiedMap = new Map();
    try {
        const files = await getDailyAgendaFiles(currentPlannerDate);
        for (const f of files) {
            try {
                if(await app.vault.adapter.exists(f)) {
                    const content = await app.vault.adapter.read(f);
                    const lines = content.split('\n');
                    lines.forEach(line => {
                        if (line.trim().startsWith("|") && !line.includes("**Activity**") && !line.includes("---")) {
                            const parts = line.split("|");
                            if (parts.length >= 5) {
                                const id = parts[1].trim();
                                if(id) {
                                    const s = parts[3].trim();
                                    const e = parts[4].trim();
                                    if (s === "DELETED" || e === "DELETED") {
                                        if (unifiedMap.has(id)) unifiedMap.delete(id);
                                    } else {
                                        unifiedMap.set(id, { 
                                            id, name: parts[2].trim(), start: s, end: e, 
                                            sourceFile: f
                                        });
                                    }
                                }
                            }
                        }
                    });
                }
            } catch(readErr) { console.log("Skipping file:", f); }
        }
    } catch(e) { console.error("Unified Map Error", e); }
    return unifiedMap;
}

/* ---------- CSS ---------- */
const css = `
.chat-wrap{font:14px/1.45 var(--font-interface);background:#54B5FB !important; border:1px solid var(--background-modifier-border); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px}
.row{display:flex; gap:6px; flex-wrap:wrap; align-items:center}
textarea{width:100%; height:88px; resize:vertical; border-radius:10px; padding:10px; border:1px solid var(--background-modifier-border);background:#094782 !important; color:var(--text-normal)}
textarea.ref{width:50%; min-height:10px}
textarea.ref2{width:48%; min-height:10px;background:var(--background-primary);border-color:var(--background-primary);cursor:none}
.log{max-height:260px; overflow:auto; padding:6px; background:var(--background-secondary); border-radius:8px}
.msg{margin:6px 0}
.msg .meta{font-size:12px; color:var(--text-muted)}
.embed-box { display:none; }

.suggest-panel{position:absolute; z-index:9999; max-height:280px; overflow:auto; border:1px solid var(--background-modifier-border); background:var(--background-primary); border-radius:8px; padding:6px; box-shadow:0 8px 24px rgba(0,0,0,.25); min-width:320px}
.suggest-head{display:flex; gap:8px; align-items:center; padding:4px 6px 8px 6px; border-bottom:1px solid var(--background-modifier-border); justify-content: space-between;}
.suggest-bc{font-size:12px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-grow: 1;}
.suggest-nav{display:flex; gap:4px;}
.nav-btn{padding:2px 10px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--interactive-normal); cursor:pointer; font-size:14px; line-height:1;}
.suggest-list{margin-top:6px}
.suggest-item{padding:6px 8px; border-radius:6px; cursor:pointer; display:flex; gap:8px; align-items:center}
.suggest-item:hover,.suggest-item.active{background:var(--background-secondary)}
.suggest-item small{opacity:.7}
.suggest-icon{width:1.2em; text-align:center}
.suggest-item.active{outline:1px solid var(--interactive-accent)}
.suggest-input-hint{padding:8px; font-style:italic; opacity:0.8; border-top:1px solid var(--background-modifier-border)}
.suggest-section-title{margin:6px 0 2px 0; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; font-weight:600;}
/* Calendar */
.cal-box{display:none; position:fixed; z-index:10050; width:320px; max-width:92vw; background:var(--background-primary); border:1px solid var(--background-modifier-border); border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,.35); padding:10px}
.cal-head{display:flex; align-items:center; justify-content:space-between; gap:6px; padding:4px 2px 10px 2px}
.cal-title{font-weight:700; font-size:13px; text-align:center; flex:1}
.cal-nav{display:flex; gap:4px}
.cal-nav button{padding:2px 8px; border-radius:6px; border:1px solid var(--background-modifier-border); background:var(--interactive-normal); cursor:pointer}
.cal-week{display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:6px; font-size:11px; color:var(--text-muted); text-align:center}
.cal-grid{display:grid; grid-template-columns:repeat(7,1fr); gap:4px}
.cal-day{padding:6px 0; border-radius:8px; text-align:center; cursor:pointer; user-select:none}
.cal-day:hover{background:var(--background-secondary)}
.cal-day.muted{opacity:.35}
.cal-day.today{outline:1px solid var(--interactive-accent)}
.cal-day.selected{background:var(--interactive-accent); color:var(--text-on-accent)}
`;

/* ---------- UI SETUP ---------- */
const style = document.createElement("style"); style.textContent = css; this.container.appendChild(style);
const wrap = this.container.createEl("div",{cls:"chat-wrap"});
const COMPONENT = this.component; 

const sourceRow = wrap.createEl("div",{cls:"row"});
const source_box = sourceRow.createEl("textarea",{cls:"ref", text: IS_MOBILE ? "edwin-mobile" : "edwin"});
const task = sourceRow.createEl("textarea",{ cls:"ref2", text:"" });
task.tabIndex = -1; source_box.tabIndex = -1;

const text_box = wrap.createEl("textarea",{placeholder:"Type "});
const actions = wrap.createEl("div",{cls:"row"});

const toDo = actions.createEl("button",{cls:"btn", text:"toDo"});
const editBtn = actions.createEl("button",{cls:"btn", text:"<"}); 
const consumeBtn = actions.createEl("button",{cls:"btn", text:"Consume"}); 
const breakBtn = actions.createEl("button",{cls:"btn", text:"Break"}); 
const sendBtn = actions.createEl("button",{cls:"btn", text:"Send ⏎"});
const modeLabel = IS_MOBILE ? "(M)" : "";
const dateBtn = actions.createEl("button",{cls:"btn", text: `${currentPlannerDate} ${modeLabel}`});
const embedBtn = actions.createEl("button",{cls:"btn", text:"Agenda"}); 

const logBox = wrap.createEl("div",{cls:"log"});
const embedBox = wrap.createEl("div",{cls:"embed-box"});

/* ---------- HELPERS ---------- */
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

/* ---------- LOGIC: CALENDAR LOADING (Integrated) ---------- */
async function loadCalendarData(dateStr) {
    calState.currentDate = dateStr;
    calState.nodes = []; 

    // Use Planner's Base Path
    const folder = app.vault.getAbstractFileByPath(AGENDA_BASE_PATH.slice(0, -1));
    if (!folder || !folder.children) return;

    // 1. Identify ALL relevant files
    const files = folder.children.filter(f => 
        f.extension === 'md' && f.name.includes(dateStr)
    );
    if (files.length === 0) return;

    // 2. Data Collection (Gather all candidates)
    const candidates = new Map();

    // Regex for Standard Agenda
    const regexAgenda = /\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/;
    // Regex for EdLog
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
                timestamp = new Date(`${datePart}T${timePart}`).getTime();
            } else {
                const match = regexAgenda.exec(line);
                if (!match) continue;
                actId = match[1].trim();
                activityRaw = match[2].trim();
                startStr = match[3].trim();
                endStr = match[4].trim();
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

    // 3. Conflict Resolution
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentMins = now.getHours() * 60 + now.getMinutes();

    candidates.forEach((entries, actId) => {
        entries.sort((a, b) => b.timestamp - a.timestamp);
        const winner = entries[0];
        
        let finalEnd = winner.endMins;

        if (finalEnd === null) {
            if (dateStr === todayStr && winner.startMins < currentMins) {
                finalEnd = Math.max(currentMins, winner.startMins + 30);
            } else {
                finalEnd = winner.startMins + 60; 
            }
        }

        const duration = finalEnd - winner.startMins;

        if (duration > 0) {
            let blockColor = "#54B5FB"; // Desktop
            if (winner.source === "Log") blockColor = "#FFB86C"; // Log
            else if (winner.source === "Mobile") blockColor = "#bd93f9"; // Mobile

            calState.nodes.push({
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

    // 4. Distribute Columns
    calState.nodes.sort((a, b) => a.y - b.y);
    const colEnds = [0, 0, 0, 0]; 

    calState.nodes.forEach(node => {
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

    drawCalendarView(); 
}

/* ---------- LOGIC: DRAWING ---------- */
function drawCalendarView() {
    embedBox.innerHTML = "";
    
    // Create Control Bar
    const controls = embedBox.createEl("div");
    controls.style.cssText = cvControlStyle;
    
    controls.createEl("span", { text: `Zoom: `, style: "font-size:12px;" });
    const slider = controls.createEl("input");
    slider.type = "range"; slider.min = "0.2"; slider.max = "1.5"; slider.step = "0.05";
    slider.value = calState.scale;
    slider.style.width = "150px"; slider.style.cursor = "pointer";
    slider.addEventListener("input", (e)=>{ calState.scale = parseFloat(e.target.value); drawCalendarView(); });

    // Create Viewport
    const viewport = embedBox.createEl("div");
    viewport.style.cssText = cvContainerStyle;

    const totalHeight = 1440 * PIXELS_PER_MIN * calState.scale;
    const contentWrapper = viewport.createEl("div");
    contentWrapper.style.height = `${totalHeight}px`;
    contentWrapper.style.position = "relative";
    contentWrapper.style.minWidth = `${(4 * COL_SPACING * calState.scale) + 100}px`; 

    // Grid
    for (let h = 0; h < 24; h++) {
        const mins = h * 60;
        const y = mins * PIXELS_PER_MIN; 
        
        const line = contentWrapper.createEl("div");
        line.style.cssText = cvGridLineStyle;
        line.style.top = `${y * calState.scale}px`;

        const label = contentWrapper.createEl("div", {text: `${h}:00`});
        label.style.cssText = cvTimeLabelStyle;
        label.style.top = `${y * calState.scale}px`;
    }

    // Now Line
    const now = new Date();
    const isToday = (currentPlannerDate === now_date());
    if (isToday) {
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const nowY = nowMins * PIXELS_PER_MIN;
        const nowLine = contentWrapper.createEl("div");
        nowLine.style.cssText = `
            position: absolute; left: 50px; right: 0; 
            top: ${nowY * calState.scale}px; border-top: 2px solid red; z-index: 10; pointer-events: none;
        `;
        setTimeout(() => { viewport.scrollTop = (nowY * calState.scale) - 300; }, 50);
    }

    // Nodes
    if (calState.nodes.length === 0) {
        contentWrapper.createEl("div", {text: "No activities found."}).style.padding = "50px";
    }

    calState.nodes.forEach(node => {
        const renderHeight = node.height * calState.scale;
        const block = contentWrapper.createEl("div");
        block.style.cssText = cvBlockStyle(node.y, node.height, node.color, node.colIndex);
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

async function RefreshEmbed(){
    await loadCalendarData(currentPlannerDate);
}

/* ---------- CALENDAR SYSTEM (NAV) ---------- */
const calendarBox = document.createElement('div'); calendarBox.className = 'cal-box'; calendarBox.style.display = 'none'; document.body.appendChild(calendarBox);
COMPONENT.register(()=>{ try{ calendarBox.remove(); }catch(e){} });
let calViewYear = Number(String(currentPlannerDate).split('-')[0] || new Date().getFullYear());
let calViewMonth = Number(String(currentPlannerDate).split('-')[1] || (new Date().getMonth()+1)) - 1; 

function fmtDate(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }
function setPlannerDate(dStr){
  currentPlannerDate = String(dStr);
  dateBtn.textContent = `${currentPlannerDate} ${modeLabel}`;
  PRIMARY_AGENDA_FILE = getPrimaryAgendaFile(currentPlannerDate);
  CONSUMPTION_LOG_FILE = getConsumptionLogFile(currentPlannerDate);
  if (embedBox.style.display !== "none") RefreshEmbed();
  logUp();
}
function monthName(m){ try{ return new Date(2000, m, 1).toLocaleDateString('en-US',{month:'long'}); } catch(e){ return String(m+1); } }
function renderCalendar(){
  const first = new Date(calViewYear, calViewMonth, 1);
  const startDow = (first.getDay()+6)%7; 
  const daysInMonth = new Date(calViewYear, calViewMonth+1, 0).getDate();
  const prevDays = new Date(calViewYear, calViewMonth, 0).getDate();
  const todayStr = now_date();
  calendarBox.innerHTML = '';
  const head = document.createElement('div'); head.className='cal-head';
  const navL = document.createElement('div'); navL.className='cal-nav';
  const byPrevYear = document.createElement('button'); byPrevYear.textContent='«';
  const byPrevMonth = document.createElement('button'); byPrevMonth.textContent='‹';
  const byNextMonth = document.createElement('button'); byNextMonth.textContent='›';
  const byNextYear = document.createElement('button'); byNextYear.textContent='»';
  byPrevYear.onclick=()=>{calViewYear--;renderCalendar();}; byNextYear.onclick=()=>{calViewYear++;renderCalendar();};
  byPrevMonth.onclick=()=>{calViewMonth--;if(calViewMonth<0){calViewMonth=11;calViewYear--;}renderCalendar();};
  byNextMonth.onclick=()=>{calViewMonth++;if(calViewMonth>11){calViewMonth=0;calViewYear++;}renderCalendar();};
  navL.append(byPrevYear, byPrevMonth);
  const title = document.createElement('div'); title.className='cal-title'; title.textContent = `${monthName(calViewMonth)} ${calViewYear}`;
  const navR = document.createElement('div'); navR.className='cal-nav'; navR.append(byNextMonth, byNextYear);
  head.append(navL, title, navR);
  const grid = document.createElement('div'); grid.className='cal-grid';
  for(let i=0;i<42;i++){
    const cell=document.createElement('div'); cell.className='cal-day';
    let y=calViewYear, m=calViewMonth, d=0;
    if(i<startDow){ d = prevDays - (startDow-1-i); cell.classList.add('muted'); m = calViewMonth-1; y = calViewYear; if(m<0){m=11;y--;} }
    else if (i >= startDow + daysInMonth){ d = i - (startDow + daysInMonth) + 1; cell.classList.add('muted'); m = calViewMonth+1; y = calViewYear; if(m>11){m=0;y++;} }
    else { d = i - startDow + 1; }
    const ds = fmtDate(y,m,d); cell.textContent = String(d);
    if (ds === todayStr) cell.classList.add('today');
    if (ds === currentPlannerDate) cell.classList.add('selected');
    cell.onclick=()=>{ setPlannerDate(ds); calendarBox.style.display='none'; };
    grid.appendChild(cell);
  }
  const week = document.createElement('div'); week.className='cal-week';
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(w=>{ const d=document.createElement('div'); d.textContent=w; week.appendChild(d); });
  calendarBox.append(head, week, grid);
}
function positionCalendar(){
  const r = dateBtn.getBoundingClientRect();
  const w = 320;
  const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
  const top = Math.min(r.bottom + 6, window.innerHeight - 380);
  calendarBox.style.left = `${left}px`; calendarBox.style.top = `${top}px`;
}
dateBtn.onclick=(e)=>{ e.stopPropagation(); if(calendarBox.style.display==='none'){openCalendar(); positionCalendar(); calendarBox.style.display='block';}else calendarBox.style.display='none'; };
function openCalendar(){ renderCalendar(); }

/* ---------- FILE INIT ---------- */
function getDateParts(dStr){
  try{ const [y,m,d] = String(dStr).split('-').map(Number); const dt = new Date(y, (m||1)-1, d||1);
    return { day_week: dt.toLocaleDateString('en-US',{weekday:'long'}), day: d, month: dt.toLocaleDateString('en-US',{month:'long'}), year: y };
  }catch(e){ return { day_week: '', day: '', month: '', year: '' }; }
}
async function ensureLogFilesForDate(d){
  try{ await app.vault.adapter.mkdir(FULL_LOG_FOLDER); }catch(e){}
  try{ await app.vault.adapter.mkdir(`${FULL_LOG_FOLDER}/meta_log`); }catch(e){}
  const TF = getThoughtsFile(d);
  if(!await app.vault.adapter.exists(TF)){ 
      const p = getDateParts(d);
      await app.vault.create(TF, `---
date: ${d}
day_week: ${p.day_week} 
day: ${p.day}
month: ${p.month}
year: ${p.year}
nurtured: 0
---
[[Thoughts_and_ObservationsList]]\n\n| id  | Comment                         | Time  |\n| --- | ------------------------------- | ----- |\n`); 
  }
  const MF = getMetaLogFile(d);
  if(!await app.vault.adapter.exists(MF)){ await app.vault.create(MF, `|id|Source|Duration (ms)|\n|---|---|---|\n`); }
}
async function EnsurePrimaryAgendaFile(){
  try{ await app.vault.adapter.mkdir(AGENDA_BASE_PATH); }catch(e){}
  const exists = await app.vault.adapter.exists(PRIMARY_AGENDA_FILE);
  if(!exists){
    const p = getDateParts(currentPlannerDate);
    await app.vault.create(PRIMARY_AGENDA_FILE, `---
date: ${currentPlannerDate}
day_week: ${p.day_week}
day: ${p.day}
month: ${p.month}
year: ${p.year}
nurtured: 0
device: ${IS_MOBILE ? 'Mobile' : 'Desktop'}
---

[[Agenda]]

| id  | **Activity** | **Start** | **End** |
| --- | ---------------------------- | ---------- | -------- |
`);
  }
}

async function logUp(){
  const d = currentPlannerDate;
  await ensureLogFilesForDate(d);
  const TF = getThoughtsFile(d);
  const txt = await app.vault.adapter.read(TF).catch(()=>null);
  logBox.innerHTML = ""; 
  if (!txt) return;
  const rows = [];
  String(txt).split('\n').forEach(line => {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(\d{1,2}:\d{2})/);
    if (m) rows.push({ id: m[1], comment: m[2], time: m[3] });
  });
  rows.slice(-50).reverse().forEach(r=>{
    const msg = logBox.createEl("div",{cls:"msg"});
    msg.createEl("div",{cls:"meta", text:`- ${r.comment} (${r.time}-${r.id})`});
  });
  logBox.scrollTop = logBox.scrollHeight;
}

let highResStart = performance.now();

/* --- SPLIT-RANGE ID LOGIC --- */
async function getNextTableId(filePath){
  try{
    const txt = await app.vault.adapter.read(filePath);
    const lines = txt.split('\n');
    let maxDesktop = 0;
    let maxMobile = 100;

    lines.forEach(line => {
        const m = line.match(/^\|\s*(\d+)\s*\|/);
        if (m) {
            const id = Number(m[1]);
            if (id < 100) maxDesktop = Math.max(maxDesktop, id);
            else maxMobile = Math.max(maxMobile, id);
        }
    });

    if (IS_MOBILE) {
        return maxMobile + 1;
    } else {
        return maxDesktop + 1;
    }
  } catch(e){ return IS_MOBILE ? 101 : 1; }
}

async function LogActivityChange(actId, name, startVal, endVal) {
    const d = currentPlannerDate; 
    const logFile = getEdLogFile(d);
    try { 
        const logFolder = AGENDA_BASE_PATH + 'EdLog';
        if (!await app.vault.adapter.exists(logFolder)) await app.vault.adapter.mkdir(logFolder); 
        if (!await app.vault.adapter.exists(logFile)) { await app.vault.create(logFile, `| LogID | ActID | Date | Time | Activity | Start | End |\n|---|---|---|---|---|---|---|\n`); }
        
        // Use generic increment for log file (not split range)
        const txt = await app.vault.adapter.read(logFile);
        let maxId = 0;
        txt.split('\n').forEach(line => { const m = line.match(/^\|\s*(\d+)\s*\|/); if (m) maxId = Math.max(maxId, Number(m[1])); });
        const logId = maxId + 1;

        const sName = String(name).trim().replace(/\|/g, '');
        const sStart = String(startVal).replace(/<.*?>/g, '').trim(); 
        const sEnd = String(endVal).replace(/<.*?>/g, '').trim();
        const row = `| ${logId} | ${actId} | ${now_date()} | ${now_time()} | ${sName} | ${sStart} | ${sEnd} |\n`;
        await appendToFile(logFile, row);
    } catch(e) {}
}

async function send(){
  const content = text_box.value.trim();
  if(!content) return;
  const d = currentPlannerDate; 
  const ts = now_time();
  const TF = getThoughtsFile(d);
  const MF = getMetaLogFile(d);
  const source = source_box.value.trim();
  await ensureLogFilesForDate(d);
  
  // Logic for Thoughts file is simple increment
  const tTxt = await app.vault.adapter.read(TF);
  let maxId = 0;
  tTxt.split('\n').forEach(l => { const m = l.match(/^\|\s*(\d+)\s*\|/); if (m) maxId = Math.max(maxId, Number(m[1])); });
  const note_id = maxId + 1;

  const duration = Math.floor(performance.now()-highResStart);
  try { navigator.clipboard.writeText(content); } catch(e){}
  const cleanContent = String(content).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  await appendToFile(TF, `| ${note_id} | ${cleanContent}  | ${ts} <t-${Math.floor(highResStart)}> |\n`);
  await appendToFile(MF, `| ${note_id} | ${source} | ${duration} |\n`);
  source_box.value = IS_MOBILE ? "edwin-mobile" : "edwin";
  text_box.value = "";
  await logUp();
  highResStart = performance.now();
  text_box.focus();
}

(async () => {
    await EnsurePrimaryAgendaFile();
    await logUp();
    setInterval(CheckNotifications, 30000);
})();

/* ---------- ACTIVITY LOGIC (FAIL-SAFE) ---------- */
async function CheckNotifications() {
    try {
        const unifiedMap = await GetUnifiedActivityMap();
        const nowMins = TimeToMins(now_time());
        let activeFound = false;
        let globalLastEnd = -1;

        unifiedMap.forEach(act => {
            const startCol = act.start.replace(/<.*?>/g, '').trim(); 
            const endCol = act.end.replace(/<.*?>/g, '').trim();
            if (/^\d{1,2}:\d{2}/.test(startCol)) {
                const sMins = TimeToMins(startCol);
                if (sMins <= nowMins) {
                     let isEndFuture = true;
                     if (/^\d{1,2}:\d{2}/.test(endCol)) { if (TimeToMins(endCol) <= nowMins) isEndFuture = false; }
                     if (isEndFuture) activeFound = true;
                }
                if (/^\d{1,2}:\d{2}/.test(endCol)) {
                     const eMins = TimeToMins(endCol);
                     if (eMins <= nowMins && eMins > globalLastEnd) globalLastEnd = eMins;
                }
            }
        });
        
        let alertMsg = "";
        if (!activeFound && globalLastEnd !== -1) {
            const gap = nowMins - globalLastEnd;
            if (gap >= 10) { alertMsg = `⚠️ No Activity for ${gap} min!`; task.style.color = "#ff4444"; }
        }
        if (alertMsg) task.textContent = alertMsg; else task.textContent = "";
    } catch (e) {}
}

async function StartActivity(activityName, startTime, plannedEndTime = null, existingRowId = null, preciseUnix = null, skipRefresh = false){
  try {
      await EnsurePrimaryAgendaFile();
      const cleanTime = startTime; 
      let unixTag = "";
      const startMins = TimeToMins(cleanTime);
      const nowMins = TimeToMins(now_time());
      const todayStr = now_date();
      const viewingToday = String(currentPlannerDate) === todayStr;
      const isFuturePlan = (viewingToday && (startMins > (nowMins + 5)));
      if (!isFuturePlan && viewingToday) { const ts = preciseUnix || GetUnixFromString(cleanTime); unixTag = ` <u${ts}>`; }
      
      const content = await app.vault.adapter.read(PRIMARY_AGENDA_FILE);
      let lines = content.split('\n');
      while(lines.length > 0 && lines[lines.length-1].trim() === "") lines.pop();

      let finalId = existingRowId; 
      let finalEnd = plannedEndTime ? ` ${plannedEndTime} ` : `<end-${existingRowId}>`;

      if (existingRowId) {
          const rowIndex = lines.findIndex(l => l.match(new RegExp(`^\\|\\s*${existingRowId}\\s*\\|`)));
          if (rowIndex !== -1) {
              const parts = lines[rowIndex].split("|");
              parts[3] = ` ${cleanTime}${unixTag} `.padEnd(10); 
              lines[rowIndex] = parts.join("|");
              finalEnd = parts[4]; 
          } else {
             lines.push(`| ${existingRowId}    | ${activityName.padEnd(28)} | ${cleanTime}${unixTag} | ${finalEnd} |`);
          }
      } else {
          // GENERATE NEW ID USING SPLIT RANGE LOGIC
          finalId = await getNextTableId(PRIMARY_AGENDA_FILE);
          finalEnd = plannedEndTime ? ` ${plannedEndTime} ` : `<end-${finalId}>`;
          lines.push(`| ${finalId}    | ${activityName.padEnd(28)} | ${cleanTime}${unixTag} | ${finalEnd} |`);
      }
      await app.vault.adapter.write(PRIMARY_AGENDA_FILE, lines.join('\n') + '\n');
      await LogActivityChange(finalId, activityName, cleanTime, finalEnd);
      // DEFERRED REFRESH: Wait for write to settle on mobile I/O
      if(!skipRefresh && embedBox.style.display !== "none") setTimeout(() => RefreshEmbed(), 50);
  } catch(e) { console.error("Start Error", e); task.textContent = "❌ Write Failed: " + e.message; }
}

async function EndActivity(activityName, endTime, preciseUnix = null, targetFile = null, skipRefresh = false){
  try {
      const unifiedMap = await GetUnifiedActivityMap();
      let activity = null;
      for(const act of unifiedMap.values()) { if(act.name === activityName) activity = act; }
      if(!activity) return null; 

      const ts = preciseUnix || GetUnixFromString(endTime);
      const unixTag = ` <u${ts}>`;
      const actStart = activity.start;
      const startUnixMatch = actStart.match(/<u(\d+)>/);
      const startUnix = startUnixMatch ? startUnixMatch[1] : null;

      if (activity.sourceFile === PRIMARY_AGENDA_FILE) {
           const content = await app.vault.adapter.read(PRIMARY_AGENDA_FILE);
           const lines = content.split('\n');
           const rowIndex = lines.findIndex(l => l.match(new RegExp(`^\\|\\s*${activity.id}\\s*\\|`)));
           if(rowIndex !== -1) {
               const parts = lines[rowIndex].split("|");
               const oldEnd = parts[4].trim();
               let newEndCell = endTime;
               if (/^\d{1,2}:\d{2}/.test(oldEnd) && !oldEnd.startsWith("<")) {
                   const pureTime = oldEnd.replace(/<.*?>/g, '').trim();
                   if(pureTime !== endTime) { const targetTag = pureTime.replace(':', '-'); newEndCell = `${endTime} <t${targetTag}>`; }
               }
               newEndCell += unixTag;
               parts[4] = ` ${newEndCell} `; 
               lines[rowIndex] = parts.join("|");
               await app.vault.adapter.write(PRIMARY_AGENDA_FILE, lines.join('\n') + '\n');
               await LogActivityChange(activity.id, activityName, actStart, newEndCell);
           }
      } else {
          const newEndCell = `${endTime} ${unixTag}`;
          const newRow = `| ${activity.id} | ${activity.name.padEnd(28)} | ${activity.start.padEnd(10)} | ${newEndCell} |`;
          await appendToFile(PRIMARY_AGENDA_FILE, newRow + '\n');
          await LogActivityChange(activity.id, activityName, actStart, newEndCell);
      }
      
      if(!skipRefresh && embedBox.style.display !== "none") setTimeout(() => RefreshEmbed(), 50);
      return startUnix;
  } catch(e) { console.error("End Error", e); return null; }
}

async function EditActivity(rowId, field, newVal, preciseUnix = null, targetFile, skipRefresh = false) {
  try {
      const unifiedMap = await GetUnifiedActivityMap();
      const activity = unifiedMap.get(String(rowId));
      if(!activity) return;

      let pName = activity.name.trim();
      let pStart = activity.start.trim();
      let pEnd = activity.end.trim();

      if (field === 'name') pName = newVal;
      else if (field === 'start') {
          let newTimeStr = newVal;
          const tMatch = pStart.match(/<t(\d{1,2}-\d{2})>/);
          if (tMatch) newTimeStr = `${newVal} <t${tMatch[1]}>`;
          const ts = preciseUnix || GetUnixFromString(newVal);
          newTimeStr += ` <u${ts}>`;
          pStart = newTimeStr;
      } else {
          let newTimeStr = newVal;
          const tMatch = pEnd.match(/<t(\d{1,2}-\d{2})>/);
          if (tMatch) newTimeStr = `${newVal} <t${tMatch[1]}>`;
          const ts = preciseUnix || GetUnixFromString(newVal);
          newTimeStr += ` <u${ts}>`;
          pEnd = newTimeStr;
      }

      if (activity.sourceFile === PRIMARY_AGENDA_FILE) {
           const content = await app.vault.adapter.read(PRIMARY_AGENDA_FILE);
           const lines = content.split('\n');
           const rowIndex = lines.findIndex(l => l.match(new RegExp(`^\\|\\s*${rowId}\\s*\\|`)));
           if (rowIndex !== -1) {
               const parts = lines[rowIndex].split("|");
               parts[2] = ` ${pName.padEnd(28)} `;
               parts[3] = ` ${pStart.padEnd(10)} `;
               parts[4] = ` ${pEnd} `;
               lines[rowIndex] = parts.join("|");
               await app.vault.adapter.write(PRIMARY_AGENDA_FILE, lines.join('\n'));
           }
      } else {
           const newRow = `| ${rowId} | ${pName.padEnd(28)} | ${pStart.padEnd(10)} | ${pEnd} |`;
           await appendToFile(PRIMARY_AGENDA_FILE, newRow + '\n');
      }
      
      await LogActivityChange(rowId, pName, pStart, pEnd);
      if(!skipRefresh && embedBox.style.display !== "none") setTimeout(() => RefreshEmbed(), 50);
  } catch(e) { console.error("Edit Error", e); }
}

async function DeleteActivity(rowId, activityName, targetFile, skipRefresh = false) {
  if (!targetFile) targetFile = PRIMARY_AGENDA_FILE;
  try {
      // NON-DESTRUCTIVE DELETE
      if (targetFile === PRIMARY_AGENDA_FILE) {
          // Local File: Safe to delete line
          const content = await app.vault.adapter.read(targetFile);
          const lines = content.split('\n');
          const newLines = lines.filter(l => !l.match(new RegExp(`^\\|\\s*${rowId}\\s*\\|`)));
          if (lines.length !== newLines.length) {
              await app.vault.adapter.write(targetFile, newLines.join('\n'));
              await LogActivityChange(rowId, activityName, "DELETED", "DELETED");
          }
      } else {
          // Remote File: Do NOT touch. Write "Tombstone" to local file
          const tombstone = `| ${rowId} | ${activityName.padEnd(28)} | DELETED | DELETED |`;
          await appendToFile(PRIMARY_AGENDA_FILE, tombstone + '\n');
          await LogActivityChange(rowId, activityName, "DELETED", "DELETED");
      }
      if(!skipRefresh && embedBox.style.display !== "none") setTimeout(() => RefreshEmbed(), 50);
  } catch(e) {}
}

async function RecordConsumption(item, amount) {
    const d = now_today(), ts = now_time();
    let fileContent = await app.vault.adapter.read(CONSUMPTION_LOG_FILE).catch(()=>"");
    if (!fileContent) { fileContent = `| id | Date | Item | Time | Amount |\n|---|---|---|---|---|\n`; await app.vault.create(CONSUMPTION_LOG_FILE, fileContent); }
    const lines = fileContent.split('\n');
    let maxId = 0;
    lines.forEach(l => { const m = l.match(/^\|\s*(\d+)\s*\|/); if (m) maxId = Math.max(maxId, Number(m[1])); });
    let newId; if (IS_MOBILE) newId = (maxId < 100) ? 101 : maxId + 1; else newId = maxId + 1;
    const row = `| ${newId} | ${d} | ${item} | ${ts} | ${amount} |\n`;
    await appendToFile(CONSUMPTION_LOG_FILE, row);
    task.textContent = `Recorded: ${amount}x ${item} @ ${ts}`;
}

async function HandleBreak() {
    const active = await GetActiveActivities();
    const isOnBreak = active.some(a => a.name === "Break");
    const now = now_time();
    const ts = Date.now();
    if (isOnBreak) {
        const activeBreaks = active.filter(a => a.name === "Break");
        for (let i=0; i<activeBreaks.length; i++) {
             const brk = activeBreaks[i];
             // Only refresh on the last one
             const isLast = (i === activeBreaks.length - 1);
             const breakStartUnix = await EndActivity("Break", now, ts, brk.sourceFile, !isLast);
             const didPrompt = await MaybePromptResumeFromUnix(breakStartUnix, ["Break"]);
             if (!didPrompt) task.textContent = "Break ended.";
        }
    } else {
        if (active.length > 0) {
            for (let i=0; i<active.length; i++) {
                // Batch stop: Skip refresh
                await EndActivity(active[i].name, now, ts, active[i].sourceFile, true);
            }
        }
        // Final start: Do refresh
        await StartActivity("Break", now, null, null, ts, false);
        task.textContent = "Started Break.";
    }
}

async function GetActiveActivities(){
    try {
        const unifiedMap = await GetUnifiedActivityMap();
        const active = [];
        const nowMins = TimeToMins(now_time());
        unifiedMap.forEach(act => {
            const startCol = act.start.replace(/<.*?>/g, '').trim();
            const endCol = act.end.replace(/<.*?>/g, '').trim();
            if (startCol.startsWith("<start") || ( /^\d{1,2}:\d{2}/.test(startCol) && TimeToMins(startCol) > nowMins)) return;
            if(endCol.startsWith("<end") || endCol === "" || ( /^\d{1,2}:\d{2}/.test(endCol) && TimeToMins(endCol) > nowMins)) {
                 active.push({ name: act.name, sourceFile: act.sourceFile });
            }
        });
        return active;
    } catch(e) { return []; }
}

async function GetPlannedActivities() {
    try {
        const unifiedMap = await GetUnifiedActivityMap();
        const planned = [];
        const nowMins = TimeToMins(now_time());
        unifiedMap.forEach(act => {
            const startVal = act.start.trim();
            let isPlanned = false;
            let planTimeDisplay = "Pending";
            if (startVal.startsWith("<start")) isPlanned = true;
            else if (/^\d{1,2}:\d{2}/.test(startVal)) {
                const cleanStart = startVal.replace(/<.*?>/g, '').trim();
                if (TimeToMins(cleanStart) > nowMins) { isPlanned = true; planTimeDisplay = cleanStart; }
            }
            if (isPlanned) planned.push({ id: act.id, name: act.name, planTime: planTimeDisplay, sourceFile: act.sourceFile });
        });
        return planned;
    } catch(e) { return []; }
}

async function GetAllActivities() {
    try {
        const unifiedMap = await GetUnifiedActivityMap();
        return Array.from(unifiedMap.values()).map(act => {
            const s = act.start.replace(/<.*?>/g, '').trim() || "---";
            const e = act.end.replace(/<.*?>/g, '').trim() || "---";
            const sourceLabel = act.sourceFile.includes("_m") ? "(M)" : "(D)";
            return { id: act.id, name: act.name, start: s, end: e, display: `${act.name} ${sourceLabel}`, sourceFile: act.sourceFile };
        }).reverse();
    } catch(e) { return []; }
}

async function GetInterruptedActivitiesByUnix(interruptUnix, excludeNames = []) {
    try {
        const unifiedMap = await GetUnifiedActivityMap();
        const targetTag = `<u${interruptUnix}>`;
        const candidates = [];
        unifiedMap.forEach(act => {
            if (excludeNames.includes(act.name)) return;
            const endCol = act.end || "";
            if (!endCol.includes(targetTag)) return;
            let originalPlan = null;
            const tMatch = endCol.match(/<t(\d{1,2}-\d{2})>/);
            if (tMatch) originalPlan = tMatch[1].replace('-', ':');
            candidates.push({ name: act.name, endTime: originalPlan });
        });
        return candidates;
    } catch(e) { return []; }
}

async function MaybePromptResumeFromUnix(interruptUnix, excludeNames = []) {
    const candidates = await GetInterruptedActivitiesByUnix(interruptUnix, excludeNames);
    if (candidates.length === 0) return false;
    const activeNowObjs = await GetActiveActivities();
    const activeNowNames = activeNowObjs.map(a => a.name);
    pendingResumableActivities = candidates.filter(c => !activeNowNames.includes(c.name));
    if (pendingResumableActivities.length === 0) return false;
    suggestMode = 'agenda-resume'; panel.style.display = 'block'; panelOpen = true; reposition(); rerender();
    setTimeout(() => text_box.focus(), 0);
    return true;
}

embedBtn.onclick = async () => {
    if (embedBox.style.display === "none") { await EnsurePrimaryAgendaFile(); await RefreshEmbed(); embedBox.style.display = "block"; embedBtn.textContent = "Hide Agenda"; }
    else { embedBox.style.display = "none"; embedBtn.textContent = "Agenda"; }
};

/* ---------- SUGGESTER ---------- */
async function GetStandardActivities() {
    const targetPath = await resolveVaultPath(ACTIVITY_LIST_PATH);
    try {
        const content = await app.vault.adapter.read(targetPath);
        return content.split('\n').map(l=>l.trim()).filter(l=>l.startsWith('- ') || l.startsWith('* ')).map(l=>l.substring(2).trim());
    } catch(e) { return ['Planning', 'Coding', 'Reading']; }
}
async function GetConsumptionItems() {
    const targetPath = await resolveVaultPath(CONSUMPTION_LIST_PATH);
    try {
        const content = await app.vault.adapter.read(targetPath);
        return content.split('\n').map(l=>l.trim()).filter(l=>l.startsWith('- ') || l.startsWith('* ')).map(l=>l.substring(2).trim());
    } catch(e) { return ['Water', 'Coffee', 'Tea']; }
}
async function GetKeySentences() {
    const targetPath = await resolveVaultPath(RELATED_FILES_PATH);
    try {
        const content = await app.vault.adapter.read(targetPath);
        return content.split('\n').map(l=>l.trim()).map(l=>l.match(/\[\[(.*?)\]\]/)).filter(m=>m).map(m=>{
             const fullInner = m[1]; const parts = fullInner.split('|'); return {label: parts[1] || fullInner, value: `[[${fullInner}]]`};
        });
    } catch(e) { return []; }
}

let panelOpen=false, activeIndex=-1, suggestMode='root';
let pendingActivity=null, pendingAction=null, pendingStartTime=null, pendingExistingId=null, pendingEditField=null, lastEditedTime=null; 
let pendingResumableActivities = []; let pendingStartRequest = null;  
let pendingCurrentStart = null, pendingCurrentEnd = null, pendingConsumptionItem = null, pendingPreciseTimestamp = null;
let pendingTargetFile = null; 
let partialTime = { h: null }; let tempStorage = { val1: null }; let historyStack = [];

const panel = document.createElement('div'); panel.className = 'suggest-panel'; panel.style.display = 'none';
panel.innerHTML = `<div class="suggest-head"><div class="suggest-bc"></div><div class="suggest-nav"><button class="nav-btn" id="nav-back">←</button><button class="nav-btn" id="nav-fwd">→</button></div></div><div class="suggest-list"></div>`;
document.body.appendChild(panel);
const bcEl = panel.querySelector('.suggest-bc'); const listEl = panel.querySelector('.suggest-list');
const backBtn = panel.querySelector('#nav-back'); const fwdBtn = panel.querySelector('#nav-fwd');

function closePanel(){ panel.style.display='none'; panelOpen=false; activeIndex=-1; historyStack = []; }
function reposition(){
  const r = text_box.getBoundingClientRect();
  const y = Math.min(r.bottom - 8, window.innerHeight - 300);
  panel.style.left = `${r.left + 12}px`; panel.style.top = `${y}px`; panel.style.minWidth = `${Math.max(320, r.width*0.6)}px`;
}
function setActive(i){ const items = listEl.querySelectorAll('.suggest-item'); items.forEach(x=>x.classList.remove('active')); if (i>=0 && i<items.length) { items[i].classList.add('active'); items[i].scrollIntoView({block:'nearest'}); activeIndex = i; } }
function createItem(icon, label){ const d = document.createElement('div'); d.className = 'suggest-item'; d.innerHTML = `<span class="suggest-icon">${icon}</span><span>${label}</span>`; return d; }
function setAgendaTitle(title){
  const mode = String(suggestMode || '');
  if (mode.startsWith('agenda-') && !mode.startsWith('agenda-consumption') && mode !== 'agenda-keysentences'){
    bcEl.innerHTML = `<div style="font-size:12px;opacity:0.75;line-height:1.1;margin-bottom:2px;">${currentPlannerDate}</div><div>${title}</div>`;
  } else { bcEl.textContent = title; }
}

function pushHistory() { historyStack.push({ mode: suggestMode, pAction: pendingAction, pActivity: pendingActivity, pId: pendingExistingId, pStart: pendingStartTime, pEdit: pendingEditField, pPrecise: pendingPreciseTimestamp, lastEdit: lastEditedTime, pCurStart: pendingCurrentStart, pCurEnd: pendingCurrentEnd, pConsume: pendingConsumptionItem, pFile: pendingTargetFile }); }
function restoreHistory() { if (historyStack.length === 0) { closePanel(); return; } const state = historyStack.pop(); suggestMode = state.mode; pendingAction = state.pAction; pendingActivity = state.pActivity; pendingExistingId = state.pId; pendingStartTime = state.pStart; pendingEditField = state.pEdit; pendingPreciseTimestamp = state.pPrecise; lastEditedTime = state.lastEdit; pendingCurrentStart = state.pCurStart; pendingCurrentEnd = state.pCurEnd; pendingConsumptionItem = state.pConsume; pendingTargetFile = state.pFile; rerender(); }
function triggerForward() { const items = listEl.querySelectorAll('.suggest-item'); if (activeIndex >= 0 && activeIndex < items.length) { const selected = items[activeIndex]; const data = { code: selected.dataset.code, value: selected.dataset.value, time: selected.dataset.time, custom: selected.dataset.custom === 'true', method: selected.dataset.method, id: selected.dataset.id, precise: selected.dataset.precise === 'true', field: selected.dataset.field, choice: selected.dataset.choice, start: selected.dataset.start, end: selected.dataset.end, file: selected.dataset.file }; selectItem(data); } }
backBtn.addEventListener('mousedown', (e) => { e.preventDefault(); restoreHistory(); });
fwdBtn.addEventListener('mousedown', (e) => { e.preventDefault(); triggerForward(); });

async function rerender(){
    try {
        listEl.innerHTML = '';
        let query = text_box.value.trim().toLowerCase();
        
        if (suggestMode === 'agenda-keysentences') {
            const anchor = findDotCommaAnchor();
            query = anchor !== null ? text_box.value.substring(anchor + 2, text_box.selectionStart).toLowerCase() : "";
        }
        
        if (suggestMode === 'agenda-root') {
            setAgendaTitle('Agenda Actions');
            [{l:'Start Activity',i:'▶️',c:'start'}, {l:'End Activity',i:'⏹️',c:'end'}, {l:'Edit Activity',i:'✏️',c:'edit'}, {l:'Delete Activity',i:'🗑️',c:'delete'}].forEach(it=>{
                const d=document.createElement('div'); d.className='suggest-item'; d.innerHTML=`<span class="suggest-icon">${it.i}</span><span>${it.l}</span>`; d.dataset.code=it.c;
                d.addEventListener('mousedown',()=>{ selectItem({code:it.c}); }); listEl.appendChild(d);
            });
        }
        else if (suggestMode === 'agenda-select-activity' || suggestMode === 'agenda-consumption-select') {
            let items = [];
            if (suggestMode === 'agenda-consumption-select') {
                 setAgendaTitle('What did you consume?');
                 const list = await GetConsumptionItems();
                 list.forEach(i => items.push({name:i, id:null, label:i, extra:'', icon:'💊'}));
            } else if (pendingAction === 'start') {
                setAgendaTitle('Select Activity');
                const planned = await GetPlannedActivities();
                if (planned.length > 0) { const title = document.createElement('div'); title.className='suggest-section-title'; title.textContent='📅 Planned'; listEl.appendChild(title); planned.forEach(p => items.push({name:p.name, id:p.id, label:p.name, extra:p.planTime, icon:'🎯'})); }
                const dynamicActivities = await GetStandardActivities();
                if(items.length>0) { const title = document.createElement('div'); title.className='suggest-section-title'; title.textContent='📂 All'; listEl.appendChild(title); }
                dynamicActivities.forEach(a => items.push({name:a, id:null, label:a, extra:'', icon:'🏁'}));
            } else if (pendingAction === 'end') {
                 setAgendaTitle('End which activity?');
                 const active = await GetActiveActivities();
                 active.forEach(a => items.push({name:a.name, id:null, label:a.name, extra:'', icon:'⏹️', file: a.sourceFile}));
            } else if (pendingAction === 'edit') {
                 setAgendaTitle('Edit which activity?');
                 const all = await GetAllActivities();
                 all.forEach(a => items.push({name:a.name, id:a.id, label:a.name, extra:`${a.start}-${a.end}`, icon:'✏️', start: a.start, end: a.end, file: a.sourceFile}));
            } else if (pendingAction === 'delete') {
                 setAgendaTitle('Delete which activity?');
                 const all = await GetAllActivities();
                 all.forEach(a => items.push({name:a.name, id:a.id, label:a.name, extra:`${a.start}-${a.end}`, icon:'🗑️', file: a.sourceFile}));
            }
            const matches = items.filter(i => i.label.toLowerCase().includes(query));
            if(matches.length === 0) listEl.innerHTML = '<div class="suggest-item">No matches</div>';
            matches.forEach(m => {
                const d = document.createElement('div'); d.className = 'suggest-item';
                d.innerHTML = `<span class="suggest-icon">${m.icon}</span><span>${m.label}</span> <small style="float:right">${m.extra}</small>`;
                d.dataset.value = m.name; if (m.id) d.dataset.id = String(m.id); if (m.start) d.dataset.start = m.start; if (m.end) d.dataset.end = m.end; if (m.file) d.dataset.file = m.file;
                d.addEventListener('mousedown', ()=>selectItem({value:m.name, id:m.id, start:m.start, end:m.end, file:m.file})); listEl.appendChild(d);
            });
        }
        else if (suggestMode === 'agenda-keysentences') {
            setAgendaTitle('Insert Key Sentence');
            const sentences = await GetKeySentences();
            const matches = sentences.filter(s => s.label.toLowerCase().includes(query));
            if(matches.length === 0) listEl.innerHTML = '<div class="suggest-item">No matches</div>';
            matches.forEach(s => {
                const d = document.createElement('div'); d.className = 'suggest-item'; d.innerHTML = `<span class="suggest-icon">📝</span><span>${s.label}</span>`; d.dataset.value = s.value;
                d.addEventListener('mousedown', ()=>selectItem({value:s.value, code:'insert-sentence'})); listEl.appendChild(d);
            });
        }
        else if (suggestMode === 'agenda-consumption-amount') {
             setAgendaTitle(`How much ${pendingConsumptionItem}?`);
             const hint = document.createElement('div'); hint.className = 'suggest-input-hint'; hint.innerHTML = text_box.value ? `Press Enter for: <b>${text_box.value}</b>` : `Type amount (Default: 1)`; listEl.appendChild(hint);
        }
        else if (suggestMode === 'agenda-consumption-double-1') {
             setAgendaTitle(`${pendingConsumptionItem}: Amount/Volume?`);
             const hint = document.createElement('div'); hint.className = 'suggest-input-hint'; hint.innerHTML = text_box.value ? `Press Enter for: <b>${text_box.value}</b>` : `e.g. 500ml, 1 Pint`; listEl.appendChild(hint);
        }
        else if (suggestMode === 'agenda-consumption-double-2') {
             setAgendaTitle(`${pendingConsumptionItem}: % / Type / Notes?`);
             const hint = document.createElement('div'); hint.className = 'suggest-input-hint'; hint.innerHTML = text_box.value ? `Press Enter for: <b>${text_box.value}</b>` : `e.g. 5%, IPA, etc`; listEl.appendChild(hint);
        }
        else if (suggestMode === 'agenda-edit-field') {
            setAgendaTitle(`Edit "${pendingActivity}" (${pendingCurrentStart || '?'} - ${pendingCurrentEnd || '?'})`);
            [{l:'Start Time', v:'start', i:'🕒'}, {l:'End Time', v:'end', i:'🏁'}, {l:'Rename Activity', v:'name', i:'Aa'}].forEach(f=>{
                const d=document.createElement('div'); d.className='suggest-item'; d.innerHTML=`<span class="suggest-icon">${f.i}</span><span>${f.l}</span>`;
                d.dataset.field = f.v; d.addEventListener('mousedown', ()=>selectItem({field:f.v})); listEl.appendChild(d);
            });
        }
        else if (suggestMode === 'agenda-rename-input') {
            setAgendaTitle(`Rename "${pendingActivity}" to...`);
            const typeHint = document.createElement('div'); typeHint.className = 'suggest-input-hint'; typeHint.innerHTML = text_box.value ? `Press Enter to rename to: <b>${text_box.value}</b>` : `Type new name...`; listEl.appendChild(typeHint);
            const dynamicActivities = await GetStandardActivities();
            const matches = dynamicActivities.filter(a => a.toLowerCase().includes(query));
            matches.forEach(name => {
                const d = document.createElement('div'); d.className = 'suggest-item'; d.innerHTML = `<span class="suggest-icon">🏷️</span><span>${name}</span>`; d.dataset.value = name;
                d.addEventListener('mousedown', ()=>selectItem({value:name})); listEl.appendChild(d);
            });
        }
        else if (suggestMode === 'agenda-edit-chain') {
            const otherField = pendingEditField === 'start' ? 'End' : 'Start';
            setAgendaTitle(`Edited ${pendingEditField}. Also edit ${otherField}?`);
            const d1 = document.createElement('div'); d1.className = 'suggest-item'; d1.innerHTML = `<span class="suggest-icon">✅</span><span>No, I'm done</span>`; d1.dataset.choice = 'done'; d1.addEventListener('mousedown', ()=>selectItem({choice:'done'})); listEl.appendChild(d1);
            const d2 = document.createElement('div'); d2.className = 'suggest-item'; d2.innerHTML = `<span class="suggest-icon">✏️</span><span>Yes, Edit ${otherField}</span>`; d2.dataset.choice = 'edit_other'; d2.addEventListener('mousedown', ()=>selectItem({choice:'edit_other'})); listEl.appendChild(d2);
        }
        else if (suggestMode === 'agenda-edit-method') {
            setAgendaTitle(`How to set ${pendingEditField}?`);
            const d1 = document.createElement('div'); d1.className = 'suggest-item'; d1.innerHTML = `<span class="suggest-icon">⌨️</span><span>Set Time</span>`; d1.dataset.method = 'time'; d1.addEventListener('mousedown', ()=>selectItem({method:'time'})); listEl.appendChild(d1);
            const d2 = document.createElement('div'); d2.className = 'suggest-item'; d2.innerHTML = `<span class="suggest-icon">⏳</span><span>Duration (min)</span>`; d2.dataset.method = 'duration'; d2.addEventListener('mousedown', ()=>selectItem({method:'duration'})); listEl.appendChild(d2);
        }
        else if (suggestMode === 'agenda-start-overlap') {
            const act = (pendingStartRequest && pendingStartRequest.activityName) ? pendingStartRequest.activityName : (pendingActivity || 'Activity');
            setAgendaTitle(`Start "${act}" — end active task(s)?`);
            const y = document.createElement('div'); y.className = 'suggest-item'; y.innerHTML = `<span class="suggest-icon">🧹</span><span>Yes — end & start</span>`; y.dataset.choice = 'overlap_yes'; y.addEventListener('mousedown', ()=>selectItem({choice:'overlap_yes'})); listEl.appendChild(y);
            const n = document.createElement('div'); n.className = 'suggest-item'; n.innerHTML = `<span class="suggest-icon">🧬</span><span>No — multitask</span>`; n.dataset.choice = 'overlap_no'; n.addEventListener('mousedown', ()=>selectItem({choice:'overlap_no'})); listEl.appendChild(n);
            const c = document.createElement('div'); c.className = 'suggest-item'; c.innerHTML = `<span class="suggest-icon">↩️</span><span>Cancel</span>`; c.dataset.choice = 'overlap_cancel'; c.addEventListener('mousedown', ()=>selectItem({choice:'overlap_cancel'})); listEl.appendChild(c);
        }
        else if (suggestMode === 'agenda-resume') {
            setAgendaTitle('Resume interrupted activities?');
            const names = pendingResumableActivities.map(a=>a.name).join(', ');
            const hint = document.createElement('div'); hint.className='suggest-input-hint'; hint.textContent = `Interrupted: ${names}`; listEl.appendChild(hint);
            const y = document.createElement('div'); y.className = 'suggest-item'; y.innerHTML = `<span class="suggest-icon">🔄</span><span>Yes, Resume</span>`; y.dataset.choice = 'resume_yes'; y.addEventListener('mousedown', ()=>selectItem({choice:'resume_yes'})); listEl.appendChild(y);
            const n = document.createElement('div'); n.className = 'suggest-item'; n.innerHTML = `<span class="suggest-icon">⏹️</span><span>No, just end break</span>`; n.dataset.choice = 'resume_no'; n.addEventListener('mousedown', ()=>selectItem({choice:'resume_no'})); listEl.appendChild(n);
        }
        else if (suggestMode === 'agenda-delete-confirm') {
            setAgendaTitle(`DELETE "${pendingActivity}"?`);
            const y = document.createElement('div'); y.className = 'suggest-item'; y.innerHTML = `<span class="suggest-icon">🗑️</span><span>Yes, Delete it</span>`; y.dataset.choice = 'delete_yes'; y.addEventListener('mousedown', ()=>selectItem({choice:'delete_yes'})); listEl.appendChild(y);
            const n = document.createElement('div'); n.className = 'suggest-item'; n.innerHTML = `<span class="suggest-icon">↩️</span><span>No, Cancel</span>`; n.dataset.choice = 'delete_no'; n.addEventListener('mousedown', ()=>selectItem({choice:'delete_no'})); listEl.appendChild(n);
        }
        else if (suggestMode === 'agenda-time-select') {
            setAgendaTitle('Set Time');
            const now = now_time();
            const d1 = createItem('⏱️', `Now (${now})`); d1.dataset.time = now; d1.dataset.precise = 'true'; d1.addEventListener('mousedown', ()=>selectItem({time: now, precise: true})); listEl.appendChild(d1);
            const d2 = createItem('⌨️', 'Custom.'); d2.dataset.custom = 'true'; d2.addEventListener('mousedown', ()=>selectItem({custom: true})); listEl.appendChild(d2);
        }
        else if (suggestMode === 'agenda-plan-method') {
            setAgendaTitle('Plan End');
            const d1 = createItem('⏳', 'Duration (min)'); d1.dataset.method = 'duration'; d1.addEventListener('mousedown', ()=>selectItem({method: 'duration'})); listEl.appendChild(d1);
            const d2 = createItem('🔚', 'Set End Time'); d2.dataset.method = 'manual'; d2.addEventListener('mousedown', ()=>selectItem({method: 'manual'})); listEl.appendChild(d2);
            const d3 = createItem('🔓', 'Open End'); d3.dataset.method = 'open'; d3.addEventListener('mousedown', ()=>selectItem({method: 'open'})); listEl.appendChild(d3);
        }
        const _items = listEl.querySelectorAll('.suggest-item'); if (_items.length > 0) setActive(0);
    } catch(e) { console.error("Rerender Error", e); }
}

function selectItem(data) {
    pushHistory();
    if (suggestMode === 'agenda-root') { pendingAction = data.code; suggestMode = 'agenda-select-activity'; text_box.value = ''; rerender(); }
    else if (suggestMode === 'agenda-keysentences') {
        if (data.value) {
            const anchor = findDotCommaAnchor();
            if (anchor !== null) {
                 const before = text_box.value.substring(0, anchor);
                 const after = text_box.value.substring(text_box.selectionStart);
                 text_box.value = before + data.value + after;
                 const newCursor = before.length + data.value.length;
                 text_box.setSelectionRange(newCursor, newCursor);
            }
            closePanel(); text_box.focus();
        }
    }
    else if (suggestMode === 'agenda-select-activity') {
         const val = data.value || listEl.children[activeIndex]?.dataset.value;
         const id = (data.id && data.id !== 'undefined') ? data.id : null;
         const file = data.file;
         if(val){
              pendingActivity = val; pendingExistingId = id; pendingTargetFile = file;
              if (pendingAction === 'edit') { pendingCurrentStart = data.start; pendingCurrentEnd = data.end; suggestMode = 'agenda-edit-field'; } 
              else if (pendingAction === 'delete') { suggestMode = 'agenda-delete-confirm'; }
              else { suggestMode = 'agenda-time-select'; }
              text_box.value = ''; rerender();
        }
    }
    else if (suggestMode === 'agenda-consumption-select') {
        const val = data.value;
        if (val) {
            pendingConsumptionItem = val;
            if (PROMPT_DOUBLE.includes(val)) { suggestMode = 'agenda-consumption-double-1'; text_box.value = ''; text_box.placeholder = 'First Val'; rerender(); }
            else if (PROMPT_SINGLE.includes(val)) { suggestMode = 'agenda-consumption-amount'; text_box.value = ''; text_box.placeholder = '1'; rerender(); } 
            else { RecordConsumption(val, '1'); CloseAndClear(); }
        }
    }
    else if (suggestMode === 'agenda-edit-field') {
        pendingEditField = data.field;
        suggestMode = (pendingEditField === 'name') ? 'agenda-rename-input' : 'agenda-time-select';
        rerender();
    }
    else if (suggestMode === 'agenda-rename-input') {
        const newVal = data.value || text_box.value.trim();
        if (newVal) { EditActivity(pendingExistingId, 'name', newVal, null, pendingTargetFile); CloseAndClear(); }
    }
    else if (suggestMode === 'agenda-edit-chain') {
        if (data.choice === 'done') CloseAndClear();
        else { pendingEditField = pendingEditField === 'start' ? 'end' : 'start'; suggestMode = 'agenda-edit-method'; rerender(); }
    }
    else if (suggestMode === 'agenda-edit-method') {
        if (data.method === 'time') { suggestMode = 'agenda-time-select'; rerender(); }
        else { suggestMode = 'agenda-edit-duration'; text_box.value = ''; text_box.placeholder = 'min'; rerender(); }
    }
    else if (suggestMode === 'agenda-start-overlap') {
        if (data.choice === 'overlap_cancel') { pendingStartRequest = null; if (historyStack.length > 0) historyStack.pop(); restoreHistory(); return; }
        (async () => {
            if (!pendingStartRequest) { CloseAndClear(); return; }
            const payload = pendingStartRequest; pendingStartRequest = null;
            if (data.choice === 'overlap_yes') for (const act of payload.active) await EndActivity(act.name, payload.startTime, payload.preciseUnix, act.sourceFile, true); // SKIP REFRESH
            await StartActivity(payload.activityName, payload.startTime, payload.plannedEndTime, payload.existingRowId, payload.preciseUnix, false); // DO REFRESH
            CloseAndClear();
        })();
    }
    else if (suggestMode === 'agenda-resume') {
        if (data.choice === 'resume_yes') (async () => { const nowStr = now_time(); const ts = Date.now(); for (const act of pendingResumableActivities) await StartActivity(act.name, nowStr, act.endTime, null, ts); })();
        CloseAndClear();
    }
    else if (suggestMode === 'agenda-delete-confirm') {
        if (data.choice === 'delete_yes') { DeleteActivity(pendingExistingId, pendingActivity, pendingTargetFile); CloseAndClear(); }
        else { CloseAndClear(); }
    }
    else if (suggestMode === 'agenda-time-select') {
        if (data.custom) { suggestMode = 'agenda-time-hour'; text_box.value = ''; text_box.placeholder = 'HH'; rerender(); }
        else { const preciseTs = data.precise ? Date.now() : null; (async()=>{ await HandleTimeSelection(data.time || now_time(), preciseTs); })(); }
    }
    else if (suggestMode === 'agenda-plan-method') {
        if (data.method === 'duration') { suggestMode = 'agenda-plan-duration'; text_box.value = ''; text_box.placeholder = 'min'; rerender(); }
        else if (data.method === 'open') { (async()=>{ await RequestStartWithOverlapCheck(pendingActivity, pendingStartTime, null, pendingExistingId, pendingPreciseTimestamp); })(); }
        else { suggestMode = 'agenda-time-hour'; pendingAction = 'plan-end-manual'; text_box.value = ''; text_box.placeholder = 'HH'; rerender(); }
    }
    const _items = listEl.querySelectorAll('.suggest-item'); if (_items.length > 0) setActive(0);
}

async function HandleTimeSelection(timeStr, preciseTs = null) {
    if (pendingAction === 'end') {
        const startUnix = await EndActivity(pendingActivity, timeStr, preciseTs, pendingTargetFile);
        const exclude = (pendingActivity === "Break") ? ["Break"] : ["Break", pendingActivity];
        if (!(await MaybePromptResumeFromUnix(startUnix, exclude))) CloseAndClear();
        return;
    }
    if (pendingAction === 'edit') {
        await EditActivity(pendingExistingId, pendingEditField, timeStr, preciseTs, pendingTargetFile); lastEditedTime = timeStr; suggestMode = 'agenda-edit-chain'; text_box.value = ''; await rerender(); return;
    }
    if (pendingAction === 'plan-end-manual') {
        await RequestStartWithOverlapCheck(pendingActivity, pendingStartTime, timeStr, pendingExistingId, pendingPreciseTimestamp); return;
    }
    pendingStartTime = timeStr; pendingPreciseTimestamp = preciseTs; suggestMode = 'agenda-plan-method'; text_box.value = ''; await rerender();
}

function HandleDurationInput(minutes) {
    if (pendingAction === 'edit') {
        const baseMins = TimeToMins(lastEditedTime);
        const newMins = (pendingEditField === 'end') ? baseMins + minutes : baseMins - minutes;
        EditActivity(pendingExistingId, pendingEditField, MinsToTime(newMins), null, pendingTargetFile); CloseAndClear();
    }
}

async function RequestStartWithOverlapCheck(activityName, startTime, plannedEndTime, existingRowId, preciseUnix) {
    try {
        if (preciseUnix && String(currentPlannerDate) === now_date()) {
            const active = await GetActiveActivities();
            const activeFiltered = active.filter(a => a.name !== activityName);
            if (activeFiltered.length > 0) {
                pendingStartRequest = { activityName, startTime, plannedEndTime, existingRowId, preciseUnix, active: activeFiltered };
                suggestMode = 'agenda-start-overlap'; panel.style.display = 'block'; panelOpen = true; reposition(); await rerender(); setTimeout(() => text_box.focus(), 0); return;
            }
        }
        await StartActivity(activityName, startTime, plannedEndTime, existingRowId, preciseUnix); CloseAndClear();
    } catch(e) { console.error("Overlap Check Error", e); }
}

function CloseAndClear(){ text_box.value = ''; text_box.placeholder = 'Type '; closePanel(); }

/* --- DYNAMIC '.,' TRIGGER --- */
function findDotCommaAnchor() {
    const s = text_box.value; const cursor = text_box.selectionStart ?? s.length;
    for (let i = cursor - 1; i >= 1; i--) { const ch = s[i]; if (ch === ' ' || ch === '\n' || ch === '\t') break; if (ch === ',' && s[i - 1] === '.') return i - 1; }
    return null;
}

text_box.addEventListener('input', ()=>{ 
    if (findDotCommaAnchor() !== null) { suggestMode = 'agenda-keysentences'; panelOpen = true; panel.style.display = 'block'; reposition(); rerender(); return; }
    if (panelOpen && suggestMode === 'agenda-keysentences') closePanel();
    if(panelOpen) rerender(); 
});

text_box.addEventListener('keydown', (e)=>{
    if (e.key === '<' && text_box.value.trim() === '') { setTimeout(()=>{ suggestMode = 'agenda-root'; panel.style.display = 'block'; panelOpen = true; reposition(); rerender(); }, 10); return; }
    if (e.key === 'Escape') { if(panelOpen) { closePanel(); e.preventDefault(); } else if (text_box.value.trim() === '') { suggestMode = 'agenda-consumption-select'; panel.style.display = 'block'; panelOpen = true; reposition(); rerender(); } return; }
    if (!panelOpen) { if(e.key === "Enter") { e.preventDefault(); send(); } return; }

    if (e.key === 'ArrowLeft') { e.preventDefault(); restoreHistory(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); triggerForward(); return; }

    if (suggestMode === 'agenda-time-hour' && e.key === 'Enter') { e.preventDefault(); const raw = text_box.value.trim(); if (/^\d{1,2}$/.test(raw) && Number(raw) >= 0 && Number(raw) <= 23) { partialTime.h = Number(raw); suggestMode = 'agenda-time-minute'; text_box.value = ''; text_box.placeholder = 'MM'; rerender(); } return; }
    if (suggestMode === 'agenda-time-minute' && e.key === 'Enter') { e.preventDefault(); const raw = text_box.value.trim(); if (/^\d{1,2}$/.test(raw) && Number(raw) >= 0 && Number(raw) <= 59) { (async()=>{ await HandleTimeSelection(`${pad(partialTime.h)}:${pad(raw)}`); })(); } return; }
    if (suggestMode === 'agenda-plan-duration' && e.key === 'Enter') { e.preventDefault(); const raw = text_box.value.trim(); if (/^\d+$/.test(raw) && Number(raw) > 0) { const endMins = TimeToMins(pendingStartTime) + Number(raw); (async()=>{ await RequestStartWithOverlapCheck(pendingActivity, pendingStartTime, MinsToTime(endMins), pendingExistingId, pendingPreciseTimestamp); })(); } return; }
    if (suggestMode === 'agenda-edit-duration' && e.key === 'Enter') { e.preventDefault(); const raw = text_box.value.trim(); if (/^\d+$/.test(raw) && Number(raw) > 0) HandleDurationInput(Number(raw)); return; }
    if (suggestMode === 'agenda-rename-input' && e.key === 'Enter') { e.preventDefault(); const raw = text_box.value.trim(); if (raw) { EditActivity(pendingExistingId, 'name', raw, null, pendingTargetFile); CloseAndClear(); } return; }
    
    // Consumption Enter Handlers
    if (suggestMode === 'agenda-consumption-amount' && e.key === 'Enter') { e.preventDefault(); const raw = text_box.value.trim(); RecordConsumption(pendingConsumptionItem, raw === '' ? '1' : raw); CloseAndClear(); return; }
    if (suggestMode === 'agenda-consumption-double-1' && e.key === 'Enter') { e.preventDefault(); tempStorage.val1 = text_box.value.trim() || '1'; suggestMode = 'agenda-consumption-double-2'; text_box.value = ''; rerender(); return; }
    if (suggestMode === 'agenda-consumption-double-2' && e.key === 'Enter') { e.preventDefault(); const val2 = text_box.value.trim() || '-'; RecordConsumption(pendingConsumptionItem, `${tempStorage.val1} (${val2})`); CloseAndClear(); return; }

    if (['agenda-time-hour', 'agenda-time-minute', 'agenda-plan-duration', 'agenda-edit-duration'].includes(suggestMode)) { if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); return; }
    
    const items = listEl.querySelectorAll('.suggest-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIndex + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
    else if (e.key === 'Enter') {
        e.preventDefault(); const selected = items[activeIndex];
        if(selected) {
             const data = { code: selected.dataset.code, value: selected.dataset.value, time: selected.dataset.time, custom: selected.dataset.custom === 'true', method: selected.dataset.method, id: selected.dataset.id, precise: selected.dataset.precise === 'true', field: selected.dataset.field, choice: selected.dataset.choice, start: selected.dataset.start, end: selected.dataset.end, file: selected.dataset.file };
             selectItem(data);
        }
    }
});

this.registeredCleanup = this.registeredCleanup || [];
this.registeredCleanup.push(()=>{ try{ document.body.removeChild(panel); }catch(e){} });
const intervalId = setInterval(CheckNotifications, 30000); 
this.registeredCleanup.push(() => clearInterval(intervalId));

sendBtn.addEventListener("click", ()=>{ sendBtn.textContent="..."; send(); setTimeout(()=>sendBtn.textContent="Send ⏎", 500); });
toDo.addEventListener("click", ()=>{ source_box.value = (source_box.value==='toDo') ? 'edwin' : 'toDo'; });
editBtn.addEventListener("click", async ()=>{ editBtn.textContent="..."; await EnsurePrimaryAgendaFile(); suggestMode = 'agenda-root'; panel.style.display = 'block'; panelOpen = true; reposition(); rerender(); text_box.focus(); setTimeout(()=>editBtn.textContent="<", 500); });
consumeBtn.addEventListener("click", ()=>{ consumeBtn.textContent="..."; suggestMode = 'agenda-consumption-select'; panel.style.display = 'block'; panelOpen = true; reposition(); rerender(); text_box.focus(); setTimeout(()=>consumeBtn.textContent="Consume", 500); });
breakBtn.addEventListener("click", ()=>{ breakBtn.textContent="..."; HandleBreak(); setTimeout(()=>breakBtn.textContent="Break", 500); });
(async ()=>{ await logUp(); })();
```
