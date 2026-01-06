const { logActivityChange } = require("./logActivityChange");

/**
 * Non-destructive delete of an activity.
 * @param {Object} state - PlannerState.
 * @param {Object} payload - Delete details.
 * @param {string|number} payload.rowId - Activity id.
 * @param {string} payload.activityName - Name for logging.
 * @param {string|null} [payload.targetFile] - Source file.
 * @param {boolean} [payload.skipRefresh] - Skip refresh callback.
 * @param {Function} [payload.onRefresh] - Optional refresh handler.
 */
async function deleteActivity(state, payload) {
  const { rowId, activityName, targetFile = null, skipRefresh = false, onRefresh } = payload;
  const sourceFile = targetFile || state.primaryAgendaFile;
  try {
    if (sourceFile === state.primaryAgendaFile) {
      const content = await state.io.read(sourceFile);
      const lines = String(content).split("\n");
      const newLines = lines.filter((l) => !l.match(new RegExp(`^\\|\\s*${rowId}\\s*\\|`)));
      if (lines.length !== newLines.length) {
        await state.io.write(sourceFile, newLines.join("\n"));
        await logActivityChange(state, { actId: rowId, name: activityName, startVal: "DELETED", endVal: "DELETED" });
      }
    } else {
      const tombstone = `| ${rowId} | ${activityName.padEnd(28)} | DELETED | DELETED |`;
      await state.io.append(state.primaryAgendaFile, `${tombstone}\n`);
      await logActivityChange(state, { actId: rowId, name: activityName, startVal: "DELETED", endVal: "DELETED" });
    }
    if (!skipRefresh && typeof onRefresh === "function") setTimeout(() => onRefresh(), 50);
  } catch (e) {
    console.error("Delete Error", e);
  }
}

module.exports = { deleteActivity };
