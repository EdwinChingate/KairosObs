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
