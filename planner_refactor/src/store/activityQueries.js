const { buildUnifiedActivityMap } = require("./unifiedActivityMap");

/**
 * Activity query helpers that operate on the unified activity map.
 * @param {Object} state - PlannerState.
 * @returns {Object} Query functions.
 */
function createActivityQueries(state) {
  const getActiveActivities = async () => {
    try {
      const unifiedMap = await buildUnifiedActivityMap(state);
      const active = [];
      const nowMins = state.time.timeToMins(state.now.nowTime());
      unifiedMap.forEach((act) => {
        const startCol = act.start.replace(/<.*?>/g, "").trim();
        const endCol = act.end.replace(/<.*?>/g, "").trim();
        if (startCol.startsWith("<start") || (/^\\d{1,2}:\\d{2}/.test(startCol) && state.time.timeToMins(startCol) > nowMins)) return;
        if (endCol.startsWith("<end") || endCol === "" || (/^\\d{1,2}:\\d{2}/.test(endCol) && state.time.timeToMins(endCol) > nowMins)) {
          active.push({ name: act.name, sourceFile: act.sourceFile });
        }
      });
      return active;
    } catch (e) {
      return [];
    }
  };

  const getPlannedActivities = async () => {
    try {
      const unifiedMap = await buildUnifiedActivityMap(state);
      const planned = [];
      const nowMins = state.time.timeToMins(state.now.nowTime());
      unifiedMap.forEach((act) => {
        const startVal = act.start.trim();
        let isPlanned = false;
        let planTimeDisplay = "Pending";
        if (startVal.startsWith("<start")) isPlanned = true;
        else if (/^\\d{1,2}:\\d{2}/.test(startVal)) {
          const cleanStart = startVal.replace(/<.*?>/g, "").trim();
          if (state.time.timeToMins(cleanStart) > nowMins) {
            isPlanned = true;
            planTimeDisplay = cleanStart;
          }
        }
        if (isPlanned) planned.push({ id: act.id, name: act.name, planTime: planTimeDisplay, sourceFile: act.sourceFile });
      });
      return planned;
    } catch (e) {
      return [];
    }
  };

  const getAllActivities = async () => {
    try {
      const unifiedMap = await buildUnifiedActivityMap(state);
      return Array.from(unifiedMap.values())
        .map((act) => {
          const s = act.start.replace(/<.*?>/g, "").trim() || "---";
          const e = act.end.replace(/<.*?>/g, "").trim() || "---";
          const sourceLabel = act.sourceFile.includes("_m") ? "(M)" : "(D)";
          return { id: act.id, name: act.name, start: s, end: e, display: `${act.name} ${sourceLabel}`, sourceFile: act.sourceFile };
        })
        .reverse();
    } catch (e) {
      return [];
    }
  };

  const getInterruptedActivitiesByUnix = async (interruptUnix, excludeNames = []) => {
    try {
      const unifiedMap = await buildUnifiedActivityMap(state);
      const targetTag = `<u${interruptUnix}>`;
      const candidates = [];
      unifiedMap.forEach((act) => {
        if (excludeNames.includes(act.name)) return;
        const endCol = act.end || "";
        if (!endCol.includes(targetTag)) return;
        let originalPlan = null;
        const tMatch = endCol.match(/<t(\\d{1,2}-\\d{2})>/);
        if (tMatch) originalPlan = tMatch[1].replace("-", ":");
        candidates.push({ name: act.name, endTime: originalPlan });
      });
      return candidates;
    } catch (e) {
      return [];
    }
  };

  return {
    getActiveActivities,
    getPlannedActivities,
    getAllActivities,
    getInterruptedActivitiesByUnix,
  };
}

module.exports = { createActivityQueries };
