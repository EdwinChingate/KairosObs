const { cvContainerStyle, cvControlStyle, cvGridLineStyle, cvTimeLabelStyle, cvBlockStyle, OFFSET_Y, PIXELS_PER_MIN, TEXT_HEIGHT_THRESHOLD } = require("./styles");

/**
 * Render calendar view blocks into the embed container.
 * @param {Object} state - PlannerState.
 * @param {HTMLElement} embedBox - Target container.
 */
function drawCalendarView(state, embedBox) {
  embedBox.innerHTML = "";

  const controls = embedBox.createEl("div");
  controls.style.cssText = cvControlStyle;

  controls.createEl("span", { text: "Zoom: ", style: "font-size:12px;" });
  const slider = controls.createEl("input");
  slider.type = "range";
  slider.min = "0.2";
  slider.max = "1.5";
  slider.step = "0.05";
  slider.value = state.calState.scale;
  slider.style.width = "150px";
  slider.style.cursor = "pointer";
  slider.addEventListener("input", (e) => {
    state.calState.scale = parseFloat(e.target.value);
    drawCalendarView(state, embedBox);
  });

  const viewport = embedBox.createEl("div");
  viewport.style.cssText = cvContainerStyle;

  const totalHeight = 1440 * PIXELS_PER_MIN * state.calState.scale;
  const contentWrapper = viewport.createEl("div");
  contentWrapper.style.height = `${totalHeight}px`;
  contentWrapper.style.position = "relative";
  contentWrapper.style.minWidth = `${4 * 340 * state.calState.scale + 100}px`;

  for (let h = 0; h < 24; h += 1) {
    const mins = h * 60;
    const y = mins * PIXELS_PER_MIN;
    const line = contentWrapper.createEl("div");
    line.style.cssText = cvGridLineStyle;
    line.style.top = `${y * state.calState.scale}px`;

    const label = contentWrapper.createEl("div", { text: `${h}:00` });
    label.style.cssText = cvTimeLabelStyle;
    label.style.top = `${y * state.calState.scale}px`;
  }

  const now = new Date();
  const isToday = state.currentPlannerDate === state.now.nowDate();
  if (isToday) {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const nowY = nowMins * PIXELS_PER_MIN;
    const nowLine = contentWrapper.createEl("div");
    nowLine.style.cssText = `
            position: absolute; left: 50px; right: 0; 
            top: ${nowY * state.calState.scale}px; border-top: 2px solid red; z-index: 10; pointer-events: none;
        `;
    setTimeout(() => {
      viewport.scrollTop = nowY * state.calState.scale - 300;
    }, 50);
  }

  if (state.calState.nodes.length === 0) {
    contentWrapper.createEl("div", { text: "No activities found." }).style.padding = "50px";
  }

  state.calState.nodes.forEach((node) => {
    const renderHeight = node.height * state.calState.scale;
    const block = contentWrapper.createEl("div");
    block.style.cssText = cvBlockStyle(node.y, node.height, node.color, node.colIndex, state.calState.scale);
    block.title = `${node.text} (Source: ${node.sourceType})`;

    const startMins = (node.y - OFFSET_Y) / PIXELS_PER_MIN;
    const durationMins = node.height / PIXELS_PER_MIN;
    const endMins = startMins + durationMins;

    const timeStr = `${minutesToTime(startMins)} - ${minutesToTime(endMins)}`;
    const durationStr = `${Math.round(durationMins)} min`;

    if (renderHeight >= TEXT_HEIGHT_THRESHOLD) {
      block.innerHTML = `
                <strong>${node.text}</strong><br>
                <span style="opacity:0.8; font-size:0.9em">${timeStr}</span><br>
                <span style="opacity:0.6; font-size:0.8em">${durationStr}</span>
            `;
    } else {
      block.style.opacity = "0.6";
    }

    block.style.cursor = "pointer";
    block.onclick = async () => {
      const leaf = state.app.workspace.getLeaf("tab");
      await leaf.openFile(node.sourceFile);
    };
  });
}

function minutesToTime(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = Math.floor(totalMins % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

module.exports = { drawCalendarView };
