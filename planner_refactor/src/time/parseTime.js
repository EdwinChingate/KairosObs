/**
 * Parse an HH:mm string into total minutes.
 * @param {string} str - Formatted time string.
 * @returns {number|null} Minutes or null when invalid.
 */
function parseTime(str) {
  if (!str) return null;
  const match = String(str).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

module.exports = { parseTime };
