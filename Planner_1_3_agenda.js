// Planner agenda helpers
// Manages activity metadata and canvas updates.
const PlannerRootAgenda = typeof window !== "undefined" ? window : globalThis;
PlannerRootAgenda.Planner = PlannerRootAgenda.Planner || {};

function InitPlannerAgenda(app, config, ui, utils) {
  async function ReadFullName(activity) {
    const txtPath = `${config.ACTIVITIES_ROOT_PATH}/${activity}.txt`;
    try {
      let full = await app.vault.adapter.read(txtPath);
      full = (full || "").replace("\n", "").trim();
      if (full) return full;
    } catch (e) {}

    const mdPath = `${config.ACTIVITIES_ROOT_PATH}/${activity}.md`;
    try {
      let fullMd = await app.vault.adapter.read(mdPath);
      fullMd = (fullMd || "").split("\n")[0].replace(/^#\s*/, "").trim();
      return fullMd || activity;
    } catch (e) {
      return activity;
    }
  }

  function MinutesFromMidnight(t) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
    const hours = Number(m?.[1] ?? 0);
    const minutes = Number(m?.[2] ?? 0);
    return hours * 60 + minutes;
  }

  function TimeToCanvas(mins) {
    const m = 3;
    const b = 100;
    return String(mins * m + b);
  }

  function XCanvas(col) {
    return String(400 + (col - 1) * 340);
  }

  function ShiftColumn(cols, col) {
    const base = cols[2];
    const sample = Math.random();
    if (sample > 0.5) {
      cols[2] = col;
      cols.push(base);
    } else {
      cols.push(col);
    }
    return cols;
  }

  function NextColumn(latest) {
    const cols = latest.slice(-5);
    const nextId = cols[4];
    const baseCols = cols.slice(0, 4);
    const first = baseCols.shift();
    const shifted = ShiftColumn(baseCols, first);
    return { Columns: shifted, Next_id: nextId };
  }

  async function MetaAgenda() {
    const log = await app.vault.adapter.read(config.AGENDA_META_LOG);
    const lines = log.split(/\n/);
    const last = lines[lines.length - 1] || "";
    const parts = last.split(",");
    const active = parts.slice(0, -7);
    const meta = NextColumn(parts);
    meta.ActiveActivities = active;
    return meta;
  }

  async function UpdateAgendaCanvasJSON(nodeObj) {
    let raw;
    try {
      raw = await app.vault.adapter.read(config.AGENDA_CANVAS_PATH);
    } catch (e) {
      const fresh = { nodes: [nodeObj], edges: [] };
      await app.vault.adapter.write(config.AGENDA_CANVAS_PATH, JSON.stringify(fresh, null, 2));
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      data = { nodes: [], edges: [] };
    }
    if (!Array.isArray(data.nodes)) data.nodes = [];
    data.nodes.push(nodeObj);
    await app.vault.adapter.write(config.AGENDA_CANVAS_PATH, JSON.stringify(data, null, 2));
  }

  async function UpdateMetaAgenda(metaAgenda, uniqueLoc) {
    const cols = metaAgenda.Columns;
    const active = metaAgenda.ActiveActivities;
    const next = Number(metaAgenda.Next_id) + 1;
    const line = `\n${active},${uniqueLoc},${utils.NowDateString()},${utils.NowTimeString()},${cols},${next}`;
    await utils.AppendToFile(config.AGENDA_META_LOG, line);
  }

  async function StartActivity(result, metaAgenda) {
    const activity = result.asString("{{list}}");
    const startTime = result.asString("{{when}}");

    const mins = MinutesFromMidnight(startTime);
    const yCoord = Number(TimeToCanvas(mins));
    const col = metaAgenda.Columns[0];
    const xCoord = Number(XCanvas(col));

    const id = `${String(metaAgenda.Next_id)}-${Date.now().toString(36)}`;
    const fullName = await ReadFullName(activity);

    const nodeText = `# ${activity}\n  [[${fullName}|___${startTime}_-]] \n  $_{length}$`;
    const nodeObj = {
      id,
      type: "text",
      text: nodeText,
      x: xCoord,
      y: yCoord,
      width: 323,
      height: 163
    };

    await UpdateAgendaCanvasJSON(nodeObj);

    const uniqueLoc = `${activity}-${xCoord}-${yCoord}`;
    await UpdateMetaAgenda(metaAgenda, uniqueLoc);

    ui.taskBox.textContent = `Started: ${fullName} @ ${startTime}`;
  }

  async function EndActivity(activityKey) {
    const ts = utils.NowTimeString();
    ui.taskBox.textContent = `Ended: ${activityKey || "(choose…)"} @ ${ts}`;
  }

  return {
    ReadFullName,
    MinutesFromMidnight,
    TimeToCanvas,
    XCanvas,
    MetaAgenda,
    UpdateAgendaCanvasJSON,
    StartActivity,
    EndActivity
  };
}

PlannerRootAgenda.Planner.Agenda = {
  InitPlannerAgenda
};
