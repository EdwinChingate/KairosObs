const { ensureLogFilesForDate } = require("../mutate/ensureFiles");
const { parseThoughtLogRow } = require("../parse/thoughtLogRow");

/**
 * Render the thoughts log into the UI list.
 * @param {Object} state - PlannerState.
 * @param {HTMLElement} logBox - Target container.
 */
async function refreshThoughtLog(state, logBox) {
  const date = state.currentPlannerDate;
  await ensureLogFilesForDate(state, date);
  const thoughtsFile = state.paths.getThoughtsFile(date);
  const txt = await state.io.read(thoughtsFile).catch(() => null);
  logBox.innerHTML = "";
  if (!txt) return;
  const rows = [];
  String(txt)
    .split("\n")
    .forEach((line) => {
      const row = parseThoughtLogRow(line);
      if (row) rows.push(row);
    });
  rows
    .slice(-50)
    .reverse()
    .forEach((r) => {
      const msg = logBox.createEl("div", { cls: "msg" });
      msg.createEl("div", { cls: "meta", text: `- ${r.comment} (${r.time}-${r.id})` });
    });
  logBox.scrollTop = logBox.scrollHeight;
}

module.exports = { refreshThoughtLog };
