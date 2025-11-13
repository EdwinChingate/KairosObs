// Planner orchestrator
// Loads modules, builds UI, and wires planner features.
const modulePaths = [
  "Planner_1_3_config.js",
  "Planner_1_3_styles.js",
  "Planner_1_3_ui.js",
  "Planner_1_3_log.js",
  "Planner_1_3_agenda.js",
  "Planner_1_3_consumption.js",
  "Planner_1_3_suggester.js",
  "Planner_1_3_events.js"
];

for (const path of modulePaths) {
  const code = await dv.io.load(path);
  await dv.executeJs(code);
}

const PlannerRoot = typeof window !== "undefined" ? window : globalThis;
const Planner = PlannerRoot.Planner || {};
const config = Planner.Config;
const utils = Planner.Utils;

const removeStyles = Planner.Styles.ApplyPlannerStyles(this.container);
const ui = Planner.UI.InitPlannerUI(this.container, config);

const logApi = Planner.Log.InitPlannerLog(app, config, ui, utils);
await logApi.UpdateTaskDisplay();
await logApi.LogUp();

const agendaApi = Planner.Agenda.InitPlannerAgenda(app, config, ui, utils);
const consumptionApi = Planner.Consumption.InitPlannerConsumption(app, config, ui, utils);
const suggesterApi = Planner.Suggester.InitPlannerSuggester(app, config, ui, agendaApi, utils);
const destroyEvents = Planner.Events.InitPlannerEvents(ui, logApi, suggesterApi, consumptionApi, config);

this.registeredCleanup = this.registeredCleanup || [];
this.registeredCleanup.push(() => {
  try {
    destroyEvents?.();
  } catch (e) {}
  try {
    suggesterApi?.Destroy?.();
  } catch (e) {}
  try {
    removeStyles?.();
  } catch (e) {}
});
