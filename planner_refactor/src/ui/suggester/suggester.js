const { requestStartWithOverlapCheck } = require("../../mutate/requestStartWithOverlapCheck");
const { startActivity } = require("../../mutate/startActivity");
const { endActivity } = require("../../mutate/endActivity");
const { editActivity } = require("../../mutate/editActivity");
const { deleteActivity } = require("../../mutate/deleteActivity");
const { recordConsumption } = require("../../mutate/recordConsumption");
const { createActivityQueries } = require("../../store/activityQueries");
const { createReferenceLists } = require("../../store/referenceLists");

const PROMPT_SINGLE = ["Tyrosine", "Tryptophan"];
const PROMPT_DOUBLE = ["Beer", "Wine"];

/**
 * State machine driving the suggester UI/keyboard flows.
 * @param {Object} state - PlannerState.
 * @param {Object} ui - DOM references.
 * @param {HTMLElement} ui.textBox - Textarea used for input.
 * @param {HTMLElement} ui.taskBox - Element used for inline notices.
 * @param {HTMLElement} ui.panelHost - Container for the panel (document.body).
 * @param {Function} refreshEmbed - Calendar refresh function.
 * @returns {Object} Suggester API.
 */
function createSuggester(state, ui, refreshEmbed) {
  const queries = createActivityQueries(state);
  const lists = createReferenceLists(state);

  const panel = document.createElement("div");
  panel.className = "suggest-panel";
  panel.style.display = "none";
  panel.innerHTML = `<div class="suggest-head"><div class="suggest-bc"></div><div class="suggest-nav"><button class="nav-btn" id="nav-back">←</button><button class="nav-btn" id="nav-fwd">→</button></div></div><div class="suggest-list"></div>`;
  ui.panelHost.appendChild(panel);
  const bcEl = panel.querySelector(".suggest-bc");
  const listEl = panel.querySelector(".suggest-list");
  const backBtn = panel.querySelector("#nav-back");
  const fwdBtn = panel.querySelector("#nav-fwd");

  const getPending = () => state.uiState.pending;

  function closePanel() {
    panel.style.display = "none";
    state.uiState.panelOpen = false;
    state.uiState.activeIndex = -1;
    state.uiState.historyStack = [];
  }

  async function processStartRequest(params) {
    const res = await requestStartWithOverlapCheck(state, { ...params, onRefresh: refreshEmbed });
    if (res.needsPrompt) {
      getPending().startRequest = res.request;
      state.uiState.suggestMode = "agenda-start-overlap";
      panel.style.display = "block";
      state.uiState.panelOpen = true;
      reposition();
      await rerender();
      setTimeout(() => ui.textBox.focus(), 0);
      return true;
    }
    return false;
  }

  function reposition() {
    const r = ui.textBox.getBoundingClientRect();
    const y = Math.min(r.bottom - 8, window.innerHeight - 300);
    panel.style.left = `${r.left + 12}px`;
    panel.style.top = `${y}px`;
    panel.style.minWidth = `${Math.max(320, r.width * 0.6)}px`;
  }

  function setActive(i) {
    const items = listEl.querySelectorAll(".suggest-item");
    items.forEach((x) => x.classList.remove("active"));
    if (i >= 0 && i < items.length) {
      items[i].classList.add("active");
      items[i].scrollIntoView({ block: "nearest" });
      state.uiState.activeIndex = i;
    }
  }

  function createItem(icon, label) {
    const d = document.createElement("div");
    d.className = "suggest-item";
    d.innerHTML = `<span class="suggest-icon">${icon}</span><span>${label}</span>`;
    return d;
  }

  function setAgendaTitle(title) {
    const mode = String(state.uiState.suggestMode || "");
    if (mode.startsWith("agenda-") && !mode.startsWith("agenda-consumption") && mode !== "agenda-keysentences") {
      bcEl.innerHTML = `<div style="font-size:12px;opacity:0.75;line-height:1.1;margin-bottom:2px;">${state.currentPlannerDate}</div><div>${title}</div>`;
    } else {
      bcEl.textContent = title;
    }
  }

  function pushHistory() {
    const p = getPending();
    state.uiState.historyStack.push({
      mode: state.uiState.suggestMode,
      pending: JSON.parse(JSON.stringify(p)),
    });
  }

  function restoreHistory() {
    if (state.uiState.historyStack.length === 0) {
      closePanel();
      return;
    }
    const snap = state.uiState.historyStack.pop();
    state.uiState.suggestMode = snap.mode;
    state.uiState.pending = { ...state.uiState.pending, ...snap.pending };
    rerender();
  }

  function triggerForward() {
    const items = listEl.querySelectorAll(".suggest-item");
    if (state.uiState.activeIndex >= 0 && state.uiState.activeIndex < items.length) {
      const selected = items[state.uiState.activeIndex];
      const data = {
        code: selected.dataset.code,
        value: selected.dataset.value,
        time: selected.dataset.time,
        custom: selected.dataset.custom === "true",
        method: selected.dataset.method,
        id: selected.dataset.id,
        precise: selected.dataset.precise === "true",
        field: selected.dataset.field,
        choice: selected.dataset.choice,
        start: selected.dataset.start,
        end: selected.dataset.end,
        file: selected.dataset.file,
      };
      selectItem(data);
    }
  }

  backBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    restoreHistory();
  });
  fwdBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    triggerForward();
  });

  async function rerender() {
    try {
      listEl.innerHTML = "";
      let query = ui.textBox.value.trim().toLowerCase();
      if (state.uiState.suggestMode === "agenda-keysentences") {
        const anchor = findDotCommaAnchor();
        query = anchor !== null ? ui.textBox.value.substring(anchor + 2, ui.textBox.selectionStart).toLowerCase() : "";
      }

      if (state.uiState.suggestMode === "agenda-root") {
        setAgendaTitle("Agenda Actions");
        [
          { l: "Start Activity", i: "▶️", c: "start" },
          { l: "End Activity", i: "⏹️", c: "end" },
          { l: "Edit Activity", i: "✏️", c: "edit" },
          { l: "Delete Activity", i: "🗑️", c: "delete" },
        ].forEach((it) => {
          const d = document.createElement("div");
          d.className = "suggest-item";
          d.innerHTML = `<span class="suggest-icon">${it.i}</span><span>${it.l}</span>`;
          d.dataset.code = it.c;
          d.addEventListener("mousedown", () => selectItem({ code: it.c }));
          listEl.appendChild(d);
        });
      } else if (state.uiState.suggestMode === "agenda-select-activity" || state.uiState.suggestMode === "agenda-consumption-select") {
        let items = [];
        if (state.uiState.suggestMode === "agenda-consumption-select") {
          setAgendaTitle("What did you consume?");
          const list = await lists.getConsumptionItems();
          list.forEach((i) => items.push({ name: i, id: null, label: i, extra: "", icon: "💊" }));
        } else if (getPending().action === "start") {
          setAgendaTitle("Select Activity");
          const planned = await queries.getPlannedActivities();
          if (planned.length > 0) {
            const title = document.createElement("div");
            title.className = "suggest-section-title";
            title.textContent = "📅 Planned";
            listEl.appendChild(title);
            planned.forEach((p) => items.push({ name: p.name, id: p.id, label: p.name, extra: p.planTime, icon: "🎯" }));
          }
          const dynamicActivities = await lists.getStandardActivities();
          if (items.length > 0) {
            const title = document.createElement("div");
            title.className = "suggest-section-title";
            title.textContent = "📂 All";
            listEl.appendChild(title);
          }
          dynamicActivities.forEach((a) => items.push({ name: a, id: null, label: a, extra: "", icon: "🏁" }));
        } else if (getPending().action === "end") {
          setAgendaTitle("End which activity?");
          const active = await queries.getActiveActivities();
          active.forEach((a) => items.push({ name: a.name, id: null, label: a.name, extra: "", icon: "⏹️", file: a.sourceFile }));
        } else if (getPending().action === "edit") {
          setAgendaTitle("Edit which activity?");
          const all = await queries.getAllActivities();
          all.forEach((a) => items.push({ name: a.name, id: a.id, label: a.name, extra: `${a.start}-${a.end}`, icon: "✏️", start: a.start, end: a.end, file: a.sourceFile }));
        } else if (getPending().action === "delete") {
          setAgendaTitle("Delete which activity?");
          const all = await queries.getAllActivities();
          all.forEach((a) => items.push({ name: a.name, id: a.id, label: a.name, extra: `${a.start}-${a.end}`, icon: "🗑️", file: a.sourceFile }));
        }
        const matches = items.filter((i) => i.label.toLowerCase().includes(query));
        if (matches.length === 0) listEl.innerHTML = '<div class="suggest-item">No matches</div>';
        matches.forEach((m) => {
          const d = document.createElement("div");
          d.className = "suggest-item";
          d.innerHTML = `<span class="suggest-icon">${m.icon}</span><span>${m.label}</span> <small style="float:right">${m.extra}</small>`;
          d.dataset.value = m.name;
          if (m.id) d.dataset.id = String(m.id);
          if (m.start) d.dataset.start = m.start;
          if (m.end) d.dataset.end = m.end;
          if (m.file) d.dataset.file = m.file;
          d.addEventListener("mousedown", () => selectItem({ value: m.name, id: m.id, start: m.start, end: m.end, file: m.file }));
          listEl.appendChild(d);
        });
      } else if (state.uiState.suggestMode === "agenda-keysentences") {
        setAgendaTitle("Insert Key Sentence");
        const sentences = await lists.getKeySentences();
        const matches = sentences.filter((s) => s.label.toLowerCase().includes(query));
        if (matches.length === 0) listEl.innerHTML = '<div class="suggest-item">No matches</div>';
        matches.forEach((s) => {
          const d = document.createElement("div");
          d.className = "suggest-item";
          d.innerHTML = `<span class="suggest-icon">📝</span><span>${s.label}</span>`;
          d.dataset.value = s.value;
          d.addEventListener("mousedown", () => selectItem({ value: s.value, code: "insert-sentence" }));
          listEl.appendChild(d);
        });
      } else if (state.uiState.suggestMode === "agenda-consumption-amount") {
        setAgendaTitle(`How much ${getPending().consumptionItem}?`);
        const hint = document.createElement("div");
        hint.className = "suggest-input-hint";
        hint.innerHTML = ui.textBox.value ? `Press Enter for: <b>${ui.textBox.value}</b>` : "Type amount (Default: 1)";
        listEl.appendChild(hint);
      } else if (state.uiState.suggestMode === "agenda-consumption-double-1") {
        setAgendaTitle(`${getPending().consumptionItem}: Amount/Volume?`);
        const hint = document.createElement("div");
        hint.className = "suggest-input-hint";
        hint.innerHTML = ui.textBox.value ? `Press Enter for: <b>${ui.textBox.value}</b>` : "e.g. 500ml, 1 Pint";
        listEl.appendChild(hint);
      } else if (state.uiState.suggestMode === "agenda-consumption-double-2") {
        setAgendaTitle(`${getPending().consumptionItem}: % / Type / Notes?`);
        const hint = document.createElement("div");
        hint.className = "suggest-input-hint";
        hint.innerHTML = ui.textBox.value ? `Press Enter for: <b>${ui.textBox.value}</b>` : "e.g. 5%, IPA, etc";
        listEl.appendChild(hint);
      } else if (state.uiState.suggestMode === "agenda-edit-field") {
        setAgendaTitle(`Edit "${getPending().activity}" (${getPending().currentStart || "?"} - ${getPending().currentEnd || "?"})`);
        [
          { l: "Start Time", v: "start", i: "🕒" },
          { l: "End Time", v: "end", i: "🏁" },
          { l: "Rename Activity", v: "name", i: "Aa" },
        ].forEach((f) => {
          const d = document.createElement("div");
          d.className = "suggest-item";
          d.innerHTML = `<span class="suggest-icon">${f.i}</span><span>${f.l}</span>`;
          d.dataset.field = f.v;
          d.addEventListener("mousedown", () => selectItem({ field: f.v }));
          listEl.appendChild(d);
        });
      } else if (state.uiState.suggestMode === "agenda-rename-input") {
        setAgendaTitle(`Rename "${getPending().activity}" to...`);
        const typeHint = document.createElement("div");
        typeHint.className = "suggest-input-hint";
        typeHint.innerHTML = ui.textBox.value ? `Press Enter to rename to: <b>${ui.textBox.value}</b>` : "Type new name...";
        listEl.appendChild(typeHint);
        const dynamicActivities = await lists.getStandardActivities();
        const matches = dynamicActivities.filter((a) => a.toLowerCase().includes(query));
        matches.forEach((name) => {
          const d = document.createElement("div");
          d.className = "suggest-item";
          d.innerHTML = `<span class="suggest-icon">🏷️</span><span>${name}</span>`;
          d.dataset.value = name;
          d.addEventListener("mousedown", () => selectItem({ value: name }));
          listEl.appendChild(d);
        });
      } else if (state.uiState.suggestMode === "agenda-edit-chain") {
        const otherField = getPending().editField === "start" ? "End" : "Start";
        setAgendaTitle(`Edited ${getPending().editField}. Also edit ${otherField}?`);
        const d1 = document.createElement("div");
        d1.className = "suggest-item";
        d1.innerHTML = `<span class="suggest-icon">✅</span><span>No, I'm done</span>`;
        d1.dataset.choice = "done";
        d1.addEventListener("mousedown", () => selectItem({ choice: "done" }));
        listEl.appendChild(d1);
        const d2 = document.createElement("div");
        d2.className = "suggest-item";
        d2.innerHTML = `<span class="suggest-icon">✏️</span><span>Yes, Edit ${otherField}</span>`;
        d2.dataset.choice = "edit_other";
        d2.addEventListener("mousedown", () => selectItem({ choice: "edit_other" }));
        listEl.appendChild(d2);
      } else if (state.uiState.suggestMode === "agenda-edit-method") {
        setAgendaTitle(`How to set ${getPending().editField}?`);
        const d1 = document.createElement("div");
        d1.className = "suggest-item";
        d1.innerHTML = `<span class="suggest-icon">⌨️</span><span>Set Time</span>`;
        d1.dataset.method = "time";
        d1.addEventListener("mousedown", () => selectItem({ method: "time" }));
        listEl.appendChild(d1);
        const d2 = document.createElement("div");
        d2.className = "suggest-item";
        d2.innerHTML = `<span class="suggest-icon">⏳</span><span>Duration (min)</span>`;
        d2.dataset.method = "duration";
        d2.addEventListener("mousedown", () => selectItem({ method: "duration" }));
        listEl.appendChild(d2);
      } else if (state.uiState.suggestMode === "agenda-start-overlap") {
        const act = getPending().startRequest?.activityName || getPending().activity || "Activity";
        setAgendaTitle(`Start "${act}" — end active task(s)?`);
        const y = document.createElement("div");
        y.className = "suggest-item";
        y.innerHTML = `<span class="suggest-icon">🧹</span><span>Yes — end & start</span>`;
        y.dataset.choice = "overlap_yes";
        y.addEventListener("mousedown", () => selectItem({ choice: "overlap_yes" }));
        listEl.appendChild(y);
        const n = document.createElement("div");
        n.className = "suggest-item";
        n.innerHTML = `<span class="suggest-icon">🧬</span><span>No — multitask</span>`;
        n.dataset.choice = "overlap_no";
        n.addEventListener("mousedown", () => selectItem({ choice: "overlap_no" }));
        listEl.appendChild(n);
        const c = document.createElement("div");
        c.className = "suggest-item";
        c.innerHTML = `<span class="suggest-icon">↩️</span><span>Cancel</span>`;
        c.dataset.choice = "overlap_cancel";
        c.addEventListener("mousedown", () => selectItem({ choice: "overlap_cancel" }));
        listEl.appendChild(c);
      } else if (state.uiState.suggestMode === "agenda-resume") {
        setAgendaTitle("Resume interrupted activities?");
        const names = (getPending().resumable || []).map((a) => a.name).join(", ");
        const hint = document.createElement("div");
        hint.className = "suggest-input-hint";
        hint.textContent = `Interrupted: ${names}`;
        listEl.appendChild(hint);
        const y = document.createElement("div");
        y.className = "suggest-item";
        y.innerHTML = `<span class="suggest-icon">🔄</span><span>Yes, Resume</span>`;
        y.dataset.choice = "resume_yes";
        y.addEventListener("mousedown", () => selectItem({ choice: "resume_yes" }));
        listEl.appendChild(y);
        const n = document.createElement("div");
        n.className = "suggest-item";
        n.innerHTML = `<span class="suggest-icon">⏹️</span><span>No, just end break</span>`;
        n.dataset.choice = "resume_no";
        n.addEventListener("mousedown", () => selectItem({ choice: "resume_no" }));
        listEl.appendChild(n);
      } else if (state.uiState.suggestMode === "agenda-delete-confirm") {
        setAgendaTitle(`DELETE "${getPending().activity}"?`);
        const y = document.createElement("div");
        y.className = "suggest-item";
        y.innerHTML = `<span class="suggest-icon">🗑️</span><span>Yes, Delete it</span>`;
        y.dataset.choice = "delete_yes";
        y.addEventListener("mousedown", () => selectItem({ choice: "delete_yes" }));
        listEl.appendChild(y);
        const n = document.createElement("div");
        n.className = "suggest-item";
        n.innerHTML = `<span class="suggest-icon">↩️</span><span>No, Cancel</span>`;
        n.dataset.choice = "delete_no";
        n.addEventListener("mousedown", () => selectItem({ choice: "delete_no" }));
        listEl.appendChild(n);
      } else if (state.uiState.suggestMode === "agenda-time-select") {
        setAgendaTitle("Set Time");
        const nowStr = state.now.nowTime();
        const d1 = createItem("⏱️", `Now (${nowStr})`);
        d1.dataset.time = nowStr;
        d1.dataset.precise = "true";
        d1.addEventListener("mousedown", () => selectItem({ time: nowStr, precise: true }));
        listEl.appendChild(d1);
        const d2 = createItem("⌨️", "Custom.");
        d2.dataset.custom = "true";
        d2.addEventListener("mousedown", () => selectItem({ custom: true }));
        listEl.appendChild(d2);
      } else if (state.uiState.suggestMode === "agenda-plan-method") {
        setAgendaTitle("Plan End");
        const d1 = createItem("⏳", "Duration (min)");
        d1.dataset.method = "duration";
        d1.addEventListener("mousedown", () => selectItem({ method: "duration" }));
        listEl.appendChild(d1);
        const d2 = createItem("🔚", "Set End Time");
        d2.dataset.method = "manual";
        d2.addEventListener("mousedown", () => selectItem({ method: "manual" }));
        listEl.appendChild(d2);
        const d3 = createItem("🔓", "Open End");
        d3.dataset.method = "open";
        d3.addEventListener("mousedown", () => selectItem({ method: "open" }));
        listEl.appendChild(d3);
      }
      const items = listEl.querySelectorAll(".suggest-item");
      if (items.length > 0) setActive(0);
    } catch (e) {
      console.error("Rerender Error", e);
    }
  }

  function closeAndClear() {
    ui.textBox.value = "";
    ui.textBox.placeholder = "Type ";
    closePanel();
  }

  async function selectItem(data) {
    pushHistory();
    const pending = getPending();
    if (state.uiState.suggestMode === "agenda-root") {
      pending.action = data.code;
      state.uiState.suggestMode = "agenda-select-activity";
      ui.textBox.value = "";
      rerender();
    } else if (state.uiState.suggestMode === "agenda-keysentences") {
      if (data.value) {
        const anchor = findDotCommaAnchor();
        if (anchor !== null) {
          const before = ui.textBox.value.substring(0, anchor);
          const after = ui.textBox.value.substring(ui.textBox.selectionStart);
          ui.textBox.value = before + data.value + after;
          const newCursor = before.length + data.value.length;
          ui.textBox.setSelectionRange(newCursor, newCursor);
        }
        closePanel();
        ui.textBox.focus();
      }
    } else if (state.uiState.suggestMode === "agenda-select-activity") {
      const val = data.value || listEl.children[state.uiState.activeIndex]?.dataset.value;
      const id = data.id && data.id !== "undefined" ? data.id : null;
      const file = data.file;
      if (val) {
        pending.activity = val;
        pending.existingId = id;
        pending.targetFile = file;
        if (pending.action === "edit") {
          pending.currentStart = data.start;
          pending.currentEnd = data.end;
          state.uiState.suggestMode = "agenda-edit-field";
        } else if (pending.action === "delete") {
          state.uiState.suggestMode = "agenda-delete-confirm";
        } else {
          state.uiState.suggestMode = "agenda-time-select";
        }
        ui.textBox.value = "";
        rerender();
      }
    } else if (state.uiState.suggestMode === "agenda-consumption-select") {
      const val = data.value;
      if (val) {
        pending.consumptionItem = val;
        if (PROMPT_DOUBLE.includes(val)) {
          state.uiState.suggestMode = "agenda-consumption-double-1";
          ui.textBox.value = "";
          ui.textBox.placeholder = "First Val";
          rerender();
        } else if (PROMPT_SINGLE.includes(val)) {
          state.uiState.suggestMode = "agenda-consumption-amount";
          ui.textBox.value = "";
          ui.textBox.placeholder = "1";
          rerender();
        } else {
          await recordConsumption(state, { item: val, amount: "1" });
          closeAndClear();
        }
      }
    } else if (state.uiState.suggestMode === "agenda-edit-field") {
      pending.editField = data.field;
      state.uiState.suggestMode = pending.editField === "name" ? "agenda-rename-input" : "agenda-time-select";
      rerender();
    } else if (state.uiState.suggestMode === "agenda-rename-input") {
      const newVal = data.value || ui.textBox.value.trim();
      if (newVal) {
        await editActivity(state, { rowId: pending.existingId, field: "name", newVal, targetFile: pending.targetFile, onRefresh: refreshEmbed });
        closeAndClear();
      }
    } else if (state.uiState.suggestMode === "agenda-edit-chain") {
      if (data.choice === "done") closeAndClear();
      else {
        pending.editField = pending.editField === "start" ? "end" : "start";
        state.uiState.suggestMode = "agenda-edit-method";
        rerender();
      }
    } else if (state.uiState.suggestMode === "agenda-edit-method") {
      if (data.method === "time") {
        state.uiState.suggestMode = "agenda-time-select";
        rerender();
      } else {
        state.uiState.suggestMode = "agenda-edit-duration";
        ui.textBox.value = "";
        ui.textBox.placeholder = "min";
        rerender();
      }
    } else if (state.uiState.suggestMode === "agenda-start-overlap") {
      if (data.choice === "overlap_cancel") {
        pending.startRequest = null;
        if (state.uiState.historyStack.length > 0) state.uiState.historyStack.pop();
        restoreHistory();
        return;
      }
      if (!pending.startRequest) {
        closeAndClear();
        return;
      }
      const payload = pending.startRequest;
      pending.startRequest = null;
      if (data.choice === "overlap_yes") {
        for (const act of payload.active) {
          await endActivity(state, { activityName: act.name, endTime: payload.startTime, preciseUnix: payload.preciseUnix, targetFile: act.sourceFile, skipRefresh: true });
        }
      }
      await startActivity(state, { activityName: payload.activityName, startTime: payload.startTime, plannedEndTime: payload.plannedEndTime, existingRowId: payload.existingRowId, preciseUnix: payload.preciseUnix, onRefresh: refreshEmbed });
      closeAndClear();
    } else if (state.uiState.suggestMode === "agenda-resume") {
      if (data.choice === "resume_yes") {
        const nowStr = state.now.nowTime();
        const ts = Date.now();
        for (const act of pending.resumable || []) {
          await startActivity(state, { activityName: act.name, startTime: nowStr, plannedEndTime: act.endTime, existingRowId: null, preciseUnix: ts, onRefresh: refreshEmbed });
        }
      }
      closeAndClear();
    } else if (state.uiState.suggestMode === "agenda-delete-confirm") {
      if (data.choice === "delete_yes") {
        await deleteActivity(state, { rowId: pending.existingId, activityName: pending.activity, targetFile: pending.targetFile, onRefresh: refreshEmbed });
        closeAndClear();
      } else {
        closeAndClear();
      }
    } else if (state.uiState.suggestMode === "agenda-time-select") {
      if (data.custom) {
        state.uiState.suggestMode = "agenda-time-hour";
        ui.textBox.value = "";
        ui.textBox.placeholder = "HH";
        rerender();
      } else {
        const preciseTs = data.precise ? Date.now() : null;
        await handleTimeSelection(data.time || state.now.nowTime(), preciseTs);
      }
    } else if (state.uiState.suggestMode === "agenda-plan-method") {
      if (data.method === "duration") {
        state.uiState.suggestMode = "agenda-plan-duration";
        ui.textBox.value = "";
        ui.textBox.placeholder = "min";
        rerender();
      } else if (data.method === "open") {
        await processStartRequest({ activityName: pending.activity, startTime: pending.startTime, plannedEndTime: null, existingRowId: pending.existingId, preciseUnix: pending.preciseTimestamp });
      } else {
        state.uiState.suggestMode = "agenda-time-hour";
        pending.action = "plan-end-manual";
        ui.textBox.value = "";
        ui.textBox.placeholder = "HH";
        rerender();
      }
    }
    const items = listEl.querySelectorAll(".suggest-item");
    if (items.length > 0) setActive(0);
  }

  async function handleTimeSelection(timeStr, preciseTs = null) {
    const pending = getPending();
    if (pending.action === "end") {
      const startUnix = await endActivity(state, { activityName: pending.activity, endTime: timeStr, preciseUnix: preciseTs, targetFile: pending.targetFile, onRefresh: refreshEmbed });
      const exclude = pending.activity === "Break" ? ["Break"] : ["Break", pending.activity];
      const candidates = await queries.getInterruptedActivitiesByUnix(startUnix, exclude);
      if (candidates.length > 0) {
        pending.resumable = candidates;
        state.uiState.suggestMode = "agenda-resume";
        panel.style.display = "block";
        state.uiState.panelOpen = true;
        reposition();
        await rerender();
        setTimeout(() => ui.textBox.focus(), 0);
        return;
      }
      closeAndClear();
      return;
    }
    if (pending.action === "edit") {
      await editActivity(state, { rowId: pending.existingId, field: pending.editField, newVal: timeStr, preciseUnix: preciseTs, targetFile: pending.targetFile, onRefresh: refreshEmbed });
      pending.lastEditedTime = timeStr;
      state.uiState.suggestMode = "agenda-edit-chain";
      ui.textBox.value = "";
      await rerender();
      return;
    }
    if (pending.action === "plan-end-manual") {
      await processStartRequest({ activityName: pending.activity, startTime: pending.startTime, plannedEndTime: timeStr, existingRowId: pending.existingId, preciseUnix: pending.preciseTimestamp });
      return;
    }
    pending.startTime = timeStr;
    pending.preciseTimestamp = preciseTs;
    state.uiState.suggestMode = "agenda-plan-method";
    ui.textBox.value = "";
    await rerender();
  }

  function handleDurationInput(minutes) {
    const pending = getPending();
    if (pending.action === "edit") {
      const baseMins = state.time.timeToMins(pending.lastEditedTime);
      const newMins = pending.editField === "end" ? baseMins + minutes : baseMins - minutes;
      editActivity(state, { rowId: pending.existingId, field: pending.editField, newVal: state.time.minsToTime(newMins), targetFile: pending.targetFile, onRefresh: refreshEmbed });
      closeAndClear();
    }
  }

  async function maybePromptResumeFromUnix(interruptUnix, excludeNames = []) {
    const candidates = await queries.getInterruptedActivitiesByUnix(interruptUnix, excludeNames);
    if (candidates.length === 0) return false;
    const activeNowObjs = await queries.getActiveActivities();
    const activeNowNames = activeNowObjs.map((a) => a.name);
    getPending().resumable = candidates.filter((c) => !activeNowNames.includes(c.name));
    if (getPending().resumable.length === 0) return false;
    state.uiState.suggestMode = "agenda-resume";
    panel.style.display = "block";
    state.uiState.panelOpen = true;
    reposition();
    await rerender();
    setTimeout(() => ui.textBox.focus(), 0);
    return true;
  }

  function findDotCommaAnchor() {
    const s = ui.textBox.value;
    const cursor = ui.textBox.selectionStart ?? s.length;
    for (let i = cursor - 1; i >= 1; i -= 1) {
      const ch = s[i];
      if (ch === " " || ch === "\n" || ch === "\t") break;
      if (ch === "," && s[i - 1] === ".") return i - 1;
    }
    return null;
  }

  function handleInput() {
    if (findDotCommaAnchor() !== null) {
      state.uiState.suggestMode = "agenda-keysentences";
      state.uiState.panelOpen = true;
      panel.style.display = "block";
      reposition();
      rerender();
      return;
    }
    if (state.uiState.panelOpen && state.uiState.suggestMode === "agenda-keysentences") closePanel();
    if (state.uiState.panelOpen) rerender();
  }

  function handleKeydown(e) {
    const pending = getPending();
    if (e.key === "<" && ui.textBox.value.trim() === "") {
      setTimeout(() => {
        state.uiState.suggestMode = "agenda-root";
        panel.style.display = "block";
        state.uiState.panelOpen = true;
        reposition();
        rerender();
      }, 10);
      return;
    }
    if (e.key === "Escape") {
      if (state.uiState.panelOpen) {
        closePanel();
        e.preventDefault();
      } else if (ui.textBox.value.trim() === "") {
        state.uiState.suggestMode = "agenda-consumption-select";
        panel.style.display = "block";
        state.uiState.panelOpen = true;
        reposition();
        rerender();
      }
      return;
    }
    if (!state.uiState.panelOpen) {
      if (e.key === "Enter") {
        e.preventDefault();
        ui.onSend?.();
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      restoreHistory();
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      triggerForward();
      return;
    }

    if (state.uiState.suggestMode === "agenda-time-hour" && e.key === "Enter") {
      e.preventDefault();
      const raw = ui.textBox.value.trim();
      if (/^\\d{1,2}$/.test(raw) && Number(raw) >= 0 && Number(raw) <= 23) {
        pending.partialTime = pending.partialTime || {};
        pending.partialTime.h = Number(raw);
        state.uiState.suggestMode = "agenda-time-minute";
        ui.textBox.value = "";
        ui.textBox.placeholder = "MM";
        rerender();
      }
      return;
    }
    if (state.uiState.suggestMode === "agenda-time-minute" && e.key === "Enter") {
      e.preventDefault();
      const raw = ui.textBox.value.trim();
      if (/^\\d{1,2}$/.test(raw) && Number(raw) >= 0 && Number(raw) <= 59) {
        handleTimeSelection(`${String(pending.partialTime.h).padStart(2, "0")}:${String(raw).padStart(2, "0")}`);
      }
      return;
    }
    if (state.uiState.suggestMode === "agenda-plan-duration" && e.key === "Enter") {
      e.preventDefault();
      const raw = ui.textBox.value.trim();
      if (/^\\d+$/.test(raw) && Number(raw) > 0) {
        const endMins = state.time.timeToMins(getPending().startTime) + Number(raw);
        processStartRequest({ activityName: getPending().activity, startTime: getPending().startTime, plannedEndTime: state.time.minsToTime(endMins), existingRowId: getPending().existingId, preciseUnix: getPending().preciseTimestamp });
      }
      return;
    }
    if (state.uiState.suggestMode === "agenda-edit-duration" && e.key === "Enter") {
      e.preventDefault();
      const raw = ui.textBox.value.trim();
      if (/^\\d+$/.test(raw) && Number(raw) > 0) handleDurationInput(Number(raw));
      return;
    }
    if (state.uiState.suggestMode === "agenda-rename-input" && e.key === "Enter") {
      e.preventDefault();
      const raw = ui.textBox.value.trim();
      if (raw) {
        editActivity(state, { rowId: getPending().existingId, field: "name", newVal: raw, targetFile: getPending().targetFile, onRefresh: refreshEmbed });
        closeAndClear();
      }
      return;
    }

    if (state.uiState.suggestMode === "agenda-consumption-amount" && e.key === "Enter") {
      e.preventDefault();
      const raw = ui.textBox.value.trim();
      recordConsumption(state, { item: getPending().consumptionItem, amount: raw === "" ? "1" : raw }).then(() => closeAndClear());
      return;
    }
    if (state.uiState.suggestMode === "agenda-consumption-double-1" && e.key === "Enter") {
      e.preventDefault();
      getPending().tempStorage.val1 = ui.textBox.value.trim() || "1";
      state.uiState.suggestMode = "agenda-consumption-double-2";
      ui.textBox.value = "";
      rerender();
      return;
    }
    if (state.uiState.suggestMode === "agenda-consumption-double-2" && e.key === "Enter") {
      e.preventDefault();
      const val2 = ui.textBox.value.trim() || "-";
      recordConsumption(state, { item: getPending().consumptionItem, amount: `${getPending().tempStorage.val1} (${val2})` }).then(() => closeAndClear());
      return;
    }

    if (["agenda-time-hour", "agenda-time-minute", "agenda-plan-duration", "agenda-edit-duration"].includes(state.uiState.suggestMode)) {
      if (e.key.length === 1 && !/\\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
      return;
    }

    const items = listEl.querySelectorAll(".suggest-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(state.uiState.activeIndex + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(state.uiState.activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = items[state.uiState.activeIndex];
      if (selected) {
        const data = {
          code: selected.dataset.code,
          value: selected.dataset.value,
          time: selected.dataset.time,
          custom: selected.dataset.custom === "true",
          method: selected.dataset.method,
          id: selected.dataset.id,
          precise: selected.dataset.precise === "true",
          field: selected.dataset.field,
          choice: selected.dataset.choice,
          start: selected.dataset.start,
          end: selected.dataset.end,
          file: selected.dataset.file,
        };
        selectItem(data);
      }
    }
  }

  function openAgendaRoot() {
    state.uiState.suggestMode = "agenda-root";
    panel.style.display = "block";
    state.uiState.panelOpen = true;
    reposition();
    rerender();
  }

  function openConsumption() {
    state.uiState.suggestMode = "agenda-consumption-select";
    panel.style.display = "block";
    state.uiState.panelOpen = true;
    reposition();
    rerender();
  }

  function destroy() {
    try {
      ui.panelHost.removeChild(panel);
    } catch (e) {
      /* ignore */
    }
  }

  return {
    panel,
    rerender,
    closePanel,
    reposition,
    handleInput,
    handleKeydown,
    openAgendaRoot,
    openConsumption,
    maybePromptResumeFromUnix,
    destroy,
  };
}

module.exports = { createSuggester };
