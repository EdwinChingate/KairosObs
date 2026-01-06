const { pad } = require("./pad");

/**
 * Current date/time helpers used across the planner.
 * @returns {Object} Exposes formatted date, day, and time strings.
 */
function createNowHelpers() {
  const nowDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const nowToday = () => {
    const d = new Date();
    return `${pad(d.getDate())}`;
  };

  const nowTime = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return { nowDate, nowToday, nowTime };
}

module.exports = { createNowHelpers };
