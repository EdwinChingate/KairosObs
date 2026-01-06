const { parseAgendaRow } = require("../parse/agendaRow");
const { getDailyAgendaFiles } = require("./dailyAgendaFiles");

/**
 * Build unified activity map across all agenda files for the current date.
 * @param {Object} state - PlannerState.
 * @returns {Promise<Map<string, Object>>} Map of id -> Activity.
 */
async function buildUnifiedActivityMap(state) {
  const unified = new Map();
  const files = await getDailyAgendaFiles(state, state.currentPlannerDate);
  for (const file of files) {
    try {
      const path = file.path || file;
      if (await state.io.exists(path)) {
        const content = await state.io.read(path);
        const lines = String(content).split("\n");
        lines.forEach((line) => {
          const activity = parseAgendaRow(line, path, detectSourceType(path));
          if (!activity) return;
          if (activity.start === "DELETED" || activity.end === "DELETED") {
            if (unified.has(activity.id)) unified.delete(activity.id);
          } else {
            unified.set(activity.id, { ...activity, sourceFile: path });
          }
        });
      }
    } catch (e) {
      console.log("Skipping file:", file);
    }
  }
  return unified;
}

function detectSourceType(filePath) {
  if (!filePath) return "Desktop";
  if (filePath.includes("EdLog")) return "Log";
  if (filePath.includes("_m") || filePath.toLowerCase().includes("mobile")) return "Mobile";
  return "Desktop";
}

module.exports = { buildUnifiedActivityMap };
