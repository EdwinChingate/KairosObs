# Kairos Planner — Refactored Architecture

## Overview
The refactor turns the monolithic `Kairos.md` DataviewJS script into a set of small modules under `planner_refactor/src/`. Everything is composed at runtime through a single `PlannerState` object so shared data flows through explicit function calls instead of globals. A lightweight bundler (`tools/bundle.py`) concatenates the modules into one DataviewJS block for Obsidian (`dist/Kairos_refactored.md`).

## Module layout
- `state/` — Builds and updates the shared `PlannerState`. Holds device flags, date context, path helpers, IO facade, and UI state fields.
- `env/` — Device detection (`env/device`) and vault path builders (`env/paths`). `env/dateParts` formats dates for front-matter templates.
- `io/` — Centralized vault IO (`io/files`) with `read`, `write`, `append`, `exists`, `ensureFile`, and `ensureFolder`.
- `time/` — Time helpers (`pad`, `now`, `conversions`, `parseTime`).
- `model/` — Lightweight data models (`Activity`, `EditEvent`, `ConsumptionItem`).
- `parse/` — Parsing helpers for agenda rows, EdLog rows, consumption entries, and thoughts log lines.
- `store/` — Query logic: daily agenda discovery, unified activity map, activity queries, and reference list loaders.
- `mutate/` — All writes: ensuring files, ID generation, start/end/edit/delete flows, EdLog logging, consumption logging, thought logging, overlap checks, and break handling.
- `ui/` — Presentation: calendar rendering (`ui/calendar/*`), thoughts log renderer (`ui/logPanel`), base styles, and the suggester state machine (`ui/suggester/suggester`).
- `notify/` — Gap detection (`notify/checkNotifications`).
- `index.js` — DataviewJS entrypoint that wires DOM creation, date switching, embeds, suggester wiring, and notification intervals.

## Data model
- **Activity** — `{ id, name, start, end, sourceFile, sourceType }` derived from agenda rows.
- **EditEvent** — `{ logId, activityId, date, time, activity, start, end }` recorded in EdLog.
- **ConsumptionItem** — `{ id, date, item, time, amount }` recorded in monthly consumption logs.
- **PlannerState (aggregated)** — Holds app/dv refs, device suffix, file paths, IO facade, time helpers, calendar nodes, UI pending fields, and the current planner date.

## Latent feature landing spots
- **Notifications log/menu** — Extend `notify/` with a log writer and surface via a new suggester mode in `ui/suggester`.
- **Undo via EdLog replay** — Add replay helpers under `mutate/` that consume `parse/edLogRow` outputs and rebuild tables through `io/`.
- **Clickable calendar blocks** — Enhance `ui/calendar/drawCalendarView` to emit callbacks that route through a new `ui/calendar/handlers` module.
- **Weekly/monthly planning** — Add range-aware queries in `store/` (e.g., `store/rangeActivities.js`) and expose through calendar navigation in `index.js`.
- **YAML-based agenda** — Introduce a parser in `parse/` to read YAML agendas and adapt `mutate/startActivity`/`endActivity` to write to both table and YAML formats (toggling via `PlannerState` config).

## Bundling
Run `python tools/bundle.py` to emit `dist/Kairos_refactored.md` containing a single DataviewJS block. The bundler emulates CommonJS `require` resolution and should be rerun whenever source modules change.
