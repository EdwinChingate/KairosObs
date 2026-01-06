# AGENTS.md — Kairos Planner Refactor

## Project context
This repo contains an Obsidian DataviewJS-based planner prototype that evolved through many versions and log-guided iteration.
The current goal is to refactor the monolith into modular source code while preserving runtime behavior.

## Golden rules
- Do not delete or destructively overwrite any user logs or agenda files.
- Prefer behavior-preserving refactors; if behavior changes, document it in docs/MIGRATION_NOTES.md.
- Keep modules small, named, and single-purpose.
- Route ALL file I/O through a centralized io layer.

## Target architecture (high level)
- env/ (device detection, vault path resolution, date context)
- io/ (read/write/append, ensure files, path builders)
- model/ (Activity, EditEvent, ConsumptionItem)
- parse/ (agenda row parsing, EdLog parsing, consumption parsing)
- store/ (unified activity map, queries)
- mutate/ (start/end/edit/delete + EdLog writes)
- ui/ (calendar, suggester state machine, DOM helpers)
- notify/ (gap checks now; persistent notifications later)

## Commands
If bundling is used:
- Bundle: `python tools/bundle.py`
(If you choose Node instead, add the exact command here.)

## Style
- Prefer pure functions.
- Use dependency injection: pass `{ app, dv, state }` explicitly.
- Add short docstrings to every module.
- Avoid clever metaprogramming; readability beats wizardry.

