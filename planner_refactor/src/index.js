/**
 * DataviewJS entrypoint that wires together the modular planner.
 * This file should be bundled into a single DataviewJS block via tools/bundle.py.
 */
const { createPlannerState } = require("./state/PlannerState");
const { updatePlannerDate } = require("./state/updateDate");
const { ensurePrimaryAgendaFile, ensureLogFilesForDate } = require("./mutate/ensureFiles");
const { logThought } = require("./mutate/logThought");
const { handleBreak } = require("./mutate/handleBreak");
const { refreshThoughtLog } = require("./ui/logPanel");
const { baseCss } = require("./ui/ui_shared/baseStyles");
const { refreshEmbed } = require("./ui/calendar/refreshEmbed");
const { checkNotifications } = require("./notify/checkNotifications");
const { createSuggester } = require("./ui/suggester/suggester");

(function initPlanner() {
  const CONFIG = { FORCE_MOBILE_MODE: false };
  const state = createPlannerState({ app, dv, config: CONFIG });

  const wrap = this.container.createEl("div", { cls: "chat-wrap" });
  const component = this.component;
  wrap.createEl("style", { text: baseCss });

  const sourceRow = wrap.createEl("div", { cls: "row" });
  const sourceBox = sourceRow.createEl("textarea", { cls: "ref", text: state.device.isMobile ? "edwin-mobile" : "edwin" });
  const task = sourceRow.createEl("textarea", { cls: "ref2", text: "" });
  task.tabIndex = -1;
  sourceBox.tabIndex = -1;

  const textBox = wrap.createEl("textarea", { placeholder: "Type " });
  const actions = wrap.createEl("div", { cls: "row" });

  const toDo = actions.createEl("button", { cls: "btn", text: "toDo" });
  const editBtn = actions.createEl("button", { cls: "btn", text: "<" });
  const consumeBtn = actions.createEl("button", { cls: "btn", text: "Consume" });
  const breakBtn = actions.createEl("button", { cls: "btn", text: "Break" });
  const sendBtn = actions.createEl("button", { cls: "btn", text: "Send ⏎" });
  const modeLabel = state.device.isMobile ? "(M)" : "";
  const dateBtn = actions.createEl("button", { cls: "btn", text: `${state.currentPlannerDate} ${modeLabel}` });
  const embedBtn = actions.createEl("button", { cls: "btn", text: "Agenda" });

  const logBox = wrap.createEl("div", { cls: "log" });
  const embedBox = wrap.createEl("div", { cls: "embed-box" });

  const calendarBox = document.createElement("div");
  calendarBox.className = "cal-box";
  calendarBox.style.display = "none";
  document.body.appendChild(calendarBox);
  component.register(() => {
    try {
      calendarBox.remove();
    } catch (e) {
      /* ignore */
    }
  });

  let calViewYear = Number(String(state.currentPlannerDate).split("-")[0] || new Date().getFullYear());
  let calViewMonth = Number(String(state.currentPlannerDate).split("-")[1] || new Date().getMonth() + 1) - 1;

  async function sendThought() {
    const content = textBox.value.trim();
    if (!content) return;
    await logThought(state, { content, source: sourceBox.value.trim() });
    sourceBox.value = state.device.isMobile ? "edwin-mobile" : "edwin";
    textBox.value = "";
    await refreshThoughtLog(state, logBox);
    textBox.focus();
  }

  const suggester = createSuggester(
    state,
    { textBox, taskBox: task, panelHost: document.body, onSend: sendThought },
    () => refreshEmbed(state, embedBox)
  );
  component.register(() => suggester.destroy());

  function fmtDate(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function renderCalendar() {
    const first = new Date(calViewYear, calViewMonth, 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const prevDays = new Date(calViewYear, calViewMonth, 0).getDate();
    const todayStr = state.now.nowDate();
    calendarBox.innerHTML = "";
    const head = document.createElement("div");
    head.className = "cal-head";
    const navL = document.createElement("div");
    navL.className = "cal-nav";
    const byPrevYear = document.createElement("button");
    byPrevYear.textContent = "«";
    const byPrevMonth = document.createElement("button");
    byPrevMonth.textContent = "‹";
    const byNextMonth = document.createElement("button");
    byNextMonth.textContent = "›";
    const byNextYear = document.createElement("button");
    byNextYear.textContent = "»";
    byPrevYear.onclick = () => {
      calViewYear -= 1;
      renderCalendar();
    };
    byNextYear.onclick = () => {
      calViewYear += 1;
      renderCalendar();
    };
    byPrevMonth.onclick = () => {
      calViewMonth -= 1;
      if (calViewMonth < 0) {
        calViewMonth = 11;
        calViewYear -= 1;
      }
      renderCalendar();
    };
    byNextMonth.onclick = () => {
      calViewMonth += 1;
      if (calViewMonth > 11) {
        calViewMonth = 0;
        calViewYear += 1;
      }
      renderCalendar();
    };
    navL.append(byPrevYear, byPrevMonth);
    const title = document.createElement("div");
    title.className = "cal-title";
    title.textContent = `${monthName(calViewMonth)} ${calViewYear}`;
    const navR = document.createElement("div");
    navR.className = "cal-nav";
    navR.append(byNextMonth, byNextYear);
    head.append(navL, title, navR);
    const grid = document.createElement("div");
    grid.className = "cal-grid";
    for (let i = 0; i < 42; i += 1) {
      const cell = document.createElement("div");
      cell.className = "cal-day";
      let y = calViewYear;
      let m = calViewMonth;
      let d = 0;
      if (i < startDow) {
        d = prevDays - (startDow - 1 - i);
        cell.classList.add("muted");
        m = calViewMonth - 1;
        y = calViewYear;
        if (m < 0) {
          m = 11;
          y -= 1;
        }
      } else if (i >= startDow + daysInMonth) {
        d = i - (startDow + daysInMonth) + 1;
        cell.classList.add("muted");
        m = calViewMonth + 1;
        y = calViewYear;
        if (m > 11) {
          m = 0;
          y += 1;
        }
      } else {
        d = i - startDow + 1;
      }
      const ds = fmtDate(y, m, d);
      cell.textContent = String(d);
      if (ds === todayStr) cell.classList.add("today");
      if (ds === state.currentPlannerDate) cell.classList.add("selected");
      cell.onclick = () => {
        setPlannerDate(ds);
        calendarBox.style.display = "none";
      };
      grid.appendChild(cell);
    }
    const week = document.createElement("div");
    week.className = "cal-week";
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((w) => {
      const d = document.createElement("div");
      d.textContent = w;
      week.appendChild(d);
    });
    calendarBox.append(head, week, grid);
  }

  function positionCalendar() {
    const r = dateBtn.getBoundingClientRect();
    const w = 320;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    const top = Math.min(r.bottom + 6, window.innerHeight - 380);
    calendarBox.style.left = `${left}px`;
    calendarBox.style.top = `${top}px`;
  }

  function openCalendar() {
    renderCalendar();
  }

  function monthName(m) {
    try {
      return new Date(2000, m, 1).toLocaleDateString("en-US", { month: "long" });
    } catch (e) {
      return String(m + 1);
    }
  }

  async function setPlannerDate(dStr) {
    updatePlannerDate(state, dStr);
    dateBtn.textContent = `${state.currentPlannerDate} ${modeLabel}`;
    await ensureLogFilesForDate(state, state.currentPlannerDate);
    await ensurePrimaryAgendaFile(state);
    if (embedBox.style.display !== "none") refreshEmbed(state, embedBox);
    await refreshThoughtLog(state, logBox);
  }

  async function runNotificationCheck() {
    const result = await checkNotifications(state);
    if (result.alert) {
      task.textContent = result.alert;
      task.style.color = "#ff4444";
    } else {
      task.textContent = "";
      task.style.color = "";
    }
  }

  dateBtn.onclick = (e) => {
    e.stopPropagation();
    if (calendarBox.style.display === "none") {
      openCalendar();
      positionCalendar();
      calendarBox.style.display = "block";
    } else calendarBox.style.display = "none";
  };

  sendBtn.addEventListener("click", () => {
    sendBtn.textContent = "...";
    sendThought();
    setTimeout(() => (sendBtn.textContent = "Send ⏎"), 500);
  });

  toDo.addEventListener("click", () => {
    sourceBox.value = sourceBox.value === "toDo" ? "edwin" : "toDo";
  });

  editBtn.addEventListener("click", async () => {
    editBtn.textContent = "...";
    await ensurePrimaryAgendaFile(state);
    suggester.openAgendaRoot();
    textBox.focus();
    setTimeout(() => (editBtn.textContent = "<"), 500);
  });

  consumeBtn.addEventListener("click", () => {
    consumeBtn.textContent = "...";
    suggester.openConsumption();
    textBox.focus();
    setTimeout(() => (consumeBtn.textContent = "Consume"), 500);
  });

  breakBtn.addEventListener("click", async () => {
    breakBtn.textContent = "...";
    const outcome = await handleBreak(state, () => refreshEmbed(state, embedBox));
    if (outcome.resumeCandidates && outcome.resumeCandidates.length > 0) {
      state.uiState.pending.resumable = outcome.resumeCandidates;
      state.uiState.suggestMode = "agenda-resume";
      suggester.reposition();
      suggester.rerender();
      suggester.panel.style.display = "block";
      state.uiState.panelOpen = true;
    } else {
      task.textContent = outcome.started ? "Started Break." : "Break ended.";
    }
    setTimeout(() => (breakBtn.textContent = "Break"), 500);
  });

  embedBtn.onclick = async () => {
    if (embedBox.style.display === "none") {
      await ensurePrimaryAgendaFile(state);
      await refreshEmbed(state, embedBox);
      embedBox.style.display = "block";
      embedBtn.textContent = "Hide Agenda";
    } else {
      embedBox.style.display = "none";
      embedBtn.textContent = "Agenda";
    }
  };

  textBox.addEventListener("input", () => suggester.handleInput());
  textBox.addEventListener("keydown", (e) => suggester.handleKeydown(e));

  (async () => {
    await ensurePrimaryAgendaFile(state);
    await refreshThoughtLog(state, logBox);
    await runNotificationCheck();
  })();

  const intervalId = setInterval(() => runNotificationCheck(), 30000);
  component.register(() => clearInterval(intervalId));
})(); 
