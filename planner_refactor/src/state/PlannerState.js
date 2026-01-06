const { createDeviceEnv } = require("../env/device");
const { createPathEnv } = require("../env/paths");
const { createIo } = require("../io/files");
const { createNowHelpers } = require("../time/now");
const { createTimeConversions } = require("../time/conversions");

/**
 * Build the shared planner state container. All mutable cross-module data
 * lives on this object to reduce accidental globals.
 * @param {Object} deps - Runtime dependencies.
 * @param {App} deps.app - Obsidian app instance.
 * @param {DataviewApi} deps.dv - Dataview API instance.
 * @param {Object} [deps.config] - Optional configuration overrides.
 * @returns {Object} PlannerState instance.
 */
function createPlannerState({ app, dv, config = {} }) {
  const now = createNowHelpers();
  const time = createTimeConversions();
  const device = createDeviceEnv({ app, forceMobile: !!config.FORCE_MOBILE_MODE });
  const paths = createPathEnv({ suffix: device.suffix });
  const io = createIo({ app });

  const currentPlannerDate = device.currentDate;

  const state = {
    app,
    dv,
    now,
    time,
    device,
    paths,
    io,
    config: { FORCE_MOBILE_MODE: !!config.FORCE_MOBILE_MODE },
    currentPlannerDate,
    primaryAgendaFile: paths.getPrimaryAgendaFile(currentPlannerDate),
    consumptionLogFile: paths.getConsumptionLogFile(currentPlannerDate),
    calState: { scale: 0.5, currentDate: null, nodes: [] },
    highResStart: performance.now(),
    uiState: {
      panelOpen: false,
      activeIndex: -1,
      suggestMode: "root",
      pending: {
        activity: null,
        action: null,
        startTime: null,
        existingId: null,
        editField: null,
        lastEditedTime: null,
        resumable: [],
        startRequest: null,
        currentStart: null,
        currentEnd: null,
        consumptionItem: null,
        preciseTimestamp: null,
        targetFile: null,
        partialTime: { h: null },
        tempStorage: { val1: null },
      },
      historyStack: [],
    },
  };

  return state;
}

module.exports = { createPlannerState };
