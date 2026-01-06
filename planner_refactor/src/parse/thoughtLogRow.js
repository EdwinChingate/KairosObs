/**
 * Parse a Thoughts and Observations log row.
 * @param {string} line - Markdown table row.
 * @returns {Object|null} Parsed row with id/comment/time.
 */
function parseThoughtLogRow(line) {
  const match = line.match(/^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  return { id: match[1], comment: match[2], time: match[3] };
}

module.exports = { parseThoughtLogRow };
