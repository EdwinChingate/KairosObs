const { getDateParts } = require("../env/dateParts");

/**
 * Ensure daily log files exist with expected templates.
 * @param {Object} state - PlannerState.
 * @param {string} dateStr - Target date.
 */
async function ensureLogFilesForDate(state, dateStr) {
  const parts = getDateParts(dateStr);
  const thoughtsFile = state.paths.getThoughtsFile(dateStr);
  const metaLogFile = state.paths.getMetaLogFile(dateStr);

  await state.io.ensureFolder(state.paths.FULL_LOG_FOLDER);
  await state.io.ensureFolder(`${state.paths.FULL_LOG_FOLDER}/meta_log`);

  const thoughtsTemplate = `---
date: ${dateStr}
day_week: ${parts.day_week} 
day: ${parts.day}
month: ${parts.month}
year: ${parts.year}
nurtured: 0
---
[[Thoughts_and_ObservationsList]]\n
| id  | Comment                         | Time  |
| --- | ------------------------------- | ----- |
`;
  await state.io.ensureFile(thoughtsFile, thoughtsTemplate);
  const metaTemplate = `|id|Source|Duration (ms)|
|---|---|---|
`;
  await state.io.ensureFile(metaLogFile, metaTemplate);
}

/**
 * Ensure the primary agenda file exists for the state's current date.
 * @param {Object} state - PlannerState.
 */
async function ensurePrimaryAgendaFile(state) {
  await state.io.ensureFolder(state.paths.AGENDA_BASE_PATH);
  const exists = await state.io.exists(state.primaryAgendaFile);
  if (exists) return;
  const p = getDateParts(state.currentPlannerDate);
  const template = `---
date: ${state.currentPlannerDate}
day_week: ${p.day_week}
day: ${p.day}
month: ${p.month}
year: ${p.year}
nurtured: 0
device: ${state.device.isMobile ? "Mobile" : "Desktop"}
---

[[Agenda]]

| id  | **Activity** | **Start** | **End** |
| --- | ---------------------------- | ---------- | -------- |
`;
  await state.io.ensureFile(state.primaryAgendaFile, template);
}

module.exports = { ensureLogFilesForDate, ensurePrimaryAgendaFile };
