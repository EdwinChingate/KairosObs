```dataviewjs
/********************************************************************
* Planner_1 — ChatBox, Agenda + Inline Activity Suggester
* - "["   -> File/wiki suggester
* - "<"   -> Agenda menu (Start • End)
*   Start -> Activity suggester -> Time menu
*   Set time… -> Hour typing (Enter) -> Minute typing (Enter) -> Start
* - "Esc" on empty -> Consumption modal
* - Canvas write via JSON append (robust)
********************************************************************/

/* ---------- CSS / UI ---------- */
const css = `
.chat-wrap{font:14px/1.45 var(--font-interface);background:#54B5FB !important; border:1px solid var(--background-modifier-border);
border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px}
.row{display:flex; gap:6px; flex-wrap:wrap; align-items:center}
textarea{width:100%; height:88px; resize:vertical; border-radius:10px; padding:10px;
  border:1px solid var(--background-modifier-border);background:#094782 !important; color:var(--text-normal)}
textarea.ref{width:50%; min-height:10px}
textarea.ref2{width:48%; min-height:10px;background:var(--background-primary);border-color:var(--background-primary);cursor:none}
textarea[disabled]{cursor:default; opacity:1}
.log{max-height:260px; overflow:auto; padding:6px; background:var(--background-secondary); border-radius:8px}
.msg{margin:6px 0}
.msg .meta{font-size:12px; color:var(--text-muted)}
/* suggester */
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
.suggest-section-title{margin:6px 0 2px 0; font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em}
.suggest-divider{height:1px; background:var(--background-modifier-border); margin:6px 0}
`;
var highResStart = performance.now();

/* ---------- Vault paths & constants ---------- */
const MAIN_FOLDER = '0-Vault/';
const PROJECT_NAME = '11-November';
const LOG_FOLDER = MAIN_FOLDER + PROJECT_NAME;
const CONSUMPTION_FILE = '0-Vault/2025_11.md';

const ACTIVITIES_ROOT_PATH = `0-Vault/Activities`;
const AGENDA_CANVAS_PATH   = `0-Vault/Playground.canvas`;
const AGENDA_META_LOG      = `0-Vault/CleanAgenga-LogPlanner.md`;

const default_source = "edwin";
const appendToFile = async (path, text)=>{ await app.vault.adapter.append(path, text); };
const pad = n=>String(n).padStart(2,"0");
const now_date = ()=>{ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const now_today = ()=>{ const d=new Date(); return `${pad(d.getDate())}`; };
const now_time = ()=>{ const d=new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

const date = now_date();
const TARGET_FILE = `${LOG_FOLDER}/${date}-Thoughts_and_Observations.md`;

/* ---------- Mount UI ---------- */
const style = document.createElement("style"); style.textContent = css; this.container.appendChild(style);
const wrap = this.container.createEl("div",{cls:"chat-wrap"});

/* ---------- Consumption helpers ---------- */
let result_int = 1;
async function Amount(result_string){
  if (["Tyrosine","Tryptophan"].includes(result_string)) {
    const modalForm_amount = app.plugins.plugins["modalforms"]?.api;
    const res = await modalForm_amount.openForm("One");
    result_int = res.asString('{{how_much}}');
  }
  if (["Tyrosine","Tryptophan"].includes(result_string)) {
    const modalForm_amount = app.plugins.plugins["modalforms"]?.api;
    const res = await modalForm_amount.openForm("One");
    var result_int2 = res.asString('{{how_much}}');
    result_int = `${result_int} (${result_int2})`;
  }
}
async function Consumption() {
  const modalForm = app.plugins.plugins["modalforms"]?.api;
  var result = await modalForm.openForm("Consumption");
  var result_string=result.asString('{{what}}');
  if (result_string=="{{what}}") {result_string='W';}
  const d = now_today();
  const ts = now_time();
  const Log = await app.vault.adapter.read(CONSUMPTION_FILE);
  await Amount(result_string);
  const note_id=(Log.split(/\n/)).length-1;
  const save = `| ${note_id} | ${d}|${result_string} |${ts} |${result_int}  |\n`;
  await appendToFile(CONSUMPTION_FILE,save);
  task.textContent= ` got some ${result_string} the ${d} at ${ts}`;
  result_int = 1;
}

/* ---------- Agenda & Canvas helpers ---------- */
async function ReadFullName(activity){
  const txt = `${ACTIVITIES_ROOT_PATH}/${activity}.txt`;
  try{
    let full = await app.vault.adapter.read(txt);
    full = (full||'').replace('\n','').trim();
    if (full) return full;
  }catch(e){}
  const md = `${ACTIVITIES_ROOT_PATH}/${activity}.md`;
  try{
    let full2 = await app.vault.adapter.read(md);
    full2 = (full2||'').split('\n')[0].replace(/^#\s*/,'').trim();
    return full2 || activity;
  }catch(e){ return activity; }
}
function minutesFromMidnight(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
  const hours = Number(m?.[1] ?? 0), minutes = Number(m?.[2] ?? 0);
  return hours*60 + minutes;
}
function Time2Canvas(mins){ const m=3, b=100; return String(mins*m+b); }
function XCanvas(col){ return String(400+(col-1)*340); }
function SchiftColumn(Cols,Col){ const B=Cols[2], S=Math.random(); if(S>0.5){ Cols[2]=Col; Cols.push(B);} else Cols.push(Col); return Cols; }
function XColumn(Latest){
  var Cols = Latest.slice(-5); var Next_id = Cols[4]; Cols = Cols.slice(0,4);
  var Col = Cols.shift(); Cols = SchiftColumn(Cols,Col);
  return { Columns: Cols, Next_id };
}
async function MetaAgenda(){
  const Log = await app.vault.adapter.read(AGENDA_META_LOG);
  const lines = Log.split(/\n/);
  const Last = lines[lines.length-1] || '';
  const parts = Last.split(',');
  const ActiveActivities = parts.slice(0,-7);
  const meta = XColumn(parts);
  meta.ActiveActivities = ActiveActivities;
  return meta;
}

/* JSON-based canvas append (robust) */
async function UpdateAgendaCanvasJSON(nodeObj){
  let raw;
  try { raw = await app.vault.adapter.read(AGENDA_CANVAS_PATH); }
  catch(e){
    const fresh = { nodes: [nodeObj], edges: [] };
    await app.vault.adapter.write(AGENDA_CANVAS_PATH, JSON.stringify(fresh, null, 2));
    return;
  }
  let data;
  try { data = JSON.parse(raw); }
  catch(e){ data = { nodes: [], edges: [] }; }
  if (!Array.isArray(data.nodes)) data.nodes = [];
  data.nodes.push(nodeObj);
  await app.vault.adapter.write(AGENDA_CANVAS_PATH, JSON.stringify(data, null, 2));
}

/* StartActivity -> builds node & appends JSON; updates meta */
async function StartActivity(result, meta_agenda){
  const activity   = result.asString('{{list}}');
  const Start_time = result.asString('{{when}}');

  const mins   = minutesFromMidnight(Start_time);
  const yCoord = Number(Time2Canvas(mins));
  const col    = meta_agenda.Columns[0];
  const xCoord = Number(XCanvas(col));

  const id = `${String(meta_agenda.Next_id)}-${Date.now().toString(36)}`;
  const activity_full_name = await ReadFullName(activity);

  const nodeText = `# ${activity}\n  [[${activity_full_name}|___${Start_time}_-]] \n  $_{length}$`;
  const nodeObj = {
    id, type: "text", text: nodeText,
    x: xCoord, y: yCoord, width: 323, height: 163
  };

  await UpdateAgendaCanvasJSON(nodeObj);

  const UniqueLoc = `${activity}-${xCoord}-${yCoord}`;
  await UpdateMetaAgenda(meta_agenda, UniqueLoc);

  task.textContent = `Started: ${activity_full_name} @ ${Start_time}`;
}
async function UpdateMetaAgenda(meta_agenda, UniqueLoc){
  const Columns = meta_agenda.Columns;
  const ActiveActivities = meta_agenda.ActiveActivities;
  const next = Number(meta_agenda.Next_id)+1;
  const d = now_date(), ts = now_time();
  const line = `\n${ActiveActivities},${UniqueLoc},${d},${ts},${Columns},${next}`;
  await appendToFile(AGENDA_META_LOG, line);
}

/* (Stub) EndActivity — wire your own stop logic later */
async function EndActivity(activityKey){
  const ts = now_time();
  task.textContent = `Ended: ${activityKey || '(choose…)'} @ ${ts}`;
}

/* ---------- Build initial display ---------- */
const initialText = await app.vault.adapter.read(TARGET_FILE).catch(()=> "|id|Comment|Time|\n|---|---|---|");
const lines = initialText.split(/\n/);
var text_display = `${lines[2]?.split(':')[1]||''}\n${lines[1]?.split(':')[1]||''}`;

const sourceRow = wrap.createEl("div",{cls:"row"});
const source_box = sourceRow.createEl("textarea",{cls:"ref", text:default_source});
const task   = sourceRow.createEl("textarea",{ cls:"ref2", text:text_display });
task.tabIndex = -1; source_box.tabIndex = -1;

const text_box = wrap.createEl("textarea",{placeholder:"Type "});
const actions = wrap.createEl("div",{cls:"row"});
const toDo   = actions.createEl("button",{cls:"btn", text:"toDo"});
const sendBtn   = actions.createEl("button",{cls:"btn", text:"Send ⏎"});
const KeySentencesBtn   = actions.createEl("button",{cls:"btn", text:"KeySentences"});
const logBox = wrap.createEl("div",{cls:"log"});

/* ---------- LOG HELPERS ---------- */
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
  const d = now_date();
  const TF = `${LOG_FOLDER}/${d}-Thoughts_and_Observations.md`;
  const exists = await app.vault.adapter.exists(TF);
  if(!exists){
    await app.vault.create(TF,"|id|Comment|Time|\n|---|---|---|");
    const MF = `${LOG_FOLDER}/meta_log/${d}.md`;
    await app.vault.create(MF,"|id|Source|Task|Duration (ms)|\n|---|---|---|---|");
  }
}

/* ---------- SEND ---------- */
async function send(){
  const content = text_box.value.trim();
  if(!content) return;
  await create_logFile();
  const d = now_date();
  const TF = `${LOG_FOLDER}/${d}-Thoughts_and_Observations.md`;
  const MF = `${LOG_FOLDER}/meta_log/${d}.md`;
  const source=source_box.value.trim();
  const ts = now_time();
  const Log = await app.vault.adapter.read(TF);
  const note_id=(Log.split(/\n/)).length-9;
  const highResEnd = performance.now();
  const duration = Math.floor(highResEnd-highResStart);
  navigator.clipboard.writeText(content);
  await appendToFile(TF, `|${note_id}|${content}|${ts}|\n`);
  await appendToFile(MF, `|${note_id}|${source}|${duration}|\n`);
  source_box.value= default_source;
  var text_display = `${lines[2]?.split(':')[1]||''}\n${lines[1]?.split(':')[1]||''}`;
  task.textContent=text_display;
  logBox.textContent='';
  logUp();
  highResStart = performance.now();
  text_box.focus();
}
async function ClicktoDo(){
  const source=source_box.value.trim();
  source_box.value= 'toDo';
  if (source=='toDo') source_box.value= default_source ;
}
async function at_the_beginning(){ highResStart = performance.now(); text_box.value=''; return highResStart; }

/* ========================================================================
   INLINE SUGGESTER — Modes:
   'files' ( "[" ), 'agenda' ( "<" ), 'activities', 'time', 'time-typing'
   ======================================================================== */
let panelOpen = false, activeIndex = -1, currentNode = null, currentQueryStr = "";
let suggestMode = 'files'; // 'files'|'agenda'|'activities'|'time'|'time-typing'
let pendingAction = null;  // 'start'|'end'
let pendingActivity = null;

/* time typing state */
const timeInput = { phase: 'hour', hour: null, minute: null };

/* FILES root */
const PROJECT_ROOT = `${MAIN_FOLDER}${PROJECT_NAME}`;
const SKIP_PREFIXES = [`${PROJECT_ROOT}/Log`];
const INSERT_BASENAME = true;
let ROOT = buildTree();

/* ACTIVITIES root */
let ACTIVITY_ROOT = buildActivityTree();

/* Related for files mode */
const RELATED_FILE_CANDIDATES = [`${PROJECT_ROOT}/related_files.md`,`related_files.md`];
let RELATED_FILES = [];

/* Build folder tree (FILES) */
function buildTree(){
  const rootAbs = app.vault.getAbstractFileByPath(PROJECT_ROOT);
  const mkFolder = (name, path)=>({isFolder:true, name, path, children:[], files:[]});
  function walk(abs){
    const node = mkFolder(abs.name, abs.path);
    for (const ch of abs.children ?? []){
      if (ch.children){
        if (SKIP_PREFIXES.some(p => ch.path === p || ch.path.startsWith(p+'/'))) continue;
        node.children.push(walk(ch));
      } else if ((ch.extension||'').toLowerCase() === 'md'){
        node.files.push({isFolder:false, name: ch.name.replace(/\.md$/,''), path: ch.path});
      }
    }
    node.children.sort((a,b)=>a.name.localeCompare(b.name));
    node.files.sort((a,b)=>a.name.localeCompare(b.name));
    return node;
  }
  return walk(rootAbs);
}

/* Build activity tree (ACTIVITIES) */
function buildActivityTree(){
  const rootAbs = app.vault.getAbstractFileByPath(ACTIVITIES_ROOT_PATH);
  if (!rootAbs) return { isFolder:true, name:'Activities', path:ACTIVITIES_ROOT_PATH, children:[], files:[] };
  const mkFolder = (name, path)=>({isFolder:true, name, path, children:[], files:[]});
  function walk(abs){
    const node = mkFolder(abs.name, abs.path);
    for (const ch of abs.children ?? []){
      if (ch.children){
        node.children.push(walk(ch));
      } else {
        const ext = (ch.extension||'').toLowerCase();
        if (ext === 'txt' || ext === 'md'){
          const short = ch.name.replace(/\.(txt|md)$/i,'');
          node.files.push({isFolder:false, name: short, path: ch.path});
        }
      }
    }
    node.children.sort((a,b)=>a.name.localeCompare(b.name));
    node.files.sort((a,b)=>a.name.localeCompare(b.name));
    return node;
  }
  return walk(rootAbs);
}

/* Collect all files (optional) */
function collectAllFiles(node, out){ for (const f of node.files) out.push(f); for (const ch of node.children) collectAllFiles(ch, out); }
let ALL_FILES = (()=>{ const a=[]; collectAllFiles(ROOT,a); return a; })();

/* React to vault changes */
const refreshFiles = ()=>{ ROOT = buildTree(); const a=[]; collectAllFiles(ROOT,a); ALL_FILES=a; if (panelOpen) rerender(true); };
const offC = app.vault.on('create', refreshFiles);
const offD = app.vault.on('delete', refreshFiles);
const offR = app.vault.on('rename', refreshFiles);
function refreshActivityRoot(){ ACTIVITY_ROOT = buildActivityTree(); if (panelOpen) rerender(true); }
const offAC = app.vault.on('create', refreshActivityRoot);
const offAD = app.vault.on('delete', refreshActivityRoot);
const offAR = app.vault.on('rename', refreshActivityRoot);

/* Related files loader */
function basenameFromPath(p){ return p.split('/').pop().replace(/\.md$/,''); }
async function loadRelatedFiles(){
  for (const relPath of RELATED_FILE_CANDIDATES){
    const file = app.vault.getAbstractFileByPath(relPath);
    if (!file) continue;
    try{
      const raw = await app.vault.adapter.read(relPath);
      const lines = raw.split(/\r?\n/);
      const out = [];
      for (let line of lines){
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        let m = line.match(/\[\[([^\]]+)\]\]/);
        let path = m ? m[1] : line.replace(/^[-*]\s*/, '');
        path = path.replace(/\s+$/,'');
        if (!path.endsWith('.md')) path = path + '.md';
        const abs = app.vault.getAbstractFileByPath(path);
        if (abs && abs.extension?.toLowerCase() === 'md'){
          out.push({isFolder:false, name: abs.name.replace(/\.md$/,''), path: abs.path});
        } else {
          out.push({isFolder:false, name: basenameFromPath(path), path});
        }
      }
      RELATED_FILES = out;
      return;
    }catch(e){}
  }
  RELATED_FILES = [];
}

/* Matching (generic) */
function itemMatches(item, q){
  if (!q) return true;
  const L = q.toLowerCase();
  if (item.name?.toLowerCase().includes(L)) return true;
  if (item.meta?.fullName && String(item.meta.fullName).toLowerCase().includes(L)) return true;
  return false;
}
function foldHasItemMatch(node, q){
  if (node.files.some(f => itemMatches(f, q))) return true;
  for (const ch of node.children) if (foldHasItemMatch(ch, q)) return true;
  return false;
}
function filterNodeGeneric(node, q){
  const folders = [];
  for (const ch of node.children){ if (foldHasItemMatch(ch, q)) folders.push(ch); }
  const files = node.files.filter(f => itemMatches(f, q));
  return {folders, files};
}

/* Panel UI */
const panel = document.createElement('div');
panel.className = 'suggest-panel';
panel.style.display = 'none';
panel.innerHTML = `<div class="suggest-head"><div class="suggest-bc"></div></div><div class="suggest-list"></div>`;
document.body.appendChild(panel);
const bcEl = panel.querySelector('.suggest-bc');
const listEl = panel.querySelector('.suggest-list');

/* Token helpers (for "[" typed mode only) */
function findAnchorPos(){
  const s = text_box.value; const caret = text_box.selectionStart;
  for (let i = Math.max(0, caret-1); i >= 0; i--){ const ch = s[i]; if (ch === '[') return i; if (/\s/.test(ch) || ch === ']') break; }
  return null;
}
function getTokenRange(){
  const s = text_box.value; const anchor = findAnchorPos(); if (anchor == null) return null;
  let start = anchor + 1, end = start; while (end < s.length && !/[\]\s]/.test(s[end])) end++;
  return { anchor, start, end };
}
function getQueryDynamic(){ const r = getTokenRange(); if (!r) return null; return text_box.value.slice(r.start, r.end); }

/* -------- Agenda/time flow helpers (no typing for activity; typing for time) -------- */
function openAgendaMenu(){
  suggestMode = 'agenda'; currentNode = null;
  panel.style.display = 'block'; panelOpen = true; activeIndex = -1;
  reposition(); renderAgendaMenu();
}
function renderAgendaMenu(){
  bcEl.textContent = 'Agenda';
  listEl.innerHTML = '';
  const items = [
    {key:'start', label:'Start activity', icon:'▶️'},
    {key:'end',   label:'End activity',   icon:'⏹️'}
  ];
  items.forEach((it)=>{
    const r = document.createElement('div');
    r.className='suggest-item';
    r.innerHTML = `<span class="suggest-icon">${it.icon}</span><span>${it.label}</span>`;
    r.dataset.kind='agenda'; r.dataset.key=it.key;
    r.addEventListener('mousedown', ev=>{ ev.preventDefault(); chooseAgendaAction(it.key); });
    listEl.appendChild(r);
  });
  setActive(0);
}
function chooseAgendaAction(key){
  pendingAction = key;
  if (key === 'start'){ suggestMode='activities'; currentNode=ACTIVITY_ROOT; rerender(false); }
  else if (key === 'end'){ renderEndMenu(); }
}
async function renderEndMenu(){
  suggestMode = 'time';
  bcEl.textContent = 'End activity';
  listEl.innerHTML = '';
  const meta = await MetaAgenda();
  const active = (meta.ActiveActivities || []).map(s=>String(s).trim()).filter(Boolean);
  if (active.length === 0){
    const r = document.createElement('div'); r.className='suggest-item';
    r.innerHTML = `<span class="suggest-icon">ℹ️</span><span>No active activities found</span>`;
    listEl.appendChild(r); setActive(0); return;
  }
  active.forEach((name)=>{
    const r = document.createElement('div'); r.className='suggest-item';
    r.innerHTML = `<span class="suggest-icon">⏹️</span><span>${name}</span>`;
    r.dataset.kind='end'; r.dataset.name=name;
    r.addEventListener('mousedown', ev=>{ ev.preventDefault(); EndActivity(name); closePanel(); });
    listEl.appendChild(r);
  });
  setActive(0);
}
function openTimeMenu(activityKey){
  pendingActivity = activityKey;
  suggestMode = 'time';
  bcEl.textContent = `When to start?`;
  listEl.innerHTML = '';

  const nowBtn = document.createElement('div');
  nowBtn.className='suggest-item';
  nowBtn.innerHTML = `<span class="suggest-icon">⏱️</span><span>Start now (${now_time()})</span>`;
  nowBtn.dataset.kind='time-now';
  nowBtn.addEventListener('mousedown', ev=>{ ev.preventDefault(); confirmStart(now_time()); });
  listEl.appendChild(nowBtn);

  const setBtn = document.createElement('div');
  setBtn.className='suggest-item';
  setBtn.innerHTML = `<span class="suggest-icon">⌛</span><span>Set time…</span><small>Type hour, Enter → type minutes, Enter</small>`;
  setBtn.dataset.kind='time-set';
  setBtn.addEventListener('mousedown', ev=>{ ev.preventDefault(); startTimeTypingFlow(); });
  listEl.appendChild(setBtn);

  setActive(0);
}

/* ------ New: two-step inline time typing flow ------ */
function startTimeTypingFlow(){
  suggestMode = 'time-typing';
  timeInput.phase = 'hour'; timeInput.hour = null; timeInput.minute = null;
  text_box.placeholder = 'Type H or HH then Enter…';
  text_box.value = '';
  renderTimeTypingPanel();
}
function renderTimeTypingPanel(){
  const hourStr = timeInput.hour != null ? pad(timeInput.hour) : '--';
  const minStr  = timeInput.minute != null ? pad(timeInput.minute) : '--';
  bcEl.textContent = (timeInput.phase==='hour') ? 'Set time — Hour' : 'Set time — Minutes';
  listEl.innerHTML = '';

  // Status row
  const status = document.createElement('div');
  status.className = 'suggest-item';
  status.innerHTML = `<span class="suggest-icon">🕰️</span><span>Selected: ${hourStr}:${minStr}</span>`;
  listEl.appendChild(status);

  // Quick minutes when waiting minutes
  if (timeInput.phase === 'minute'){
    const title = document.createElement('div');
    title.className = 'suggest-section-title';
    title.textContent = 'Quick minutes';
    listEl.appendChild(title);

    ['00','15','30','45'].forEach(m=>{
      const r = document.createElement('div');
      r.className='suggest-item';
      r.innerHTML = `<span class="suggest-icon">💡</span><span>${hourStr}:${m}</span>`;
      r.dataset.kind='minute-quick'; r.dataset.minute=m;
      r.addEventListener('mousedown', ev=>{ ev.preventDefault(); confirmStart(`${hourStr}:${m}`); });
      listEl.appendChild(r);
    });

    const div = document.createElement('div'); div.className='suggest-divider'; listEl.appendChild(div);

    // Action when both present
    if (timeInput.minute != null){
      const go = document.createElement('div');
      go.className='suggest-item';
      go.innerHTML = `<span class="suggest-icon">▶️</span><span>Start at ${hourStr}:${minStr}</span>`;
      go.dataset.kind='start-at';
      go.addEventListener('mousedown', ev=>{ ev.preventDefault(); confirmStart(`${hourStr}:${minStr}`); });
      listEl.appendChild(go);
    } else {
      const hint = document.createElement('div');
      hint.className='suggest-item';
      hint.innerHTML = `<span class="suggest-icon">⌨️</span><span>Type minutes (MM) then press Enter…</span>`;
      listEl.appendChild(hint);
    }
  } else {
    const hint = document.createElement('div');
    hint.className='suggest-item';
    hint.innerHTML = `<span class="suggest-icon">⌨️</span><span>Type hour (H or HH) then press Enter…</span>`;
    listEl.appendChild(hint);
  }

  setActive(0);
}

/* Confirm start using typed time */
async function confirmStart(tHHMM){
  const meta = await MetaAgenda();
  const resultShim = {
    asString: (k)=>{
      if (k === '{{list}}') return pendingActivity;
      if (k === '{{when}}') return tHHMM;
      if (k === '{{what to do}}') return 'start';
      return '';
    }
  };
  await StartActivity(resultShim, meta);
  pendingAction = null; pendingActivity = null;
  // clear typing state
  timeInput.phase='hour'; timeInput.hour=null; timeInput.minute=null;
  text_box.placeholder = 'Type ';
  text_box.value = '';
  closePanel();
}

/* Breadcrumbs + nav */
function breadcrumb(node){
  if (suggestMode==='agenda') return 'Agenda';
  if (suggestMode==='time') return (pendingActivity ? `Time • ${pendingActivity}` : 'Time');
  if (suggestMode==='time-typing') return (pendingActivity ? `Set time • ${pendingActivity}` : 'Set time');
  const rootPath = (suggestMode==='activities') ? ACTIVITIES_ROOT_PATH : PROJECT_ROOT;
  const parts = []; let n = node;
  while (n){ parts.push(n.name); if (n.path === rootPath) break; n = parentOf(n); }
  return parts.reverse().join(' / ');
}
function parentOf(node){
  const base = (suggestMode==='activities') ? ACTIVITY_ROOT : ROOT;
  const parentMap = new Map();
  (function dfs(n){ for (const ch of n.children){ parentMap.set(ch.path, n); dfs(ch);} })(base);
  return parentMap.get(node.path) || null;
}
function findChildByPath(node, path){ return node.children.find(ch=>ch.path===path) || null; }
function enterFolder(f){ currentNode = f; rerender(false); reposition(); }
function goUp(){ const p = parentOf(currentNode); if (p){ currentNode = p; rerender(false); reposition(); } }
function relativeToProject(p){ return p.startsWith(PROJECT_ROOT + "/") ? p.slice(PROJECT_ROOT.length+1) : p; }

/* Insert file link (for "[" mode) */
function chooseFile(f){
  const rng = getTokenRange(); const s = text_box.value; if (!rng){ closePanel(); return; }
  const before = s.slice(0, rng.anchor-1), after  = s.slice(rng.end);
  const target = INSERT_BASENAME ? f.name : f.path.replace(/\.md$/,'');
  const wikilink = `[[${f.path}\\|${target}]]`;
  text_box.value = before + wikilink + after;
  const newCaret = (before + wikilink).length; text_box.setSelectionRange(newCaret, newCaret);
  closePanel(); text_box.focus();
}

/* Choose activity -> then open time menu */
async function chooseActivity(item){ pendingActivity = item.name; openTimeMenu(pendingActivity); }

/* Open/close & render */
async function openPanel(){
  panel.style.display = 'block'; panelOpen = true; activeIndex = -1;
  if (suggestMode === 'files'){
    const q0 = getQueryDynamic(); currentQueryStr = (q0 ?? ""); currentNode = ROOT;
    await loadRelatedFiles(); reposition(); rerender(false);
  } else if (suggestMode === 'activities'){
    currentNode = ACTIVITY_ROOT; reposition(); rerender(false);
  } else if (suggestMode === 'agenda'){
    reposition(); renderAgendaMenu();
  } else if (suggestMode === 'time'){
    reposition(); openTimeMenu(pendingActivity || '');
  } else if (suggestMode === 'time-typing'){
    reposition(); renderTimeTypingPanel();
  }
}
function closePanel(){ panel.style.display='none'; panelOpen=false; activeIndex=-1; }

/* Position & render */
function setActive(i){
  const items = listEl.querySelectorAll('.suggest-item');
  items.forEach(x=>x.classList.remove('active')); activeIndex = i;
  if (i>=0 && i<items.length){
    const el = items[i]; el.classList.add('active');
    const scroller = panel; const sRect = scroller.getBoundingClientRect(); const eRect = el.getBoundingClientRect();
    if (eRect.top < sRect.top){ scroller.scrollTop += (eRect.top - sRect.top) - 4; }
    else if (eRect.bottom > sRect.bottom){ scroller.scrollTop += (eRect.bottom - sRect.bottom) + 4; }
  }
}
function reposition(){
  const r = text_box.getBoundingClientRect();
  const y = Math.min(r.bottom - 8, window.innerHeight - 300);
  panel.style.left = `${r.left + 12}px`; panel.style.top  = `${y}px`; panel.style.minWidth = `${Math.max(320, r.width*0.6)}px`;
}
function rerender(preserveActive = true){
  if (suggestMode === 'agenda'){ renderAgendaMenu(); return; }
  if (suggestMode === 'time'){ openTimeMenu(pendingActivity||''); return; }
  if (suggestMode === 'time-typing'){ renderTimeTypingPanel(); return; }

  const qRaw = (currentQueryStr || "").trim();
  const q = (suggestMode==='activities') ? qRaw.replace(/^@/,'').toLowerCase() : qRaw.toLowerCase();
  const NODE = (suggestMode === 'activities') ? ACTIVITY_ROOT : currentNode;

  bcEl.textContent = breadcrumb(NODE);
  listEl.innerHTML = '';
  const rows = []; const seen = new Set();

  // Related (files only)
  if (suggestMode === 'files'){
    const CurrentFolder = breadcrumb(NODE);
    if (q.length > 0 && RELATED_FILES.length > 0 && CurrentFolder == PROJECT_NAME){
      const topRel = document.createElement('div'); const titleRel = document.createElement('div');
      titleRel.className = 'suggest-section-title'; titleRel.textContent = 'Related';
      topRel.appendChild(titleRel);
      RELATED_FILES.filter(f => itemMatches(f, q)).slice(0, 12).forEach(f=>{
        const r = document.createElement('div'); r.className = 'suggest-item';
        r.innerHTML = `<span class="suggest-icon">⭐</span><span>${f.name}</span><small>${relativeToProject(f.path)}</small>`;
        r.dataset.kind = 'file'; r.dataset.path = f.path; r.dataset.name = f.name; r.dataset.scope = 'related';
        r.addEventListener('mousedown', ev=>{ ev.preventDefault(); chooseFile(f); });
        topRel.appendChild(r); rows.push(r); seen.add(f.path);
      });
      if (topRel.children.length>1){ listEl.appendChild(topRel); const divR = document.createElement('div'); divR.className = 'suggest-divider'; listEl.appendChild(divR); }
    }
  }

  // Filter node
  const {folders, files} = filterNodeGeneric(NODE, q);

  // Matches
  const top = document.createElement('div'); const title = document.createElement('div');
  title.className = 'suggest-section-title'; title.textContent = (suggestMode === 'activities') ? 'Activities' : 'Matches';
  top.appendChild(title);

  (files.slice(0, 12)).forEach(f=>{
    if (seen.has(f.path)) return;
    const r = document.createElement('div'); r.className = 'suggest-item';
    const labelSpan = (suggestMode==='activities') ? `<span>${f.name}</span>` : `<span>${f.name}</span><small>${relativeToProject(f.path)}</small>`;
    r.innerHTML = `<span class="suggest-icon">${suggestMode==='activities' ? '🏁' : '🔎'}</span>${labelSpan}`;
    r.dataset.kind = 'file'; r.dataset.path = f.path; r.dataset.name = f.name; r.dataset.scope = 'top';
    r.addEventListener('mousedown', ev=>{
      ev.preventDefault();
      if (suggestMode === 'activities') chooseActivity(f);
      else chooseFile(f);
    });
    top.appendChild(r); rows.push(r);
  });
  listEl.appendChild(top);
  const div = document.createElement('div'); div.className = 'suggest-divider'; listEl.appendChild(div);

  // Browse
  const browseTitle = document.createElement('div'); browseTitle.className = 'suggest-section-title'; browseTitle.textContent = 'Browse';
  listEl.appendChild(browseTitle);

  folders.forEach(f=>{
    const r = document.createElement('div'); r.className = 'suggest-item';
    r.innerHTML = `<span class="suggest-icon">📁</span><span>${f.name}</span>`;
    r.dataset.kind = 'folder'; r.dataset.path = f.path; r.dataset.scope = 'browse';
    r.addEventListener('mousedown', ev=>{ ev.preventDefault(); enterFolder(f); });
    listEl.appendChild(r); rows.push(r);
  });

  files.forEach(f=>{
    const r = document.createElement('div'); r.className = 'suggest-item';
    const labelSpan = (suggestMode==='activities') ? `<span>${f.name}</span>` : `<span>${f.name}</span><small>${relativeToProject(f.path)}</small>`;
    r.innerHTML = `<span class="suggest-icon">📄</span>${labelSpan}`;
    r.dataset.kind = 'file'; r.dataset.path = f.path; r.dataset.name = f.name; r.dataset.scope = 'browse';
    r.addEventListener('mousedown', ev=>{
      ev.preventDefault();
      if (suggestMode === 'activities') chooseActivity(f);
      else chooseFile(f);
    });
    listEl.appendChild(r); rows.push(r);
  });

  if (rows.length === 0){
    const empty = document.createElement('div'); empty.className = 'suggest-item';
    empty.textContent = 'No matches'; listEl.appendChild(empty); setActive(-1); return;
  }
  if (preserveActive && activeIndex >= 0) setActive(Math.min(activeIndex, rows.length-1));
  else setActive(0);
}

/* Keep panel synced (files mode typing only) */
text_box.addEventListener('input', ()=>{
  if (!panelOpen) return;

  // time-typing: keep panel showing current hour/min buffer
  if (suggestMode === 'time-typing'){
    const raw = text_box.value.trim();
    if (timeInput.phase === 'hour'){
      // show what user typed, but only digits taken into account
      renderTimeTypingPanel();
    } else if (timeInput.phase === 'minute'){
      renderTimeTypingPanel();
    }
    return;
  }

  if (suggestMode !== 'files') return;
  const rng = getTokenRange(); if (!rng){ closePanel(); return; }
  const s = text_box.value; if (rng.end < s.length && s[rng.end] === ']'){ closePanel(); return; }
  const q = getQueryDynamic(); currentQueryStr = (q ?? ""); rerender(false);
}, true);

/* Click-away & housekeeping */
document.addEventListener('selectionchange', ()=>{
  if (!panelOpen) return;
  if (document.activeElement !== text_box) return;
  if (suggestMode !== 'files') return;
  const rng = getTokenRange(); if (!rng){ closePanel(); return; }
});
document.addEventListener('mousedown', (ev)=>{
  if (!panelOpen) return;
  if (ev.target === panel || panel.contains(ev.target) || ev.target === text_box) return;
  closePanel();
});
text_box.addEventListener('blur', ()=>{ setTimeout(()=>{ if (panelOpen) closePanel(); }, 120); });
window.addEventListener('resize', ()=>{ if (panelOpen) reposition(); });
document.addEventListener('scroll', ()=>{ if (panelOpen) reposition(); }, true);

/* ---------- Keyboard handlers ---------- */
text_box.addEventListener('keydown', (e)=>{
  // File/wiki suggester '['
  if (e.key === '['){
    e.preventDefault(); e.stopPropagation();
    const caret = text_box.selectionStart; const v = text_box.value;
    text_box.value = v.slice(0, caret) + '[' + v.slice(caret);
    text_box.setSelectionRange(caret+1, caret+1);
    suggestMode = 'files'; openPanel(); return;
  }

  // Agenda launcher '<' when empty
  if (e.key === '<' && text_box.value.trim() === '') {
    e.preventDefault(); e.stopPropagation();
    openAgendaMenu(); return;
  }

  // Quick: Esc on empty -> Consumption
  if (e.key === 'Escape' && text_box.value.trim() === '') {
    e.preventDefault(); e.stopPropagation();
    Consumption(); return;
  }

  // ----- Special handling: time-typing flow -----
  if (panelOpen && suggestMode === 'time-typing'){
    // allow digits/backspace/enter; don't swallow number keys
    if (e.key === 'Enter'){
      e.preventDefault(); e.stopPropagation();
      const raw = text_box.value.trim();
      if (timeInput.phase === 'hour'){
        const hh = Number(raw);
        if (!Number.isFinite(hh) || hh<0 || hh>23) { /* ignore invalid */ return; }
        timeInput.hour = hh;
        timeInput.phase = 'minute';
        text_box.placeholder = 'Type minutes (MM) then Enter…';
        text_box.value = '';
        renderTimeTypingPanel();
        return;
      } else {
        const mm = Number(raw);
        if (!Number.isFinite(mm) || mm<0 || mm>59) { /* ignore invalid */ return; }
        timeInput.minute = mm;
        renderTimeTypingPanel();
        // auto-confirm on Enter once minute is valid
        const hhStr = pad(timeInput.hour), mmStr = pad(timeInput.minute);
        confirmStart(`${hhStr}:${mmStr}`);
        return;
      }
    }
    // Backspace clears buffer normally; digits just type
    // prevent panel nav swallowing
    if (['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Tab'].includes(e.key)){
      e.preventDefault(); e.stopPropagation();
      return;
    }
    return; // let typing proceed
  }

  if (!panelOpen) return;

  // Navigation inside panel (normal modes)
  const swallow = new Set(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Enter','Tab','Escape']);
  if (swallow.has(e.key)) { e.preventDefault(); e.stopPropagation(); }

  const items = listEl.querySelectorAll('.suggest-item');
  if (e.key === 'ArrowDown'){ setActive(Math.min(activeIndex+1, items.length-1)); return; }
  if (e.key === 'ArrowUp'){   setActive(Math.max(activeIndex-1, 0)); return; }
  if (e.key === 'ArrowRight'){
    if (suggestMode==='files' || suggestMode==='activities'){
      const el = items[activeIndex]; if (!el) return;
      if (el.dataset.kind === 'folder'){
        const srcNode = (suggestMode==='activities') ? ACTIVITY_ROOT : currentNode;
        const f = findChildByPath(srcNode, el.dataset.path); if (f) enterFolder(f);
      }
    }
    return;
  }
  if (e.key === 'ArrowLeft'){ if (suggestMode==='files' || suggestMode==='activities') goUp(); return; }

  if (e.key === 'Enter' || e.key === 'Tab'){
    const el = items[activeIndex] || items[0]; if (!el) { closePanel(); return; }

    if (suggestMode === 'agenda'){ chooseAgendaAction(el.dataset.key); return; }
    if (suggestMode === 'time'){
      if (el.dataset.kind === 'time-now'){ confirmStart(now_time()); return; }
      if (el.dataset.kind === 'time-set'){ startTimeTypingFlow(); return; }
      return;
    }

    if (el.dataset.kind === 'folder'){
      const srcNode = (suggestMode === 'activities') ? ACTIVITY_ROOT : currentNode;
      const f = findChildByPath(srcNode, el.dataset.path); if (f) enterFolder(f);
    } else {
      const payload = { name: el.dataset.name, path: el.dataset.path };
      if (suggestMode === 'activities') chooseActivity(payload);
      else chooseFile(payload);
    }
    return;
  }

  if (e.key === 'Escape'){ closePanel(); return; }
}, true);

/* ---------- Buttons & send (guarded) ---------- */
sendBtn.addEventListener("click", send);
toDo.addEventListener("click", ClicktoDo);
text_box.addEventListener("keydown",(e)=>{
  if (panelOpen) return;
  if (e.key==="Enter"){ e.preventDefault(); send(); }
});
text_box.addEventListener("focus",at_the_beginning);

/* ---------- Init ---------- */
(async ()=>{ await logUp(); })();

/* ---------- Cleanup ---------- */
this.registeredCleanup = this.registeredCleanup || [];
this.registeredCleanup.push(()=>{
  try{
    document.body.removeChild(panel);
    app.vault.offref(offC); app.vault.offref(offD); app.vault.offref(offR);
    app.vault.offref(offAC); app.vault.offref(offAD); app.vault.offref(offAR);
  }catch(e){}
});

```