```dataviewjs
/********************************************************************
* Planner_5_15 — Mobile ID Offset + Edit Audit Log
********************************************************************/
const { MarkdownRenderer } = require("obsidian");

/* ---------- CONFIGURATION ---------- */
// Set to 'true' ONLY on your mobile device if auto-detection still fails.
const FORCE_MOBILE_MODE = false; 

/* ---------- UTILS: TIME & STRINGS ---------- */
const pad = n=>String(n).padStart(2,"0");
const now_date = ()=>{ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const now_today = ()=>{ const d=new Date(); return `${pad(d.getDate())}`; };
const now_time = ()=>{ const d=new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const TimeToMins = (t) => { const p=t.split(':').map(Number); return p[0]*60 + p[1]; };
const MinsToTime = (m) => { let h=Math.floor(m/60), min=m%60; if(h>23)h-=24; return `${pad(h)}:${pad(min)}`; };
const GetUnixFromString = (t) => { const d = new Date(); const [h,m] = t.split(':').map(Number); d.setHours(h, m, 0, 0); return d.getTime(); };

// Helper: Resolve paths (case-insensitive for mobile filesystem quirks)
async function resolveVaultPath(targetPath){
  try{
    const tp = String(targetPath || "").replace(/\\/g,'/');
    const lc = tp.toLowerCase();
    const files = (app?.vault?.getFiles ? app.vault.getFiles() : []) || [];
    const hit = files.find(f => String(f.path || "").replace(/\\/g,'/').toLowerCase() === lc);
    if (hit?.path) return hit.path;
  }catch(e){}
  return targetPath;
}

const appendToFile = async (path, text)=>{ 
    // Ensure parent folder exists before appending
    try {
        const folder = path.substring(0, path.lastIndexOf("/"));
        if (!await app.vault.adapter.exists(folder)) await app.vault.adapter.mkdir(folder);
    } catch(e) {}
    await app.vault.adapter.append(path, text); 
};

/* ---------- STATE MANAGEMENT ---------- */
let currentPlannerDate = now_date(); 

// PATH DEFINITIONS
const MAIN_LOG_FOLDER = '0-Vault/02-Areas/04-Thoughts_and_Observations/';
const LOG_PROJECT_NAME = '2026';
const FULL_LOG_FOLDER = MAIN_LOG_FOLDER + LOG_PROJECT_NAME;

const AGENDA_BASE_PATH = '0-Vault/02-Areas/02-Agenda/2026/';
const CONSUMPTION_BASE_PATH = '0-Vault/02-Areas/06-Body-Mind/Health/Piled_up/';

// Reference Files (Read-Only)
const ACTIVITY_LIST_PATH = '0-Vault/02-Areas/11-Gardening/Planning/RelevantInformation/Activity_List.md';
const CONSUMPTION_LIST_PATH = '0-Vault/02-Areas/11-Gardening/Planning/RelevantInformation/Consumption_List.md';
const RELATED_FILES_PATH = '0-Vault/02-Areas/11-Gardening/Planning/RelevantInformation/related_files.md'; 

// CONSUMPTION LOGIC
const PROMPT_SINGLE = ['Tyrosine', 'Tryptophan'];
const PROMPT_DOUBLE = ['Beer'];

/* ---------- DEVICE DETECTION (HARDENED) ---------- */
function detectMobile(){
  if (FORCE_MOBILE_MODE) return true;
  try {
      // Check 1: Obsidian Platform API (Most Reliable)
      const obs = require("obsidian");
      if (obs && obs.Platform) {
          if (obs.Platform.isMobileApp) return true;
          if (obs.Platform.isMobile) return true;
          if (obs.Platform.isAndroidApp) return true;
          if (obs.Platform.isIosApp) return true;
      }
      // Check 2: CSS Context
      if (document.body.classList.contains('is-mobile')) return true;
      if (document.body.classList.contains('is-phone')) return true;
      if (document.body.classList.contains('is-tablet')) return true;
      // Check 3: App Global
      if (typeof app !== 'undefined' && app.isMobile) return true;
      // Check 4: User Agent
      if (navigator && navigator.userAgent) {
          return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      }
  } catch(e) {}
  return false;
}

const IS_MOBILE = detectMobile();
const SUFFIX = IS_MOBILE ? "_m" : "";

/* ---------- DYNAMIC FILE PATHS ---------- */
// These functions guarantee we point to the _m file on mobile
const getThoughtsFile = (d) => `${FULL_LOG_FOLDER}/${d}-Thoughts_and_Observations${SUFFIX}.md`;
const getMetaLogFile = (d) => `${FULL_LOG_FOLDER}/meta_log/${d}${SUFFIX}.md`;
const getAgendaFile = (d) => `${AGENDA_BASE_PATH}${d}-Agenda${SUFFIX}.md`;
const getConsumptionLogFile = (d) => {
  const [yy, mm] = String(d).split('-');
  return `${CONSUMPTION_BASE_PATH}${yy}_${mm}${SUFFIX}.md`;
};
// NEW: Edit Log Path
const getEdLogFile = (d) => `${FULL_LOG_FOLDER}/${d}_EdLog${SUFFIX}.md`;

// Initialize Globals
let AGENDA_FILE = getAgendaFile(currentPlannerDate);
let EMBED_VIEW_PATH = AGENDA_FILE;
let CONSUMPTION_LOG_FILE = getConsumptionLogFile(currentPlannerDate);

/* ---------- CSS ---------- */
const css = `
.chat-wrap{font:14px/1.45 var(--font-interface);background:#54B5FB !important; border:1px solid var(--background-modifier-border);
border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px}
.row{display:flex; gap:6px; flex-wrap:wrap; align-items:center}
textarea{width:100%; height:88px; resize:vertical; border-radius:10px; padding:10px;
  border:1px solid var(--background-modifier-border);background:#094782 !important; color:var(--text-normal)}
textarea.ref{width:50%; min-height:10px}
textarea.ref2{width:48%; min-height:10px;background:var(--background-primary);border-color:var(--background-primary);cursor:none}
.log{max-height:260px; overflow:auto; padding:6px; background:var(--background-secondary); border-radius:8px}
.msg{margin:6px 0}
.msg .meta{font-size:12px; color:var(--text-muted)}
.embed-box { display:none; position:relative; width:100%; height:500px; background:var(--background-primary); 
  border:1px solid var(--background-modifier-border); border-radius:8px; overflow:auto; margin-top:8px; padding:20px; }

/* Suggester */
.suggest-panel{position:absolute; z-index:9999; max-height:280px; overflow:auto;
  border:1px solid var(--background-modifier-border); background:var(--background-primary);
  border-radius:8px; padding:6px; box-shadow:0 8px 24px rgba(0,0,0,.25); min-width:320px}
.suggest-head{display:flex; gap:8px; align-items:center; padding:4px 6px 8px 6px; border-bottom:1px solid var(--background-modifier-border); justify-content: space-between;}
.suggest-bc{font-size:12px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-grow: 1;}
.suggest-nav{display:flex; gap:4px;}
.nav-btn{padding:2px 10px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--interactive-normal); cursor:pointer; font-size:14px; line-height:1;}
.nav-btn:hover{background:var(--interactive-hover);}

.suggest-list{margin-top:6px}
.suggest-item{padding:6px 8px; border-radius:6px; cursor:pointer; display:flex; gap:8px; align-items:center}
.suggest-item:hover,.suggest-item.active{background:var(--background-secondary)}
.suggest-item small{opacity:.7}
.suggest-icon{width:1.2em; text-align:center}
.suggest-item.active{outline:1px solid var(--interactive-accent)}
.suggest-input-hint{padding:8px; font-style:italic; opacity:0.8; border-top:1px solid var(--background-modifier-border)}
.suggest-section-title{margin:6px 0 2px 0; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; font-weight:600;}

/* Calendar */
.cal-box{display:none; position:fixed; z-index:10050; width:320px; max-width:92vw; background:var(--background-primary);
  border:1px solid var(--background-modifier-border); border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,.35); padding:10px}
.cal-head{display:flex; align-items:center; justify-content:space-between; gap:6px; padding:4px 2px 10px 2px}
.cal-title{font-weight:700; font-size:13px; text-align:center; flex:1}
.cal-nav{display:flex; gap:4px}
.cal-nav button{padding:2px 8px; border-radius:6px; border:1px solid var(--background-modifier-border); background:var(--interactive-normal); cursor:pointer}
.cal-nav button:hover{background:var(--interactive-hover)}
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
// Auto-identity based on detected device
const source_box = sourceRow.createEl("textarea",{cls:"ref", text: IS_MOBILE ? "edwin-mobile" : "edwin"});
const task = sourceRow.createEl("textarea",{ cls:"ref2", text:"" });
task.tabIndex = -1; source_box.tabIndex = -1;

const text_box = wrap.createEl("textarea",{placeholder:"Type "});
const actions = wrap.createEl("div",{cls:"row"});

// BUTTONS
const toDo = actions.createEl("button",{cls:"btn", text:"toDo"});
const editBtn = actions.createEl("button",{cls:"btn", text:"<"}); 
const consumeBtn = actions.createEl("button",{cls:"btn", text:"Consume"}); 
const breakBtn = actions.createEl("button",{cls:"btn", text:"Break"}); 
const sendBtn = actions.createEl("button",{cls:"btn", text:"Send ⏎"});
// Visual Indicator of Device Mode on the Date Button
const modeLabel = IS_MOBILE ? "(M)" : "";
const dateBtn = actions.createEl("button",{cls:"btn", text: `${currentPlannerDate} ${modeLabel}`});
const embedBtn = actions.createEl("button",{cls:"btn", text:"Agenda"}); 

const logBox = wrap.createEl("div",{cls:"log"});
const embedBox = wrap.createEl("div",{cls:"embed-box"});

/* ---------- CALENDAR SYSTEM ---------- */
const calendarBox = document.createElement('div'); calendarBox.className = 'cal-box'; calendarBox.style.display = 'none'; document.body.appendChild(calendarBox);
COMPONENT.register(()=>{ try{ calendarBox.remove(); }catch(e){} });
let calViewYear = Number(String(currentPlannerDate).split('-')[0] || new Date().getFullYear());
let calViewMonth = Number(String(currentPlannerDate).split('-')[1] || (new Date().getMonth()+1)) - 1; 

function fmtDate(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }

function setPlannerDate(dStr){
  currentPlannerDate = String(dStr);
  dateBtn.textContent = `${currentPlannerDate} ${modeLabel}`;
  AGENDA_FILE = getAgendaFile(currentPlannerDate);
  EMBED_VIEW_PATH = AGENDA_FILE;
  CONSUMPTION_LOG_FILE = getConsumptionLogFile(currentPlannerDate);
  if (typeof RefreshEmbed === 'function' && embedBox.style.display !== "none") RefreshEmbed();
  logUp(); // Refresh logs for the selected date
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

/* ---------- STRICT FILE CREATION LOGIC ---------- */

function getDateParts(dStr){
  try{
    const [y,m,d] = String(dStr).split('-').map(Number);
    const dt = new Date(y, (m||1)-1, d||1);
    return { day_week: dt.toLocaleDateString('en-US',{weekday:'long'}), day: d, month: dt.toLocaleDateString('en-US',{month:'long'}), year: y };
  }catch(e){ return { day_week: '', day: '', month: '', year: '' }; }
}

function buildThoughtsFileTemplate(dStr){
  const p = getDateParts(dStr);
  return `---
date: ${dStr}
day_week: ${p.day_week} 
day: ${p.day}
month: ${p.month}
year: ${p.year}
nurtured: 0
---
[[Thoughts_and_ObservationsList]]

| id  | Comment                         | Time  |
| --- | ------------------------------- | ----- |
`;
}

async function ensureLogFilesForDate(d){
  // 1. Ensure Folder Structure
  try{ await app.vault.adapter.mkdir(FULL_LOG_FOLDER); }catch(e){}
  try{ await app.vault.adapter.mkdir(`${FULL_LOG_FOLDER}/meta_log`); }catch(e){}

  // 2. Thoughts Log (Independent)
  const TF = getThoughtsFile(d);
  if(!await app.vault.adapter.exists(TF)){
    // CRITICAL FIX: Create fresh from string template, NEVER copy desktop file
    const content = buildThoughtsFileTemplate(d);
    await app.vault.create(TF, content);
  }

  // 3. Meta Log (Independent)
  const MF = getMetaLogFile(d);
  if(!await app.vault.adapter.exists(MF)){
    await app.vault.create(MF, `|id|Source|Duration (ms)|\n|---|---|---|\n`);
  }
}

async function EnsureAgendaFile(){
  // Ensure Agenda folder exists
  try{ await app.vault.adapter.mkdir(AGENDA_BASE_PATH); }catch(e){}
   
  const exists = await app.vault.adapter.exists(AGENDA_FILE);
  if(!exists){
    const p = getDateParts(currentPlannerDate);
    // CRITICAL: Fresh template with correct device context
    // Back to standard 'id' header, logic handles the number offset
    const template = `---
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
`;
    await app.vault.create(AGENDA_FILE, template);
  }
}

/* ---------- LOGGING CORE ---------- */
async function logUp(){
  const d = currentPlannerDate;
  await ensureLogFilesForDate(d);

  const TF = getThoughtsFile(d);
  const txt = await app.vault.adapter.read(TF).catch(()=>null);
  logBox.innerHTML = ""; // Clear
  if (!txt) return;

  const rows = [];
  String(txt).split('\n').forEach(line => {
    // Regex matches the table format | id | comment | time |
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

// UPDATED: ID Logic handles Mobile Offset (Starts at 101)
async function getNextTableId(filePath){
  try{
    const txt = await app.vault.adapter.read(filePath);
    let maxId = 0;
    String(txt).split('\n').forEach(line => {
      const m = line.match(/^\|\s*(\d+)\s*\|/);
      if (m) maxId = Math.max(maxId, Number(m[1]));
    });
    
    if (IS_MOBILE) {
        // If mobile, ensure we start at 101. If we are already > 100, just increment.
        return (maxId < 100) ? 101 : maxId + 1;
    }
    return maxId + 1;
  }catch(e){ 
      return IS_MOBILE ? 101 : 1; 
  }
}

// NEW: Activity Audit Log Function
async function LogActivityChange(actId, name, startVal, endVal) {
    const d = currentPlannerDate; // Use selected agenda date
    const logFile = getEdLogFile(d);
    
    // Ensure file exists with correct header
    if (!await app.vault.adapter.exists(logFile)) {
        const header = `| LogID | ActID | Date | Time | Activity | Start | End |\n|---|---|---|---|---|---|---|\n`;
        await app.vault.create(logFile, header);
    }

    const logId = await getNextTableId(logFile);
    const realDate = now_date(); 
    const realTime = now_time();

    // Sanitize inputs
    const sName = String(name).trim().replace(/\|/g, '');
    const sStart = String(startVal).replace(/<.*?>/g, '').trim(); 
    const sEnd = String(endVal).replace(/<.*?>/g, '').trim();

    const row = `| ${logId} | ${actId} | ${realDate} | ${realTime} | ${sName} | ${sStart} | ${sEnd} |\n`;
    await appendToFile(logFile, row);
}

async function send(){
  const content = text_box.value.trim();
  if(!content) return;

  const d = currentPlannerDate; // Use selected date
  const ts = now_time();
  const TF = getThoughtsFile(d);
  const MF = getMetaLogFile(d);
  const source = source_box.value.trim();

  await ensureLogFilesForDate(d);

  const note_id = await getNextTableId(TF);
  const duration = Math.floor(performance.now()-highResStart);
   
  // Safe clipboard write
  try { navigator.clipboard.writeText(content); } catch(e){}

  const cleanContent = String(content).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  await appendToFile(TF, `| ${note_id} | ${cleanContent}  | ${ts} <t-${Math.floor(highResStart)}> |\n`);
  await appendToFile(MF, `| ${note_id} | ${source} | ${duration} |\n`);

  // Reset UI
  source_box.value = IS_MOBILE ? "edwin-mobile" : "edwin";
  text_box.value = "";
  await logUp();
  highResStart = performance.now();
  text_box.focus();
}

/* ---------- STARTUP ---------- */
(async () => {
    await EnsureAgendaFile();
    await logUp();
    setInterval(CheckNotifications, 30000);
})();

/* ---------- AGENDA & CONSUMPTION LOGIC ---------- */
async function CheckNotifications() {
    try {
        const content = await app.vault.adapter.read(AGENDA_FILE);
        const lines = content.split('\n');
        const nowMins = TimeToMins(now_time());
        let alertMsg = "";
        let isCurrentlyActive = false;
        let lastEndTimeMins = -1;

        for (const line of lines) {
             if (!line.trim().startsWith("|") || line.includes("**Activity**") || line.includes("---")) continue;
             const parts = line.split("|");
             if (parts.length < 5) continue;
             const name = parts[2].trim();
             const startCol = parts[3].trim().replace(/<.*?>/g, '').trim(); 
             const endCol = parts[4].trim().replace(/<.*?>/g, '').trim();

             if (/^\d{1,2}:\d{2}/.test(startCol)) {
                 const sMins = TimeToMins(startCol);
                 if (sMins <= nowMins && (/^\d{1,2}:\d{2}/.test(endCol) ? TimeToMins(endCol.replace(/<.*?>/g, '').trim()) > nowMins : true)) {
                     isCurrentlyActive = true;
                 }
                 if (/^\d{1,2}:\d{2}/.test(endCol)) {
                     const eMins = TimeToMins(endCol.replace(/<.*?>/g, '').trim());
                     if (eMins <= nowMins && eMins > lastEndTimeMins) lastEndTimeMins = eMins;
                 }
             }
        }
        if (!isCurrentlyActive && lastEndTimeMins !== -1) {
            const gap = nowMins - lastEndTimeMins;
            if (gap >= 10) { alertMsg = `⚠️ No Activity for ${gap} min!`; task.style.color = "#ff4444"; }
        }
        if (alertMsg) task.textContent = alertMsg;
    } catch (e) {}
}

async function StartActivity(activityName, startTime, plannedEndTime = null, existingRowId = null, preciseUnix = null){
  await EnsureAgendaFile();
  const cleanTime = startTime; 
  let unixTag = "";
  const startMins = TimeToMins(cleanTime);
  const nowMins = TimeToMins(now_time());
  const todayStr = now_date();
  const viewingToday = String(currentPlannerDate) === todayStr;
  const isFuturePlan = (viewingToday && (startMins > (nowMins + 5)));

  if (!isFuturePlan && viewingToday) {
      const ts = preciseUnix || GetUnixFromString(cleanTime);
      unixTag = ` <u${ts}>`;
  }

  const content = await app.vault.adapter.read(AGENDA_FILE);
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
          finalEnd = parts[4]; // Capture existing end
      }
  } else {
      let maxId = 0;
      lines.forEach(line => { const m = line.match(/^\|\s*(\d+)\s*\|/); if(m) maxId = Math.max(maxId, Number(m[1])); });
      
      if (IS_MOBILE) {
          finalId = (maxId < 100) ? 101 : maxId + 1;
      } else {
          finalId = maxId + 1;
      }
      
      finalEnd = plannedEndTime ? ` ${plannedEndTime} ` : `<end-${finalId}>`;
      lines.push(`| ${finalId}    | ${activityName.padEnd(28)} | ${cleanTime}${unixTag} | ${finalEnd} |`);
  }
  await app.vault.adapter.write(AGENDA_FILE, lines.join('\n') + '\n');
  
  // Log change
  await LogActivityChange(finalId, activityName, cleanTime, finalEnd);
  
  if(embedBox.style.display !== "none") RefreshEmbed();
}

async function EndActivity(activityName, endTime, preciseUnix = null){
  const content = await app.vault.adapter.read(AGENDA_FILE);
  const lines = content.split('\n');
  const nowMins = TimeToMins(now_time());
  
  let foundIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.includes(activityName)) {
        const parts = line.split("|");
        if(parts.length >= 5) {
            const endCol = parts[4].trim();
            const startCol = parts[3].trim();
            if (startCol.startsWith("<start")) continue;
            let isFinishable = false;
            if (endCol.startsWith("<end") || endCol === "") isFinishable = true;
            else if (/^\d{1,2}:\d{2}/.test(endCol)) {
                if (TimeToMins(endCol.replace(/<.*?>/g, '').trim()) > nowMins) isFinishable = true;
            }
            if (isFinishable) { foundIndex = i; break; }
        }
    }
  }

  if(foundIndex !== -1){
      const line = lines[foundIndex];
      const parts = line.split("|");
      
      const actId = parts[1].trim(); 
      const actStart = parts[3].trim(); 

      const startColRaw = (parts[3] || "").trim();
      const uStartMatch = startColRaw.match(/<u(\d+)>/);
      const startUnix = uStartMatch ? uStartMatch[1] : null;

      const oldEnd = parts[4].trim();
      let newEndCell = endTime;
      const ts = preciseUnix || GetUnixFromString(endTime);
      const unixTag = ` <u${ts}>`;

      if (/^\d{1,2}:\d{2}/.test(oldEnd) && !oldEnd.startsWith("<")) {
           const pureTime = oldEnd.replace(/<.*?>/g, '').trim();
           if(pureTime !== endTime) {
               const targetTag = pureTime.replace(':', '-');
               newEndCell = `${endTime} <t${targetTag}>`;
           }
      }
      newEndCell += unixTag;
      parts[4] = ` ${newEndCell} `; 
      lines[foundIndex] = parts.join("|");
      
      await app.vault.adapter.write(AGENDA_FILE, lines.join('\n') + '\n');
      
      // Log change
      await LogActivityChange(actId, activityName, actStart, newEndCell);

      if(embedBox.style.display !== "none") RefreshEmbed();
      return startUnix;
  }
  return null;
}

async function EditActivity(rowId, field, newVal, preciseUnix = null) {
  const content = await app.vault.adapter.read(AGENDA_FILE);
  const lines = content.split('\n');
  const rowIndex = lines.findIndex(l => l.match(new RegExp(`^\\|\\s*${rowId}\\s*\\|`)));
  if (rowIndex === -1) return;
  const parts = lines[rowIndex].split("|");

  // Capture current state before write
  let currentName = parts[2].trim();
  let currentStart = parts[3].trim();
  let currentEnd = parts[4].trim();

  if (field === 'name') {
      parts[2] = ` ${newVal.padEnd(28)} `;
      currentName = newVal;
  } else {
      const colIndex = (field === 'start') ? 3 : 4;
      const oldVal = parts[colIndex].trim();
      let newTimeStr = newVal;
      const tMatch = oldVal.match(/<t(\d{1,2}-\d{2})>/);
      if (tMatch) newTimeStr = `${newVal} <t${tMatch[1]}>`;
      const ts = preciseUnix || GetUnixFromString(newVal);
      newTimeStr += ` <u${ts}>`;
      parts[colIndex] = ` ${newTimeStr.padEnd(10)} `;

      if(field === 'start') currentStart = newTimeStr;
      else currentEnd = newTimeStr;
  }
  lines[rowIndex] = parts.join("|");
  await app.vault.adapter.write(AGENDA_FILE, lines.join('\n'));

  // Log change
  await LogActivityChange(rowId, currentName, currentStart, currentEnd);

  if(embedBox.style.display !== "none") RefreshEmbed();
}

async function RecordConsumption(item, amount) {
    const d = now_today(), ts = now_time();
    let fileContent = await app.vault.adapter.read(CONSUMPTION_LOG_FILE).catch(()=>"");
    
    // Auto-create monthly consumption file if missing (Independent)
    if (!fileContent) {
        fileContent = `| id | Date | Item | Time | Amount |\n|---|---|---|---|---|\n`;
        await app.vault.create(CONSUMPTION_LOG_FILE, fileContent);
    }

    const lines = fileContent.split('\n');
    let maxId = 0;
    lines.forEach(l => {
        const m = l.match(/^\|\s*(\d+)\s*\|/);
        if (m) maxId = Math.max(maxId, Number(m[1]));
    });
    
    // UPDATED: Mobile ID Offset for Consumption
    let newId;
    if (IS_MOBILE) {
        newId = (maxId < 100) ? 101 : maxId + 1;
    } else {
        newId = maxId + 1;
    }

    const row = `| ${newId} | ${d} | ${item} | ${ts} | ${amount} |\n`;
    await appendToFile(CONSUMPTION_LOG_FILE, row);
    task.textContent = `Recorded: ${amount}x ${item} @ ${ts}`;
}

async function HandleBreak() {
    const active = await GetActiveActivities();
    const isOnBreak = active.includes("Break");
    const now = now_time();
    const ts = Date.now();
    if (isOnBreak) {
        const breakStartUnix = await EndActivity("Break", now, ts);
        const didPrompt = await MaybePromptResumeFromUnix(breakStartUnix, ["Break"]);
        if (!didPrompt) task.textContent = "Break ended. Ready for next task.";
    } else {
        if (active.length > 0) for (const act of active) await EndActivity(act, now, ts);
        await StartActivity("Break", now, null, null, ts);
        task.textContent = "Started Break. Enjoy!";
    }
}

async function GetActiveActivities(){
  try {
      const content = await app.vault.adapter.read(AGENDA_FILE);
      const active = [];
      const nowMins = TimeToMins(now_time());
      content.split('\n').forEach(line => {
          if(line.trim().startsWith("|") && !line.includes("**Activity**") && !line.includes("---")){
              const parts = line.split("|");
              if(parts.length >= 5){
                  const name = parts[2].trim();
                  const startCol = parts[3].trim();
                  const endCol = parts[4].trim();
                  if (startCol.startsWith("<start") || ( /^\d{1,2}:\d{2}/.test(startCol) && TimeToMins(startCol.replace(/<.*?>/g, '').trim()) > nowMins)) return;
                  if(endCol.startsWith("<end") || endCol === "" || ( /^\d{1,2}:\d{2}/.test(endCol) && TimeToMins(endCol.replace(/<.*?>/g, '').trim()) > nowMins)) active.push(name);
              }
          }
      });
      return [...new Set(active)]; 
  } catch(e) { return []; }
}

async function GetPlannedActivities() {
    try {
        const content = await app.vault.adapter.read(AGENDA_FILE);
        const planned = [];
        const nowMins = TimeToMins(now_time());
        content.split('\n').forEach((line) => {
            if (line.trim().startsWith("|") && !line.includes("**Activity**")) {
                const parts = line.split("|");
                if (parts.length >= 5) {
                    const id = parts[1].trim();
                    const name = parts[2].trim();
                    const startVal = parts[3].trim();
                    let isPlanned = false;
                    let planTimeDisplay = "Pending";
                    if (startVal.startsWith("<start")) isPlanned = true;
                    else if (/^\d{1,2}:\d{2}/.test(startVal)) {
                        const cleanStart = startVal.replace(/<.*?>/g, '').trim();
                        if (TimeToMins(cleanStart) > nowMins) { isPlanned = true; planTimeDisplay = cleanStart; }
                    }
                    if (isPlanned) planned.push({ id, name, planTime: planTimeDisplay });
                }
            }
        });
        return planned;
    } catch (e) { return []; }
}

async function GetAllActivities() {
    try {
        const content = await app.vault.adapter.read(AGENDA_FILE);
        const all = [];
        content.split('\n').forEach(line => {
            if (line.trim().startsWith("|") && !line.includes("**Activity**")) {
                const parts = line.split("|");
                if (parts.length >= 5) {
                    const id = parts[1].trim();
                    const name = parts[2].trim();
                    const s = parts[3].replace(/<.*?>/g, '').trim() || "---";
                    const e = parts[4].replace(/<.*?>/g, '').trim() || "---";
                    all.push({ id, name, start: s, end: e, display: `${name} (${s} - ${e})` });
                }
            }
        });
        return all.reverse(); 
    } catch (e) { return []; }
}

async function GetInterruptedActivitiesByUnix(interruptUnix, excludeNames = []) {
    try {
        if (!interruptUnix) return [];
        const content = await app.vault.adapter.read(AGENDA_FILE);
        const targetTag = `<u${interruptUnix}>`;
        const candidates = [];
        content.split('\n').forEach(line => {
            if (!line.trim().startsWith("|") || line.includes("**Activity**")) return;
            const parts = line.split("|");
            if (parts.length < 5) return;
            const name = parts[2].trim();
            if (excludeNames.includes(name)) return;
            const endCol = (parts[4] || "").trim();
            if (!endCol.includes(targetTag)) return;
            let originalPlan = null;
            const tMatch = endCol.match(/<t(\d{1,2}-\d{2})>/);
            if (tMatch) originalPlan = tMatch[1].replace('-', ':');
            candidates.push({ name, endTime: originalPlan });
        });
        return candidates;
    } catch (e) { return []; }
}

async function MaybePromptResumeFromUnix(interruptUnix, excludeNames = []) {
    const candidates = await GetInterruptedActivitiesByUnix(interruptUnix, excludeNames);
    if (candidates.length === 0) return false;
    const activeNow = await GetActiveActivities();
    pendingResumableActivities = candidates.filter(c => !activeNow.includes(c.name));
    if (pendingResumableActivities.length === 0) return false;
    suggestMode = 'agenda-resume'; panel.style.display = 'block'; panelOpen = true; reposition(); rerender();
    setTimeout(() => text_box.focus(), 0);
    return true;
}

const renderMd = async (md, container, sourcePath, component) => { await MarkdownRenderer.render(app, md, container, sourcePath, component); };
async function RefreshEmbed(){
    embedBox.innerHTML = "";
    const file = app.vault.getAbstractFileByPath(AGENDA_FILE);
    if(file) await renderMd(await app.vault.read(file), embedBox, AGENDA_FILE, COMPONENT);
}
embedBtn.onclick = async () => {
    if (embedBox.style.display === "none") { await EnsureAgendaFile(); await RefreshEmbed(); embedBox.style.display = "block"; embedBtn.textContent = "Hide Agenda"; }
    else { embedBox.style.display = "none"; embedBtn.textContent = "Agenda"; }
};

// Helper: Get Activities from file
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
             const fullInner = m[1];
             const parts = fullInner.split('|');
             return {label: parts[1] || fullInner, value: `[[${fullInner}]]`};
        });
    } catch(e) { return []; }
}

/* ==================================================================================
   SUGGESTER ENGINE
   ================================================================================== */
let panelOpen=false, activeIndex=-1, suggestMode='root';
let pendingActivity=null, pendingAction=null, pendingStartTime=null, pendingExistingId=null, pendingEditField=null, lastEditedTime=null; 
let pendingResumableActivities = []; let pendingStartRequest = null;  
let pendingCurrentStart = null, pendingCurrentEnd = null, pendingConsumptionItem = null, pendingPreciseTimestamp = null;
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

function pushHistory() {
    historyStack.push({ mode: suggestMode, pAction: pendingAction, pActivity: pendingActivity, pId: pendingExistingId, pStart: pendingStartTime, pEdit: pendingEditField, pPrecise: pendingPreciseTimestamp, lastEdit: lastEditedTime, pCurStart: pendingCurrentStart, pCurEnd: pendingCurrentEnd, pConsume: pendingConsumptionItem });
}
function restoreHistory() {
    if (historyStack.length === 0) { closePanel(); return; }
    const state = historyStack.pop();
    suggestMode = state.mode; pendingAction = state.pAction; pendingActivity = state.pActivity; pendingExistingId = state.pId; pendingStartTime = state.pStart; pendingEditField = state.pEdit; pendingPreciseTimestamp = state.pPrecise; lastEditedTime = state.lastEdit; pendingCurrentStart = state.pCurStart; pendingCurrentEnd = state.pCurEnd; pendingConsumptionItem = state.pConsume; rerender();
}
function triggerForward() {
    const items = listEl.querySelectorAll('.suggest-item');
    if (activeIndex >= 0 && activeIndex < items.length) {
        const selected = items[activeIndex];
        const data = { code: selected.dataset.code, value: selected.dataset.value, time: selected.dataset.time, custom: selected.dataset.custom === 'true', method: selected.dataset.method, id: selected.dataset.id, precise: selected.dataset.precise === 'true', field: selected.dataset.field, choice: selected.dataset.choice, start: selected.dataset.start, end: selected.dataset.end };
        selectItem(data);
    }
}
backBtn.addEventListener('mousedown', (e) => { e.preventDefault(); restoreHistory(); });
fwdBtn.addEventListener('mousedown', (e) => { e.preventDefault(); triggerForward(); });

async function rerender(){
    listEl.innerHTML = '';
    let query = text_box.value.trim().toLowerCase();
    
    if (suggestMode === 'agenda-keysentences') {
        const anchor = findDotCommaAnchor();
        query = anchor !== null ? text_box.value.substring(anchor + 2, text_box.selectionStart).toLowerCase() : "";
    }
    
    if (suggestMode === 'agenda-root') {
        setAgendaTitle('Agenda Actions');
        [{l:'Start Activity',i:'▶️',c:'start'}, {l:'End Activity',i:'⏹️',c:'end'}, {l:'Edit Activity',i:'✏️',c:'edit'}].forEach(it=>{
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
            (await GetActiveActivities()).forEach(a => items.push({name:a, id:null, label:a, extra:'', icon:'⏹️'}));
        } else if (pendingAction === 'edit') {
             setAgendaTitle('Edit which activity?');
            (await GetAllActivities()).forEach(a => items.push({name:a.name, id:a.id, label:a.name, extra:`${a.start}-${a.end}`, icon:'✏️', start: a.start, end: a.end}));
        }
        const matches = items.filter(i => i.label.toLowerCase().includes(query));
        if(matches.length === 0) listEl.innerHTML = '<div class="suggest-item">No matches</div>';
        matches.forEach(m => {
            const d = document.createElement('div'); d.className = 'suggest-item';
            d.innerHTML = `<span class="suggest-icon">${m.icon}</span><span>${m.label}</span> <small style="float:right">${m.extra}</small>`;
            d.dataset.value = m.name; if (m.id) d.dataset.id = String(m.id); if (m.start) d.dataset.start = m.start; if (m.end) d.dataset.end = m.end;
            d.addEventListener('mousedown', ()=>selectItem({value:m.name, id:m.id, start:m.start, end:m.end})); listEl.appendChild(d);
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
        const count = pendingResumableActivities.length;
        setAgendaTitle(`Resume ${count} tasks?`);
        const d1 = document.createElement('div'); d1.className = 'suggest-item'; d1.innerHTML = `<span class="suggest-icon">▶️</span><span>Yes, Resume All</span>`; d1.dataset.choice = 'resume_yes'; d1.addEventListener('mousedown', ()=>selectItem({choice:'resume_yes'})); listEl.appendChild(d1);
        const d2 = document.createElement('div'); d2.className = 'suggest-item'; d2.innerHTML = `<span class="suggest-icon">🛑</span><span>No, just stop</span>`; d2.dataset.choice = 'resume_no'; d2.addEventListener('mousedown', ()=>selectItem({choice:'resume_no'})); listEl.appendChild(d2);
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
         if(val){
              pendingActivity = val; pendingExistingId = id;
              if (pendingAction === 'edit') { pendingCurrentStart = data.start; pendingCurrentEnd = data.end; suggestMode = 'agenda-edit-field'; } 
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
        if (newVal) { EditActivity(pendingExistingId, 'name', newVal); CloseAndClear(); }
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
            if (data.choice === 'overlap_yes') for (const act of payload.active) await EndActivity(act, payload.startTime, payload.preciseUnix);
            await StartActivity(payload.activityName, payload.startTime, payload.plannedEndTime, payload.existingRowId, payload.preciseUnix);
            CloseAndClear();
        })();
    }
    else if (suggestMode === 'agenda-resume') {
        if (data.choice === 'resume_yes') (async () => { const nowStr = now_time(); const ts = Date.now(); for (const act of pendingResumableActivities) await StartActivity(act.name, nowStr, act.endTime, null, ts); })();
        CloseAndClear();
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
        const startUnix = await EndActivity(pendingActivity, timeStr, preciseTs);
        const exclude = (pendingActivity === "Break") ? ["Break"] : ["Break", pendingActivity];
        if (!(await MaybePromptResumeFromUnix(startUnix, exclude))) CloseAndClear();
        return;
    }
    if (pendingAction === 'edit') {
        await EditActivity(pendingExistingId, pendingEditField, timeStr, preciseTs); lastEditedTime = timeStr; suggestMode = 'agenda-edit-chain'; text_box.value = ''; await rerender(); return;
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
        EditActivity(pendingExistingId, pendingEditField, MinsToTime(newMins), null); CloseAndClear();
    }
}

async function RequestStartWithOverlapCheck(activityName, startTime, plannedEndTime, existingRowId, preciseUnix) {
    if (preciseUnix && String(currentPlannerDate) === now_date()) {
        const active = await GetActiveActivities();
        const activeFiltered = active.filter(a => a !== activityName);
        if (activeFiltered.length > 0) {
            pendingStartRequest = { activityName, startTime, plannedEndTime, existingRowId, preciseUnix, active: activeFiltered };
            suggestMode = 'agenda-start-overlap'; panel.style.display = 'block'; panelOpen = true; reposition(); await rerender(); setTimeout(() => text_box.focus(), 0); return;
        }
    }
    await StartActivity(activityName, startTime, plannedEndTime, existingRowId, preciseUnix); CloseAndClear();
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
    if (suggestMode === 'agenda-rename-input' && e.key === 'Enter') { e.preventDefault(); const raw = text_box.value.trim(); if (raw) { EditActivity(pendingExistingId, 'name', raw); CloseAndClear(); } return; }
    
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
             const data = { code: selected.dataset.code, value: selected.dataset.value, time: selected.dataset.time, custom: selected.dataset.custom === 'true', method: selected.dataset.method, id: selected.dataset.id, precise: selected.dataset.precise === 'true', field: selected.dataset.field, choice: selected.dataset.choice, start: selected.dataset.start, end: selected.dataset.end };
             selectItem(data);
        }
    }
});

this.registeredCleanup = this.registeredCleanup || [];
this.registeredCleanup.push(()=>{ try{ document.body.removeChild(panel); }catch(e){} });
const intervalId = setInterval(CheckNotifications, 30000); 
this.registeredCleanup.push(() => clearInterval(intervalId));

sendBtn.addEventListener("click", send);
toDo.addEventListener("click", ()=>{ source_box.value = (source_box.value==='toDo') ? 'edwin' : 'toDo'; });
editBtn.addEventListener("click", ()=>{ suggestMode = 'agenda-root'; panel.style.display = 'block'; panelOpen = true; reposition(); rerender(); text_box.focus(); });
consumeBtn.addEventListener("click", ()=>{ suggestMode = 'agenda-consumption-select'; panel.style.display = 'block'; panelOpen = true; reposition(); rerender(); text_box.focus(); });
breakBtn.addEventListener("click", HandleBreak);
(async ()=>{ await logUp(); })();
```
