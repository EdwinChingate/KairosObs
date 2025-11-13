# Documentation Index

## Planner modules

- [Planner_1_3](Planner_1_3.md) — Orchestrator script that loads modular planner components and wires cleanup handlers.
- [Planner_1_3_config](Planner_1_3_config.md) — Loads planner configuration and exposes shared date/time/file helpers.
- [Planner_1_3_styles](Planner_1_3_styles.md) — Injects planner CSS and returns a disposer for style teardown.
- [Planner_1_3_ui](Planner_1_3_ui.md) — Builds the planner UI scaffold and returns DOM handles.
- [Planner_1_3_log](Planner_1_3_log.md) — Implements logging helpers for reading, rendering, and writing daily logs.
- [Planner_1_3_agenda](Planner_1_3_agenda.md) — Provides agenda metadata helpers and canvas update routines.
- [Planner_1_3_consumption](Planner_1_3_consumption.md) — Handles consumption modal flow and log appends.
- [Planner_1_3_suggester](Planner_1_3_suggester.md) — Manages the inline file/activity suggester panel and keyboard logic.
- [Planner_1_3_events](Planner_1_3_events.md) — Binds UI events to log, suggester, and consumption APIs.

## Legacy script

- [Planner_1_3 Dataview script](Planner_1_3/dataview.md) — Monolithic DataviewJS implementation retained for reference.

## Relationships

- `Planner_1_3` → `Planner_1_3_config`, `Planner_1_3_styles`, `Planner_1_3_ui`, `Planner_1_3_log`, `Planner_1_3_agenda`, `Planner_1_3_consumption`, `Planner_1_3_suggester`, `Planner_1_3_events` — orchestrator loads each module and wires the planner runtime.
- `Planner_1_3_log` → `Planner_1_3_config` (utils), `Planner_1_3_ui` (UI handles) — logging helpers depend on configuration utilities and UI references.
- `Planner_1_3_agenda` → `Planner_1_3_config` (paths/utils), `Planner_1_3_ui` (task box) — agenda helpers use shared utilities and UI.
- `Planner_1_3_consumption` → `Planner_1_3_config` (helpers), `Planner_1_3_ui` — consumption flow writes logs and updates status UI.
- `Planner_1_3_suggester` → `Planner_1_3_config`, `Planner_1_3_agenda`, `Planner_1_3_ui` — suggester references configuration, agenda APIs, and UI elements.
- `Planner_1_3_events` → `Planner_1_3_log`, `Planner_1_3_suggester`, `Planner_1_3_consumption`, `Planner_1_3_ui` — event module orchestrates subsystem interactions.

## Notes

- Modules generally share a single documentation file with per-function sections; the DataviewJS script uses a dedicated subfile (`documentation/Planner_1_3/dataview.md`) to avoid path collisions with the orchestrator doc.
