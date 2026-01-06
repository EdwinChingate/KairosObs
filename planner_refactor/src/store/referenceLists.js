/**
 * Load reference lists (activities, consumption, key sentences) from markdown sources.
 * @param {Object} state - PlannerState.
 * @returns {Object} Accessors for reference data.
 */
function createReferenceLists(state) {
  const getStandardActivities = async () => {
    const targetPath = await state.io.resolveVaultPath(state.paths.ACTIVITY_LIST_PATH);
    try {
      const content = await state.io.read(targetPath);
      return content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("- ") || l.startsWith("* "))
        .map((l) => l.substring(2).trim());
    } catch (e) {
      return ["Planning", "Coding", "Reading"];
    }
  };

  const getConsumptionItems = async () => {
    const targetPath = await state.io.resolveVaultPath(state.paths.CONSUMPTION_LIST_PATH);
    try {
      const content = await state.io.read(targetPath);
      return content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("- ") || l.startsWith("* "))
        .map((l) => l.substring(2).trim());
    } catch (e) {
      return ["Water", "Coffee", "Tea"];
    }
  };

  const getKeySentences = async () => {
    const targetPath = await state.io.resolveVaultPath(state.paths.RELATED_FILES_PATH);
    try {
      const content = await state.io.read(targetPath);
      return content
        .split("\n")
        .map((l) => l.trim())
        .map((l) => l.match(/\\[\\[(.*?)\\]\\]/))
        .filter((m) => m)
        .map((m) => {
          const fullInner = m[1];
          const parts = fullInner.split("|");
          return { label: parts[1] || fullInner, value: `[[${fullInner}]]` };
        });
    } catch (e) {
      return [];
    }
  };

  return { getStandardActivities, getConsumptionItems, getKeySentences };
}

module.exports = { createReferenceLists };
