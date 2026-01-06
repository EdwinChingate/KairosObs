const { EditEvent } = require("../model/EditEvent");

/**
 * Parse a single EdLog line.
 * @param {string} line - Markdown row.
 * @returns {EditEvent|null}
 */
function parseEdLogRow(line) {
  const regexLog =
    /\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(\d{2}:\d{2})\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/;
  const match = regexLog.exec(line);
  if (!match) return null;
  return EditEvent({
    logId: Number(match[1]),
    activityId: match[2].trim(),
    date: match[3],
    time: match[4],
    activity: match[5].trim(),
    start: match[6].trim(),
    end: match[7].trim(),
  });
}

module.exports = { parseEdLogRow };
