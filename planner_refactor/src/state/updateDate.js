/**
 * Update planner date and derived file paths.
 * @param {Object} state - PlannerState instance.
 * @param {string} dateStr - Target date YYYY-MM-DD.
 * @returns {Object} Updated derived paths.
 */
function updatePlannerDate(state, dateStr) {
  state.currentPlannerDate = String(dateStr);
  state.primaryAgendaFile = state.paths.getPrimaryAgendaFile(state.currentPlannerDate);
  state.consumptionLogFile = state.paths.getConsumptionLogFile(state.currentPlannerDate);
  return {
    primaryAgendaFile: state.primaryAgendaFile,
    consumptionLogFile: state.consumptionLogFile,
  };
}

module.exports = { updatePlannerDate };
