---
title: Planner_1_3_styles (module)
kind: module
source: Planner_1_3_styles.js
last_updated: 2025-11-13
---

## Description

Defines the planner CSS bundle and exposes a helper to inject styles into the Dataview container with a disposable cleanup.

---

## Key operations

- Declares the `PlannerCSS` string containing all planner styling rules.
- Creates and appends a `<style>` element into the provided container when invoked.
- Returns a nested disposer function that removes the style node safely.

---

## Code

```javascript
// Planner styles injector
// Inserts planner CSS block and returns a cleanup handle.
const PlannerRootStyles = typeof window !== "undefined" ? window : globalThis;
PlannerRootStyles.Planner = PlannerRootStyles.Planner || {};

const PlannerCSS = `
.chat-wrap{font:14px/1.45 var(--font-interface);background:#54B5FB !important; border:1px solid var(--background-modifier-border);
border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px}
.row{display:flex; gap:6px; flex-wrap:wrap; align-items:center}
textarea{width:100%; height:88px; resize:vertical; border-radius:10px; padding:10px;
  border:1px solid var(--background-modifier-border);background:#094782 !important; color:var(--text-normal)}
textarea.ref{width:50%; min-height:10px}
textarea.ref2{width:48%; min-height:10px;background:var(--background-primary);border-color:var(--background-primary);cursor:none}
textarea[disabled]{cursor:default; opacity:1}
.log{max-height:260px; overflow:auto; padding:6px; background:var(--background-secondary); border-radius:8px}
.msg{margin:6px 0}
.msg .meta{font-size:12px; color:var(--text-muted)}
.suggest-panel{position:absolute; z-index:9999; max-height:280px; overflow:auto;
  border:1px solid var(--background-modifier-border); background:var(--background-primary);
  border-radius:8px; padding:6px; box-shadow:0 8px 24px rgba(0,0,0,.25); min-width:320px}
.suggest-head{display:flex; gap:8px; align-items:center; padding:4px 6px 8px 6px; border-bottom:1px solid var(--background-modifier-border)}
.suggest-bc{font-size:12px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.suggest-list{margin-top:6px}
.suggest-item{padding:6px 8px; border-radius:6px; cursor:pointer; display:flex; gap:8px; align-items:center}
.suggest-item:hover,.suggest-item.active{background:var(--background-secondary)}
.suggest-item small{opacity:.7}
.suggest-icon{width:1.2em; text-align:center}
.suggest-item.active{outline:1px solid var(--interactive-accent)}
.suggest-section-title{margin:6px 0 2px 0; font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em}
.suggest-divider{height:1px; background:var(--background-modifier-border); margin:6px 0}
`;

function ApplyPlannerStyles(container) {
  const style = document.createElement("style");
  style.textContent = PlannerCSS;
  container.appendChild(style);
  return function RemovePlannerStyles() {
    try {
      container.removeChild(style);
    } catch (e) {
      // ignore
    }
  };
}

PlannerRootStyles.Planner.Styles = {
  ApplyPlannerStyles
};
```

---

## Parameters

- None for the module; parameters are on the exported function.

---

## Input

- `PlannerCSS` — CSS rule block appended to the container.
- [`container`](Planner_1_3.md#input) — DOM element receiving the `<style>` node.

---

## Output

- Registers `Planner.Styles.ApplyPlannerStyles` on the global namespace.

---

## Functions

- [`ApplyPlannerStyles`](#applyplannerstyles-function) — injects planner CSS and returns a remover handle.

---

## Called by

- [`Planner_1_3`](Planner_1_3.md#functions) — loads this module and applies planner styling to the Dataview container.

## ApplyPlannerStyles (function)

### Description

Appends the planner CSS block into the provided container and returns a disposer that removes the style element when invoked.

---

### Key operations

- Creates a `<style>` element and populates it with `PlannerCSS`.
- Appends the style node to the supplied container.
- Returns a nested remover function that attempts to detach the style node, swallowing removal errors.

---

### Code

```javascript
function ApplyPlannerStyles(container) {
  const style = document.createElement("style");
  style.textContent = PlannerCSS;
  container.appendChild(style);
  return function RemovePlannerStyles() {
    try {
      container.removeChild(style);
    } catch (e) {
      // ignore
    }
  };
}
```

---

### Parameters

- `container` — Dataview container element receiving the planner style tag.

---

### Input

- `container` — DOM node for style injection.
- `PlannerCSS` — stylesheet text inserted into the document.

---

### Output

- Returns `RemovePlannerStyles`, a disposer invoked during planner teardown.

---

### Functions

- None (relies on DOM APIs only).

---

### Called by

- [`Planner_1_3`](Planner_1_3.md#code) — applies styles at initialization and stores the disposer in cleanup handlers.
