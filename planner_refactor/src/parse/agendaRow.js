const { Activity } = require("../model/Activity");

/**
 * Parse a standard agenda table line into an Activity.
 * @param {string} line - Markdown table row.
 * @param {string} sourceFile - File path for provenance.
 * @param {string} [sourceType] - Human readable source (Desktop/Mobile).
 * @returns {Activity|null}
 */
function parseAgendaRow(line, sourceFile, sourceType = "Desktop") {
  if (!line.trim().startsWith("|") || line.includes("**Activity**") || line.includes("---")) return null;
  const parts = line.split("|");
  if (parts.length < 5) return null;
  const id = parts[1].trim();
  if (!id) return null;
  const name = parts[2].trim();
  const start = parts[3].trim();
  const end = parts[4].trim();
  return Activity({ id, name, start, end, sourceFile, sourceType });
}

module.exports = { parseAgendaRow };
