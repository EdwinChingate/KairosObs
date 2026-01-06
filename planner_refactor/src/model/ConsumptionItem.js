/**
 * Consumption entry captured in monthly log files.
 * @param {Object} params - Attributes.
 * @param {number|string} params.id - Row id.
 * @param {string} params.date - Date string.
 * @param {string} params.item - Item name.
 * @param {string} params.time - Time string.
 * @param {string} params.amount - Amount string.
 * @returns {Object} Consumption item model.
 */
function ConsumptionItem({ id, date, item, time, amount }) {
  return { id, date, item, time, amount };
}

module.exports = { ConsumptionItem };
