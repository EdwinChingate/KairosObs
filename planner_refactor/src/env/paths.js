/**
 * Resolve vault-relative paths used by the planner.
 * @param {Object} options - Planner environment options.
 * @param {string} options.suffix - Mobile/desktop suffix.
 * @returns {Object} Path helpers.
 */
function createPathEnv({ suffix }) {
  const MAIN_LOG_FOLDER = "0-Vault/02-Areas/04-Thoughts_and_Observations/";
  const LOG_PROJECT_NAME = "2026";
  const FULL_LOG_FOLDER = MAIN_LOG_FOLDER + LOG_PROJECT_NAME;

  const AGENDA_BASE_PATH = "0-Vault/02-Areas/02-Agenda/2026/";
  const CONSUMPTION_BASE_PATH = "0-Vault/02-Areas/06-Body-Mind/Health/Piled_up/";

  const ACTIVITY_LIST_PATH =
    "0-Vault/02-Areas/11-Gardening/Planning/RelevantInformation/Activity_List.md";
  const CONSUMPTION_LIST_PATH =
    "0-Vault/02-Areas/11-Gardening/Planning/RelevantInformation/Consumption_List.md";
  const RELATED_FILES_PATH =
    "0-Vault/02-Areas/11-Gardening/Planning/RelevantInformation/related_files.md";

  const getThoughtsFile = (d) => `${FULL_LOG_FOLDER}/${d}-Thoughts_and_Observations${suffix}.md`;
  const getMetaLogFile = (d) => `${FULL_LOG_FOLDER}/meta_log/${d}${suffix}.md`;
  const getPrimaryAgendaFile = (d) => `${AGENDA_BASE_PATH}${d}-Agenda${suffix}.md`;
  const getConsumptionLogFile = (d) => {
    const [yy, mm] = String(d).split("-");
    return `${CONSUMPTION_BASE_PATH}${yy}_${mm}${suffix}.md`;
  };
  const getEdLogFile = (d) => `${AGENDA_BASE_PATH}EdLog/${d}_EdLog${suffix}.md`;

  return {
    MAIN_LOG_FOLDER,
    LOG_PROJECT_NAME,
    FULL_LOG_FOLDER,
    AGENDA_BASE_PATH,
    CONSUMPTION_BASE_PATH,
    ACTIVITY_LIST_PATH,
    CONSUMPTION_LIST_PATH,
    RELATED_FILES_PATH,
    getThoughtsFile,
    getMetaLogFile,
    getPrimaryAgendaFile,
    getConsumptionLogFile,
    getEdLogFile,
  };
}

module.exports = { createPathEnv };
