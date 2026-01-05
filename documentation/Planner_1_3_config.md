---
title: Planner_1_3_config (module)
kind: module
source: Planner_1_3_config.js
last_updated: 2025-11-13
---

## Description

Provides planner configuration loading plus reusable date/time/file helpers exposed through the global `Planner.Utils` namespace.

---

## Key operations

- Loads JSON overrides from `Planner_1_3_config.json` and merges them with hard-coded defaults.
- Computes derived paths such as `LOG_FOLDER`, `PROJECT_ROOT`, `SKIP_PREFIXES`, and `RELATED_FILE_CANDIDATES` when omitted.
- Exposes time formatting helpers and file append utility for other modules via `Planner.Utils`.

---

## Code

```javascript
// Planner config loader
// Loads planner constants and date helpers.
const PlannerRoot = typeof window !== "undefined" ? window : globalThis;
PlannerRoot.Planner = PlannerRoot.Planner || {};

async function LoadPlannerConfig() {
  const defaults = {
    MAIN_FOLDER: "0-Vault/",
    PROJECT_NAME: "11-November",
    LOG_FOLDER: null,
    CONSUMPTION_FILE: "0-Vault/2025_11.md",
    ACTIVITIES_ROOT_PATH: "0-Vault/Activities",
    AGENDA_CANVAS_PATH: "0-Vault/Playground.canvas",
    AGENDA_META_LOG: "0-Vault/CleanAgenga-LogPlanner.md",
    DEFAULT_SOURCE: "edwin",
    PROJECT_ROOT: null,
    SKIP_PREFIXES: null,
    INSERT_BASENAME: true,
    RELATED_FILE_CANDIDATES: null,
    CONFIG_JSON_PATH: "Planner_1_3_config.json"
  };

  const cfgPath = defaults.CONFIG_JSON_PATH;
  let overrides = {};
  try {
    const file = app.vault.getAbstractFileByPath(cfgPath);
    if (file) {
      const raw = await app.vault.adapter.read(cfgPath);
      overrides = JSON.parse(raw);
    }
  } catch (e) {
    overrides = {};
  }

  const cfg = Object.assign({}, defaults, overrides || {});
  cfg.LOG_FOLDER = cfg.LOG_FOLDER || `${cfg.MAIN_FOLDER}${cfg.PROJECT_NAME}`;
  cfg.PROJECT_ROOT = cfg.PROJECT_ROOT || `${cfg.MAIN_FOLDER}${cfg.PROJECT_NAME}`;
  cfg.SKIP_PREFIXES = Array.isArray(cfg.SKIP_PREFIXES)
    ? cfg.SKIP_PREFIXES
    : [`${cfg.PROJECT_ROOT}/Log`];
  cfg.RELATED_FILE_CANDIDATES = Array.isArray(cfg.RELATED_FILE_CANDIDATES)
    ? cfg.RELATED_FILE_CANDIDATES
    : [`${cfg.PROJECT_ROOT}/related_files.md`, "related_files.md"];
  return cfg;
}

function PadNumber(value) {
  return String(value).padStart(2, "0");
}

function NowDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${PadNumber(d.getMonth() + 1)}-${PadNumber(d.getDate())}`;
}

function NowDayString() {
  const d = new Date();
  return `${PadNumber(d.getDate())}`;
}

function NowTimeString() {
  const d = new Date();
  return `${PadNumber(d.getHours())}:${PadNumber(d.getMinutes())}`;
}

async function AppendToFile(path, text) {
  await app.vault.adapter.append(path, text);
}

if (!PlannerRoot.Planner.Config) {
  PlannerRoot.Planner.Config = await LoadPlannerConfig();
}

PlannerRoot.Planner.Utils = Object.assign(PlannerRoot.Planner.Utils || {}, {
  PadNumber,
  NowDateString,
  NowDayString,
  NowTimeString,
  AppendToFile
});
```

---

## Parameters

- None. Module configuration is driven by vault files and defaults.

---

## Input

- [`app`](Planner_1_3.md#input) — used to read configuration JSON overrides and append to files.
- `defaults` — baseline configuration values merged with overrides.

---

## Output

- `PlannerRoot.Planner.Config` — shared configuration object consumed by planner subsystems.
- `PlannerRoot.Planner.Utils` — namespace exposing helper functions defined below.

---

## Functions

- [`LoadPlannerConfig`](#loadplannerconfig-function) — merges defaults with vault overrides and derives final configuration values.
- [`PadNumber`](#padnumber-function) — left-pads numeric strings to two digits for timestamps.
- [`NowDateString`](#nowdatestring-function) — formats the current date as `YYYY-MM-DD`.
- [`NowDayString`](#nowdaystring-function) — returns the current day-of-month as a two-digit string.
- [`NowTimeString`](#nowtimestring-function) — formats the current time as `HH:MM`.
- [`AppendToFile`](#appendtofile-function) — appends text to a vault file path.

---

## Called by

- [`Planner_1_3`](Planner_1_3.md#description) — loads this module to populate global planner configuration.

## LoadPlannerConfig (function)

### Description

Reads optional JSON overrides from the vault, merges them with defaults, derives missing path fields, and returns the finalized planner configuration.

---

### Key operations

- Reads `Planner_1_3_config.json` if present using [`app`](Planner_1_3.md#input).
- Safely parses JSON overrides, falling back to defaults on any error.
- Derives `LOG_FOLDER`, `PROJECT_ROOT`, `SKIP_PREFIXES`, and `RELATED_FILE_CANDIDATES` when missing.

---

### Code

```javascript
async function LoadPlannerConfig() {
  const defaults = {
    MAIN_FOLDER: "0-Vault/",
    PROJECT_NAME: "11-November",
    LOG_FOLDER: null,
    CONSUMPTION_FILE: "0-Vault/2025_11.md",
    ACTIVITIES_ROOT_PATH: "0-Vault/Activities",
    AGENDA_CANVAS_PATH: "0-Vault/Playground.canvas",
    AGENDA_META_LOG: "0-Vault/CleanAgenga-LogPlanner.md",
    DEFAULT_SOURCE: "edwin",
    PROJECT_ROOT: null,
    SKIP_PREFIXES: null,
    INSERT_BASENAME: true,
    RELATED_FILE_CANDIDATES: null,
    CONFIG_JSON_PATH: "Planner_1_3_config.json"
  };

  const cfgPath = defaults.CONFIG_JSON_PATH;
  let overrides = {};
  try {
    const file = app.vault.getAbstractFileByPath(cfgPath);
    if (file) {
      const raw = await app.vault.adapter.read(cfgPath);
      overrides = JSON.parse(raw);
    }
  } catch (e) {
    overrides = {};
  }

  const cfg = Object.assign({}, defaults, overrides || {});
  cfg.LOG_FOLDER = cfg.LOG_FOLDER || `${cfg.MAIN_FOLDER}${cfg.PROJECT_NAME}`;
  cfg.PROJECT_ROOT = cfg.PROJECT_ROOT || `${cfg.MAIN_FOLDER}${cfg.PROJECT_NAME}`;
  cfg.SKIP_PREFIXES = Array.isArray(cfg.SKIP_PREFIXES)
    ? cfg.SKIP_PREFIXES
    : [`${cfg.PROJECT_ROOT}/Log`];
  cfg.RELATED_FILE_CANDIDATES = Array.isArray(cfg.RELATED_FILE_CANDIDATES)
    ? cfg.RELATED_FILE_CANDIDATES
    : [`${cfg.PROJECT_ROOT}/related_files.md`, "related_files.md"];
  return cfg;
}
```

---

### Parameters

- None. Configuration is determined by file contents and defaults.

---

### Input

- `defaults` — fallback configuration fields for planner behavior.
- [`app.vault`](Planner_1_3.md#input) — checked for override files and used for JSON reads.

---

### Output

- `cfg` — normalized planner configuration object assigned to `Planner.Config`.

---

### Functions

- None beyond built-in `JSON.parse` and `Object.assign`.

---

### Called by

- [`Planner_1_3_config`](#description) — initializes the global configuration once per vault session.

## PadNumber (function)

### Description

Converts any value to a string and pads it with a leading zero when needed to ensure two-character numeric segments.

---

### Key operations

- Uses `String(value)` to normalize the input and `padStart(2, "0")` for width enforcement.

---

### Code

```javascript
function PadNumber(value) {
  return String(value).padStart(2, "0");
}
```

---

### Parameters

- `value` — number or string to pad.

---

### Input

- `value` — numeric component for timestamps.

---

### Output

- Padded string used by downstream time helpers.

---

### Functions

- None.

---

### Called by

- [`NowDateString`](#nowdatestring-function) — pads month and day fields.
- [`NowDayString`](#nowdaystring-function) — pads the day value.
- [`NowTimeString`](#nowtimestring-function) — pads hours and minutes.
- [`renderTimeTypingPanel`](Planner_1_3_suggester.md#rendertimetypingpanel-function) — displays user-selected hours and minutes.
- [`confirmStart`](Planner_1_3_suggester.md#confirmstart-function) — formats typed time slots for agenda scheduling.

## NowDateString (function)

### Description

Returns the current date formatted as `YYYY-MM-DD`, using `PadNumber` to ensure month and day have two digits.

---

### Key operations

- Instantiates `Date` once and extracts year, month, and day components.
- Pads month and day via [`PadNumber`](#padnumber-function).

---

### Code

```javascript
function NowDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${PadNumber(d.getMonth() + 1)}-${PadNumber(d.getDate())}`;
}
```

---

### Parameters

- None.

---

### Input

- `Date` — system clock reference used to compute the current date.

---

### Output

- Date string consumed by logging and agenda metadata.

---

### Functions

- [`PadNumber`](#padnumber-function) — pads month and day components.

---

### Called by

- [`DailyLogPath`](Planner_1_3_log.md#dailylogpath-function) — composes daily log file names.
- [`DailyMetaPath`](Planner_1_3_log.md#dailymetapath-function) — composes meta-log file names.
- [`UpdateMetaAgenda`](Planner_1_3_agenda.md#updatemetaagenda-function) — records date for agenda entries.

## NowDayString (function)

### Description

Retrieves the current day of the month and returns it as a zero-padded two-digit string.

---

### Key operations

- Instantiates `Date` and extracts the `getDate()` component.
- Pads the value via [`PadNumber`](#padnumber-function).

---

### Code

```javascript
function NowDayString() {
  const d = new Date();
  return `${PadNumber(d.getDate())}`;
}
```

---

### Parameters

- None.

---

### Input

- `Date` — system clock reference.

---

### Output

- Day string used for consumption log rows.

---

### Functions

- [`PadNumber`](#padnumber-function) — ensures two-digit output.

---

### Called by

- [`Consumption`](Planner_1_3_consumption.md#consumption-function) — records the day portion of consumption entries.

## NowTimeString (function)

### Description

Returns the current local time formatted as `HH:MM` with zero-padded hours and minutes.

---

### Key operations

- Extracts hours and minutes from a `Date` instance.
- Pads both components via [`PadNumber`](#padnumber-function).

---

### Code

```javascript
function NowTimeString() {
  const d = new Date();
  return `${PadNumber(d.getHours())}:${PadNumber(d.getMinutes())}`;
}
```

---

### Parameters

- None.

---

### Input

- `Date` — system clock reference.

---

### Output

- Time string reused across logging, agenda, and consumption flows.

---

### Functions

- [`PadNumber`](#padnumber-function) — pads hour and minute components.

---

### Called by

- [`SendEntry`](Planner_1_3_log.md#sendentry-function) — timestamps log submissions.
- [`UpdateMetaAgenda`](Planner_1_3_agenda.md#updatemetaagenda-function) — timestamps agenda metadata rows.
- [`StartActivity`](Planner_1_3_agenda.md#startactivity-function) — formats the status message after creating a node.
- [`EndActivity`](Planner_1_3_agenda.md#endactivity-function) — timestamps the status message when closing an activity.
- [`Consumption`](Planner_1_3_consumption.md#consumption-function) — records consumption time.
- [`openTimeMenu`](Planner_1_3_suggester.md#opentimemenu-function) — pre-fills the "start now" suggestion.

## AppendToFile (function)

### Description

Appends arbitrary text to a vault file path using the Obsidian adapter, serving as the shared write primitive for planner modules.

---

### Key operations

- Delegates to `app.vault.adapter.append` with provided path and text.

---

### Code

```javascript
async function AppendToFile(path, text) {
  await app.vault.adapter.append(path, text);
}
```

---

### Parameters

- `path` — vault-relative file path to append to.
- `text` — string content appended at the end of the file.

---

### Input

- `path` — destination file path for planner logs or agenda metadata.
- `text` — serialized row or JSON snippet to append.
- [`app.vault.adapter`](Planner_1_3.md#input) — filesystem adapter performing the append.

---

### Output

- Resolves once the append completes; no return payload.

---

### Functions

- None.

---

### Called by

- [`SendEntry`](Planner_1_3_log.md#sendentry-function) — saves log and meta rows.
- [`UpdateMetaAgenda`](Planner_1_3_agenda.md#updatemetaagenda-function) — records agenda metadata lines.
- [`Consumption`](Planner_1_3_consumption.md#consumption-function) — appends consumption log entries.
