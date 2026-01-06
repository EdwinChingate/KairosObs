/**
 * Append a consumption entry, preserving split-range ids.
 * @param {Object} state - PlannerState.
 * @param {Object} payload - Consumption details.
 * @param {string} payload.item - Item name.
 * @param {string} payload.amount - Amount string.
 */
async function recordConsumption(state, payload) {
  const { item, amount } = payload;
  const dateStr = state.now.nowToday();
  const ts = state.now.nowTime();
  const file = state.consumptionLogFile;
  let fileContent = await state.io.read(file).catch(() => "");
  if (!fileContent) {
    fileContent = `| id | Date | Item | Time | Amount |
|---|---|---|---|---|
`;
    await state.io.ensureFile(file, fileContent);
  }
  const lines = String(fileContent).split("\n");
  let maxId = 0;
  lines.forEach((l) => {
    const m = l.match(/^\\|\\s*(\\d+)\\s*\\|/);
    if (m) maxId = Math.max(maxId, Number(m[1]));
  });
  const newId = state.device.isMobile ? (maxId < 100 ? 101 : maxId + 1) : maxId + 1;
  const row = `| ${newId} | ${dateStr} | ${item} | ${ts} | ${amount} |
`;
  await state.io.append(file, row);
  return { message: `Recorded: ${amount}x ${item} @ ${ts}` };
}

module.exports = { recordConsumption };
