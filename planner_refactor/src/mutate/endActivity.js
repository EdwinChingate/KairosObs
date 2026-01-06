const { buildUnifiedActivityMap } = require("../store/unifiedActivityMap");
const { logActivityChange } = require("./logActivityChange");

/**
 * End an active activity and write result to agenda.
 * @param {Object} state - PlannerState.
 * @param {Object} payload - End parameters.
 * @param {string} payload.activityName - Target activity.
 * @param {string} payload.endTime - HH:mm string.
 * @param {number|null} [payload.preciseUnix] - Optional unix tag.
 * @param {string|null} [payload.targetFile] - Optional target file override.
 * @param {boolean} [payload.skipRefresh] - Skip refresh callback.
 * @param {Function} [payload.onRefresh] - Callback after write.
 * @returns {Promise<number|null>} Start unix tag (for resume prompt).
 */
async function endActivity(state, payload) {
  const { activityName, endTime, preciseUnix = null, targetFile = null, skipRefresh = false, onRefresh } = payload;
  try {
    const unifiedMap = await buildUnifiedActivityMap(state);
    let activity = null;
    for (const act of unifiedMap.values()) {
      if (act.name === activityName) activity = act;
    }
    if (!activity) return null;

    const ts = preciseUnix || state.time.getUnixFromString(endTime);
    const unixTag = ` <u${ts}>`;
    const actStart = activity.start;
    const startUnixMatch = actStart.match(/<u(\\d+)>/);
    const startUnix = startUnixMatch ? startUnixMatch[1] : null;
    const targetAgenda = targetFile || activity.sourceFile;

    if (targetAgenda === state.primaryAgendaFile) {
      const content = await state.io.read(state.primaryAgendaFile);
      const lines = String(content).split("\n");
      const rowIndex = lines.findIndex((l) => l.match(new RegExp(`^\\|\\s*${activity.id}\\s*\\|`)));
      if (rowIndex !== -1) {
        const parts = lines[rowIndex].split("|");
        const oldEnd = parts[4].trim();
        let newEndCell = endTime;
        if (/^\\d{1,2}:\\d{2}/.test(oldEnd) && !oldEnd.startsWith("<")) {
          const pureTime = oldEnd.replace(/<.*?>/g, "").trim();
          if (pureTime !== endTime) {
            const targetTag = pureTime.replace(":", "-");
            newEndCell = `${endTime} <t${targetTag}>`;
          }
        }
        newEndCell += unixTag;
        parts[4] = ` ${newEndCell} `;
        lines[rowIndex] = parts.join("|");
        await state.io.write(state.primaryAgendaFile, lines.join("\n"));
        await logActivityChange(state, { actId: activity.id, name: activityName, startVal: actStart, endVal: newEndCell });
      }
    } else {
      const newEndCell = `${endTime} ${unixTag}`;
      const newRow = `| ${activity.id} | ${activity.name.padEnd(28)} | ${activity.start.padEnd(10)} | ${newEndCell} |`;
      await state.io.append(state.primaryAgendaFile, `${newRow}\n`);
      await logActivityChange(state, { actId: activity.id, name: activityName, startVal: actStart, endVal: newEndCell });
    }

    if (!skipRefresh && typeof onRefresh === "function") setTimeout(() => onRefresh(), 50);
    return startUnix;
  } catch (e) {
    console.error("End Error", e);
    return null;
  }
}

module.exports = { endActivity };
