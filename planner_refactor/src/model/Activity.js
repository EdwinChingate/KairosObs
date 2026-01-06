/**
 * Activity domain object captured from agenda tables.
 * @param {Object} params - Activity attributes.
 * @param {string|number} params.id - Unique agenda row identifier.
 * @param {string} params.name - Activity label.
 * @param {string} params.start - Start cell value (may include tags).
 * @param {string} params.end - End cell value (may include tags).
 * @param {string} params.sourceFile - Originating file path.
 * @param {string} [params.sourceType] - Source label (Desktop/Mobile/Log).
 * @returns {Object} Activity.
 */
function Activity({ id, name, start, end, sourceFile, sourceType = "Desktop" }) {
  return { id: String(id), name, start, end, sourceFile, sourceType };
}

module.exports = { Activity };
