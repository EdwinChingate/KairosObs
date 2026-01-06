const { buildUnifiedActivityMap } = require("../store/unifiedActivityMap");

/**
 * Gap detection alert logic reused by UI.
 * @param {Object} state - PlannerState.
 * @returns {Promise<{alert:string, active:boolean}>} Alert message (or empty).
 */
async function checkNotifications(state) {
  try {
    const unifiedMap = await buildUnifiedActivityMap(state);
    const nowMins = state.time.timeToMins(state.now.nowTime());
    let activeFound = false;
    let globalLastEnd = -1;

    unifiedMap.forEach((act) => {
      const startCol = act.start.replace(/<.*?>/g, "").trim();
      const endCol = act.end.replace(/<.*?>/g, "").trim();
      if (/^\\d{1,2}:\\d{2}/.test(startCol)) {
        const sMins = state.time.timeToMins(startCol);
        if (sMins <= nowMins) {
          let isEndFuture = true;
          if (/^\\d{1,2}:\\d{2}/.test(endCol)) {
            if (state.time.timeToMins(endCol) <= nowMins) isEndFuture = false;
          }
          if (isEndFuture) activeFound = true;
        }
        if (/^\\d{1,2}:\\d{2}/.test(endCol)) {
          const eMins = state.time.timeToMins(endCol);
          if (eMins <= nowMins && eMins > globalLastEnd) globalLastEnd = eMins;
        }
      }
    });

    let alertMsg = "";
    if (!activeFound && globalLastEnd !== -1) {
      const gap = nowMins - globalLastEnd;
      if (gap >= 10) alertMsg = `⚠️ No Activity for ${gap} min!`;
    }
    return { alert: alertMsg };
  } catch (e) {
    return { alert: "" };
  }
}

module.exports = { checkNotifications };
