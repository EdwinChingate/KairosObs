// Planner log helpers
// Handles log creation, rendering, and send pipeline.
const PlannerRootLog = typeof window !== "undefined" ? window : globalThis;
PlannerRootLog.Planner = PlannerRootLog.Planner || {};

function InitPlannerLog(app, config, ui, utils) {
  let highResStart = performance.now();

  function DailyLogPath() {
    return `${config.LOG_FOLDER}/${utils.NowDateString()}-Thoughts_and_Observations.md`;
  }

  function DailyMetaPath() {
    return `${config.LOG_FOLDER}/meta_log/${utils.NowDateString()}.md`;
  }

  function RenderMsg(ts, note, noteId) {
    const msg = ui.logBox.createEl("div", { cls: "msg" });
    msg.createEl("div", { cls: "meta", text: `- ${note} (${ts}-${noteId})` });
    ui.logBox.scrollBottom = ui.logBox.scrollHeight;
  }

  async function LogUp() {
    const txt = await app.vault.adapter.read(DailyLogPath()).catch(() => null);
    if (!txt) return;
    const lines = txt.split("\n").slice(-50).reverse();
    lines.forEach((line) => {
      const parts = line.split("|");
      if (parts && parts[1] > 0) {
        RenderMsg(parts[1], parts[2], parts[3]);
      }
    });
  }

  async function CreateLogFile() {
    const logPath = DailyLogPath();
    const exists = await app.vault.adapter.exists(logPath);
    if (!exists) {
      await app.vault.create(logPath, "|id|Comment|Time|\n|---|---|---|");
    }
    const metaPath = DailyMetaPath();
    const metaExists = await app.vault.adapter.exists(metaPath);
    if (!metaExists) {
      await app.vault.create(metaPath, "|id|Source|Task|Duration (ms)|\n|---|---|---|---|");
    }
  }

  function TaskDisplayFromRaw(raw) {
    if (!raw) return "";
    const lines = raw.split(/\n/);
    const upper = lines[2]?.split(":")[1] || "";
    const lower = lines[1]?.split(":")[1] || "";
    return `${upper}\n${lower}`.trim();
  }

  async function UpdateTaskDisplay() {
    const raw = await app.vault.adapter.read(DailyLogPath()).catch(() => null);
    ui.taskBox.textContent = TaskDisplayFromRaw(raw) || "";
  }

  async function SendEntry() {
    const content = ui.textBox.value.trim();
    if (!content) return false;

    await CreateLogFile();
    const logPath = DailyLogPath();
    const metaPath = DailyMetaPath();
    const source = ui.sourceBox.value.trim() || config.DEFAULT_SOURCE;
    const ts = utils.NowTimeString();
    const logRaw = await app.vault.adapter.read(logPath);
    const noteId = logRaw.split(/\n/).length - 9;
    const duration = Math.floor(performance.now() - highResStart);

    try {
      await navigator.clipboard.writeText(content);
    } catch (e) {
      // ignore clipboard failures
    }

    await utils.AppendToFile(logPath, `|${noteId}|${content}|${ts}|\n`);
    await utils.AppendToFile(metaPath, `|${noteId}|${source}|${duration}|\n`);

    ui.sourceBox.value = config.DEFAULT_SOURCE;
    ui.textBox.value = "";
    ui.logBox.textContent = "";

    await UpdateTaskDisplay();
    await LogUp();

    highResStart = performance.now();
    ui.textBox.focus();
    return true;
  }

  function ResetTimer() {
    highResStart = performance.now();
    ui.textBox.value = "";
    return highResStart;
  }

  return {
    DailyLogPath,
    DailyMetaPath,
    RenderMsg,
    LogUp,
    CreateLogFile,
    UpdateTaskDisplay,
    SendEntry,
    ResetTimer
  };
}

PlannerRootLog.Planner.Log = {
  InitPlannerLog
};
