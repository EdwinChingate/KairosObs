/**
 * Pad a number with a leading zero to ensure two-digit formatting.
 * @param {number|string} value - Numeric value to pad.
 * @returns {string} Two-character string representation.
 */
function pad(value) {
  return String(value).padStart(2, "0");
}

module.exports = { pad };
