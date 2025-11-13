## Purpose

Generate code that mirrors Edwin’s reasoning style: **procedural pipelines**, **transparent data flow**, **deterministic outputs**, and **minimal but meaningful comments**. Optimize for **numerical correctness** and **flow continuity** over heavy abstractions.

---

## Core Principles (follow in every language)

1. **Procedural over OOP.** Prefer plain functions to classes. Classes are allowed only when unavoidable (GUI, framework constraints).
2. **Single responsibility.** Each function performs exactly one transformation. Orchestrators only chain helpers.
3. **Flat, utility-driven layout.** Place one main function per file under `Functions/` (or equivalent). Filenames and function names match.
4. **Explicit data in/out.** No hidden state. Pass everything as parameters; return fresh values.
5. **Arrays as truth.** Use dense array/matrix types for numeric/tabular work. Build with lists, then convert to arrays before returning.
6. **Determinism first.** Sort outputs on a clear key before returning (e.g., by time/index). Same input ⇒ same output order.
7. **Guard & continue.** On insufficient data or known failures, return **sentinels** (`[]`, `0`, `None`/`null`) rather than raising. The pipeline must keep flowing.
8. **Local error handling.** Wrap risky math in `try/catch`; log minimal context; return sentinel. Do not crash orchestrators.
9. **Thresholds are knobs.** Expose key heuristics as parameters with sensible defaults (e.g., `minSignals`, `stdDistance`).
10. **Minimal comments, maximal clarity.** Comment *why*, not *what*. Keep togglable debug lines (e.g., plotting) commented rather than deleted.
11. **Dependency direction is one-way.** Low-level helpers never import higher layers. Orchestrators may import many helpers.
12. **Small, composable steps.** Prefer a chain of short helpers over one clever monolith.
13. **Manual logging when needed.** Append timestamped CSV-style lines for diagnostics. Keep logs optional and lightweight.
14. **Reproducibility.** If randomness is used, accept a `seed` parameter and set it locally.

---

## Naming & Formatting

* **Functions:** `PascalCase` (e.g., `ResolveChromatogram`, `FindMzPeak`).
* **Variables:** `CamelCase` emphasizing domain nouns (e.g., `ChromPeaks`, `ParametersMat`, `MutationRateVec`).
* **Files/Modules:** `Functions/<FunctionName>.<ext>` exporting the single primary function.
* **Constants/Thresholds:** `UPPER_SNAKE` if idiomatic in the language, otherwise `CamelCase` is acceptable.
* **Return shapes:** Prefer arrays/matrices or tuples/lists like `[Result, Metadata]`. Document shape in a one-line comment.

> Rule of thumb: A function name reads like a **verb** (action). A variable reads like a **thing** (domain noun).

---

## Directory Layout

```
/Functions/
  ResolveChromatogram.<ext>
  AllSubChromatograms.<ext>
  SmoothFourier.<ext>
  SmoothSavgol.<ext>
  RawGaussSeed.<ext>
  ...
/Pipelines/
  ChromPipeline.<ext>         # optional: orchestration entrypoints
/Logs/                        # optional runtime diagnostics
/Docs/                        # optional notebooks/specs
```

* One primary function per file in `Functions/`.
* Orchestrators (if separated) live in `/Pipelines/` and import from `/Functions/`.

---

## Control Flow Patterns

* **Pipelines:** `prep → transform → fit → refine → export`
* **Iterative extraction:** `while (true)` with explicit `break` conditions tied to thresholds.
* **Recursive segmentation:** For splits/cluster expansion, recurse until termination heuristics are met.
* **No hidden loops:** Favor explicit `for`/`while` over comprehensions if readability improves.

---

## Error Handling & Sentinels

* Wrap numerically fragile steps (`curve fit`, `matrix inverse`, `fft`) in `try/catch`.
* On failure:

  * Optionally log a single CSV line with timestamp + key params.
  * Return a sentinel (`[]`, `0`, or `null`) that upstream code treats as “no result.”
* Orchestrators **must** skip over sentinels without aborting.

**Example (language-agnostic pseudocode):**

```text
result = TryFit(data, params)
if IsEmpty(result):
    LogCSV("fit_fail", context)
    return []
return SortByKey(result, keyIndex)
```

---

## Comments & Docstrings

* Top of each file: a **two-line header** stating

  1. the transformation performed,
  2. expected input/output shapes and key thresholds.
* Inside functions: comments justify **decisions/thresholds** (“why 5?”, “why argsort col 0?”).
* Keep optional plotting/printing lines commented, ready for re-activation.

**File header template:**

```text
# ResolvingGaussianChromatogram
# Transform: (RT, Int) → sorted Gaussian parameter matrix [NPeaks x 3]; thresholds: minSignals, minIntFrac.
```

---

## Determinism & Output Order

* Always sort outputs at the end (e.g., by first column, timestamp, or index).
* Document the sort key in one comment line.
* If selection ties occur, break ties deterministically (e.g., by secondary key).

---

## Thresholds & Defaults

Expose the common knobs as parameters with defaults:

* `minSignals` (int) – minimum points to accept a segment/peak.
* `minIntFrac` (float) – percentage of max intensity to keep.
* `StdDistance` / `Prominence` – for smoothing/peak discovery.
* `MaxIterations` / `MaxGenerations` – for refinement loops.
* `Seed` – RNG seed for reproducibility (optional).

One line near the signature must list defaults and typical ranges.

---

## Data Structures

* Prefer dense arrays/matrices for numerics.
* If collecting during loops, append to a list and convert to an array just before returning.
* For composite returns, use `[MainResult, AuxMetadata]` or a small struct/record only if idiomatic and lightweight.

**Return shape examples:**

* `np.ndarray` shape `(N, 3)` for `[center, width, intensity]`
* `[]` sentinel when no peaks found
* `[FeaturesArray, SummaryDict]` when extra metadata is needed

---

## Logging (Optional & Manual)

* When enabled, log minimally:

  * `timestamp, functionName, shortContext, status`
* Append to `Logs/runtime.csv`. Do not depend on logging frameworks.
* Logging is for *later inspection*, never to control program flow.

---

## Orchestration Pattern (Skeleton)

**Language-agnostic pseudocode**

```text
function ResolveFullChromatogram(Chrom, minSignals=5, minIntFrac=1, seed=None):
    # 1) Segment
    ChromList = AllSubChromatograms(Chrom, minSignals=minSignals)
    Results = []

    # 2) Resolve each segment
    for Seg in ChromList:
        Params = ResolvingGaussianChromatogram(Seg, minSignals=minSignals, minIntFrac=minIntFrac, seed=seed)
        if IsEmpty(Params): 
            continue
        # 3) Keep paired result [params, original segment]
        Results.append([Params, Seg])

    # 4) Deterministic order (by first column of Params)
    Results = SortPairedBy(Results, key = Params[:,0])
    return Results
```

---

## Generation Checklist (Agent must satisfy all)

* [ ] One primary function per file in `Functions/`, name matches file.
* [ ] Function performs one transformation; orchestration only chains.
* [ ] Inputs/outputs explicitly documented (shape + sort key).
* [ ] Thresholds exposed with defaults; sensible ranges noted.
* [ ] Sentinel returns on failure; no uncaught exceptions.
* [ ] Final results sorted deterministically.
* [ ] Minimal comments explain decisions/thresholds (not every line).
* [ ] Optional debug plotting/printing lines present but commented.
* [ ] No circular imports; low-level never imports high-level.
* [ ] If randomness used, accept `seed` and set RNG locally.

---

## Language Notes

### Python

* Prefer `numpy` arrays; use `np.where`, `np.append`, `argsort`, `matmul`.
* Wildcard imports are acceptable inside orchestrators (`from Functions import *`) if module bundling is clean; otherwise import explicit names.
* Type hints are optional; if used, keep them lightweight (`ndarray`, `list`).

**Function stub**

```python
# Functions/ResolvingGaussianChromatogram.py
import numpy as np

def ResolvingGaussianChromatogram(Chrom, minSignals=5, minIntFrac=1.0, seed=None):
    """
    Transform: (RT, Int) array → Gaussian parameter matrix [NPeaks x 3], sorted by RT.
    Returns [] on failure/insufficient data.
    """
    try:
        # ... compute Params ...
        if Params.size == 0 or Params.shape[0] < 1:
            return []
        order = np.argsort(Params[:, 0])
        return Params[order, :]
    except Exception:
        # optional: append minimal CSV line to Logs/runtime.csv
        return []
```

### JavaScript/TypeScript

* Use plain functions; prefer typed arrays when numeric (`Float64Array`).
* Keep modules small; one export default per file.

**Stub**

```ts
// Functions/FindMzPeak.ts
export default function FindMzPeak(spectrum: number[][], mz: number, tol: number=0.01): number[] | [] {
  // Transform: 2D [m/z, intensity] → [center, width, area] or [].
  try {
    // ... compute params ...
    return params.length ? params : [];
  } catch {
    return [];
  }
}
```

### R / Matlab / Julia

* Mirror the same structure: one function per file, numeric matrices for work, deterministic sorting at the end, sentinel on failure (`numeric(0)`, `nothing`, etc.).

---

## When Classes Are Justified (rare)

* Framework-required objects (e.g., web handlers, GUI widgets).
* Immutable data containers with zero logic (records).
* If used, keep methods as thin wrappers calling the same single-purpose functions in `Functions/`.

---

## Examples of Acceptable Comments

* “`# sort by RT for deterministic output`”
* “`# bail early if fewer than 4 points above noise`”
* “`# try inverse; if ill-conditioned, return equal contributions []`”
* “`# thresholds exposed as knobs: minSignals, minIntFrac`”

---

## Anti-Patterns to Avoid

* ❌ Hidden state inside objects; “magical” side effects.
* ❌ Complex inheritance or dependency injection.
* ❌ Silent reordering without documenting the sort key.
* ❌ Overloading a function with multiple responsibilities.
* ❌ Crashing the pipeline on single-sample failures.

---

## Minimal Test Scaffolding (Optional but Helpful)

* Provide a small `Samples/` dataset and a `SmokeTest.<ext>` that:

  * Calls 2–3 core functions with default thresholds,
  * Asserts non-crash and deterministic lengths/shapes,
  * Verifies outputs are sorted by the documented key.

---

## Quick Start for Agents

1. Create a new helper in `Functions/` with one responsibility.
2. Accept arrays + thresholds; return arrays (or `[]`).
3. Place orchestration in `/Pipelines/` if needed; import helpers.
4. End every function by sorting on a documented key.
5. On any numerical failure, **return a sentinel, not an exception**.


