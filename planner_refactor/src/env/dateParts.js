/**
 * Derive human friendly date components for front-matter.
 * @param {string} dateStr - YYYY-MM-DD.
 * @returns {Object} Parts object.
 */
function getDateParts(dateStr) {
  try {
    const [y, m, d] = String(dateStr).split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return {
      day_week: dt.toLocaleDateString("en-US", { weekday: "long" }),
      day: d,
      month: dt.toLocaleDateString("en-US", { month: "long" }),
      year: y,
    };
  } catch (e) {
    return { day_week: "", day: "", month: "", year: "" };
  }
}

module.exports = { getDateParts };
