const { ConsumptionItem } = require("../model/ConsumptionItem");

/**
 * Parse a consumption log row into a ConsumptionItem.
 * @param {string} line - Markdown row.
 * @returns {ConsumptionItem|null}
 */
function parseConsumptionRow(line) {
  const match = line.match(
    /^\|\s*(\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.*?)\s*\|\s*(\d{1,2}:\d{2})\s*\|\s*(.*?)\s*\|/
  );
  if (!match) return null;
  return ConsumptionItem({
    id: Number(match[1]),
    date: match[2],
    item: match[3].trim(),
    time: match[4],
    amount: match[5].trim(),
  });
}

module.exports = { parseConsumptionRow };
