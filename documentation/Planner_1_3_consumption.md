---
title: Planner_1_3_consumption (module)
kind: module
source: Planner_1_3_consumption.js
last_updated: 2025-11-13
---

## Description

Implements the consumption logging workflow: prompting the user for what and how much was consumed, appending the entry to the configured Markdown table, and updating the planner status display.

---

## Key operations

- Opens modal forms via the `modalforms` plugin API to collect consumption type and amount.
- Adjusts the recorded amount for specific items by chaining multiple modal prompts.
- Appends a formatted Markdown table row to the consumption file and refreshes the UI task box.

---

## Code

```javascript
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
```

---

## Parameters

- None for the module itself; dependencies are provided through the initializer.

---

## Input

- [`app`](Planner_1_3.md#input) — used to access modal plugin APIs and read vault files.
- [`config`](Planner_1_3_config.md#loadplannerconfig-function) — provides the consumption log file path.
- [`ui`](Planner_1_3_ui.md#initplannerui-function) — offers the task box for feedback messages.
- [`utils`](Planner_1_3_config.md#functions) — supplies date/time helpers and file append capability.

---

## Output

- Registers `Planner.Consumption.InitPlannerConsumption` globally.

---

## Functions

- [`InitPlannerConsumption`](#initplannerconsumption-function) — returns the consumption API.
- [`AmountFlow`](#amountflow-function) — collects amount details for specific substances.
- [`Consumption`](#consumption-function) — orchestrates the modal prompts and file append.

---

## Called by

- [`Planner_1_3`](Planner_1_3.md#functions) — initializes the consumption helper for use by events.
- [`InitPlannerEvents`](Planner_1_3_events.md#functions) — triggers consumption logging when Escape is pressed on an empty textbox.

## InitPlannerConsumption (function)

### Description

Binds consumption helper closures to the provided `app`, `config`, `ui`, and `utils`, tracks the in-progress amount, and exposes the `Consumption` function for UI triggers.

---

### Key operations

- Maintains a `resultAmount` variable scoped to the initializer for reuse across modal prompts.
- Defines [`AmountFlow`](#amountflow-function) to gather dosage details for certain substances.
- Returns an object exposing the [`Consumption`](#consumption-function) orchestrator.

---

### Code

```javascript
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
```

---

### Parameters

- `app` — Obsidian API for plugin access and file I/O.
- `config` — planner configuration containing `CONSUMPTION_FILE` path.
- `ui` — planner UI handles, specifically `taskBox`.
- `utils` — helper namespace used for date, time, and file append operations.

---

### Input

- [`app.plugins.plugins["modalforms"].api`](Planner_1_3.md#functions) — opens modal forms to collect data.
- [`config.CONSUMPTION_FILE`](Planner_1_3_config.md#loadplannerconfig-function) — Markdown table storing consumption entries.
- [`utils.NowDayString`](Planner_1_3_config.md#nowdaystring-function) — day indicator for the entry.
- [`utils.NowTimeString`](Planner_1_3_config.md#nowtimestring-function) — timestamp of consumption.
- [`utils.AppendToFile`](Planner_1_3_config.md#appendtofile-function) — appends the table row.
- [`ui.taskBox`](Planner_1_3_ui.md#initplannerui-function) — displays feedback message.

---

### Output

- Returns `{ Consumption }` for use by event handlers.

---

### Functions

- [`AmountFlow`](#amountflow-function) — collects dosage info when required.
- [`Consumption`](#consumption-function) — writes the log entry.

---

### Called by

- [`Planner_1_3`](Planner_1_3.md#code) — stores the returned API for other modules.
- [`InitPlannerEvents`](Planner_1_3_events.md#handlekeydown-function) — triggers consumption logging via Escape key.

## AmountFlow (function)

### Description

Prompts the user for consumption amounts when the selected item is `Tyrosine` or `Tryptophan`, supporting a secondary detail prompt and updating the shared `resultAmount` variable.

---

### Key operations

- Invokes the `modalforms` API with the `One` form to gather amount input.
- Updates `resultAmount` with the initial value and optionally appends a secondary detail in parentheses.

---

### Code

```javascript
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
```

---

### Parameters

- `resultString` — normalized consumption item identifier.

---

### Input

- [`app.plugins.plugins["modalforms"].api`](Planner_1_3.md#functions) — opens modal forms for amount capture.
- `resultString` — item name controlling whether prompts run.

---

### Output

- Updates the `resultAmount` closure variable; no direct return value.

---

### Functions

- None beyond modal API calls.

---

### Called by

- [`Consumption`](#consumption-function) — adjusts the amount before writing the log entry.

## Consumption (function)

### Description

Runs the full consumption logging flow: prompts for the item, optionally gathers quantity, writes a Markdown table row, updates the planner status, and resets the amount tracker.

---

### Key operations

- Opens the `Consumption` modal form and normalizes the returned item string.
- Calls [`AmountFlow`](#amountflow-function) to gather optional dosage details.
- Determines the next row ID, builds a Markdown table row with date, item, time, and amount, and appends it via [`utils.AppendToFile`](Planner_1_3_config.md#appendtofile-function).
- Updates `ui.taskBox` with a confirmation message and resets `resultAmount` to `1`.

---

### Code

```javascript
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
```

---

### Parameters

- None.

---

### Input

- [`app.plugins.plugins["modalforms"].api`](Planner_1_3.md#functions) — prompts for consumption details.
- [`config.CONSUMPTION_FILE`](Planner_1_3_config.md#loadplannerconfig-function) — Markdown file receiving the entry.
- [`utils.NowDayString`](Planner_1_3_config.md#nowdaystring-function) — date for the log line.
- [`utils.NowTimeString`](Planner_1_3_config.md#nowtimestring-function) — time for the log line.
- [`AmountFlow`](#amountflow-function) — collects optional dosage info.
- [`utils.AppendToFile`](Planner_1_3_config.md#appendtofile-function) — writes the table row.
- [`ui.taskBox`](Planner_1_3_ui.md#initplannerui-function) — shows confirmation text.

---

### Output

- Appends a Markdown table row and updates status UI; returns nothing.

---

### Functions

- [`AmountFlow`](#amountflow-function) — ensures dosage is captured.
- [`utils.AppendToFile`](Planner_1_3_config.md#appendtofile-function) — performs the append.

---

### Called by

- [`InitPlannerEvents`](Planner_1_3_events.md#handlekeydown-function) — triggered when Escape is pressed on an empty textbox.
