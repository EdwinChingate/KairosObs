### 1. Overview

The **Kairos** prototype represents the most integrated and feature‑complete iteration of the Planner system. It consolidates multiple prior experiments—calendar visualization, mobile adaptation, unified file logging, and contextual suggestion panels—into a cohesive, highly interactive journaling and time‑tracking environment designed to operate inside Obsidian.

The system functions as a **temporal and cognitive companion**, combining:

* structured agenda management,
* real‑time data synchronization across mobile and desktop,
* natural interaction patterns via prompts and panels,
* and contextual overlays (calendar views, embedded agendas, and suggestion boxes) for guided logging.

### 2. Software Architecture

**Architectural style:** hybrid reactive‑procedural architecture built atop Obsidian’s plugin environment, blending direct DOM manipulation with async vault API calls.

**Core layers:**

* **UI Layer:** Custom HTML/CSS generation using Obsidian’s `createEl` for visual composition (calendar grids, control bars, and input panels).
* **State Layer:** Global objects (`calState`, `panelOpen`, `pending*` variables) maintain transient user and calendar state.
* **Data Access Layer:** Unified file I/O wrappers (e.g., `appendToFile`, `resolveVaultPath`, `GetUnifiedActivityMap`) abstract Obsidian vault operations.
* **Scheduler Layer:** Time‑based checks (`setInterval(CheckNotifications, 30000)`) ensure awareness of idle periods and active activities.
* **Interaction Layer:** Event‑driven model—buttons, keyboard shortcuts, and suggest‑mode transitions—allow fluid context switching.

**Pattern:** The architecture resembles an **event‑driven finite state machine** with context‑aware modes (`suggestMode` values like `agenda-root`, `agenda-edit-field`, `agenda-consumption-select`). Each mode defines an input vocabulary and transition rules, effectively acting as a conversational agent embedded in the note interface.

### 3. Data Management & Processing

**Vault‑based persistence:** All user data is Markdown‑table‑based. Activities, logs, and consumption records are appended directly to text files organized by date. Each entry preserves both human readability and machine traceability (via timestamps `<uUnix>` tags and inline metadata).

**Data normalization techniques:**

* **Split‑range ID logic:** differentiates mobile vs desktop IDs (e.g., `<100` vs `≥100`) to avoid collisions.
* **Path resolution helpers:** dynamically rebuild file paths based on mode and date context, ensuring robustness across devices.
* **Temporal indexing:** uses derived minute‑based positions and Unix timestamps to synchronize calendar visualization with recorded activity data.

**Processing pipeline:**

1. Parse daily agenda and EdLog tables.
2. Construct unified activity maps keyed by ID.
3. Resolve conflicts via recency and timestamp order.
4. Render visual layers (grid, labels, blocks, current time line) in proportional scaling.

### 4. Feature Landscape

Cross‑referencing the taxonomy【42†features_taxonomy.md】 and matrix【41†prototypes_features_matrix.md】, Planner_11_5 implements the complete feature set known across all Planner variants:

* **file_append_logging** — full journaling and metadata capture.
* **mobile_detection_mode** — automatic UI adaptation; suffix‑based file separation.
* **remote_local_path_switch** — seamless context persistence between devices.
* **calendar_widget_date_picker** — inline monthly selector with real‑time rendering.
* **consumption_logging_prompts** — preconfigured for health/self‑tracking.
* **activity_suggestion_panel** — context‑sensitive autocompletion and navigation interface.
* **agenda_embed_preview** — dynamic agenda embedding toggled within the planner UI.
* **path_resolution_helper** — resilient file lookup by normalized vault paths.
* **quick_action_buttons** — immediate command interface (`Break`, `Consume`, `toDo`, `Send`).
* **data_lists_lookup** — integration of activity, consumption, and related files for semantic linkage.
* **grid_and_time_labels / current_time_indicator / event_blocks_coloring** — visually rich temporal layout bridging data and lived time.

### 5. Strengths

* **Self‑contained persistence:** no external database, full portability within Obsidian.
* **High affordance UI:** intuitive keyboard triggers, dynamic suggestions, and responsive scaling.
* **Unified cognitive workflow:** integrates thought logging, consumption tracking, and scheduling into one environment.
* **Temporal grounding:** real‑time feedback (red current‑time line) fosters awareness of activity flow.
* **Psychological utility:** the continuous feedback loop between writing, reflecting, and visualizing supports self‑regulation and mindfulness.


