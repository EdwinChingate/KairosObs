/**
 * EditEvent represents a change recorded in the EdLog.
 * @param {Object} params - Event attributes.
 * @param {number} params.logId - Incremental log identifier.
 * @param {string|number} params.activityId - Activity id.
 * @param {string} params.date - Date string (YYYY-MM-DD).
 * @param {string} params.time - Time string (HH:mm).
 * @param {string} params.activity - Activity name.
 * @param {string} params.start - Start value.
 * @param {string} params.end - End value.
 * @returns {Object} EditEvent.
 */
function EditEvent({ logId, activityId, date, time, activity, start, end }) {
  return { logId, activityId: String(activityId), date, time, activity, start, end };
}

module.exports = { EditEvent };
