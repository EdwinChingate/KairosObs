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
