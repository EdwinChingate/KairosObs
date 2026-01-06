/**
 * Resolve all agenda files for a given date (desktop + mobile variants).
 * @param {Object} state - PlannerState.
 * @param {string} dateStr - Target date (YYYY-MM-DD).
 * @returns {Promise<string[]>} Ordered list of file paths.
 */
async function getDailyAgendaFiles(state, dateStr) {
  const basePath = state.paths.AGENDA_BASE_PATH;
  try {
    const cleanPath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
    const folder = state.app.vault.getAbstractFileByPath(cleanPath);
    if (!folder || !folder.children) return [state.paths.getPrimaryAgendaFile(dateStr)];

    const primary = state.paths.getPrimaryAgendaFile(dateStr);
    const matches = folder.children
      .filter((f) => f.name.startsWith(dateStr) && f.name.includes("Agenda") && f.extension === "md")
      .map((f) => f.path)
      .sort((a, b) => {
        if (a === primary) return 1;
        if (b === primary) return -1;
        return a.localeCompare(b);
      });
    return matches.length > 0 ? matches : [primary];
  } catch (e) {
    return [state.paths.getPrimaryAgendaFile(dateStr)];
  }
}

module.exports = { getDailyAgendaFiles };
