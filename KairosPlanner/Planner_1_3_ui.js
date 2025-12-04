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
