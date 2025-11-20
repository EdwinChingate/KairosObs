---
title: Planner_1_3 (script)
kind: script
source: Planner_1_3.js
last_updated: 2025-11-13
---

## Description

Loads all planner modules in sequence, initializes shared configuration and utilities, wires UI components, and registers cleanup handlers for the DataviewJS container.

---

## Key operations

- Calls Dataview's loader to fetch and execute each planner module listed in `modulePaths`.
- Resolves global `Planner` namespace and pulls exported `Config`, `Utils`, `Styles`, `UI`, `Log`, `Agenda`, `Consumption`, `Suggester`, and `Events` APIs.
- Applies planner styles, instantiates the UI, and initializes log, agenda, consumption, suggester, and event subsystems in order.
- Stores disposer callbacks (`destroyEvents`, suggester `Destroy`, and `removeStyles`) in `this.registeredCleanup` for automatic teardown.

---

## Code

```javascript
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
```

---

## Parameters

- None. The script runs in the DataviewJS context and relies on globals `app`, `dv`, and `this.container`.

---

## Input

- `modulePaths`: Array of module filenames that compose the planner runtime.
- `this.container`: DataviewJS container element used to mount planner styles and UI.
- `app`: Obsidian application instance for vault operations (forwarded into subsystem initializers).

---

## Output

- Updates `this.registeredCleanup` with planner teardown callbacks.
- Instantiates Planner subsystem APIs for downstream use by event handlers.

---

## Functions

- [`ApplyPlannerStyles`](Planner_1_3_styles.md#applyplannerstyles-function) — injects CSS and returns a disposer for planner styles.
- [`InitPlannerUI`](Planner_1_3_ui.md#initplannerui-function) — constructs the planner DOM scaffold and exposes element handles.
- [`InitPlannerLog`](Planner_1_3_log.md#initplannerlog-function) — builds the logging pipeline and returns log helpers.
- [`InitPlannerAgenda`](Planner_1_3_agenda.md#initplanneragenda-function) — prepares agenda helpers for activities and canvas updates.
- [`InitPlannerConsumption`](Planner_1_3_consumption.md#initplannerconsumption-function) — configures the consumption logging flow.
- [`InitPlannerSuggester`](Planner_1_3_suggester.md#initplannersuggester-function) — wires the inline suggester UX and exposes keyboard handlers.
- [`InitPlannerEvents`](Planner_1_3_events.md#initplannerevents-function) — binds UI events to log, suggester, and consumption actions.

---

## Called by

- [`Planner_1_3 Dataview script`](Planner_1_3/dataview.md#planner_1_3-dataview-script) — loads and executes this orchestrator to mount the modular planner inside the note.
