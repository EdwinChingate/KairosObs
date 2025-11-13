---
title: Planner_1_3_events (module)
kind: module
source: Planner_1_3_events.js
last_updated: 2025-11-13
---

## Description

Binds UI events from the planner interface to logging, suggester, and consumption APIs, and exposes a disposer to detach all listeners when the planner unloads.

---

## Key operations

- Registers click handlers for sending entries and toggling the source textarea between default and "toDo".
- Proxies textbox `input` and `keydown` events to the suggester and log APIs while handling Escape-to-consumption behavior.
- Resets the log timer when the textbox gains focus.
- Collects all listener removal callbacks and exposes them through a destroy function.

---

## Code

```javascript
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
```

---

## Parameters

- None at module scope; dependencies are passed to the initializer.

---

## Input

- [`ui`](Planner_1_3_ui.md#initplannerui-function) — provides DOM nodes (`sendBtn`, `toDoBtn`, `textBox`, `sourceBox`).
- [`logApi`](Planner_1_3_log.md#initplannerlog-function) — exposes logging helpers (`SendEntry`, `ResetTimer`).
- [`suggesterApi`](Planner_1_3_suggester.md#initplannersuggester-function) — provides `HandleInput`, `HandleKeydown`, `IsPanelOpen`.
- [`consumptionApi`](Planner_1_3_consumption.md#initplannerconsumption-function) — optional `Consumption` handler for Escape.
- [`config`](Planner_1_3_config.md#loadplannerconfig-function) — supplies `DEFAULT_SOURCE` for toggle behavior.

---

## Output

- Registers `Planner.Events.InitPlannerEvents` and returns a destroy function that removes all event listeners.

---

## Functions

- [`InitPlannerEvents`](#initplannerevents-function) — attaches listeners and returns the disposer.
- [`DestroyPlannerEvents`](#destroyplannerevents-function) — removes registered listeners when invoked.

---

## Called by

- [`Planner_1_3`](Planner_1_3.md#functions) — initializes event bindings after constructing subsystem APIs.

## InitPlannerEvents (function)

### Description

Wires planner UI elements to logging, suggester, and consumption behaviors and tracks listener removers for clean teardown.

---

### Key operations

- Defines a helper `on` to register listeners while storing corresponding removal callbacks.
- Routes button clicks and textbox events to the appropriate API handlers.
- Handles Escape on an empty textbox by triggering consumption logging and prevents Enter default behavior when the suggester is closed.

---

### Code

```javascript
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
```

---

### Parameters

- `ui` — planner UI handles.
- `logApi` — logging API returned by [`InitPlannerLog`](Planner_1_3_log.md#initplannerlog-function).
- `suggesterApi` — suggester API returned by [`InitPlannerSuggester`](Planner_1_3_suggester.md#initplannersuggester-function).
- `consumptionApi` — optional consumption API from [`InitPlannerConsumption`](Planner_1_3_consumption.md#initplannerconsumption-function).
- `config` — configuration containing `DEFAULT_SOURCE`.

---

### Input

- `ui.sendBtn`, `ui.toDoBtn`, `ui.textBox` — DOM elements to bind.
- [`logApi.SendEntry`](Planner_1_3_log.md#sendentry-function) — called on send actions.
- [`logApi.ResetTimer`](Planner_1_3_log.md#resettimer-function) — invoked on focus.
- [`suggesterApi.HandleInput`](Planner_1_3_suggester.md#handleinput-function) — triggered on textbox input.
- [`suggesterApi.HandleKeydown`](Planner_1_3_suggester.md#handlekeydown-function) — handles keyboard before fallback logic.
- [`suggesterApi.IsPanelOpen`](Planner_1_3_suggester.md#initplannersuggester-function) — checked before submitting on Enter.
- [`consumptionApi.Consumption`](Planner_1_3_consumption.md#consumption-function) — optional Escape handler.

---

### Output

- Returns `DestroyPlannerEvents`, a function that removes all registered listeners.

---

### Functions

- `on` — helper for listener registration.
- `handleSendClick`, `toggleTodo`, `handleTextInput`, `handleKeydown`, `handleFocus` — internal event handlers.

---

### Called by

- [`Planner_1_3`](Planner_1_3.md#code) — sets up event wiring after building subsystem APIs.

## DestroyPlannerEvents (function)

### Description

Removes each event listener registered by [`InitPlannerEvents`](#initplannerevents-function) by executing the stored disposer callbacks.

---

### Key operations

- Pops listener removal callbacks off the `listeners` stack and executes them inside a try/catch to avoid teardown failures.

---

### Code

```javascript
return function DestroyPlannerEvents() {
  while (listeners.length) {
    const dispose = listeners.pop();
    try {
      dispose();
    } catch (e) {}
  }
};
```

---

### Parameters

- None (closure captures the `listeners` stack).

---

### Input

- `listeners` — array of removal callbacks pushed by `on`.

---

### Output

- Removes each registered event listener; returns nothing.

---

### Functions

- None.

---

### Called by

- [`Planner_1_3`](Planner_1_3.md#code) — executed during planner cleanup via `destroyEvents()`.
