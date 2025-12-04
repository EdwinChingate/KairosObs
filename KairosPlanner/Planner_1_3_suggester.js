// Planner suggester module
// Manages inline file/activity panels and navigation.
const PlannerRootSuggester = typeof window !== "undefined" ? window : globalThis;
PlannerRootSuggester.Planner = PlannerRootSuggester.Planner || {};

function InitPlannerSuggester(app, config, ui, agenda, utils) {
  const textBox = ui.textBox;

  let panelOpen = false;
  let activeIndex = -1;
  let currentNode = null;
  let currentQueryStr = "";
  let suggestMode = "files";
  let pendingActivity = null;

  const timeInput = { phase: "hour", hour: null, minute: null };

  const panel = document.createElement("div");
  panel.className = "suggest-panel";
  panel.style.display = "none";
  panel.innerHTML = '<div class="suggest-head"><div class="suggest-bc"></div></div><div class="suggest-list"></div>';
  document.body.appendChild(panel);
  const bcEl = panel.querySelector(".suggest-bc");
  const listEl = panel.querySelector(".suggest-list");

  function buildTree() {
    const rootAbs = app.vault.getAbstractFileByPath(config.PROJECT_ROOT);
    const mkFolder = (name, path) => ({ isFolder: true, name, path, children: [], files: [] });
    if (!rootAbs) return mkFolder(config.PROJECT_NAME, config.PROJECT_ROOT);
    function walk(abs) {
      const node = mkFolder(abs.name, abs.path);
      for (const ch of abs.children ?? []) {
        if (ch.children) {
          if (config.SKIP_PREFIXES.some((p) => ch.path === p || ch.path.startsWith(p + "/"))) continue;
          node.children.push(walk(ch));
        } else if ((ch.extension || "").toLowerCase() === "md") {
          node.files.push({ isFolder: false, name: ch.name.replace(/\.md$/, ""), path: ch.path });
        }
      }
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      node.files.sort((a, b) => a.name.localeCompare(b.name));
      return node;
    }
    return walk(rootAbs);
  }

  function buildActivityTree() {
    const rootAbs = app.vault.getAbstractFileByPath(config.ACTIVITIES_ROOT_PATH);
    if (!rootAbs)
      return { isFolder: true, name: "Activities", path: config.ACTIVITIES_ROOT_PATH, children: [], files: [] };
    const mkFolder = (name, path) => ({ isFolder: true, name, path, children: [], files: [] });
    function walk(abs) {
      const node = mkFolder(abs.name, abs.path);
      for (const ch of abs.children ?? []) {
        if (ch.children) {
          node.children.push(walk(ch));
        } else {
          const ext = (ch.extension || "").toLowerCase();
          if (ext === "txt" || ext === "md") {
            const short = ch.name.replace(/\.(txt|md)$/i, "");
            node.files.push({ isFolder: false, name: short, path: ch.path });
          }
        }
      }
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      node.files.sort((a, b) => a.name.localeCompare(b.name));
      return node;
    }
    return walk(rootAbs);
  }

  let ROOT = buildTree();
  let ACTIVITY_ROOT = buildActivityTree();
  let RELATED_FILES = [];

  function basenameFromPath(p) {
    return p.split("/").pop().replace(/\.md$/, "");
  }

  async function loadRelatedFiles() {
    for (const relPath of config.RELATED_FILE_CANDIDATES) {
      const file = app.vault.getAbstractFileByPath(relPath);
      if (!file) continue;
      try {
        const raw = await app.vault.adapter.read(relPath);
        const lines = raw.split(/\r?\n/);
        const out = [];
        for (let line of lines) {
          line = line.trim();
          if (!line || line.startsWith("#")) continue;
          let match = line.match(/\[\[([^\]]+)\]\]/);
          let path = match ? match[1] : line.replace(/^[-*]\s*/, "");
          path = path.replace(/\s+$/, "");
          if (!path.endsWith(".md")) path = path + ".md";
          const abs = app.vault.getAbstractFileByPath(path);
          if (abs && abs.extension?.toLowerCase() === "md") {
            out.push({ isFolder: false, name: abs.name.replace(/\.md$/, ""), path: abs.path });
          } else {
            out.push({ isFolder: false, name: basenameFromPath(path), path });
          }
        }
        RELATED_FILES = out;
        return;
      } catch (e) {}
    }
    RELATED_FILES = [];
  }

  function itemMatches(item, q) {
    if (!q) return true;
    const lower = q.toLowerCase();
    if (item.name?.toLowerCase().includes(lower)) return true;
    if (item.meta?.fullName && String(item.meta.fullName).toLowerCase().includes(lower)) return true;
    return false;
  }

  function foldHasItemMatch(node, q) {
    if (node.files.some((f) => itemMatches(f, q))) return true;
    for (const ch of node.children) if (foldHasItemMatch(ch, q)) return true;
    return false;
  }

  function filterNodeGeneric(node, q) {
    const folders = [];
    for (const ch of node.children) {
      if (foldHasItemMatch(ch, q)) folders.push(ch);
    }
    const files = node.files.filter((f) => itemMatches(f, q));
    return { folders, files };
  }

  const vaultOffRefs = [];
  function registerVaultOff(ref) {
    if (ref) vaultOffRefs.push(ref);
  }

  function refreshFiles() {
    ROOT = buildTree();
    if (panelOpen) rerender(true);
  }
  registerVaultOff(app.vault.on("create", refreshFiles));
  registerVaultOff(app.vault.on("delete", refreshFiles));
  registerVaultOff(app.vault.on("rename", refreshFiles));

  function refreshActivityRoot() {
    ACTIVITY_ROOT = buildActivityTree();
    if (panelOpen) rerender(true);
  }
  registerVaultOff(app.vault.on("create", refreshActivityRoot));
  registerVaultOff(app.vault.on("delete", refreshActivityRoot));
  registerVaultOff(app.vault.on("rename", refreshActivityRoot));

  function findAnchorPos() {
    const s = textBox.value;
    const caret = textBox.selectionStart;
    for (let i = Math.max(0, caret - 1); i >= 0; i--) {
      const ch = s[i];
      if (ch === "[") return i;
      if (/\s/.test(ch) || ch === "]") break;
    }
    return null;
  }

  function getTokenRange() {
    const s = textBox.value;
    const anchor = findAnchorPos();
    if (anchor == null) return null;
    let start = anchor + 1;
    let end = start;
    while (end < s.length && !/[\]\s]/.test(s[end])) end++;
    return { anchor, start, end };
  }

  function getQueryDynamic() {
    const range = getTokenRange();
    if (!range) return null;
    return textBox.value.slice(range.start, range.end);
  }

  function openAgendaMenu() {
    suggestMode = "agenda";
    currentNode = null;
    panel.style.display = "block";
    panelOpen = true;
    activeIndex = -1;
    reposition();
    renderAgendaMenu();
  }

  function renderAgendaMenu() {
    bcEl.textContent = "Agenda";
    listEl.innerHTML = "";
    const items = [
      { key: "start", label: "Start activity", icon: "▶️" },
      { key: "end", label: "End activity", icon: "⏹️" }
    ];
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "suggest-item";
      row.innerHTML = `<span class="suggest-icon">${it.icon}</span><span>${it.label}</span>`;
      row.dataset.kind = "agenda";
      row.dataset.key = it.key;
      row.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        chooseAgendaAction(it.key);
      });
      listEl.appendChild(row);
    });
    setActive(0);
  }

  function chooseAgendaAction(key) {
    if (key === "start") {
      suggestMode = "activities";
      currentNode = ACTIVITY_ROOT;
      rerender(false);
    } else if (key === "end") {
      renderEndMenu();
    }
  }

  async function renderEndMenu() {
    suggestMode = "time";
    bcEl.textContent = "End activity";
    listEl.innerHTML = "";
    const meta = await agenda.MetaAgenda();
    const active = (meta.ActiveActivities || []).map((s) => String(s).trim()).filter(Boolean);
    if (active.length === 0) {
      const row = document.createElement("div");
      row.className = "suggest-item";
      row.innerHTML = '<span class="suggest-icon">ℹ️</span><span>No active activities found</span>';
      listEl.appendChild(row);
      setActive(0);
      return;
    }
    active.forEach((name) => {
      const row = document.createElement("div");
      row.className = "suggest-item";
      row.innerHTML = `<span class="suggest-icon">⏹️</span><span>${name}</span>`;
      row.dataset.kind = "end";
      row.dataset.name = name;
      row.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        agenda.EndActivity(name);
        closePanel();
      });
      listEl.appendChild(row);
    });
    setActive(0);
  }

  function openTimeMenu(activityKey) {
    pendingActivity = activityKey;
    suggestMode = "time";
    bcEl.textContent = "When to start?";
    listEl.innerHTML = "";

    const nowBtn = document.createElement("div");
    nowBtn.className = "suggest-item";
    nowBtn.innerHTML = `<span class="suggest-icon">⏱️</span><span>Start now (${utils.NowTimeString()})</span>`;
    nowBtn.dataset.kind = "time-now";
    nowBtn.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      confirmStart(utils.NowTimeString());
    });
    listEl.appendChild(nowBtn);

    const setBtn = document.createElement("div");
    setBtn.className = "suggest-item";
    setBtn.innerHTML = '<span class="suggest-icon">⌛</span><span>Set time…</span><small>Type hour, Enter → type minutes, Enter</small>';
    setBtn.dataset.kind = "time-set";
    setBtn.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      startTimeTypingFlow();
    });
    listEl.appendChild(setBtn);

    setActive(0);
  }

  function startTimeTypingFlow() {
    suggestMode = "time-typing";
    timeInput.phase = "hour";
    timeInput.hour = null;
    timeInput.minute = null;
    textBox.placeholder = "Type H or HH then Enter…";
    textBox.value = "";
    renderTimeTypingPanel();
  }

  function renderTimeTypingPanel() {
    const hourStr = timeInput.hour != null ? utils.PadNumber(timeInput.hour) : "--";
    const minStr = timeInput.minute != null ? utils.PadNumber(timeInput.minute) : "--";
    bcEl.textContent = timeInput.phase === "hour" ? "Set time — Hour" : "Set time — Minutes";
    listEl.innerHTML = "";

    const status = document.createElement("div");
    status.className = "suggest-item";
    status.innerHTML = `<span class="suggest-icon">🕰️</span><span>Selected: ${hourStr}:${minStr}</span>`;
    listEl.appendChild(status);

    if (timeInput.phase === "minute") {
      const title = document.createElement("div");
      title.className = "suggest-section-title";
      title.textContent = "Quick minutes";
      listEl.appendChild(title);

      ["00", "15", "30", "45"].forEach((m) => {
        const row = document.createElement("div");
        row.className = "suggest-item";
        row.innerHTML = `<span class="suggest-icon">💡</span><span>${hourStr}:${m}</span>`;
        row.dataset.kind = "minute-quick";
        row.dataset.minute = m;
        row.addEventListener("mousedown", (ev) => {
          ev.preventDefault();
          confirmStart(`${hourStr}:${m}`);
        });
        listEl.appendChild(row);
      });

      const divider = document.createElement("div");
      divider.className = "suggest-divider";
      listEl.appendChild(divider);

      if (timeInput.minute != null) {
        const go = document.createElement("div");
        go.className = "suggest-item";
        const minShow = utils.PadNumber(timeInput.minute);
        go.innerHTML = `<span class="suggest-icon">▶️</span><span>Start at ${hourStr}:${minShow}</span>`;
        go.dataset.kind = "start-at";
        go.addEventListener("mousedown", (ev) => {
          ev.preventDefault();
          confirmStart(`${hourStr}:${minShow}`);
        });
        listEl.appendChild(go);
      } else {
        const hint = document.createElement("div");
        hint.className = "suggest-item";
        hint.innerHTML = '<span class="suggest-icon">⌨️</span><span>Type minutes (MM) then press Enter…</span>';
        listEl.appendChild(hint);
      }
    } else {
      const hint = document.createElement("div");
      hint.className = "suggest-item";
      hint.innerHTML = '<span class="suggest-icon">⌨️</span><span>Type hour (H or HH) then press Enter…</span>';
      listEl.appendChild(hint);
    }

    setActive(0);
  }

  async function confirmStart(tHHMM) {
    const meta = await agenda.MetaAgenda();
    const shim = {
      asString: (key) => {
        if (key === "{{list}}") return pendingActivity;
        if (key === "{{when}}") return tHHMM;
        if (key === "{{what to do}}") return "start";
        return "";
      }
    };
    await agenda.StartActivity(shim, meta);
    pendingActivity = null;
    timeInput.phase = "hour";
    timeInput.hour = null;
    timeInput.minute = null;
    textBox.placeholder = "Type ";
    textBox.value = "";
    closePanel();
  }

  function breadcrumb(node) {
    if (suggestMode === "agenda") return "Agenda";
    if (suggestMode === "time") return pendingActivity ? `Time • ${pendingActivity}` : "Time";
    if (suggestMode === "time-typing") return pendingActivity ? `Set time • ${pendingActivity}` : "Set time";
    const rootPath = suggestMode === "activities" ? config.ACTIVITIES_ROOT_PATH : config.PROJECT_ROOT;
    const parts = [];
    let n = node;
    while (n) {
      parts.push(n.name);
      if (n.path === rootPath) break;
      n = parentOf(n);
    }
    return parts.reverse().join(" / ");
  }

  function parentOf(node) {
    const base = suggestMode === "activities" ? ACTIVITY_ROOT : ROOT;
    const parentMap = new Map();
    (function dfs(n) {
      for (const ch of n.children) {
        parentMap.set(ch.path, n);
        dfs(ch);
      }
    })(base);
    return parentMap.get(node.path) || null;
  }

  function findChildByPath(node, path) {
    return node.children.find((ch) => ch.path === path) || null;
  }

  function enterFolder(folder) {
    currentNode = folder;
    rerender(false);
    reposition();
  }

  function goUp() {
    const parent = parentOf(currentNode);
    if (parent) {
      currentNode = parent;
      rerender(false);
      reposition();
    }
  }

  function relativeToProject(p) {
    return p.startsWith(config.PROJECT_ROOT + "/") ? p.slice(config.PROJECT_ROOT.length + 1) : p;
  }

  function chooseFile(file) {
    const range = getTokenRange();
    const s = textBox.value;
    if (!range) {
      closePanel();
      return;
    }
    const before = s.slice(0, range.anchor - 1);
    const after = s.slice(range.end);
    const target = config.INSERT_BASENAME ? file.name : file.path.replace(/\.md$/, "");
    const wikilink = `[[${file.path}\\|${target}]]`;
    textBox.value = before + wikilink + after;
    const newCaret = (before + wikilink).length;
    textBox.setSelectionRange(newCaret, newCaret);
    closePanel();
    textBox.focus();
  }

  async function chooseActivity(item) {
    pendingActivity = item.name;
    openTimeMenu(pendingActivity);
  }

  async function openPanel() {
    panel.style.display = "block";
    panelOpen = true;
    activeIndex = -1;
    if (suggestMode === "files") {
      const q0 = getQueryDynamic();
      currentQueryStr = q0 ?? "";
      currentNode = ROOT;
      await loadRelatedFiles();
      reposition();
      rerender(false);
    } else if (suggestMode === "activities") {
      currentNode = ACTIVITY_ROOT;
      reposition();
      rerender(false);
    } else if (suggestMode === "agenda") {
      reposition();
      renderAgendaMenu();
    } else if (suggestMode === "time") {
      reposition();
      openTimeMenu(pendingActivity || "");
    } else if (suggestMode === "time-typing") {
      reposition();
      renderTimeTypingPanel();
    }
  }

  function closePanel() {
    panel.style.display = "none";
    panelOpen = false;
    activeIndex = -1;
  }

  function setActive(index) {
    const items = listEl.querySelectorAll(".suggest-item");
    items.forEach((el) => el.classList.remove("active"));
    activeIndex = index;
    if (index >= 0 && index < items.length) {
      const el = items[index];
      el.classList.add("active");
      const sRect = panel.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      if (eRect.top < sRect.top) {
        panel.scrollTop += eRect.top - sRect.top - 4;
      } else if (eRect.bottom > sRect.bottom) {
        panel.scrollTop += eRect.bottom - sRect.bottom + 4;
      }
    }
  }

  function reposition() {
    const rect = textBox.getBoundingClientRect();
    const y = Math.min(rect.bottom - 8, window.innerHeight - 300);
    panel.style.left = `${rect.left + 12}px`;
    panel.style.top = `${y}px`;
    panel.style.minWidth = `${Math.max(320, rect.width * 0.6)}px`;
  }

  function rerender(preserveActive = true) {
    if (suggestMode === "agenda") {
      renderAgendaMenu();
      return;
    }
    if (suggestMode === "time") {
      openTimeMenu(pendingActivity || "");
      return;
    }
    if (suggestMode === "time-typing") {
      renderTimeTypingPanel();
      return;
    }

    const qRaw = (currentQueryStr || "").trim();
    const q = suggestMode === "activities" ? qRaw.replace(/^@/, "").toLowerCase() : qRaw.toLowerCase();
    const node = suggestMode === "activities" ? ACTIVITY_ROOT : currentNode;

    bcEl.textContent = breadcrumb(node);
    listEl.innerHTML = "";
    const rows = [];
    const seen = new Set();

    if (suggestMode === "files") {
      const currentFolder = breadcrumb(node);
      if (q.length > 0 && RELATED_FILES.length > 0 && currentFolder === config.PROJECT_NAME) {
        const topRel = document.createElement("div");
        const titleRel = document.createElement("div");
        titleRel.className = "suggest-section-title";
        titleRel.textContent = "Related";
        topRel.appendChild(titleRel);
        RELATED_FILES.filter((f) => itemMatches(f, q))
          .slice(0, 12)
          .forEach((f) => {
            const row = document.createElement("div");
            row.className = "suggest-item";
            row.innerHTML = `<span class="suggest-icon">⭐</span><span>${f.name}</span><small>${relativeToProject(f.path)}</small>`;
            row.dataset.kind = "file";
            row.dataset.path = f.path;
            row.dataset.name = f.name;
            row.dataset.scope = "related";
            row.addEventListener("mousedown", (ev) => {
              ev.preventDefault();
              chooseFile(f);
            });
            topRel.appendChild(row);
            rows.push(row);
            seen.add(f.path);
          });
        if (topRel.children.length > 1) {
          listEl.appendChild(topRel);
          const divRel = document.createElement("div");
          divRel.className = "suggest-divider";
          listEl.appendChild(divRel);
        }
      }
    }

    const { folders, files } = filterNodeGeneric(node, q);

    const top = document.createElement("div");
    const title = document.createElement("div");
    title.className = "suggest-section-title";
    title.textContent = suggestMode === "activities" ? "Activities" : "Matches";
    top.appendChild(title);

    files.slice(0, 12).forEach((f) => {
      if (seen.has(f.path)) return;
      const row = document.createElement("div");
      row.className = "suggest-item";
      const label = suggestMode === "activities"
        ? `<span>${f.name}</span>`
        : `<span>${f.name}</span><small>${relativeToProject(f.path)}</small>`;
      row.innerHTML = `<span class="suggest-icon">${suggestMode === "activities" ? "🏁" : "🔎"}</span>${label}`;
      row.dataset.kind = "file";
      row.dataset.path = f.path;
      row.dataset.name = f.name;
      row.dataset.scope = "top";
      row.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        if (suggestMode === "activities") chooseActivity(f);
        else chooseFile(f);
      });
      top.appendChild(row);
      rows.push(row);
    });
    listEl.appendChild(top);

    const divider = document.createElement("div");
    divider.className = "suggest-divider";
    listEl.appendChild(divider);

    const browseTitle = document.createElement("div");
    browseTitle.className = "suggest-section-title";
    browseTitle.textContent = "Browse";
    listEl.appendChild(browseTitle);

    folders.forEach((folder) => {
      const row = document.createElement("div");
      row.className = "suggest-item";
      row.innerHTML = '<span class="suggest-icon">📁</span><span>' + folder.name + "</span>";
      row.dataset.kind = "folder";
      row.dataset.path = folder.path;
      row.dataset.scope = "browse";
      row.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        enterFolder(folder);
      });
      listEl.appendChild(row);
      rows.push(row);
    });

    files.forEach((file) => {
      const row = document.createElement("div");
      row.className = "suggest-item";
      const label = suggestMode === "activities"
        ? `<span>${file.name}</span>`
        : `<span>${file.name}</span><small>${relativeToProject(file.path)}</small>`;
      row.innerHTML = `<span class="suggest-icon">📄</span>${label}`;
      row.dataset.kind = "file";
      row.dataset.path = file.path;
      row.dataset.name = file.name;
      row.dataset.scope = "browse";
      row.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        if (suggestMode === "activities") chooseActivity(file);
        else chooseFile(file);
      });
      listEl.appendChild(row);
      rows.push(row);
    });

    if (rows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "suggest-item";
      empty.textContent = "No matches";
      listEl.appendChild(empty);
      setActive(-1);
      return;
    }

    if (preserveActive && activeIndex >= 0) setActive(Math.min(activeIndex, rows.length - 1));
    else setActive(0);
  }

  function handleInput() {
    if (!panelOpen) return;

    if (suggestMode === "time-typing") {
      renderTimeTypingPanel();
      return;
    }

    if (suggestMode !== "files") return;
    const range = getTokenRange();
    if (!range) {
      closePanel();
      return;
    }
    const s = textBox.value;
    if (range.end < s.length && s[range.end] === "]") {
      closePanel();
      return;
    }
    const q = getQueryDynamic();
    currentQueryStr = q ?? "";
    rerender(false);
  }

  function handleKeydown(e) {
    if (e.key === "[") {
      e.preventDefault();
      e.stopPropagation();
      const caret = textBox.selectionStart;
      const v = textBox.value;
      textBox.value = v.slice(0, caret) + "[" + v.slice(caret);
      textBox.setSelectionRange(caret + 1, caret + 1);
      suggestMode = "files";
      openPanel();
      return true;
    }

    if (e.key === "<" && textBox.value.trim() === "") {
      e.preventDefault();
      e.stopPropagation();
      openAgendaMenu();
      return true;
    }

    if (panelOpen && suggestMode === "time-typing") {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const raw = textBox.value.trim();
        if (timeInput.phase === "hour") {
          const hh = Number(raw);
          if (!Number.isFinite(hh) || hh < 0 || hh > 23) return true;
          timeInput.hour = hh;
          timeInput.phase = "minute";
          textBox.placeholder = "Type minutes (MM) then Enter…";
          textBox.value = "";
          renderTimeTypingPanel();
          return true;
        }
        const mm = Number(raw);
        if (!Number.isFinite(mm) || mm < 0 || mm > 59) return true;
        timeInput.minute = mm;
        renderTimeTypingPanel();
        confirmStart(`${utils.PadNumber(timeInput.hour)}:${utils.PadNumber(timeInput.minute)}`);
        return true;
      }
      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
      return false;
    }

    if (!panelOpen) return false;

    const swallow = new Set(["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Enter", "Tab", "Escape"]);
    if (swallow.has(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    const items = listEl.querySelectorAll(".suggest-item");

    if (e.key === "ArrowDown") {
      setActive(Math.min(activeIndex + 1, items.length - 1));
      return true;
    }
    if (e.key === "ArrowUp") {
      setActive(Math.max(activeIndex - 1, 0));
      return true;
    }
    if (e.key === "ArrowRight") {
      if (suggestMode === "files" || suggestMode === "activities") {
        const el = items[activeIndex];
        if (!el) return true;
        if (el.dataset.kind === "folder") {
          const srcNode = suggestMode === "activities" ? ACTIVITY_ROOT : currentNode;
          const f = findChildByPath(srcNode, el.dataset.path);
          if (f) enterFolder(f);
        }
      }
      return true;
    }
    if (e.key === "ArrowLeft") {
      if (suggestMode === "files" || suggestMode === "activities") goUp();
      return true;
    }

    if (e.key === "Enter" || e.key === "Tab") {
      const el = items[activeIndex] || items[0];
      if (!el) {
        closePanel();
        return true;
      }
      if (suggestMode === "agenda") {
        chooseAgendaAction(el.dataset.key);
        return true;
      }
      if (suggestMode === "time") {
        if (el.dataset.kind === "time-now") {
          confirmStart(utils.NowTimeString());
        } else if (el.dataset.kind === "time-set") {
          startTimeTypingFlow();
        } else if (el.dataset.kind === "end") {
          agenda.EndActivity(el.dataset.name);
          closePanel();
        }
        return true;
      }
      if (el.dataset.kind === "folder") {
        const srcNode = suggestMode === "activities" ? ACTIVITY_ROOT : currentNode;
        const f = findChildByPath(srcNode, el.dataset.path);
        if (f) enterFolder(f);
      } else {
        const payload = { name: el.dataset.name, path: el.dataset.path };
        if (suggestMode === "activities") chooseActivity(payload);
        else chooseFile(payload);
      }
      return true;
    }

    if (e.key === "Escape") {
      closePanel();
      return true;
    }

    return false;
  }

  function selectionHandler() {
    if (!panelOpen) return;
    if (document.activeElement !== textBox) return;
    if (suggestMode !== "files") return;
    const range = getTokenRange();
    if (!range) closePanel();
  }

  function mouseDownHandler(ev) {
    if (!panelOpen) return;
    if (ev.target === panel || panel.contains(ev.target) || ev.target === textBox) return;
    closePanel();
  }

  function blurHandler() {
    setTimeout(() => {
      if (panelOpen) closePanel();
    }, 120);
  }

  function resizeHandler() {
    if (panelOpen) reposition();
  }

  function scrollHandler() {
    if (panelOpen) reposition();
  }

  document.addEventListener("selectionchange", selectionHandler);
  document.addEventListener("mousedown", mouseDownHandler);
  textBox.addEventListener("blur", blurHandler);
  window.addEventListener("resize", resizeHandler);
  document.addEventListener("scroll", scrollHandler, true);

  function destroy() {
    try {
      document.body.removeChild(panel);
    } catch (e) {}
    document.removeEventListener("selectionchange", selectionHandler);
    document.removeEventListener("mousedown", mouseDownHandler);
    textBox.removeEventListener("blur", blurHandler);
    window.removeEventListener("resize", resizeHandler);
    document.removeEventListener("scroll", scrollHandler, true);
    vaultOffRefs.forEach((ref) => {
      try {
        app.vault.offref(ref);
      } catch (e) {}
    });
  }

  return {
    HandleInput: handleInput,
    HandleKeydown: handleKeydown,
    ClosePanel: closePanel,
    IsPanelOpen: () => panelOpen,
    Destroy: destroy
  };
}

PlannerRootSuggester.Planner.Suggester = {
  InitPlannerSuggester
};
