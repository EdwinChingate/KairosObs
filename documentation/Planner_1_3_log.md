---
title: Planner_1_3_log (module)
kind: module
source: Planner_1_3_log.js
last_updated: 2025-11-13
---

## Description

Initializes the planner logging pipeline: reading existing notes, rendering messages, managing clipboard copies, appending vault rows, and exposing helpers for UI event handlers.

---

## Key operations

- Calculates daily log and meta file paths from configuration and current date.
- Loads existing log entries, renders them into the UI, and keeps the task display in sync.
- Appends log and meta rows when the user submits text, copying content to the clipboard and resetting timers.

---

## Code

```javascript
// Planner log helpers
// Handles log creation, rendering, and send pipeline.
const PlannerRootLog = typeof window !== "undefined" ? window : globalThis;
PlannerRootLog.Planner = PlannerRootLog.Planner || {};

function InitPlannerLog(app, config, ui, utils) {
  let highResStart = performance.now();

  function DailyLogPath() {
    return `${config.LOG_FOLDER}/${utils.NowDateString()}-Thoughts_and_Observations.md`;
  }

  function DailyMetaPath() {
    return `${config.LOG_FOLDER}/meta_log/${utils.NowDateString()}.md`;
  }

  function RenderMsg(ts, note, noteId) {
    const msg = ui.logBox.createEl("div", { cls: "msg" });
    msg.createEl("div", { cls: "meta", text: `- ${note} (${ts}-${noteId})` });
    ui.logBox.scrollBottom = ui.logBox.scrollHeight;
  }

  async function LogUp() {
    const txt = await app.vault.adapter.read(DailyLogPath()).catch(() => null);
    if (!txt) return;
    const lines = txt.split("\n").slice(-50).reverse();
    lines.forEach((line) => {
      const parts = line.split("|");
      if (parts && parts[1] > 0) {
        RenderMsg(parts[1], parts[2], parts[3]);
      }
    });
  }

  async function CreateLogFile() {
    const logPath = DailyLogPath();
    const exists = await app.vault.adapter.exists(logPath);
    if (!exists) {
      await app.vault.create(logPath, "|id|Comment|Time|\n|---|---|---|");
    }
    const metaPath = DailyMetaPath();
    const metaExists = await app.vault.adapter.exists(metaPath);
    if (!metaExists) {
      await app.vault.create(metaPath, "|id|Source|Task|Duration (ms)|\n|---|---|---|---|");
    }
  }

  function TaskDisplayFromRaw(raw) {
    if (!raw) return "";
    const lines = raw.split(/\n/);
    const upper = lines[2]?.split(":")[1] || "";
    const lower = lines[1]?.split(":")[1] || "";
    return `${upper}\n${lower}`.trim();
  }

  async function UpdateTaskDisplay() {
    const raw = await app.vault.adapter.read(DailyLogPath()).catch(() => null);
    ui.taskBox.textContent = TaskDisplayFromRaw(raw) || "";
  }

  async function SendEntry() {
    const content = ui.textBox.value.trim();
    if (!content) return false;

    await CreateLogFile();
    const logPath = DailyLogPath();
    const metaPath = DailyMetaPath();
    const source = ui.sourceBox.value.trim() || config.DEFAULT_SOURCE;
    const ts = utils.NowTimeString();
    const logRaw = await app.vault.adapter.read(logPath);
    const noteId = logRaw.split(/\n/).length - 9;
    const duration = Math.floor(performance.now() - highResStart);

    try {
      await navigator.clipboard.writeText(content);
    } catch (e) {
      // ignore clipboard failures
    }

    await utils.AppendToFile(logPath, `|${noteId}|${content}|${ts}|\n`);
    await utils.AppendToFile(metaPath, `|${noteId}|${source}|${duration}|\n`);

    ui.sourceBox.value = config.DEFAULT_SOURCE;
    ui.textBox.value = "";
    ui.logBox.textContent = "";

    await UpdateTaskDisplay();
    await LogUp();

    highResStart = performance.now();
    ui.textBox.focus();
    return true;
  }

  function ResetTimer() {
    highResStart = performance.now();
    ui.textBox.value = "";
    return highResStart;
  }

  return {
    DailyLogPath,
    DailyMetaPath,
    RenderMsg,
    LogUp,
    CreateLogFile,
    UpdateTaskDisplay,
    SendEntry,
    ResetTimer
  };
}

PlannerRootLog.Planner.Log = {
  InitPlannerLog
};
```

---

## Parameters

- None at the module level; the exported function handles dependencies.

---

## Input

- [`app`](Planner_1_3.md#input) — provides vault file I/O and creation helpers.
- [`config`](Planner_1_3_config.md#loadplannerconfig-function) — supplies folder paths and defaults.
- [`ui`](Planner_1_3_ui.md#initplannerui-function) — exposes DOM nodes manipulated by log helpers.
- [`utils`](Planner_1_3_config.md#functions) — provides time formatting and file append utilities.

---

## Output

- Registers `Planner.Log.InitPlannerLog` in the global namespace.

---

## Functions

- [`InitPlannerLog`](#initplannerlog-function) — constructs the log helper API and returns all logging functions.
- [`DailyLogPath`](#dailylogpath-function) — builds the daily log file path.
- [`DailyMetaPath`](#dailymetapath-function) — builds the daily meta-log file path.
- [`RenderMsg`](#rendermsg-function) — appends a message row in the UI.
- [`LogUp`](#logup-function) — loads recent log rows into the UI.
- [`CreateLogFile`](#createlogfile-function) — ensures daily log and meta files exist.
- [`TaskDisplayFromRaw`](#taskdisplayfromraw-function) — extracts current task summary from the log file body.
- [`UpdateTaskDisplay`](#updatetaskdisplay-function) — refreshes the task textarea from the log file.
- [`SendEntry`](#sendentry-function) — orchestrates content submission, file append, and UI refresh.
- [`ResetTimer`](#resettimer-function) — clears the timer and textbox when focus returns.

---

## Called by

- [`Planner_1_3`](Planner_1_3.md#functions) — initializes the log subsystem and triggers initial refresh.
- [`InitPlannerEvents`](Planner_1_3_events.md#functions) — invokes log helpers from UI events.

## InitPlannerLog (function)

### Description

Creates a stateful logging context tied to the provided `app`, `config`, `ui`, and `utils`, and returns helper functions for reading, writing, and rendering planner logs.

---

### Key operations

- Captures a high-resolution timer baseline to compute durations between entries.
- Defines helper closures (`DailyLogPath`, `DailyMetaPath`, etc.) and returns them as an API surface.
- Stores references to `ui` nodes to render log messages and update task status.

---

### Code

```javascript
function InitPlannerLog(app, config, ui, utils) {
  let highResStart = performance.now();

  function DailyLogPath() {
    return `${config.LOG_FOLDER}/${utils.NowDateString()}-Thoughts_and_Observations.md`;
  }

  function DailyMetaPath() {
    return `${config.LOG_FOLDER}/meta_log/${utils.NowDateString()}.md`;
  }

  function RenderMsg(ts, note, noteId) {
    const msg = ui.logBox.createEl("div", { cls: "msg" });
    msg.createEl("div", { cls: "meta", text: `- ${note} (${ts}-${noteId})` });
    ui.logBox.scrollBottom = ui.logBox.scrollHeight;
  }

  async function LogUp() {
    const txt = await app.vault.adapter.read(DailyLogPath()).catch(() => null);
    if (!txt) return;
    const lines = txt.split("\n").slice(-50).reverse();
    lines.forEach((line) => {
      const parts = line.split("|");
      if (parts && parts[1] > 0) {
        RenderMsg(parts[1], parts[2], parts[3]);
      }
    });
  }

  async function CreateLogFile() {
    const logPath = DailyLogPath();
    const exists = await app.vault.adapter.exists(logPath);
    if (!exists) {
      await app.vault.create(logPath, "|id|Comment|Time|\n|---|---|---|");
    }
    const metaPath = DailyMetaPath();
    const metaExists = await app.vault.adapter.exists(metaPath);
    if (!metaExists) {
      await app.vault.create(metaPath, "|id|Source|Task|Duration (ms)|\n|---|---|---|---|");
    }
  }

  function TaskDisplayFromRaw(raw) {
    if (!raw) return "";
    const lines = raw.split(/\n/);
    const upper = lines[2]?.split(":")[1] || "";
    const lower = lines[1]?.split(":")[1] || "";
    return `${upper}\n${lower}`.trim();
  }

  async function UpdateTaskDisplay() {
    const raw = await app.vault.adapter.read(DailyLogPath()).catch(() => null);
    ui.taskBox.textContent = TaskDisplayFromRaw(raw) || "";
  }

  async function SendEntry() {
    const content = ui.textBox.value.trim();
    if (!content) return false;

    await CreateLogFile();
    const logPath = DailyLogPath();
    const metaPath = DailyMetaPath();
    const source = ui.sourceBox.value.trim() || config.DEFAULT_SOURCE;
    const ts = utils.NowTimeString();
    const logRaw = await app.vault.adapter.read(logPath);
    const noteId = logRaw.split(/\n/).length - 9;
    const duration = Math.floor(performance.now() - highResStart);

    try {
      await navigator.clipboard.writeText(content);
    } catch (e) {
      // ignore clipboard failures
    }

    await utils.AppendToFile(logPath, `|${noteId}|${content}|${ts}|\n`);
    await utils.AppendToFile(metaPath, `|${noteId}|${source}|${duration}|\n`);

    ui.sourceBox.value = config.DEFAULT_SOURCE;
    ui.textBox.value = "";
    ui.logBox.textContent = "";

    await UpdateTaskDisplay();
    await LogUp();

    highResStart = performance.now();
    ui.textBox.focus();
    return true;
  }

  function ResetTimer() {
    highResStart = performance.now();
    ui.textBox.value = "";
    return highResStart;
  }

  return {
    DailyLogPath,
    DailyMetaPath,
    RenderMsg,
    LogUp,
    CreateLogFile,
    UpdateTaskDisplay,
    SendEntry,
    ResetTimer
  };
}
```

---

### Parameters

- `app` — Obsidian application interface for file I/O and event loops.
- `config` — planner configuration supplying folder paths and defaults.
- `ui` — planner UI handles used for rendering and input management.
- `utils` — helper namespace providing date/time formatting and append operations.

---

### Input

- [`app.vault`](Planner_1_3.md#input) — used for reading, writing, and creating files.
- [`config.LOG_FOLDER`](Planner_1_3_config.md#loadplannerconfig-function) — base folder for log files.
- [`ui.logBox`](Planner_1_3_ui.md#initplannerui-function) — target element for log rendering.
- [`utils.NowDateString`](Planner_1_3_config.md#nowdatestring-function) — generates date strings for file names.
- [`utils.NowTimeString`](Planner_1_3_config.md#nowtimestring-function) — timestamps log entries.
- [`utils.AppendToFile`](Planner_1_3_config.md#appendtofile-function) — appends log and meta rows.

---

### Output

- Returns an object exposing `DailyLogPath`, `DailyMetaPath`, `RenderMsg`, `LogUp`, `CreateLogFile`, `UpdateTaskDisplay`, `SendEntry`, and `ResetTimer` for planner events.

---

### Functions

- [`DailyLogPath`](#dailylogpath-function) — helper closure for log file path.
- [`DailyMetaPath`](#dailymetapath-function) — helper closure for meta file path.
- [`RenderMsg`](#rendermsg-function) — UI renderer invoked for each row.
- [`LogUp`](#logup-function) — fetches and displays log history.
- [`CreateLogFile`](#createlogfile-function) — ensures files exist.
- [`TaskDisplayFromRaw`](#taskdisplayfromraw-function) — formats the task preview.
- [`UpdateTaskDisplay`](#updatetaskdisplay-function) — writes formatted task preview into UI.
- [`SendEntry`](#sendentry-function) — orchestrates submission flow.
- [`ResetTimer`](#resettimer-function) — clears timer when focus returns.

---

### Called by

- [`Planner_1_3`](Planner_1_3.md#code) — instantiates the log API and triggers `UpdateTaskDisplay` and `LogUp`.
- [`InitPlannerEvents`](Planner_1_3_events.md#initplannerevents-function) — uses returned helpers in UI listeners.

## DailyLogPath (function)

### Description

Builds the path to the current day's log file combining the configured log folder and the current date string.

---

### Key operations

- Concatenates `config.LOG_FOLDER` with the formatted date from [`utils.NowDateString`](Planner_1_3_config.md#nowdatestring-function).

---

### Code

```javascript
function DailyLogPath() {
  return `${config.LOG_FOLDER}/${utils.NowDateString()}-Thoughts_and_Observations.md`;
}
```

---

### Parameters

- None (captures dependencies from closure scope).

---

### Input

- [`config.LOG_FOLDER`](Planner_1_3_config.md#loadplannerconfig-function) — base directory for log files.
- [`utils.NowDateString`](Planner_1_3_config.md#nowdatestring-function) — supplies the `YYYY-MM-DD` segment.

---

### Output

- Log file path string used across logging helpers.

---

### Functions

- [`utils.NowDateString`](Planner_1_3_config.md#nowdatestring-function) — generates the date component.

---

### Called by

- [`LogUp`](#logup-function) — reads the daily log content.
- [`CreateLogFile`](#createlogfile-function) — checks for file existence or creates headers.
- [`UpdateTaskDisplay`](#updatetaskdisplay-function) — loads the raw log text for task preview.
- [`SendEntry`](#sendentry-function) — reads and appends to the log file.

## DailyMetaPath (function)

### Description

Returns the path to the current day's meta log inside the `meta_log` subfolder using the same date string as the main log.

---

### Key operations

- Concatenates the `meta_log` folder with the date string from [`utils.NowDateString`](Planner_1_3_config.md#nowdatestring-function).

---

### Code

```javascript
function DailyMetaPath() {
  return `${config.LOG_FOLDER}/meta_log/${utils.NowDateString()}.md`;
}
```

---

### Parameters

- None.

---

### Input

- [`config.LOG_FOLDER`](Planner_1_3_config.md#loadplannerconfig-function) — base path for logs.
- [`utils.NowDateString`](Planner_1_3_config.md#nowdatestring-function) — provides date string.

---

### Output

- Meta log file path string used during submission.

---

### Functions

- [`utils.NowDateString`](Planner_1_3_config.md#nowdatestring-function).

---

### Called by

- [`CreateLogFile`](#createlogfile-function) — ensures meta file exists.
- [`SendEntry`](#sendentry-function) — appends duration data to the meta log.

## RenderMsg (function)

### Description

Appends a formatted log message into the UI log container, including metadata about time and note ID.

---

### Key operations

- Creates a `.msg` div with nested `.meta` child inside `ui.logBox`.
- Scrolls the log container to the bottom after insertion.

---

### Code

```javascript
function RenderMsg(ts, note, noteId) {
  const msg = ui.logBox.createEl("div", { cls: "msg" });
  msg.createEl("div", { cls: "meta", text: `- ${note} (${ts}-${noteId})` });
  ui.logBox.scrollBottom = ui.logBox.scrollHeight;
}
```

---

### Parameters

- `ts` — timestamp string from the log row.
- `note` — log text content.
- `noteId` — row identifier appended to the display.

---

### Input

- [`ui.logBox`](Planner_1_3_ui.md#initplannerui-function) — DOM container receiving the message.
- `ts`, `note`, `noteId` — fields extracted from parsed log lines.

---

### Output

- Creates new DOM elements inside the log box; no return value.

---

### Functions

- None beyond DOM manipulation.

---

### Called by

- [`LogUp`](#logup-function) — renders each historical row retrieved from the log file.

## LogUp (function)

### Description

Loads the latest entries from the daily log file, parses them into fields, and renders each entry into the UI using `RenderMsg`.

---

### Key operations

- Reads the daily log file using [`DailyLogPath`](#dailylogpath-function) and handles missing files gracefully.
- Processes up to 50 most recent lines, splitting pipe-delimited columns, and invokes [`RenderMsg`](#rendermsg-function).

---

### Code

```javascript
async function LogUp() {
  const txt = await app.vault.adapter.read(DailyLogPath()).catch(() => null);
  if (!txt) return;
  const lines = txt.split("\n").slice(-50).reverse();
  lines.forEach((line) => {
    const parts = line.split("|");
    if (parts && parts[1] > 0) {
      RenderMsg(parts[1], parts[2], parts[3]);
    }
  });
}
```

---

### Parameters

- None.

---

### Input

- [`DailyLogPath`](#dailylogpath-function) — resolves the log file location.
- [`app.vault.adapter`](Planner_1_3.md#input) — reads file content.

---

### Output

- Renders recent log rows into `ui.logBox` and returns nothing.

---

### Functions

- [`DailyLogPath`](#dailylogpath-function) — locates log file.
- [`RenderMsg`](#rendermsg-function) — handles DOM rendering for each entry.

---

### Called by

- [`Planner_1_3`](Planner_1_3.md#code) — runs after initialization to show history.
- [`SendEntry`](#sendentry-function) — refreshes the log list after writing.

## CreateLogFile (function)

### Description

Ensures the daily log and meta log files exist, creating them with header rows when absent.

---

### Key operations

- Checks for the presence of the daily log file and creates it with Markdown table headers if missing.
- Performs the same existence check and creation for the daily meta log.

---

### Code

```javascript
async function CreateLogFile() {
  const logPath = DailyLogPath();
  const exists = await app.vault.adapter.exists(logPath);
  if (!exists) {
    await app.vault.create(logPath, "|id|Comment|Time|\n|---|---|---|");
  }
  const metaPath = DailyMetaPath();
  const metaExists = await app.vault.adapter.exists(metaPath);
  if (!metaExists) {
    await app.vault.create(metaPath, "|id|Source|Task|Duration (ms)|\n|---|---|---|---|");
  }
}
```

---

### Parameters

- None.

---

### Input

- [`DailyLogPath`](#dailylogpath-function) — main log path.
- [`DailyMetaPath`](#dailymetapath-function) — meta log path.
- [`app.vault.adapter`](Planner_1_3.md#input) — provides `exists` checks.
- [`app.vault`](Planner_1_3.md#input) — used to create files with default headers.

---

### Output

- Creates files if missing; returns nothing.

---

### Functions

- [`DailyLogPath`](#dailylogpath-function).
- [`DailyMetaPath`](#dailymetapath-function).

---

### Called by

- [`SendEntry`](#sendentry-function) — ensures files exist before appending.

## TaskDisplayFromRaw (function)

### Description

Parses the raw log Markdown to derive the two-line task summary shown in the planner UI.

---

### Key operations

- Splits the raw log into lines and extracts segments after the first colon on lines 2 and 3.
- Trims whitespace and combines the two lines into a single string separated by a newline.

---

### Code

```javascript
function TaskDisplayFromRaw(raw) {
  if (!raw) return "";
  const lines = raw.split(/\n/);
  const upper = lines[2]?.split(":")[1] || "";
  const lower = lines[1]?.split(":")[1] || "";
  return `${upper}\n${lower}`.trim();
}
```

---

### Parameters

- `raw` — string content of the daily log file.

---

### Input

- `raw` — Markdown content from the daily log.

---

### Output

- Two-line task summary displayed in the task textarea.

---

### Functions

- None.

---

### Called by

- [`UpdateTaskDisplay`](#updatetaskdisplay-function) — transforms raw log text into a UI summary.

## UpdateTaskDisplay (function)

### Description

Reads the current log file and updates the task textarea with the summary derived by `TaskDisplayFromRaw`.

---

### Key operations

- Reads the log file using [`DailyLogPath`](#dailylogpath-function).
- Delegates to [`TaskDisplayFromRaw`](#taskdisplayfromraw-function) for parsing and writes the result into `ui.taskBox`.

---

### Code

```javascript
async function UpdateTaskDisplay() {
  const raw = await app.vault.adapter.read(DailyLogPath()).catch(() => null);
  ui.taskBox.textContent = TaskDisplayFromRaw(raw) || "";
}
```

---

### Parameters

- None.

---

### Input

- [`DailyLogPath`](#dailylogpath-function) — locates the log file.
- [`app.vault.adapter`](Planner_1_3.md#input) — reads file content.
- [`TaskDisplayFromRaw`](#taskdisplayfromraw-function) — parses summary lines.
- [`ui.taskBox`](Planner_1_3_ui.md#initplannerui-function) — DOM element to update.

---

### Output

- Updates `ui.taskBox.textContent` with the latest task summary.

---

### Functions

- [`DailyLogPath`](#dailylogpath-function).
- [`TaskDisplayFromRaw`](#taskdisplayfromraw-function).

---

### Called by

- [`Planner_1_3`](Planner_1_3.md#code) — refreshes task info on startup.
- [`SendEntry`](#sendentry-function) — updates task status after submission.

## SendEntry (function)

### Description

Handles the entire submission pipeline: validates input, ensures files exist, copies text to clipboard, appends log/meta rows, refreshes UI, and resets timers.

---

### Key operations

- Validates the textbox content and returns `false` if empty.
- Ensures log and meta files exist by calling [`CreateLogFile`](#createlogfile-function).
- Derives note IDs, timestamps, and durations, copies content to the clipboard, and appends rows using [`utils.AppendToFile`](Planner_1_3_config.md#appendtofile-function).
- Resets UI fields, reloads history, updates the task display, and refocuses the textbox.

---

### Code

```javascript
async function SendEntry() {
  const content = ui.textBox.value.trim();
  if (!content) return false;

  await CreateLogFile();
  const logPath = DailyLogPath();
  const metaPath = DailyMetaPath();
  const source = ui.sourceBox.value.trim() || config.DEFAULT_SOURCE;
  const ts = utils.NowTimeString();
  const logRaw = await app.vault.adapter.read(logPath);
  const noteId = logRaw.split(/\n/).length - 9;
  const duration = Math.floor(performance.now() - highResStart);

  try {
    await navigator.clipboard.writeText(content);
  } catch (e) {
    // ignore clipboard failures
  }

  await utils.AppendToFile(logPath, `|${noteId}|${content}|${ts}|\n`);
  await utils.AppendToFile(metaPath, `|${noteId}|${source}|${duration}|\n`);

  ui.sourceBox.value = config.DEFAULT_SOURCE;
  ui.textBox.value = "";
  ui.logBox.textContent = "";

  await UpdateTaskDisplay();
  await LogUp();

  highResStart = performance.now();
  ui.textBox.focus();
  return true;
}
```

---

### Parameters

- None.

---

### Input

- [`CreateLogFile`](#createlogfile-function) — ensures files exist.
- [`DailyLogPath`](#dailylogpath-function) — resolves log path.
- [`DailyMetaPath`](#dailymetapath-function) — resolves meta path.
- [`ui.sourceBox`](Planner_1_3_ui.md#initplannerui-function) — provides source field value.
- [`config.DEFAULT_SOURCE`](Planner_1_3_config.md#loadplannerconfig-function) — fallback source label.
- [`utils.NowTimeString`](Planner_1_3_config.md#nowtimestring-function) — generates timestamp.
- [`app.vault.adapter`](Planner_1_3.md#input) — reads the current log.
- [`utils.AppendToFile`](Planner_1_3_config.md#appendtofile-function) — appends rows to log and meta files.
- [`UpdateTaskDisplay`](#updatetaskdisplay-function) — refreshes task summary.
- [`LogUp`](#logup-function) — refreshes log list.

---

### Output

- Returns `true` when a submission succeeds, `false` when the textbox was empty.

---

### Functions

- [`CreateLogFile`](#createlogfile-function).
- [`DailyLogPath`](#dailylogpath-function).
- [`DailyMetaPath`](#dailymetapath-function).
- [`UpdateTaskDisplay`](#updatetaskdisplay-function).
- [`LogUp`](#logup-function).

---

### Called by

- [`Planner_1_3`](Planner_1_3.md#code) — invoked to seed UI after initialization via awaited call.
- [`InitPlannerEvents`](Planner_1_3_events.md#functions) — triggers submissions on button click or Enter keypress.

## ResetTimer (function)

### Description

Resets the high-resolution timer used for duration tracking and clears the textbox value when the input regains focus.

---

### Key operations

- Updates `highResStart` to the current `performance.now()`.
- Clears the textbox content and returns the new timestamp.

---

### Code

```javascript
function ResetTimer() {
  highResStart = performance.now();
  ui.textBox.value = "";
  return highResStart;
}
```

---

### Parameters

- None.

---

### Input

- [`ui.textBox`](Planner_1_3_ui.md#initplannerui-function) — cleared when timer resets.

---

### Output

- Returns the new baseline timestamp for duration measurement.

---

### Functions

- None.

---

### Called by

- [`InitPlannerEvents`](Planner_1_3_events.md#functions) — invoked on textbox focus to measure writing duration accurately.
