/**
 * Centralized vault I/O helpers. All file reads and writes flow through here.
 * @param {Object} deps - Dependencies.
 * @param {App} deps.app - Obsidian app instance.
 * @returns {Object} Helper methods for file operations.
 */
function createIo({ app }) {
  const adapter = app?.vault?.adapter;

  const resolveVaultPath = async (targetPath) => {
    try {
      const normalized = String(targetPath || "").replace(/\\/g, "/");
      const lc = normalized.toLowerCase();
      const files = app.vault.getFiles();
      const hit = files.find((f) => f.path.replace(/\\/g, "/").toLowerCase() === lc);
      if (hit) return hit.path;
    } catch (e) {
      /* ignore */
    }
    return targetPath;
  };

  const ensureFolder = async (folder) => {
    if (!adapter) return;
    if (!(await adapter.exists(folder))) {
      try {
        await adapter.mkdir(folder);
      } catch (e) {
        /* ignore */
      }
    }
  };

  const ensureFile = async (path, template = "") => {
    if (!adapter) return;
    const folder = path.substring(0, path.lastIndexOf("/"));
    if (folder) await ensureFolder(folder);
    if (!(await adapter.exists(path))) {
      await app.vault.create(path, template);
    }
  };

  const append = async (path, text) => {
    if (!adapter) return;
    const folder = path.substring(0, path.lastIndexOf("/"));
    if (folder) await ensureFolder(folder);
    await adapter.append(path, text);
  };

  const read = async (path) => {
    if (!adapter) return "";
    return adapter.read(path);
  };

  const write = async (path, content) => {
    if (!adapter) return;
    await adapter.write(path, content);
  };

  const exists = async (path) => {
    if (!adapter) return false;
    return adapter.exists(path);
  };

  return { resolveVaultPath, ensureFolder, ensureFile, append, read, write, exists };
}

module.exports = { createIo };
