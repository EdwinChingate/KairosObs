const { ensureLogFilesForDate } = require("./ensureFiles");

/**
 * Append a thought entry to the daily log and meta log.
 * @param {Object} state - PlannerState.
 * @param {Object} payload - Log details.
 * @param {string} payload.content - Note content.
 * @param {string} payload.source - Source label.
 * @returns {Promise<number|null>} Created note id.
 */
async function logThought(state, payload) {
  const { content, source } = payload;
  if (!content) return null;
  const date = state.currentPlannerDate;
  const ts = state.now.nowTime();
  const thoughtsFile = state.paths.getThoughtsFile(date);
  const metaLogFile = state.paths.getMetaLogFile(date);

  await ensureLogFilesForDate(state, date);
  const tTxt = await state.io.read(thoughtsFile);
  let maxId = 0;
  String(tTxt)
    .split("\n")
    .forEach((l) => {
      const m = l.match(/^\\|\\s*(\\d+)\\s*\\|/);
      if (m) maxId = Math.max(maxId, Number(m[1]));
    });
  const noteId = maxId + 1;

  const duration = Math.floor(performance.now() - state.highResStart);
  try {
    navigator.clipboard.writeText(content);
  } catch (e) {
    /* clipboard best-effort */
  }
  const cleanContent = String(content).replace(/\\|/g, "\\\\|").replace(/\\r?\\n/g, " ");
  await state.io.append(thoughtsFile, `| ${noteId} | ${cleanContent}  | ${ts} <t-${Math.floor(state.highResStart)}> |
`);
  await state.io.append(metaLogFile, `| ${noteId} | ${source} | ${duration} |
`);
  state.highResStart = performance.now();
  return noteId;
}

module.exports = { logThought };
