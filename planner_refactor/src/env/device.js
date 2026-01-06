const { createNowHelpers } = require("../time/now");

/**
 * Detect whether the planner should run in mobile mode.
 * @param {Object} deps - Environment deps.
 * @param {App} deps.app - Obsidian app instance.
 * @param {boolean} deps.forceMobile - Override for testing.
 * @returns {Object} Mobile flags and suffix.
 */
function createDeviceEnv({ app, forceMobile = false }) {
  const { nowDate } = createNowHelpers();

  const detectMobile = () => {
    if (forceMobile) return true;
    try {
      if (typeof app !== "undefined" && app.isMobile) return true;
      if (window.matchMedia("(max-width: 768px)").matches) return true;
    } catch (e) {
      /* ignore */
    }
    return false;
  };

  const isMobile = detectMobile();

  return {
    isMobile,
    suffix: isMobile ? "_m" : "",
    currentDate: nowDate(),
  };
}

module.exports = { createDeviceEnv };
