/**
 * Append an activity change entry to the EdLog file.
 * @param {Object} state - PlannerState.
 * @param {Object} payload - Change details.
 * @param {string|number} payload.actId - Activity id.
 * @param {string} payload.name - Activity name.
 * @param {string} payload.startVal - Start column value.
 * @param {string} payload.endVal - End column value.
 */
async function logActivityChange(state, { actId, name, startVal, endVal }) {
  const date = state.currentPlannerDate;
  const logFile = state.paths.getEdLogFile(date);
  try {
    const logFolder = `${state.paths.AGENDA_BASE_PATH}EdLog`;
    await state.io.ensureFolder(logFolder);
    const header = `| LogID | ActID | Date | Time | Activity | Start | End |
|---|---|---|---|---|---|---|
`;
    await state.io.ensureFile(logFile, header);

    const txt = await state.io.read(logFile);
    let maxId = 0;
    String(txt)
      .split("\n")
      .forEach((line) => {
        const m = line.match(/^\\|\\s*(\\d+)\\s*\\|/);
        if (m) maxId = Math.max(maxId, Number(m[1]));
      });
    const logId = maxId + 1;
    const cleanName = String(name).trim().replace(/\\|/g, "");
    const cleanStart = String(startVal).replace(/<.*?>/g, "").trim();
    const cleanEnd = String(endVal).replace(/<.*?>/g, "").trim();
    const row = `| ${logId} | ${actId} | ${state.now.nowDate()} | ${state.now.nowTime()} | ${cleanName} | ${cleanStart} | ${cleanEnd} |
`;
    await state.io.append(logFile, row);
  } catch (e) {
    console.error("EdLog append failed", e);
  }
}

module.exports = { logActivityChange };
