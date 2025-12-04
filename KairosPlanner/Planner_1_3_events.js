// Planner event bindings
// Wires UI controls to log, suggester, and consumption actions.
const PlannerRootEvents = typeof window !== "undefined" ? window : globalThis;
PlannerRootEvents.Planner = PlannerRootEvents.Planner || {};

function InitPlannerEvents(ui, logApi, suggesterApi, consumptionApi, config) {
  const listeners = [];

  function on(el, event, handler, options) {
    el.addEventListener(event, handler, options);
    listeners.push(() => el.removeEventListener(event, handler, options));
  }

  function handleSendClick() {
    logApi.SendEntry();
  }

  function toggleTodo() {
    const current = ui.sourceBox.value.trim();
    ui.sourceBox.value = current === "toDo" ? config.DEFAULT_SOURCE : "toDo";
  }

  function handleTextInput(ev) {
    suggesterApi.HandleInput(ev);
  }

  function handleKeydown(ev) {
    if (suggesterApi.HandleKeydown(ev)) return;

    if (ev.key === "Escape" && ui.textBox.value.trim() === "") {
      ev.preventDefault();
      ev.stopPropagation();
      consumptionApi?.Consumption();
      return;
    }

    if (ev.key === "Enter" && !suggesterApi.IsPanelOpen()) {
      ev.preventDefault();
      logApi.SendEntry();
    }
  }

  function handleFocus() {
    logApi.ResetTimer();
  }

  on(ui.sendBtn, "click", handleSendClick);
  on(ui.toDoBtn, "click", toggleTodo);
  on(ui.textBox, "input", handleTextInput, true);
  on(ui.textBox, "keydown", handleKeydown, true);
  on(ui.textBox, "focus", handleFocus);

  return function DestroyPlannerEvents() {
    while (listeners.length) {
      const dispose = listeners.pop();
      try {
        dispose();
      } catch (e) {}
    }
  };
}

PlannerRootEvents.Planner.Events = {
  InitPlannerEvents
};
