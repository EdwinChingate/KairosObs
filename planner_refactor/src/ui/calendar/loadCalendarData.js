const { parseTime } = require("../../time/parseTime");
const { createTimeConversions } = require("../../time/conversions");
const { OFFSET_Y, PIXELS_PER_MIN } = require("./styles");
const { getDailyAgendaFiles } = require("../../store/dailyAgendaFiles");
const { parseAgendaRow } = require("../../parse/agendaRow");
const { parseEdLogRow } = require("../../parse/edLogRow");

const timeConversions = createTimeConversions();

/**
 * Load calendar nodes for a given date into state.calState.
 * @param {Object} state - PlannerState.
 * @param {string} dateStr - Target date.
 */
async function loadCalendarData(state, dateStr) {
  state.calState.currentDate = dateStr;
  state.calState.nodes = [];

  const folder = state.app.vault.getAbstractFileByPath(state.paths.AGENDA_BASE_PATH.slice(0, -1));
  if (!folder || !folder.children) return;

  const files = folder.children.filter((f) => f.extension === "md" && f.name.includes(dateStr));
  if (files.length === 0) return;

  const candidates = new Map();
  const agendaFiles = await getDailyAgendaFiles(state, dateStr);

  for (const file of files) {
    const isLog = file.name.includes("EdLog");
    const isMobile = file.name.includes("_m") || file.name.includes("Mobile");
    const content = await state.io.read(file.path || file);
    const lines = content.split("\n");

    for (const line of lines) {
      let actId;
      let activityRaw;
      let startStr;
      let endStr;
      let timestamp;

      if (isLog) {
        const parsed = parseEdLogRow(line);
        if (!parsed) continue;
        actId = parsed.activityId;
        activityRaw = parsed.activity;
        startStr = parsed.start;
        endStr = parsed.end;
        timestamp = new Date(`${parsed.date}T${parsed.time}`).getTime();
      } else {
        const parsed = parseAgendaRow(line, file.path || file, isMobile ? "Mobile" : "Desktop");
        if (!parsed) continue;
        actId = parsed.id;
        activityRaw = parsed.name;
        startStr = parsed.start;
        endStr = parsed.end;
        timestamp = 0;
      }

      const startMins = parseTime(startStr);
      const endMins = parseTime(endStr);

      const displayTitle = String(activityRaw)
        .replace(/\\[\\[.*?\\|(.*?)\\]\\]/, "$1")
        .replace(/\\[\\[(.*?)\\]\\]/, "$1")
        .replace(/^[#\\s]+/, "")
        .replace(/<.*?>/, "???");

      if (startMins !== null) {
        if (!candidates.has(actId)) candidates.set(actId, []);
        candidates.get(actId).push({
          id: actId,
          text: displayTitle,
          startMins,
          endMins,
          timestamp,
          source: isLog ? "Log" : isMobile ? "Mobile" : "Desktop",
          file,
        });
      }
    }
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMins = now.getHours() * 60 + now.getMinutes();

  candidates.forEach((entries) => {
    entries.sort((a, b) => b.timestamp - a.timestamp);
    const winner = entries[0];
    let finalEnd = winner.endMins;

    if (finalEnd === null) {
      if (dateStr === todayStr && winner.startMins < currentMins) {
        finalEnd = Math.max(currentMins, winner.startMins + 30);
      } else {
        finalEnd = winner.startMins + 60;
      }
    }

    const duration = finalEnd - winner.startMins;
    if (duration > 0) {
      let blockColor = "#54B5FB";
      if (winner.source === "Log") blockColor = "#FFB86C";
      else if (winner.source === "Mobile") blockColor = "#bd93f9";

      state.calState.nodes.push({
        id: winner.id,
        text: winner.text,
        y: winner.startMins * PIXELS_PER_MIN + OFFSET_Y,
        height: duration * PIXELS_PER_MIN,
        color: blockColor,
        colIndex: 0,
        sourceFile: winner.file,
        sourceType: winner.source,
      });
    }
  });

  state.calState.nodes.sort((a, b) => a.y - b.y);
  const colEnds = [0, 0, 0, 0];

  state.calState.nodes.forEach((node) => {
    let bestCol = 0;
    let maxGap = -1;
    let foundValid = false;
    for (let i = 0; i < 4; i += 1) {
      if (node.y >= colEnds[i] - 5) {
        const gap = node.y - colEnds[i];
        if (gap > maxGap) {
          maxGap = gap;
          bestCol = i;
          foundValid = true;
        }
      }
    }
    if (!foundValid) {
      let minEnd = colEnds[0];
      for (let i = 1; i < 4; i += 1) {
        if (colEnds[i] < minEnd) {
          minEnd = colEnds[i];
          bestCol = i;
        }
      }
    }
    node.colIndex = bestCol;
    colEnds[bestCol] = node.y + node.height;
  });
}

module.exports = { loadCalendarData };
