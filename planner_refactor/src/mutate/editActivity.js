const { buildUnifiedActivityMap } = require("../store/unifiedActivityMap");
const { logActivityChange } = require("./logActivityChange");

/**
 * Edit an activity row (name, start, or end).
 * @param {Object} state - PlannerState.
 * @param {Object} payload - Edit details.
 * @param {string|number} payload.rowId - Activity id.
 * @param {"name"|"start"|"end"} payload.field - Field to edit.
 * @param {string} payload.newVal - New value.
 * @param {number|null} [payload.preciseUnix] - Optional unix tag.
 * @param {string|null} [payload.targetFile] - Optional source override.
 * @param {boolean} [payload.skipRefresh] - Skip refresh callback.
 * @param {Function} [payload.onRefresh] - Optional refresh function.
 */
async function editActivity(state, payload) {
  const { rowId, field, newVal, preciseUnix = null, targetFile = null, skipRefresh = false, onRefresh } = payload;
  try {
    const unifiedMap = await buildUnifiedActivityMap(state);
    const activity = unifiedMap.get(String(rowId));
    if (!activity) return;

    let pName = activity.name.trim();
    let pStart = activity.start.trim();
    let pEnd = activity.end.trim();

    if (field === "name") pName = newVal;
    else if (field === "start") {
      let newTimeStr = newVal;
      const tMatch = pStart.match(/<t(\\d{1,2}-\\d{2})>/);
      if (tMatch) newTimeStr = `${newVal} <t${tMatch[1]}>`;
      const ts = preciseUnix || state.time.getUnixFromString(newVal);
      newTimeStr += ` <u${ts}>`;
      pStart = newTimeStr;
    } else {
      let newTimeStr = newVal;
      const tMatch = pEnd.match(/<t(\\d{1,2}-\\d{2})>/);
      if (tMatch) newTimeStr = `${newVal} <t${tMatch[1]}>`;
      const ts = preciseUnix || state.time.getUnixFromString(newVal);
      newTimeStr += ` <u${ts}>`;
      pEnd = newTimeStr;
    }

    const sourceFile = targetFile || activity.sourceFile;
    if (sourceFile === state.primaryAgendaFile) {
      const content = await state.io.read(state.primaryAgendaFile);
      const lines = String(content).split("\n");
      const rowIndex = lines.findIndex((l) => l.match(new RegExp(`^\\|\\s*${rowId}\\s*\\|`)));
      if (rowIndex !== -1) {
        const parts = lines[rowIndex].split("|");
        parts[2] = ` ${pName.padEnd(28)} `;
        parts[3] = ` ${pStart.padEnd(10)} `;
        parts[4] = ` ${pEnd} `;
        lines[rowIndex] = parts.join("|");
        await state.io.write(state.primaryAgendaFile, lines.join("\n"));
      }
    } else {
      const newRow = `| ${rowId} | ${pName.padEnd(28)} | ${pStart.padEnd(10)} | ${pEnd} |`;
      await state.io.append(state.primaryAgendaFile, `${newRow}\n`);
    }

    await logActivityChange(state, { actId: rowId, name: pName, startVal: pStart, endVal: pEnd });
    if (!skipRefresh && typeof onRefresh === "function") setTimeout(() => onRefresh(), 50);
  } catch (e) {
    console.error("Edit Error", e);
  }
}

module.exports = { editActivity };
