---
title: Planner_1_3_ui (module)
kind: module
source: Planner_1_3_ui.js
last_updated: 2025-11-13
---

## Description

Creates the planner chat interface inside the Dataview container and exposes handles to all relevant DOM elements.

---

## Key operations

- Builds the wrapper, input rows, buttons, and log area using Obsidian's `createEl` helper on the provided container.
- Pre-populates the source textarea with the configured default source.
- Returns references so other subsystems (log, suggester, events) can manipulate the UI.

---

## Code

```javascript
// Planner UI builder
// Creates planner DOM structure and returns element references.
const PlannerRootUI = typeof window !== "undefined" ? window : globalThis;
PlannerRootUI.Planner = PlannerRootUI.Planner || {};

function InitPlannerUI(container, config) {
  const wrap = container.createEl("div", { cls: "chat-wrap" });

  const sourceRow = wrap.createEl("div", { cls: "row" });
  const sourceBox = sourceRow.createEl("textarea", { cls: "ref", text: config.DEFAULT_SOURCE });
  const taskBox = sourceRow.createEl("textarea", { cls: "ref2", text: "" });
  taskBox.tabIndex = -1;
  sourceBox.tabIndex = -1;

  const textBox = wrap.createEl("textarea", { placeholder: "Type " });

  const actions = wrap.createEl("div", { cls: "row" });
  const toDoBtn = actions.createEl("button", { cls: "btn", text: "toDo" });
  const sendBtn = actions.createEl("button", { cls: "btn", text: "Send ⏎" });
  const keySentencesBtn = actions.createEl("button", { cls: "btn", text: "KeySentences" });

  const logBox = wrap.createEl("div", { cls: "log" });

  return {
    wrap,
    sourceBox,
    taskBox,
    textBox,
    toDoBtn,
    sendBtn,
    keySentencesBtn,
    logBox
  };
}

PlannerRootUI.Planner.UI = {
  InitPlannerUI
};
```

---

## Parameters

- None for the module; the exported function handles inputs.

---

## Input

- [`container`](Planner_1_3.md#input) — Dataview container where UI is mounted.
- [`config`](Planner_1_3_config.md#loadplannerconfig-function) — supplies defaults like `DEFAULT_SOURCE`.

---

## Output

- Registers `Planner.UI.InitPlannerUI` on the global planner namespace.

---

## Functions

- [`InitPlannerUI`](#initplannerui-function) — builds and returns planner UI handles.

---

## Called by

- [`Planner_1_3`](Planner_1_3.md#functions) — constructs the UI before wiring log, agenda, and suggester subsystems.

## InitPlannerUI (function)

### Description

Constructs the planner's layout inside the given container, creates source/task textareas, action buttons, and log area, and returns references for downstream modules.

---

### Key operations

- Creates a wrapping `div.chat-wrap` and nested `div.row` containers for source/task and action buttons.
- Configures the source and task textareas as read-only-style fields by setting `tabIndex` to `-1`.
- Returns handles for the wrap, inputs, buttons, and log area so other modules can attach behavior.

---

### Code

```javascript
function InitPlannerUI(container, config) {
  const wrap = container.createEl("div", { cls: "chat-wrap" });

  const sourceRow = wrap.createEl("div", { cls: "row" });
  const sourceBox = sourceRow.createEl("textarea", { cls: "ref", text: config.DEFAULT_SOURCE });
  const taskBox = sourceRow.createEl("textarea", { cls: "ref2", text: "" });
  taskBox.tabIndex = -1;
  sourceBox.tabIndex = -1;

  const textBox = wrap.createEl("textarea", { placeholder: "Type " });

  const actions = wrap.createEl("div", { cls: "row" });
  const toDoBtn = actions.createEl("button", { cls: "btn", text: "toDo" });
  const sendBtn = actions.createEl("button", { cls: "btn", text: "Send ⏎" });
  const keySentencesBtn = actions.createEl("button", { cls: "btn", text: "KeySentences" });

  const logBox = wrap.createEl("div", { cls: "log" });

  return {
    wrap,
    sourceBox,
    taskBox,
    textBox,
    toDoBtn,
    sendBtn,
    keySentencesBtn,
    logBox
  };
}
```

---

### Parameters

- `container` — DataviewJS container to host the planner UI.
- `config` — planner configuration providing initial values such as `DEFAULT_SOURCE`.

---

### Input

- `container` — DOM context for creating UI nodes.
- `config.DEFAULT_SOURCE` — initial text for the source textarea.

---

### Output

- Object with references `{ wrap, sourceBox, taskBox, textBox, toDoBtn, sendBtn, keySentencesBtn, logBox }` consumed by other modules.

---

### Functions

- None (relies on Obsidian's `createEl` helper).

---

### Called by

- [`Planner_1_3`](Planner_1_3.md#code) — obtains UI handles before initializing behavior modules.
- [`InitPlannerEvents`](Planner_1_3_events.md#initplannerevents-function) — attaches listeners to the returned elements.
