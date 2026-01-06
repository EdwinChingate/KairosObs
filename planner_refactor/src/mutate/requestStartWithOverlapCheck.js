const { createActivityQueries } = require("../store/activityQueries");
const { startActivity } = require("./startActivity");

/**
 * Start an activity, optionally prompting when overlap is detected.
 * @param {Object} state - PlannerState.
 * @param {Object} payload - Start parameters.
 * @returns {Promise<Object>} Outcome describing whether a prompt is needed.
 */
async function requestStartWithOverlapCheck(state, payload) {
  const { activityName, startTime, plannedEndTime, existingRowId, preciseUnix, onRefresh } = payload;
  try {
    const queries = createActivityQueries(state);
    if (preciseUnix && String(state.currentPlannerDate) === state.now.nowDate()) {
      const active = await queries.getActiveActivities();
      const activeFiltered = active.filter((a) => a.name !== activityName);
      if (activeFiltered.length > 0) {
        return {
          needsPrompt: true,
          active: activeFiltered,
          request: { activityName, startTime, plannedEndTime, existingRowId, preciseUnix, onRefresh },
        };
      }
    }
    await startActivity(state, { activityName, startTime, plannedEndTime, existingRowId, preciseUnix, onRefresh });
    return { needsPrompt: false };
  } catch (e) {
    console.error("Overlap Check Error", e);
    return { needsPrompt: false };
  }
}

module.exports = { requestStartWithOverlapCheck };
