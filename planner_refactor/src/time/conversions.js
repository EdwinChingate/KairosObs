const { pad } = require("./pad");

/**
 * Convert time strings and minute counts between formats.
 * @returns {Object} Conversion helpers.
 */
function createTimeConversions() {
  const timeToMins = (value) => {
    const parts = String(value || "").split(":").map(Number);
    if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return NaN;
    return parts[0] * 60 + parts[1];
  };

  const minsToTime = (mins) => {
    let hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 23) hours -= 24;
    return `${pad(hours)}:${pad(minutes)}`;
  };

  const getUnixFromString = (timeStr) => {
    const d = new Date();
    const [h, m] = String(timeStr || "").split(":").map(Number);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };

  return { timeToMins, minsToTime, getUnixFromString };
}

module.exports = { createTimeConversions };
