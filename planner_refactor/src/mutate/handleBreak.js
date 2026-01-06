const { createActivityQueries } = require("../store/activityQueries");
const { endActivity } = require("./endActivity");
const { startActivity } = require("./startActivity");

/**
 * Toggle break status. Returns resume candidates when ending a break.
 * @param {Object} state - PlannerState.
 * @param {Function} [onRefresh] - Optional refresh callback.
 * @returns {Promise<Object>} Outcome with resumeCandidates.
 */
async function handleBreak(state, onRefresh) {
  const queries = createActivityQueries(state);
  const active = await queries.getActiveActivities();
  const isOnBreak = active.some((a) => a.name === "Break");
  const nowStr = state.now.nowTime();
  const ts = Date.now();

  if (isOnBreak) {
    const activeBreaks = active.filter((a) => a.name === "Break");
    let resumeCandidates = [];
    for (let i = 0; i < activeBreaks.length; i += 1) {
      const brk = activeBreaks[i];
      const isLast = i === activeBreaks.length - 1;
      const breakStartUnix = await endActivity(state, { activityName: "Break", endTime: nowStr, preciseUnix: ts, targetFile: brk.sourceFile, skipRefresh: !isLast, onRefresh });
      if (breakStartUnix) {
        const candidates = await queries.getInterruptedActivitiesByUnix(breakStartUnix, ["Break"]);
        resumeCandidates = resumeCandidates.concat(candidates);
      }
    }
    return { ended: true, resumeCandidates };
  }

  if (active.length > 0) {
    for (let i = 0; i < active.length; i += 1) {
      await endActivity(state, { activityName: active[i].name, endTime: nowStr, preciseUnix: ts, targetFile: active[i].sourceFile, skipRefresh: true });
    }
  }
  await startActivity(state, { activityName: "Break", startTime: nowStr, plannedEndTime: null, existingRowId: null, preciseUnix: ts, skipRefresh: false, onRefresh });
  return { started: true, resumeCandidates: [] };
}

module.exports = { handleBreak };
