// Planner consumption helpers
// Handles substance logging modal flow.
const PlannerRootConsumption = typeof window !== "undefined" ? window : globalThis;
PlannerRootConsumption.Planner = PlannerRootConsumption.Planner || {};

function InitPlannerConsumption(app, config, ui, utils) {
  let resultAmount = 1;

  async function AmountFlow(resultString) {
    const modalApi = app.plugins.plugins["modalforms"]?.api;
    if (["Tyrosine","Tryptophan"].includes(resultString)) {
      const res = await modalApi?.openForm("One");
      const value = res?.asString("{{how_much}}");
      if (value) resultAmount = value;
    }
    if (["Tyrosine","Tryptophan"].includes(resultString)) {
      const res = await modalApi?.openForm("One");
      const extra = res?.asString("{{how_much}}");
      if (extra) resultAmount = `${resultAmount} (${extra})`;
    }
  }

  async function Consumption() {
    const modalApi = app.plugins.plugins["modalforms"]?.api;
    const result = await modalApi?.openForm("Consumption");
    const raw = result?.asString("{{what}}");
    const resultString = raw && raw !== "{{what}}" ? raw : "W";
    const day = utils.NowDayString();
    const ts = utils.NowTimeString();
    const logRaw = await app.vault.adapter.read(config.CONSUMPTION_FILE).catch(() => "");
    await AmountFlow(resultString);
    const noteId = logRaw.split(/\n/).length - 1;
    const line = `| ${noteId} | ${day}|${resultString} |${ts} |${resultAmount}  |\n`;
    await utils.AppendToFile(config.CONSUMPTION_FILE, line);
    ui.taskBox.textContent = ` got some ${resultString} the ${day} at ${ts}`;
    resultAmount = 1;
  }

  return {
    Consumption
  };
}

PlannerRootConsumption.Planner.Consumption = {
  InitPlannerConsumption
};
