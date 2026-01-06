const { loadCalendarData } = require("./loadCalendarData");
const { drawCalendarView } = require("./drawCalendarView");

/**
 * Load calendar nodes then draw into the embed container.
 * @param {Object} state - PlannerState.
 * @param {HTMLElement} embedBox - Target element.
 */
async function refreshEmbed(state, embedBox) {
  await loadCalendarData(state, state.currentPlannerDate);
  drawCalendarView(state, embedBox);
}

module.exports = { refreshEmbed };
