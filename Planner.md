```dataviewjs
/********************************************************************
* Planner_2_17 — Edit Activity (Past/Plan) + Smart Overwrite
********************************************************************/
const { MarkdownRenderer } = require("obsidian");

/* ---------- CONFIGURATION ---------- */
const pad = n=>String(n).padStart(2,"0");
const now_date = ()=>{ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const AGENDA_FILE = `0-Vault/${now_date()}-Agenda.md`; 
const EMBED_VIEW_PATH = AGENDA_FILE; 

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
.suggest-head{display:flex; gap:8px; align-items:center; padding:4px 6px 8px 6px; border-bottom:1px solid var(--background-modifier-border)}
.suggest-bc{font-size:12px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.suggest-list{margin-top:6px}
.suggest-item{padding:6px 8px; border-radius:6px; cursor:pointer; display:flex; gap:8px; align-items:center}
.suggest-item:hover,.suggest-item.active{background:var(--background-secondary)}
.suggest-item small{opacity:.7}
.suggest-icon{width:1.2em; text-align:center}
.suggest-item.active{outline:1px solid var(--interactive-accent)}
.suggest-input-hint{padding:8px; font-style:italic; opacity:0.8; border-top:1px solid var(--background-modifier-border)}
.suggest-section-title{margin:6px 0 2px 0; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; font-weight:600;}
`;

/* ---------- UTILS ---------- */
const MAIN_FOLDER = '0-Vault/';
const PROJECT_NAME = '11-November';
const LOG_FOLDER = MAIN_FOLDER + PROJECT_NAME;
const CONSUMPTION_FILE = '0-Vault/2025_11.md';

const appendToFile = async (path, text)=>{ await app.vault.adapter.append(path, text); };
const now_today = ()=>{ const d=new Date(); return `${pad(d.getDate())}`; };
const now_time = ()=>{ const d=new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

const TimeToMins = (t) => { const p=t.split(':').map(Number); return p[0]*60 + p[1]; };
const MinsToTime = (m) => { let h=Math.floor(m/60), min=m%60; if(h>23)h-=24; return `${pad(h)}:${pad(min)}`; };

const GetUnixFromString = (t) => { 
    const d = new Date(); 
    const [h,m] = t.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d.getTime(); 
};

/* ---------- UI SETUP ---------- */
const style = document.createElement("style"); style.textContent = css; this.container.appendChild(style);
const wrap = this.container.createEl("div",{cls:"chat-wrap"});
const COMPONENT = this.component; 

const sourceRow = wrap.createEl("div",{cls:"row"});
const source_box = sourceRow.createEl("textarea",{cls:"ref", text:"edwin"});
const task = sourceRow.createEl("textarea",{ cls:"ref2", text:"" });
task.tabIndex = -1; source_box.tabIndex = -1;

const text_box = wrap.createEl("textarea",{placeholder:"Type "});
const actions = wrap.createEl("div",{cls:"row"});
const toDo = actions.createEl("button",{cls:"btn", text:"toDo"});
const sendBtn = actions.createEl("button",{cls:"btn", text:"Send ⏎"});
const embedBtn = actions.createEl("button",{cls:"btn", text:"Agenda"}); 
const logBox = wrap.createEl("div",{cls:"log"});
const embedBox = wrap.createEl("div",{cls:"embed-box"}); 

/* ---------- AGENDA LOGIC ---------- */

const YAML_HEADER = `---
date: ${now_date()}
day: ${new Date().toLocaleDateString('en-US', {weekday: 'long'})} 
nurtured: 0
---

[[Agenda]]

| id  | **Activity** | **Start** | **End** |
| --- | ---------------------------- | ---------- | -------- |
`;

async function EnsureAgendaFile(){
  const exists = await app.vault.adapter.exists(AGENDA_FILE);
  if(!exists){ await app.vault.create(AGENDA_FILE, YAML_HEADER); }
}

async function GetNextId(){
  const content = await app.vault.adapter.read(AGENDA_FILE);
  const lines = content.split("\n");
  let maxId = 0;
  for (const line of lines){
    const m = line.match(/^\|\s*(\d+)\s*\|/);
    if (m) maxId = Math.max(maxId, Number(m[1]));
  }
  return maxId + 1;
}

// --- NOTIFICATION ENGINE ---
async function CheckNotifications() {
    try {
        const content = await app.vault.adapter.read(AGENDA_FILE);
        const lines = content.split('\n');
        const nowMins = TimeToMins(now_time());
        let alertMsg = "";
        let minDiff = 999;

        for (const line of lines) {
             if (!line.trim().startsWith("|") || line.includes("**Activity**") || line.includes("---")) continue;
             const parts = line.split("|");
             if (parts.length < 5) continue;

             const name = parts[2].trim();
             const startCol = parts[3].trim().replace(/<.*?>/g, '').trim(); 
             const endCol = parts[4].trim().replace(/<.*?>/g, '').trim();

             // 1. Check Upcoming Starts
             if (/^\d{1,2}:\d{2}/.test(startCol)) {
                 const sMins = TimeToMins(startCol);
                 const diff = sMins - nowMins;
                 if (diff > 0 && diff <= 10) {
                     if (diff < minDiff) {
                         minDiff = diff;
                         alertMsg = `⚠️ "${name}" starts in ${diff} min`;
                     }
                 }
             }

             // 2. Check Upcoming Ends
             if (/^\d{1,2}:\d{2}/.test(startCol) && /^\d{1,2}:\d{2}/.test(endCol)) {
                 const sMins = TimeToMins(startCol);
                 const eMins = TimeToMins(endCol);
                 if (sMins <= nowMins && eMins > nowMins) {
                     const diff = eMins - nowMins;
                     if (diff <= 10) {
                         if (diff < minDiff) {
                             minDiff = diff;
                             alertMsg = `⚠️ "${name}" ends in ${diff} min`;
                         }
                     }
                 }
             }
        }

        if (alertMsg) {
            task.textContent = alertMsg;
            task.style.color = "var(--text-accent)";
        } else {
             if (task.textContent.startsWith("⚠️")) {
                 task.textContent = ""; 
                 task.style.color = "var(--text-normal)";
             }
        }
    } catch (e) {}
}

// --- CORE AGENDA FUNCTIONS ---

async function GetPlannedActivities() {
    try {
        const content = await app.vault.adapter.read(AGENDA_FILE);
        const lines = content.split('\n');
        const planned = [];
        const nowMins = TimeToMins(now_time());

        lines.forEach((line, index) => {
            if (line.trim().startsWith("|") && !line.includes("**Activity**") && !line.includes("---")) {
                const parts = line.split("|");
                if (parts.length >= 5) {
                    const id = parts[1].trim();
                    const name = parts[2].trim();
                    const startVal = parts[3].trim();
                    
                    let isPlanned = false;
                    let planTimeDisplay = "Pending";

                    if (startVal.startsWith("<start")) {
                        isPlanned = true;
                    } else if (/^\d{1,2}:\d{2}/.test(startVal)) {
                        const cleanStart = startVal.replace(/<.*?>/g, '').trim();
                        if (TimeToMins(cleanStart) > nowMins) {
                            isPlanned = true;
                            planTimeDisplay = cleanStart;
                        }
                    }

                    if (isPlanned) {
                        planned.push({
                            id: id,
                            name: name,
                            planTime: planTimeDisplay,
                            lineIndex: index
                        });
                    }
                }
            }
        });
        return planned;
    } catch (e) { return []; }
}

async function GetAllActivities() {
    try {
        const content = await app.vault.adapter.read(AGENDA_FILE);
        const lines = content.split('\n');
        const all = [];

        lines.forEach((line, index) => {
            if (line.trim().startsWith("|") && !line.includes("**Activity**") && !line.includes("---")) {
                const parts = line.split("|");
                if (parts.length >= 5) {
                    const id = parts[1].trim();
                    const name = parts[2].trim();
                    // Clean for display
                    const s = parts[3].replace(/<.*?>/g, '').trim() || "---";
                    const e = parts[4].replace(/<.*?>/g, '').trim() || "---";
                    all.push({ id, name, display: `${name} (${s} - ${e})` });
                }
            }
        });
        return all.reverse(); // Show newest first
    } catch (e) { return []; }
}

async function StartActivity(activityName, startTime, plannedEndTime = null, existingRowId = null, preciseUnix = null){
  await EnsureAgendaFile();
  const cleanTime = startTime; 
  const startMins = TimeToMins(cleanTime);
  const nowMins = TimeToMins(now_time());
  const isFuturePlan = startMins > (nowMins + 5); 

  let unixTag = "";
  if (!isFuturePlan) {
      const ts = preciseUnix || GetUnixFromString(cleanTime);
      unixTag = ` <u${ts}>`;
  }

  if (existingRowId) {
      const content = await app.vault.adapter.read(AGENDA_FILE);
      const lines = content.split('\n');
      const rowIndex = lines.findIndex(l => l.match(new RegExp(`^\\|\\s*${existingRowId}\\s*\\|`)));
      
      if (rowIndex !== -1) {
          const parts = lines[rowIndex].split("|");
          const oldStart = parts[3].trim();
          let newStartCell = cleanTime;
          
          if (/^\d{1,2}:\d{2}/.test(oldStart) && !oldStart.startsWith("<")) {
               const pureTime = oldStart.replace(/<.*?>/g, '').trim();
               if(pureTime !== cleanTime) {
                   const targetTag = pureTime.replace(':', '-');
                   newStartCell = `${cleanTime} <t${targetTag}>`;
               }
          }
          newStartCell += unixTag;
          parts[3] = ` ${newStartCell.padEnd(10)} `; 
          lines[rowIndex] = parts.join("|");
          await app.vault.adapter.write(AGENDA_FILE, lines.join('\n'));
          task.textContent = `Started Planned: ${activityName} @ ${cleanTime}`;
          task.style.color = "var(--text-normal)";
      }
  } else {
      const id = await GetNextId();
      const endVal = plannedEndTime ? ` ${plannedEndTime} ` : `<end-${id}>`;
      const startCell = `${cleanTime}${unixTag}`;
      const row = `| ${id}   | ${activityName.padEnd(28)} | ${startCell.padEnd(10)} | ${endVal} |`;
      await appendToFile(AGENDA_FILE, row + "\n");
      
      if(plannedEndTime){
          task.textContent = `Planned: ${activityName} (${cleanTime} - ${plannedEndTime})`;
      } else {
          task.textContent = `Started: ${activityName} @ ${cleanTime}`;
      }
      task.style.color = "var(--text-normal)";
  }
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
            if (endCol.startsWith("<end") || endCol === "") {
                isFinishable = true; 
            } else if (/^\d{1,2}:\d{2}/.test(endCol)) {
                const cleanEnd = endCol.replace(/<.*?>/g, '').trim();
                if (TimeToMins(cleanEnd) > nowMins) isFinishable = true; 
            }
            if (isFinishable) { foundIndex = i; break; }
        }
    }
  }

  if(foundIndex !== -1){
      const line = lines[foundIndex];
      const parts = line.split("|");
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
      await app.vault.adapter.write(AGENDA_FILE, lines.join('\n'));
      task.textContent = `Ended: ${activityName} @ ${endTime}`;
      task.style.color = "var(--text-normal)";
      if(embedBox.style.display !== "none") RefreshEmbed();
  } else {
      task.textContent = `Could not find active task to end: ${activityName}`;
  }
}

// 4. NEW: Edit Activity (Updates file directly)
async function EditActivity(rowId, field, newTime, preciseUnix = null) {
  const content = await app.vault.adapter.read(AGENDA_FILE);
  const lines = content.split('\n');
  
  const rowIndex = lines.findIndex(l => l.match(new RegExp(`^\\|\\s*${rowId}\\s*\\|`)));
  if (rowIndex === -1) return;

  const parts = lines[rowIndex].split("|");
  const colIndex = (field === 'start') ? 3 : 4;
  const oldVal = parts[colIndex].trim();
  
  let newVal = newTime;
  
  // Logic: Preserve/Create Target
  // 1. If old value has <tHH-MM>, keep it.
  // 2. If old value has no tag but is a time, convert it to target.
  const tMatch = oldVal.match(/<t(\d{1,2}-\d{2})>/);
  if (tMatch) {
      newVal = `${newTime} <t${tMatch[1]}>`;
  } else if (/^\d{1,2}:\d{2}/.test(oldVal) && !oldVal.startsWith("<")) {
      const pureTime = oldVal.replace(/<.*?>/g, '').trim();
      // Only create target if new time is different
      if (pureTime !== newTime) {
           const targetTag = pureTime.replace(':', '-');
           newVal = `${newTime} <t${targetTag}>`;
      }
  }
  
  // Unix Tag
  const ts = preciseUnix || GetUnixFromString(newTime);
  newVal += ` <u${ts}>`;

  parts[colIndex] = ` ${newVal.padEnd(10)} `;
  lines[rowIndex] = parts.join("|");
  
  await app.vault.adapter.write(AGENDA_FILE, lines.join('\n'));
  const actName = parts[2].trim();
  task.textContent = `Edited ${field} of "${actName}" to ${newTime}`;
  if(embedBox.style.display !== "none") RefreshEmbed();
}


async function GetActiveActivities(){
  try {
      const content = await app.vault.adapter.read(AGENDA_FILE);
      const lines = content.split('\n');
      const active = [];
      const nowMins = TimeToMins(now_time());
      lines.forEach(line => {
          if(line.trim().startsWith("|") && !line.includes("**Activity**") && !line.includes("---")){
              const parts = line.split("|");
              if(parts.length >= 5){
                  const name = parts[2].trim();
                  const startCol = parts[3].trim();
                  const endCol = parts[4].trim();
                  if (startCol.startsWith("<start")) return;
                  if (/^\d{1,2}:\d{2}/.test(startCol)) {
                      const cleanStart = startCol.replace(/<.*?>/g, '').trim();
                      if (TimeToMins(cleanStart) > nowMins) return; 
                  }
                  let isActive = false;
                  if(endCol.startsWith("<end") || endCol === "") {
                      isActive = true;
                  } else if (/^\d{1,2}:\d{2}/.test(endCol)) {
                      const cleanEnd = endCol.replace(/<.*?>/g, '').trim();
                      if (TimeToMins(cleanEnd) > nowMins) isActive = true;
                  }
                  if(isActive) active.push(name);
              }
          }
      });
      return [...new Set(active)]; 
  } catch(e) { return []; }
}

/* ---------- EMBED VIEWER ---------- */
const renderMd = async (md, container, sourcePath, component) => {
    await MarkdownRenderer.render(app, md, container, sourcePath, component);
};
async function RefreshEmbed(){
    embedBox.innerHTML = "";
    const file = app.vault.getAbstractFileByPath(AGENDA_FILE);
    if(file){
        const content = await app.vault.read(file);
        await renderMd(content, embedBox, AGENDA_FILE, COMPONENT);
    }
}
embedBtn.onclick = async () => {
    if (embedBox.style.display === "none") {
        await EnsureAgendaFile();
        await RefreshEmbed();
        embedBox.style.display = "block"; embedBtn.textContent = "Hide Agenda";
    } else {
        embedBox.style.display = "none"; embedBtn.textContent = "Agenda";
    }
};

/* ---------- LOGGING CORE ---------- */
const date = now_date();
const TARGET_FILE = `${LOG_FOLDER}/${date}-Thoughts_and_Observations.md`;
let highResStart = performance.now();

const renderMsg = (ts,log_note, log_note_id)=>{
  const msg = logBox.createEl("div",{cls:"msg"});
  msg.createEl("div",{cls:"meta", text:`- ${log_note} (${ts}-${log_note_id})`});
  logBox.scrollBottom = logBox.scrollHeight;
};
async function logUp(){
  const txt = await app.vault.adapter.read(TARGET_FILE).catch(()=>null);
  if (!txt) return;
  txt.split("\n").slice(-50).reverse().forEach(l=>{
    const m = l.split("|"); if(m && m[1]>0){ renderMsg(m[1], m[2], m[3]); }
  });
}
async function create_logFile(){
  const TF = `${LOG_FOLDER}/${now_date()}-Thoughts_and_Observations.md`;
  const exists = await app.vault.adapter.exists(TF);
  if(!exists){
    await app.vault.create(TF,"|id|Comment|Time|\n|---|---|---|");
    const MF = `${LOG_FOLDER}/meta_log/${now_date()}.md`;
    await app.vault.create(MF,"|id|Source|Task|Duration (ms)|\n|---|---|---|---|");
  }
}
async function send(){
  const content = text_box.value.trim();
  if(!content) return;
  await create_logFile();
  const d = now_date(), ts = now_time();
  const TF = `${LOG_FOLDER}/${d}-Thoughts_and_Observations.md`;
  const MF = `${LOG_FOLDER}/meta_log/${d}.md`;
  const source=source_box.value.trim();
  const Log = await app.vault.adapter.read(TF);
  const note_id=(Log.split(/\n/)).length-9;
  const duration = Math.floor(performance.now()-highResStart);
  navigator.clipboard.writeText(content);
  await appendToFile(TF, `|${note_id}|${content}|${ts}|\n`);
  await appendToFile(MF, `|${note_id}|${source}|${duration}|\n`);
  source_box.value = "edwin"; text_box.value = ""; logBox.textContent = '';
  await logUp(); highResStart = performance.now(); text_box.focus();
}

/* ---------- CONSUMPTION SHIM ---------- */
let result_int = 1;
async function Amount(result_string){
  if (["Tyrosine","Tryptophan"].includes(result_string)) {
    const modalForm_amount = app.plugins.plugins["modalforms"]?.api;
    const res = await modalForm_amount.openForm("One");
    result_int = res.asString('{{how_much}}');
  }
}
async function Consumption() {
  const modalForm = app.plugins.plugins["modalforms"]?.api;
  var result = await modalForm.openForm("Consumption");
  var result_string=result.asString('{{what}}');
  if (result_string=="{{what}}") {result_string='W';}
  const d = now_today(), ts = now_time();
  const Log = await app.vault.adapter.read(CONSUMPTION_FILE);
  await Amount(result_string);
  const note_id=(Log.split(/\n/)).length-1;
  const save = `| ${note_id} | ${d}|${result_string} |${ts} |${result_int}  |\n`;
  await appendToFile(CONSUMPTION_FILE,save);
  task.textContent= ` got some ${result_string} the ${d} at ${ts}`;
  result_int = 1;
}

/* ==================================================================================
   KEYBOARD NAVIGABLE SUGGESTER
   ================================================================================== */
let panelOpen=false, activeIndex=-1, suggestMode='files';
let pendingActivity=null, pendingAction=null, pendingStartTime=null, pendingExistingId=null, pendingEditField=null; 
let partialTime = { h: null }; 

const panel = document.createElement('div');
panel.className = 'suggest-panel'; panel.style.display = 'none';
panel.innerHTML = `<div class=\"suggest-head\"><div class=\"suggest-bc\"></div></div><div class=\"suggest-list\"></div>`;
document.body.appendChild(panel);
const bcEl = panel.querySelector('.suggest-bc');
const listEl = panel.querySelector('.suggest-list');

const ALL_ACTIVITIES = ['Planning', 'Coding', 'Reading', '003-Sleep-PC-MO', '009-Coffee-PC-F', '012-Dinner-PC-F'];

function closePanel(){ panel.style.display='none'; panelOpen=false; activeIndex=-1; }
function reposition(){
  const r = text_box.getBoundingClientRect();
  const y = Math.min(r.bottom - 8, window.innerHeight - 300);
  panel.style.left = `${r.left + 12}px`; panel.style.top  = `${y}px`; panel.style.minWidth = `${Math.max(320, r.width*0.6)}px`;
}
function setActive(i){
  const items = listEl.querySelectorAll('.suggest-item');
  items.forEach(x=>x.classList.remove('active')); 
  if (i>=0 && i<items.length) { items[i].classList.add('active'); items[i].scrollIntoView({block:'nearest'}); activeIndex = i; }
}

// Render Logic
async function rerender(){
    listEl.innerHTML = '';
    const query = text_box.value.trim().toLowerCase();
    
    // 1. Root
    if (suggestMode === 'agenda-root') {
        bcEl.textContent = 'Agenda Actions';
        [{l:'Start Activity',i:'▶️',c:'start'}, 
         {l:'End Activity',i:'⏹️',c:'end'},
         {l:'Edit Activity',i:'✏️',c:'edit'}].forEach(it=>{
            const d=document.createElement('div'); d.className='suggest-item';
            d.innerHTML=`<span class="suggest-icon">${it.i}</span><span>${it.l}</span>`;
            d.dataset.code=it.c; d.addEventListener('mousedown',()=>selectItem(it));
            listEl.appendChild(d);
        });
    }
    
    // 2. Select Activity (Split Logic)
    else if (suggestMode === 'agenda-select-activity') {
        bcEl.textContent = 'Select Activity';
        
        let items = [];
        
        if (pendingAction === 'start') {
            const planned = await GetPlannedActivities();
            if (planned.length > 0) {
                 const title = document.createElement('div'); title.className='suggest-section-title'; title.textContent='📅 Planned'; listEl.appendChild(title);
                 planned.forEach(p => items.push({name:p.name, id:p.id, label:p.name, extra:p.planTime, icon:'🎯'}));
            }
            if(items.length>0) { const title = document.createElement('div'); title.className='suggest-section-title'; title.textContent='📂 All'; listEl.appendChild(title); }
            ALL_ACTIVITIES.forEach(a => items.push({name:a, id:null, label:a, extra:'', icon:'🏁'}));

        } else if (pendingAction === 'end') {
            const active = await GetActiveActivities();
            active.forEach(a => items.push({name:a, id:null, label:a, extra:'', icon:'⏹️'}));

        } else if (pendingAction === 'edit') {
            const all = await GetAllActivities(); // Returns {id, name, display}
            all.forEach(a => items.push({name:a.name, id:a.id, label:a.display, extra:'', icon:'✏️'}));
        }

        const matches = items.filter(i => i.label.toLowerCase().includes(query));
        if(matches.length === 0) listEl.innerHTML = '<div class="suggest-item">No matches</div>';
        
        matches.forEach(m => {
            const d = document.createElement('div'); d.className = 'suggest-item';
            d.innerHTML = `<span class="suggest-icon">${m.icon}</span><span>${m.label}</span> <small style="float:right">${m.extra}</small>`;
            d.dataset.value = m.name; d.dataset.id = m.id;
            d.addEventListener('mousedown', ()=>selectItem({value:m.name, id:m.id}));
            listEl.appendChild(d);
        });
    }
    
    // 3. Edit Field Select
    else if (suggestMode === 'agenda-edit-field') {
        bcEl.textContent = `Edit which time for "${pendingActivity}"?`;
        [{l:'Start Time', v:'start'}, {l:'End Time', v:'end'}].forEach(f=>{
            const d=document.createElement('div'); d.className='suggest-item';
            d.innerHTML=`<span class="suggest-icon">🕒</span><span>${f.l}</span>`;
            d.dataset.field = f.v; d.addEventListener('mousedown', ()=>selectItem({field:f.v}));
            listEl.appendChild(d);
        });
    }

    // 4. Time Select
    else if (suggestMode === 'agenda-time-select') {
         bcEl.textContent = `Set Time`;
         const nowStr = now_time();
         const d1 = document.createElement('div'); d1.className = 'suggest-item';
         d1.innerHTML = `<span class="suggest-icon">⏱️</span><span>Now (${nowStr})</span>`;
         d1.dataset.time = nowStr; 
         d1.dataset.precise = 'true';
         d1.addEventListener('mousedown', ()=>selectItem({time:nowStr, precise:true}));
         listEl.appendChild(d1);
         const d2 = document.createElement('div'); d2.className = 'suggest-item';
         d2.innerHTML = `<span class="suggest-icon">⌨️</span><span>Set Time...</span>`;
         d2.dataset.custom = 'true'; d2.addEventListener('mousedown', ()=>selectItem({custom:true}));
         listEl.appendChild(d2);
    }

    // 5. Type Hour / Minute
    else if (suggestMode === 'agenda-time-hour' || suggestMode === 'agenda-time-minute') {
         const isH = suggestMode === 'agenda-time-hour';
         bcEl.textContent = isH ? `Set Hour (0-23)` : `Set Minute (0-59)`;
         const raw = text_box.value.trim();
         const limit = isH ? 23 : 59;
         const isValid = /^\d{1,2}$/.test(raw) && Number(raw) >= 0 && Number(raw) <= limit;
         const help = document.createElement('div'); help.className = 'suggest-input-hint';
         if(isH) help.innerHTML = isValid ? `Enter for <b>${pad(raw)}</b>:??` : `Type hour`;
         else {
             help.innerHTML = isValid ? `Enter for <b>${pad(partialTime.h)}:${pad(raw)}</b>` : `Type minute`;
             const ctx = document.createElement('div'); ctx.className = 'suggest-item';
             ctx.innerHTML = `<span class="suggest-icon">🕰️</span><span>Hour: ${pad(partialTime.h)}</span>`;
             listEl.prepend(ctx);
         }
         help.style.color = isValid ? 'var(--text-accent)' : 'var(--text-muted)';
         listEl.appendChild(help);
    }
    
    // 6. Plan Method
    else if (suggestMode === 'agenda-plan-method') {
        bcEl.textContent = `Define expected Duration / End:`;
        const d1 = document.createElement('div'); d1.className = 'suggest-item';
        d1.innerHTML = `<span class="suggest-icon">⏳</span><span>Duration (min)</span>`;
        d1.dataset.method = 'duration'; d1.addEventListener('mousedown', ()=>selectItem({method:'duration'}));
        listEl.appendChild(d1);
        const d2 = document.createElement('div'); d2.className = 'suggest-item';
        d2.innerHTML = `<span class="suggest-icon">🏁</span><span>Ending Time</span>`;
        d2.dataset.method = 'endtime'; d2.addEventListener('mousedown', ()=>selectItem({method:'endtime'}));
        listEl.appendChild(d2);
        
        const d3 = document.createElement('div'); d3.className = 'suggest-item';
        d3.innerHTML = `<span class="suggest-icon">➡️</span><span>Skip / Open-Ended</span>`;
        d3.dataset.method = 'open'; d3.addEventListener('mousedown', ()=>selectItem({method:'open'}));
        listEl.appendChild(d3);
    }
    else if (suggestMode === 'agenda-plan-duration') {
        bcEl.textContent = `Type Duration (minutes)`;
        const raw = text_box.value.trim();
        const isValid = /^\d+$/.test(raw) && Number(raw) > 0;
        const help = document.createElement('div'); help.className = 'suggest-input-hint';
        help.innerHTML = isValid ? `Enter for <b>${raw} mins</b>` : `Type minutes`;
        help.style.color = isValid ? 'var(--text-accent)' : 'var(--text-muted)';
        listEl.appendChild(help);
    }
    
    if (!['agenda-time-hour', 'agenda-time-minute', 'agenda-plan-duration'].includes(suggestMode)) setActive(0);
}

// Selection
function selectItem(data) {
    if (suggestMode === 'agenda-root') {
        pendingAction = data.code;
        suggestMode = 'agenda-select-activity';
        text_box.value = ''; rerender();
    }
    else if (suggestMode === 'agenda-select-activity') {
        const val = data.value || listEl.children[activeIndex]?.dataset.value;
        const id = data.id || listEl.children[activeIndex]?.dataset.id; 
        if(val){
             pendingActivity = val;
             pendingExistingId = id || null; 
             
             if (pendingAction === 'edit') {
                 suggestMode = 'agenda-edit-field';
             } else {
                 suggestMode = 'agenda-time-select';
             }
             text_box.value = ''; rerender();
        }
    }
    else if (suggestMode === 'agenda-edit-field') {
        pendingEditField = data.field;
        suggestMode = 'agenda-time-select';
        rerender();
    }
    else if (suggestMode === 'agenda-time-select') {
        if (data.custom) {
            suggestMode = 'agenda-time-hour';
            text_box.value = ''; text_box.placeholder = 'HH'; rerender();
        } else {
            const preciseTs = data.precise ? Date.now() : null;
            HandleTimeSelection(data.time || now_time(), preciseTs);
        }
    }
    else if (suggestMode === 'agenda-plan-method') {
        if (data.method === 'duration') {
            suggestMode = 'agenda-plan-duration';
            text_box.value = ''; text_box.placeholder = 'min'; rerender();
        } else if (data.method === 'open') {
             StartActivity(pendingActivity, pendingStartTime, null, pendingExistingId, pendingPreciseTimestamp);
             CloseAndClear();
        } else {
            suggestMode = 'agenda-time-hour';
            pendingAction = 'plan-end-manual';
            text_box.value = ''; text_box.placeholder = 'HH'; rerender();
        }
    }
}

let pendingPreciseTimestamp = null; 

function HandleTimeSelection(timeStr, preciseTs = null) {
    if (pendingAction === 'end') {
        EndActivity(pendingActivity, timeStr, preciseTs); CloseAndClear(); return;
    }
    if (pendingAction === 'edit') {
        EditActivity(pendingExistingId, pendingEditField, timeStr, preciseTs); CloseAndClear(); return;
    }
    if (pendingAction === 'plan-end-manual') {
        StartActivity(pendingActivity, pendingStartTime, timeStr, pendingExistingId, pendingPreciseTimestamp); 
        CloseAndClear(); return;
    }

    pendingStartTime = timeStr;
    pendingPreciseTimestamp = preciseTs;
    suggestMode = 'agenda-plan-method';
    text_box.value = ''; 
    rerender();
}

function CloseAndClear(){ text_box.value = ''; text_box.placeholder = 'Type '; closePanel(); }

text_box.addEventListener('input', (e)=>{ if(panelOpen) rerender(); });
text_box.addEventListener('keydown', (e)=>{
    if (e.key === '<' && text_box.value.trim() === '') { setTimeout(()=>{ suggestMode = 'agenda-root'; panel.style.display = 'block'; panelOpen = true; reposition(); rerender(); }, 10); return; }
    if (e.key === 'Escape') { if(panelOpen) { closePanel(); e.preventDefault(); } else if (text_box.value.trim() === '') { Consumption(); } return; }
    if (!panelOpen) { if(e.key === "Enter") { e.preventDefault(); send(); } return; }

    if (suggestMode === 'agenda-time-hour' && e.key === 'Enter') {
        e.preventDefault();
        const raw = text_box.value.trim();
        if (/^\d{1,2}$/.test(raw) && Number(raw) >= 0 && Number(raw) <= 23) {
            partialTime.h = Number(raw); suggestMode = 'agenda-time-minute'; text_box.value = ''; text_box.placeholder = 'MM'; rerender();
        } return;
    }
    if (suggestMode === 'agenda-time-minute' && e.key === 'Enter') {
        e.preventDefault();
        const raw = text_box.value.trim();
        if (/^\d{1,2}$/.test(raw) && Number(raw) >= 0 && Number(raw) <= 59) {
            HandleTimeSelection(`${pad(partialTime.h)}:${pad(raw)}`);
        } return;
    }
    if (suggestMode === 'agenda-plan-duration' && e.key === 'Enter') {
        e.preventDefault();
        const raw = text_box.value.trim();
        if (/^\d+$/.test(raw) && Number(raw) > 0) {
            const endMins = TimeToMins(pendingStartTime) + Number(raw);
            StartActivity(pendingActivity, pendingStartTime, MinsToTime(endMins), pendingExistingId, pendingPreciseTimestamp);
            CloseAndClear();
        } return;
    }
    if (['agenda-time-hour', 'agenda-time-minute', 'agenda-plan-duration'].includes(suggestMode)) {
        if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); return; 
    }
    const items = listEl.querySelectorAll('.suggest-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIndex + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
    else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = items[activeIndex];
        if(selected) {
             const data = { code: selected.dataset.code, value: selected.dataset.value, time: selected.dataset.time, custom: selected.dataset.custom === 'true', method: selected.dataset.method, id: selected.dataset.id, precise: selected.dataset.precise === 'true', field: selected.dataset.field };
             selectItem(data);
        }
    }
});

// Init & Cleanups
this.registeredCleanup = this.registeredCleanup || [];
this.registeredCleanup.push(()=>{ try{ document.body.removeChild(panel); }catch(e){} });
const intervalId = setInterval(CheckNotifications, 30000); 
this.registeredCleanup.push(() => clearInterval(intervalId));

sendBtn.addEventListener("click", send);
toDo.addEventListener("click", ()=>{ source_box.value = (source_box.value==='toDo') ? 'edwin' : 'toDo'; });
(async ()=>{ await logUp(); })();
```
