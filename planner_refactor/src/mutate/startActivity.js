const { getNextTableId } = require("./getNextTableId");
const { ensurePrimaryAgendaFile } = require("./ensureFiles");
const { logActivityChange } = require("./logActivityChange");

/**
 * Start (or plan) an activity by writing to the agenda table.
 * @param {Object} state - PlannerState.
 * @param {Object} payload - Start parameters.
 * @param {string} payload.activityName - Activity title.
 * @param {string} payload.startTime - HH:mm string.
 * @param {string|null} [payload.plannedEndTime] - Optional planned end.
 * @param {string|null} [payload.existingRowId] - Existing id to overwrite.
 * @param {number|null} [payload.preciseUnix] - Optional unix tag.
 * @param {boolean} [payload.skipRefresh] - Skip embed refresh.
 * @param {Function} [payload.onRefresh] - Callback when refresh needed.
 */
async function startActivity(state, payload) {
  const {
    activityName,
    startTime,
    plannedEndTime = null,
    existingRowId = null,
    preciseUnix = null,
    skipRefresh = false,
    onRefresh,
  } = payload;

  try {
    await ensurePrimaryAgendaFile(state);
    const cleanTime = startTime;
    let unixTag = "";
    const startMins = state.time.timeToMins(cleanTime);
    const nowMins = state.time.timeToMins(state.now.nowTime());
    const todayStr = state.now.nowDate();
    const viewingToday = String(state.currentPlannerDate) === todayStr;
    const isFuturePlan = viewingToday && startMins > nowMins + 5;
    if (!isFuturePlan && viewingToday) {
      const ts = preciseUnix || state.time.getUnixFromString(cleanTime);
      unixTag = ` <u${ts}>`;
    }

    const content = await state.io.read(state.primaryAgendaFile);
    const lines = String(content).split("\n");
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();

    let finalId = existingRowId;
    let finalEnd = plannedEndTime ? ` ${plannedEndTime} ` : `<end-${existingRowId}>`;

    if (existingRowId) {
      const rowIndex = lines.findIndex((l) => l.match(new RegExp(`^\\|\\s*${existingRowId}\\s*\\|`)));
      if (rowIndex !== -1) {
        const parts = lines[rowIndex].split("|");
        parts[3] = ` ${cleanTime}${unixTag} `.padEnd(10);
        lines[rowIndex] = parts.join("|");
        finalEnd = parts[4];
      } else {
        lines.push(`| ${existingRowId}    | ${activityName.padEnd(28)} | ${cleanTime}${unixTag} | ${finalEnd} |`);
      }
    } else {
      finalId = await getNextTableId(state, state.primaryAgendaFile);
      finalEnd = plannedEndTime ? ` ${plannedEndTime} ` : `<end-${finalId}>`;
      lines.push(`| ${finalId}    | ${activityName.padEnd(28)} | ${cleanTime}${unixTag} | ${finalEnd} |`);
    }

    await state.io.write(state.primaryAgendaFile, `${lines.join("\n")}\n`);
    await logActivityChange(state, { actId: finalId, name: activityName, startVal: cleanTime, endVal: finalEnd });
    if (!skipRefresh && typeof onRefresh === "function") {
      setTimeout(() => onRefresh(), 50);
    }
  } catch (e) {
    console.error("Start Error", e);
  }
}

module.exports = { startActivity };
