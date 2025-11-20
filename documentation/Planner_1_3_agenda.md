---
title: Planner_1_3_agenda (module)
kind: module
source: Planner_1_3_agenda.js
last_updated: 2025-11-13
---

## Description

Provides agenda management utilities: reading activity metadata, transforming times to canvas coordinates, updating canvas JSON, and logging active activities for later use by the suggester.

---

## Key operations

- Reads activity display names from `.txt`/`.md` files in the configured activity directory.
- Converts clock strings to minutes-from-midnight and maps them to canvas coordinates.
- Loads the meta agenda log, computes next column assignments, and appends new metadata lines.
- Writes new nodes into the agenda canvas JSON file when starting activities and updates status text in the UI.

---

## Code

```javascript
// Planner agenda helpers
// Manages activity metadata and canvas updates.
const PlannerRootAgenda = typeof window !== "undefined" ? window : globalThis;
PlannerRootAgenda.Planner = PlannerRootAgenda.Planner || {};

function InitPlannerAgenda(app, config, ui, utils) {
  async function ReadFullName(activity) {
    const txtPath = `${config.ACTIVITIES_ROOT_PATH}/${activity}.txt`;
    try {
      let full = await app.vault.adapter.read(txtPath);
      full = (full || "").replace("\n", "").trim();
      if (full) return full;
    } catch (e) {}

    const mdPath = `${config.ACTIVITIES_ROOT_PATH}/${activity}.md`;
    try {
      let fullMd = await app.vault.adapter.read(mdPath);
      fullMd = (fullMd || "").split("\n")[0].replace(/^#\s*/, "").trim();
      return fullMd || activity;
    } catch (e) {
      return activity;
    }
  }

  function MinutesFromMidnight(t) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
    const hours = Number(m?.[1] ?? 0);
    const minutes = Number(m?.[2] ?? 0);
    return hours * 60 + minutes;
  }

  function TimeToCanvas(mins) {
    const m = 3;
    const b = 100;
    return String(mins * m + b);
  }

  function XCanvas(col) {
    return String(400 + (col - 1) * 340);
  }

  function ShiftColumn(cols, col) {
    const base = cols[2];
    const sample = Math.random();
    if (sample > 0.5) {
      cols[2] = col;
      cols.push(base);
    } else {
      cols.push(col);
    }
    return cols;
  }

  function NextColumn(latest) {
    const cols = latest.slice(-5);
    const nextId = cols[4];
    const baseCols = cols.slice(0, 4);
    const first = baseCols.shift();
    const shifted = ShiftColumn(baseCols, first);
    return { Columns: shifted, Next_id: nextId };
  }

  async function MetaAgenda() {
    const log = await app.vault.adapter.read(config.AGENDA_META_LOG);
    const lines = log.split(/\n/);
    const last = lines[lines.length - 1] || "";
    const parts = last.split(",");
    const active = parts.slice(0, -7);
    const meta = NextColumn(parts);
    meta.ActiveActivities = active;
    return meta;
  }

  async function UpdateAgendaCanvasJSON(nodeObj) {
    let raw;
    try {
      raw = await app.vault.adapter.read(config.AGENDA_CANVAS_PATH);
    } catch (e) {
      const fresh = { nodes: [nodeObj], edges: [] };
      await app.vault.adapter.write(config.AGENDA_CANVAS_PATH, JSON.stringify(fresh, null, 2));
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      data = { nodes: [], edges: [] };
    }
    if (!Array.isArray(data.nodes)) data.nodes = [];
    data.nodes.push(nodeObj);
    await app.vault.adapter.write(config.AGENDA_CANVAS_PATH, JSON.stringify(data, null, 2));
  }

  async function UpdateMetaAgenda(metaAgenda, uniqueLoc) {
    const cols = metaAgenda.Columns;
    const active = metaAgenda.ActiveActivities;
    const next = Number(metaAgenda.Next_id) + 1;
    const line = `\n${active},${uniqueLoc},${utils.NowDateString()},${utils.NowTimeString()},${cols},${next}`;
    await utils.AppendToFile(config.AGENDA_META_LOG, line);
  }

  async function StartActivity(result, metaAgenda) {
    const activity = result.asString("{{list}}");
    const startTime = result.asString("{{when}}");

    const mins = MinutesFromMidnight(startTime);
    const yCoord = Number(TimeToCanvas(mins));
    const col = metaAgenda.Columns[0];
    const xCoord = Number(XCanvas(col));

    const id = `${String(metaAgenda.Next_id)}-${Date.now().toString(36)}`;
    const fullName = await ReadFullName(activity);

    const nodeText = `# ${activity}\n  [[${fullName}|___${startTime}_-]] \n  $_{length}$`;
    const nodeObj = {
      id,
      type: "text",
      text: nodeText,
      x: xCoord,
      y: yCoord,
      width: 323,
      height: 163
    };

    await UpdateAgendaCanvasJSON(nodeObj);

    const uniqueLoc = `${activity}-${xCoord}-${yCoord}`;
    await UpdateMetaAgenda(metaAgenda, uniqueLoc);

    ui.taskBox.textContent = `Started: ${fullName} @ ${startTime}`;
  }

  async function EndActivity(activityKey) {
    const ts = utils.NowTimeString();
    ui.taskBox.textContent = `Ended: ${activityKey || "(choose…)"} @ ${ts}`;
  }

  return {
    ReadFullName,
    MinutesFromMidnight,
    TimeToCanvas,
    XCanvas,
    MetaAgenda,
    UpdateAgendaCanvasJSON,
    StartActivity,
    EndActivity
  };
}

PlannerRootAgenda.Planner.Agenda = {
  InitPlannerAgenda
};
```

---

## Parameters

- None at module load; dependencies are provided via the exported initializer.

---

## Input

- [`app`](Planner_1_3.md#input) — supplies vault read/write APIs for agenda files.
- [`config`](Planner_1_3_config.md#loadplannerconfig-function) — provides paths to activities, canvas, and meta logs.
- [`ui`](Planner_1_3_ui.md#initplannerui-function) — exposes `taskBox` for status updates.
- [`utils`](Planner_1_3_config.md#functions) — offers date/time strings and append helper.

---

## Output

- Registers `Planner.Agenda.InitPlannerAgenda` on the global namespace.

---

## Functions

- [`InitPlannerAgenda`](#initplanneragenda-function) — returns the agenda API surface.
- [`ReadFullName`](#readfullname-function) — resolves display names for activities.
- [`MinutesFromMidnight`](#minutesfrommidnight-function) — converts clock strings to total minutes.
- [`TimeToCanvas`](#timetocanvas-function) — converts minutes to canvas Y coordinates.
- [`XCanvas`](#xcanvas-function) — converts column numbers to canvas X coordinates.
- [`ShiftColumn`](#shiftcolumn-function) — randomizes column rotation for meta agenda state.
- [`NextColumn`](#nextcolumn-function) — computes next column assignments from meta log rows.
- [`MetaAgenda`](#metaagenda-function) — reads the meta agenda log and returns active metadata.
- [`UpdateAgendaCanvasJSON`](#updateagendacanvasjson-function) — appends nodes to the canvas JSON file.
- [`UpdateMetaAgenda`](#updatemetaagenda-function) — appends agenda metadata rows for future scheduling.
- [`StartActivity`](#startactivity-function) — creates a canvas node and logs metadata when an activity begins.
- [`EndActivity`](#endactivity-function) — updates the UI when an activity ends.

---

## Called by

- [`Planner_1_3`](Planner_1_3.md#functions) — initializes the agenda subsystem and exposes its API to the suggester.
- [`InitPlannerSuggester`](Planner_1_3_suggester.md#functions) — invokes agenda helpers when starting or ending activities.

## InitPlannerAgenda (function)

### Description

Constructs agenda helper closures bound to `app`, `config`, `ui`, and `utils`, and returns functions for reading activity data, computing coordinates, updating canvas JSON, and reporting activity status.

---

### Key operations

- Defines helper functions for metadata retrieval, coordinate conversion, and file updates.
- Returns the API object used by the suggester and other modules to manage agenda interactions.

---

### Code

```javascript
function InitPlannerAgenda(app, config, ui, utils) {
  async function ReadFullName(activity) {
    const txtPath = `${config.ACTIVITIES_ROOT_PATH}/${activity}.txt`;
    try {
      let full = await app.vault.adapter.read(txtPath);
      full = (full || "").replace("\n", "").trim();
      if (full) return full;
    } catch (e) {}

    const mdPath = `${config.ACTIVITIES_ROOT_PATH}/${activity}.md`;
    try {
      let fullMd = await app.vault.adapter.read(mdPath);
      fullMd = (fullMd || "").split("\n")[0].replace(/^#\s*/, "").trim();
      return fullMd || activity;
    } catch (e) {
      return activity;
    }
  }

  function MinutesFromMidnight(t) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
    const hours = Number(m?.[1] ?? 0);
    const minutes = Number(m?.[2] ?? 0);
    return hours * 60 + minutes;
  }

  function TimeToCanvas(mins) {
    const m = 3;
    const b = 100;
    return String(mins * m + b);
  }

  function XCanvas(col) {
    return String(400 + (col - 1) * 340);
  }

  function ShiftColumn(cols, col) {
    const base = cols[2];
    const sample = Math.random();
    if (sample > 0.5) {
      cols[2] = col;
      cols.push(base);
    } else {
      cols.push(col);
    }
    return cols;
  }

  function NextColumn(latest) {
    const cols = latest.slice(-5);
    const nextId = cols[4];
    const baseCols = cols.slice(0, 4);
    const first = baseCols.shift();
    const shifted = ShiftColumn(baseCols, first);
    return { Columns: shifted, Next_id: nextId };
  }

  async function MetaAgenda() {
    const log = await app.vault.adapter.read(config.AGENDA_META_LOG);
    const lines = log.split(/\n/);
    const last = lines[lines.length - 1] || "";
    const parts = last.split(",");
    const active = parts.slice(0, -7);
    const meta = NextColumn(parts);
    meta.ActiveActivities = active;
    return meta;
  }

  async function UpdateAgendaCanvasJSON(nodeObj) {
    let raw;
    try {
      raw = await app.vault.adapter.read(config.AGENDA_CANVAS_PATH);
    } catch (e) {
      const fresh = { nodes: [nodeObj], edges: [] };
      await app.vault.adapter.write(config.AGENDA_CANVAS_PATH, JSON.stringify(fresh, null, 2));
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      data = { nodes: [], edges: [] };
    }
    if (!Array.isArray(data.nodes)) data.nodes = [];
    data.nodes.push(nodeObj);
    await app.vault.adapter.write(config.AGENDA_CANVAS_PATH, JSON.stringify(data, null, 2));
  }

  async function UpdateMetaAgenda(metaAgenda, uniqueLoc) {
    const cols = metaAgenda.Columns;
    const active = metaAgenda.ActiveActivities;
    const next = Number(metaAgenda.Next_id) + 1;
    const line = `\n${active},${uniqueLoc},${utils.NowDateString()},${utils.NowTimeString()},${cols},${next}`;
    await utils.AppendToFile(config.AGENDA_META_LOG, line);
  }

  async function StartActivity(result, metaAgenda) {
    const activity = result.asString("{{list}}");
    const startTime = result.asString("{{when}}");

    const mins = MinutesFromMidnight(startTime);
    const yCoord = Number(TimeToCanvas(mins));
    const col = metaAgenda.Columns[0];
    const xCoord = Number(XCanvas(col));

    const id = `${String(metaAgenda.Next_id)}-${Date.now().toString(36)}`;
    const fullName = await ReadFullName(activity);

    const nodeText = `# ${activity}\n  [[${fullName}|___${startTime}_-]] \n  $_{length}$`;
    const nodeObj = {
      id,
      type: "text",
      text: nodeText,
      x: xCoord,
      y: yCoord,
      width: 323,
      height: 163
    };

    await UpdateAgendaCanvasJSON(nodeObj);

    const uniqueLoc = `${activity}-${xCoord}-${yCoord}`;
    await UpdateMetaAgenda(metaAgenda, uniqueLoc);

    ui.taskBox.textContent = `Started: ${fullName} @ ${startTime}`;
  }

  async function EndActivity(activityKey) {
    const ts = utils.NowTimeString();
    ui.taskBox.textContent = `Ended: ${activityKey || "(choose…)"} @ ${ts}`;
  }

  return {
    ReadFullName,
    MinutesFromMidnight,
    TimeToCanvas,
    XCanvas,
    MetaAgenda,
    UpdateAgendaCanvasJSON,
    StartActivity,
    EndActivity
  };
}
```

---

### Parameters

- `app` — Obsidian API for vault reads and writes.
- `config` — planner configuration with agenda paths and settings.
- `ui` — planner UI handles (for updating `taskBox`).
- `utils` — helper namespace for date/time strings and file appends.

---

### Input

- [`app.vault`](Planner_1_3.md#input) — used to read/write agenda files.
- [`config.ACTIVITIES_ROOT_PATH`](Planner_1_3_config.md#loadplannerconfig-function) — base path for activity files.
- [`config.AGENDA_CANVAS_PATH`](Planner_1_3_config.md#loadplannerconfig-function) — location of the canvas JSON file.
- [`config.AGENDA_META_LOG`](Planner_1_3_config.md#loadplannerconfig-function) — meta log file for agenda state.
- [`ui.taskBox`](Planner_1_3_ui.md#initplannerui-function) — displays status messages.
- [`utils.NowDateString`](Planner_1_3_config.md#nowdatestring-function) — used in meta log entries.
- [`utils.NowTimeString`](Planner_1_3_config.md#nowtimestring-function) — timestamps meta entries and status text.
- [`utils.AppendToFile`](Planner_1_3_config.md#appendtofile-function) — appends meta log lines.

---

### Output

- Returns agenda helper API with methods described above.

---

### Functions

- [`ReadFullName`](#readfullname-function).
- [`MinutesFromMidnight`](#minutesfrommidnight-function).
- [`TimeToCanvas`](#timetocanvas-function).
- [`XCanvas`](#xcanvas-function).
- [`ShiftColumn`](#shiftcolumn-function).
- [`NextColumn`](#nextcolumn-function).
- [`MetaAgenda`](#metaagenda-function).
- [`UpdateAgendaCanvasJSON`](#updateagendacanvasjson-function).
- [`UpdateMetaAgenda`](#updatemetaagenda-function).
- [`StartActivity`](#startactivity-function).
- [`EndActivity`](#endactivity-function).

---

### Called by

- [`Planner_1_3`](Planner_1_3.md#code) — instantiates the agenda API for the planner session.
- [`InitPlannerSuggester`](Planner_1_3_suggester.md#initplannersuggester-function) — leverages agenda helpers when processing activity commands.

## ReadFullName (function)

### Description

Attempts to resolve a human-friendly activity name by reading associated `.txt` or `.md` files; falls back to the activity slug when no metadata is available.

---

### Key operations

- Tries reading `<activity>.txt`, strips newline characters, and trims whitespace.
- If `.txt` is missing or empty, reads `<activity>.md`, taking the first heading line after stripping Markdown heading markers.
- Catches read errors and ultimately returns the original `activity` string.

---

### Code

```javascript
async function ReadFullName(activity) {
  const txtPath = `${config.ACTIVITIES_ROOT_PATH}/${activity}.txt`;
  try {
    let full = await app.vault.adapter.read(txtPath);
    full = (full || "").replace("\n", "").trim();
    if (full) return full;
  } catch (e) {}

  const mdPath = `${config.ACTIVITIES_ROOT_PATH}/${activity}.md`;
  try {
    let fullMd = await app.vault.adapter.read(mdPath);
    fullMd = (fullMd || "").split("\n")[0].replace(/^#\s*/, "").trim();
    return fullMd || activity;
  } catch (e) {
    return activity;
  }
}
```

---

### Parameters

- `activity` — slug name of the activity selected by the user.

---

### Input

- [`config.ACTIVITIES_ROOT_PATH`](Planner_1_3_config.md#loadplannerconfig-function) — base path for metadata files.
- [`app.vault.adapter`](Planner_1_3.md#input) — reads `.txt` or `.md` files.

---

### Output

- Full activity name string used in canvas nodes and status messages.

---

### Functions

- None beyond `app.vault.adapter.read`.

---

### Called by

- [`StartActivity`](#startactivity-function) — resolves the display name before rendering canvas nodes.

## MinutesFromMidnight (function)

### Description

Parses a `HH:MM` string and converts it into the total number of minutes since midnight, defaulting missing segments to zero.

---

### Key operations

- Uses a regular expression to capture hour and minute groups.
- Converts captured strings to numbers with safe defaults and returns `hours * 60 + minutes`.

---

### Code

```javascript
function MinutesFromMidnight(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
  const hours = Number(m?.[1] ?? 0);
  const minutes = Number(m?.[2] ?? 0);
  return hours * 60 + minutes;
}
```

---

### Parameters

- `t` — time string extracted from modal form input.

---

### Input

- `t` — start time string for the activity.

---

### Output

- Number of minutes since midnight used for canvas coordinate calculations.

---

### Functions

- None.

---

### Called by

- [`StartActivity`](#startactivity-function) — computes the Y coordinate for the canvas node.
- [`confirmStart`](Planner_1_3_suggester.md#confirmstart-function) — indirectly depends on consistent interpretation of time strings.

## TimeToCanvas (function)

### Description

Transforms minute counts into canvas Y coordinates using a linear mapping with slope `3` and intercept `100`.

---

### Key operations

- Multiplies the minute value by `3`, adds `100`, and returns the result as a string.

---

### Code

```javascript
function TimeToCanvas(mins) {
  const m = 3;
  const b = 100;
  return String(mins * m + b);
}
```

---

### Parameters

- `mins` — minutes from midnight for the activity start time.

---

### Input

- `mins` — numeric minute offset produced by [`MinutesFromMidnight`](#minutesfrommidnight-function).

---

### Output

- String Y coordinate inserted into the canvas node definition.

---

### Functions

- None.

---

### Called by

- [`StartActivity`](#startactivity-function) — generates the Y coordinate for the new canvas node.

## XCanvas (function)

### Description

Maps a column index to a canvas X coordinate by offsetting from a base of `400` and spacing columns `340` units apart.

---

### Key operations

- Applies the formula `400 + (col - 1) * 340` and returns the result as a string.

---

### Code

```javascript
function XCanvas(col) {
  return String(400 + (col - 1) * 340);
}
```

---

### Parameters

- `col` — column number selected for the activity.

---

### Input

- `col` — leading value from meta agenda column rotation.

---

### Output

- String X coordinate used in the canvas node.

---

### Functions

- None.

---

### Called by

- [`StartActivity`](#startactivity-function) — computes the X coordinate for the node.

## ShiftColumn (function)

### Description

Randomly rotates column assignments by reordering the pool of available columns, using a sampled coin flip to determine whether to swap in the selected column or append it.

---

### Key operations

- Captures the third column as a base reference.
- Uses `Math.random()` to decide whether to replace the third entry with the incoming column or simply append it.
- Returns the mutated column list.

---

### Code

```javascript
function ShiftColumn(cols, col) {
  const base = cols[2];
  const sample = Math.random();
  if (sample > 0.5) {
    cols[2] = col;
    cols.push(base);
  } else {
    cols.push(col);
  }
  return cols;
}
```

---

### Parameters

- `cols` — array of recent column assignments.
- `col` — next column candidate to rotate into the sequence.

---

### Input

- `cols` — column list derived from the meta log row.
- `col` — first element removed from the base column list.

---

### Output

- Mutated `cols` array representing updated column ordering.

---

### Functions

- [`Math.random`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random) — randomizes rotation.

---

### Called by

- [`NextColumn`](#nextcolumn-function) — adjusts the rolling column list after reading meta log data.

## NextColumn (function)

### Description

Transforms the last meta log row into the next column assignment and exposes the ID for the upcoming node.

---

### Key operations

- Takes the last five values from the meta log line: four columns and the next ID.
- Shifts the first column off, rotates columns via [`ShiftColumn`](#shiftcolumn-function), and returns both the rotated columns and `Next_id`.

---

### Code

```javascript
function NextColumn(latest) {
  const cols = latest.slice(-5);
  const nextId = cols[4];
  const baseCols = cols.slice(0, 4);
  const first = baseCols.shift();
  const shifted = ShiftColumn(baseCols, first);
  return { Columns: shifted, Next_id: nextId };
}
```

---

### Parameters

- `latest` — array of comma-separated tokens from the last meta log line.

---

### Input

- `latest` — parsed segments of the meta log entry.
- [`ShiftColumn`](#shiftcolumn-function) — rotates column order.

---

### Output

- Object `{ Columns, Next_id }` consumed by agenda scheduling.

---

### Functions

- [`ShiftColumn`](#shiftcolumn-function) — updates column ordering.

---

### Called by

- [`MetaAgenda`](#metaagenda-function) — builds the meta agenda state for suggester flows.

## MetaAgenda (function)

### Description

Reads the agenda meta log, extracts the last entry, and produces a metadata object containing active activities, column assignments, and the next ID for canvas nodes.

---

### Key operations

- Reads the meta log file using `app.vault.adapter.read`.
- Splits the content into lines and tokens, collects active activity names, and delegates to [`NextColumn`](#nextcolumn-function) for column rotation.
- Attaches `ActiveActivities` to the result before returning.

---

### Code

```javascript
async function MetaAgenda() {
  const log = await app.vault.adapter.read(config.AGENDA_META_LOG);
  const lines = log.split(/\n/);
  const last = lines[lines.length - 1] || "";
  const parts = last.split(",");
  const active = parts.slice(0, -7);
  const meta = NextColumn(parts);
  meta.ActiveActivities = active;
  return meta;
}
```

---

### Parameters

- None.

---

### Input

- [`config.AGENDA_META_LOG`](Planner_1_3_config.md#loadplannerconfig-function) — meta log path.
- [`app.vault.adapter`](Planner_1_3.md#input) — reads the log file.
- [`NextColumn`](#nextcolumn-function) — computes column rotation and next ID.

---

### Output

- Meta agenda object containing `{ Columns, Next_id, ActiveActivities }`.

---

### Functions

- [`NextColumn`](#nextcolumn-function) — transforms log tokens into scheduling data.

---

### Called by

- [`InitPlannerSuggester`](Planner_1_3_suggester.md#functions) — fetches meta data when rendering agenda menus.
- [`StartActivity`](#startactivity-function) — receives meta agenda context to place nodes.

## UpdateAgendaCanvasJSON (function)

### Description

Safely appends a new node definition to the agenda canvas JSON file, creating the file if missing and ensuring the nodes array exists.

---

### Key operations

- Attempts to read the canvas JSON; if missing, writes a fresh file containing the node and empty edges.
- Parses the JSON with error handling, ensuring `data.nodes` is an array before pushing the new node.
- Writes the updated JSON back to the vault with pretty formatting.

---

### Code

```javascript
async function UpdateAgendaCanvasJSON(nodeObj) {
  let raw;
  try {
    raw = await app.vault.adapter.read(config.AGENDA_CANVAS_PATH);
  } catch (e) {
    const fresh = { nodes: [nodeObj], edges: [] };
    await app.vault.adapter.write(config.AGENDA_CANVAS_PATH, JSON.stringify(fresh, null, 2));
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    data = { nodes: [], edges: [] };
  }
  if (!Array.isArray(data.nodes)) data.nodes = [];
  data.nodes.push(nodeObj);
  await app.vault.adapter.write(config.AGENDA_CANVAS_PATH, JSON.stringify(data, null, 2));
}
```

---

### Parameters

- `nodeObj` — serialized canvas node to append.

---

### Input

- [`config.AGENDA_CANVAS_PATH`](Planner_1_3_config.md#loadplannerconfig-function) — canvas file path.
- [`app.vault.adapter`](Planner_1_3.md#input) — reads and writes JSON content.
- `nodeObj` — node descriptor built in [`StartActivity`](#startactivity-function).

---

### Output

- Updated canvas JSON persisted in the vault; no return value.

---

### Functions

- [`JSON.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) — converts raw JSON to objects.
- [`JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) — serializes updated canvas data.

---

### Called by

- [`StartActivity`](#startactivity-function) — writes the new activity node to the canvas file.

## UpdateMetaAgenda (function)

### Description

Appends a new line to the agenda meta log capturing active activities, node location, date, time, column rotation, and next ID.

---

### Key operations

- Extracts `Columns`, `ActiveActivities`, and `Next_id` from the provided meta agenda object.
- Builds a CSV-style line with current date and time via [`utils`](Planner_1_3_config.md#functions).
- Appends the line to the meta log using [`utils.AppendToFile`](Planner_1_3_config.md#appendtofile-function).

---

### Code

```javascript
async function UpdateMetaAgenda(metaAgenda, uniqueLoc) {
  const cols = metaAgenda.Columns;
  const active = metaAgenda.ActiveActivities;
  const next = Number(metaAgenda.Next_id) + 1;
  const line = `\n${active},${uniqueLoc},${utils.NowDateString()},${utils.NowTimeString()},${cols},${next}`;
  await utils.AppendToFile(config.AGENDA_META_LOG, line);
}
```

---

### Parameters

- `metaAgenda` — object from [`MetaAgenda`](#metaagenda-function) containing scheduling context.
- `uniqueLoc` — unique identifier combining activity name and coordinates.

---

### Input

- `metaAgenda.Columns` — column rotation list to persist.
- `metaAgenda.ActiveActivities` — list of currently active activity names.
- `metaAgenda.Next_id` — numeric identifier for the next node.
- [`utils.NowDateString`](Planner_1_3_config.md#nowdatestring-function) — current date.
- [`utils.NowTimeString`](Planner_1_3_config.md#nowtimestring-function) — current time.
- [`utils.AppendToFile`](Planner_1_3_config.md#appendtofile-function) — appends the new line.
- [`config.AGENDA_META_LOG`](Planner_1_3_config.md#loadplannerconfig-function) — log file path.

---

### Output

- Appends a new metadata line; no return value.

---

### Functions

- [`utils.AppendToFile`](Planner_1_3_config.md#appendtofile-function) — writes to disk.

---

### Called by

- [`StartActivity`](#startactivity-function) — records metadata after placing the canvas node.

## StartActivity (function)

### Description

Transforms modal result data into a canvas node, writes it to the canvas JSON, logs metadata, and updates the planner UI to reflect the started activity.

---

### Key operations

- Extracts activity slug and start time from the modal result object.
- Converts time to canvas coordinates using [`MinutesFromMidnight`](#minutesfrommidnight-function), [`TimeToCanvas`](#timetocanvas-function), and [`XCanvas`](#xcanvas-function).
- Builds a node object with ID, text, coordinates, and size; appends it to the canvas via [`UpdateAgendaCanvasJSON`](#updateagendacanvasjson-function).
- Appends meta log entry via [`UpdateMetaAgenda`](#updatemetaagenda-function) and updates `ui.taskBox` with a status string.

---

### Code

```javascript
async function StartActivity(result, metaAgenda) {
  const activity = result.asString("{{list}}");
  const startTime = result.asString("{{when}}");

  const mins = MinutesFromMidnight(startTime);
  const yCoord = Number(TimeToCanvas(mins));
  const col = metaAgenda.Columns[0];
  const xCoord = Number(XCanvas(col));

  const id = `${String(metaAgenda.Next_id)}-${Date.now().toString(36)}`;
  const fullName = await ReadFullName(activity);

  const nodeText = `# ${activity}\n  [[${fullName}|___${startTime}_-]] \n  $_{length}$`;
  const nodeObj = {
    id,
    type: "text",
    text: nodeText,
    x: xCoord,
    y: yCoord,
    width: 323,
    height: 163
  };

  await UpdateAgendaCanvasJSON(nodeObj);

  const uniqueLoc = `${activity}-${xCoord}-${yCoord}`;
  await UpdateMetaAgenda(metaAgenda, uniqueLoc);

  ui.taskBox.textContent = `Started: ${fullName} @ ${startTime}`;
}
```

---

### Parameters

- `result` — modal result object providing `asString` accessors for activity details.
- `metaAgenda` — metadata context from [`MetaAgenda`](#metaagenda-function).

---

### Input

- `result.asString("{{list}}").` — activity slug.
- `result.asString("{{when}}").` — start time string.
- [`MinutesFromMidnight`](#minutesfrommidnight-function) — converts time to minutes.
- [`TimeToCanvas`](#timetocanvas-function) — converts minutes to Y coordinate.
- [`XCanvas`](#xcanvas-function) — converts column to X coordinate.
- [`ReadFullName`](#readfullname-function) — resolves full activity name.
- [`UpdateAgendaCanvasJSON`](#updateagendacanvasjson-function) — writes node to canvas file.
- [`UpdateMetaAgenda`](#updatemetaagenda-function) — records metadata line.
- [`ui.taskBox`](Planner_1_3_ui.md#initplannerui-function) — displays status text.

---

### Output

- Creates a new canvas node and updates status UI; returns nothing.

---

### Functions

- [`MinutesFromMidnight`](#minutesfrommidnight-function).
- [`TimeToCanvas`](#timetocanvas-function).
- [`XCanvas`](#xcanvas-function).
- [`ReadFullName`](#readfullname-function).
- [`UpdateAgendaCanvasJSON`](#updateagendacanvasjson-function).
- [`UpdateMetaAgenda`](#updatemetaagenda-function).

---

### Called by

- [`InitPlannerSuggester`](Planner_1_3_suggester.md#confirmstart-function) — triggers when the user confirms a start time.

## EndActivity (function)

### Description

Updates the planner status textarea to indicate that an activity ended at the current time or prompts the user if no activity was chosen.

---

### Key operations

- Retrieves the current time using [`utils.NowTimeString`](Planner_1_3_config.md#nowtimestring-function).
- Writes a status message to `ui.taskBox` indicating the end time and optional activity key.

---

### Code

```javascript
async function EndActivity(activityKey) {
  const ts = utils.NowTimeString();
  ui.taskBox.textContent = `Ended: ${activityKey || "(choose…)"} @ ${ts}`;
}
```

---

### Parameters

- `activityKey` — optional identifier for the activity being ended.

---

### Input

- `activityKey` — selection from the suggester when ending an activity.
- [`utils.NowTimeString`](Planner_1_3_config.md#nowtimestring-function) — timestamp for the status message.
- [`ui.taskBox`](Planner_1_3_ui.md#initplannerui-function) — displays the status.

---

### Output

- Updates the status text; returns nothing.

---

### Functions

- [`utils.NowTimeString`](Planner_1_3_config.md#nowtimestring-function).

---

### Called by

- [`renderEndMenu`](Planner_1_3_suggester.md#renderendmenu-function) — handles clicks on end-activity entries.
- [`InitPlannerSuggester`](Planner_1_3_suggester.md#handlekeydown-function) — triggered when user confirms end action via keyboard.
