# Refactor plan (Codex): Kairos_20260104

## Objective

Split the monolithic DataviewJS planner into small modules (ideally one file per function) so debugging and adding features becomes straightforward.

## Important constraint (DataviewJS)

A DataviewJS block is not a normal Node/TypeScript runtime. ES module imports usually don’t work. The practical approach is:

1. keep source code modular in a `src/` tree
2. generate a single bundled `dist/Kairos_refactored.md` containing one DataviewJS block that Obsidian can run

## Proposed module boundaries

1. **Config & Environment**: date, device detection, vault root, folder names, UI constants
2. **Vault I/O**: read/write/append, ensure files for day, safe path join, file templates
3. **Parsing & Model**: parse agenda rows and EdLog rows into a canonical Activity object
4. **Activity Store**: unify activities across files/devices; query helpers (planned/active/interrupted)
5. **Mutations**: start/end/edit/delete activity + EdLog append
6. **Calendar View**: compute layout + draw blocks + open calendar interactions
7. **Suggester UI Engine**: modes, rendering, selection handlers, history stack
8. **Notifications**: idle gap checks now; later a persistent notifications menu/log

## Suggested folder layout

```
planner_refactor/
  src/
    config/
      config.js
      env_detectMobile.js
      date_fmtDate.js
    io/
      vault_read.js
      vault_write.js
      vault_appendToFile.js
      paths_getPrimaryAgendaFile.js
      paths_getEdLogFile.js
      ensure_ensureLogFilesForDate.js
    model/
      activity_types.js
      parse_parseTime.js
      parse_minutesToTime.js
      parse_getNextTableId.js
    store/
      GetUnifiedActivityMap.js
      GetActiveActivities.js
      GetPlannedActivities.js
      GetAllActivities.js
      GetInterruptedActivitiesByUnix.js
    mutations/
      StartActivity.js
      EndActivity.js
      EditActivity.js
      DeleteActivity.js
      LogActivityChange.js
      HandleBreak.js
      MaybePromptResumeFromUnix.js
    consumption/
      RecordConsumption.js
      GetConsumptionItems.js
    calendar/
      loadCalendarData.js
      drawCalendarView.js
      renderCalendar.js
      positionCalendar.js
      openCalendar.js
    ui/
      styles_css.js
      panel_closePanel.js
      panel_reposition.js
      panel_setActive.js
      panel_createItem.js
      panel_setAgendaTitle.js
      history_pushHistory.js
      history_restoreHistory.js
      trigger_triggerForward.js
      rerender.js
      selectItem.js
      HandleTimeSelection.js
      HandleDurationInput.js
      RequestStartWithOverlapCheck.js
      CloseAndClear.js
      findDotCommaAnchor.js
    notifications/
      CheckNotifications.js
      send.js
    main.js
  tools/
    bundle.py
  dist/
    Kairos_refactored.md
    Kairos_refactored.view.js
```

## Migration strategy (safe, incremental)

1. **Freeze baseline**: keep the original file untouched and create a small checklist of behaviors to preserve (file names/locations, ID allocation, resume prompts, calendar draw, suggester flows).
2. **Extract pure utilities first**: time parsing/formatting and date helpers.
3. **Centralize vault I/O**: one module owns read/write/append and all path building.
4. **Introduce a canonical Activity model**: everything becomes `Activity` objects in memory.
5. **Extract store + mutations**: unify map + the start/end/edit/delete functions.
6. **Extract UI engine**: turn the suggester into explicit “modes” with `render()` and `onSelect()`.
7. **Bundle**: use `tools/bundle.py` to concatenate `src/**.js` into a single runnable `dist/*.md`.

## Acceptance criteria

* `dist/Kairos_refactored.md` runs in Obsidian and produces the same outputs as the original.
* No log files are deleted or overwritten unexpectedly.
* Every extracted file has a short header comment: purpose, inputs, outputs, side effects.

## What this enables next (stubs only for now)

* persistent notifications menu + history log
* undo by replaying EdLog
* click calendar blocks to edit
* weekly/monthly planning layers

