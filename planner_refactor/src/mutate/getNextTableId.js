/**
 * Generate next table id using desktop/mobile split ranges.
 * @param {Object} state - PlannerState.
 * @param {string} filePath - Agenda file path.
 * @returns {Promise<number>} Next id.
 */
async function getNextTableId(state, filePath) {
  try {
    const txt = await state.io.read(filePath);
    const lines = String(txt).split("\n");
    let maxDesktop = 0;
    let maxMobile = 100;
    lines.forEach((line) => {
      const m = line.match(/^\\|\\s*(\\d+)\\s*\\|/);
      if (m) {
        const id = Number(m[1]);
        if (id < 100) maxDesktop = Math.max(maxDesktop, id);
        else maxMobile = Math.max(maxMobile, id);
      }
    });
    return state.device.isMobile ? maxMobile + 1 : maxDesktop + 1;
  } catch (e) {
    return state.device.isMobile ? 101 : 1;
  }
}

module.exports = { getNextTableId };
