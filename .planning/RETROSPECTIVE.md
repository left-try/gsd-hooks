# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Rate-Limit Resilience & Economy

**Shipped:** 2026-06-09
**Phases:** 3 | **Plans:** 6 | **Sessions:** 2 (cross-context continuation)

### What Was Built

- **gsd-429-guard.js** — Stop/SubagentStop hook that raw-scans transcripts for 429 signals, activates economy mode, appends a timestamped log entry, and sleeps 60s before exit
- **gsd-economy.js** — CLI (`--on`/`--off`) that patches `.planning/config.json` to budget model + 1 agent + disabled optional steps, with deepMerge snapshot/restore and `economy.lock` state file
- **gsd-phase-pacer.js** — Stop hook that sleeps a configurable inter-phase delay (default 15s) to smooth burst throughput; self-bypasses when `economy.lock` is present
- **`/gsd-feature` SKILL.md** — 360-line lightweight feature workflow (discuss → plan → execute+verify) requiring no ROADMAP.md or milestone setup; economy settings injected per-invocation
- **bin/install.js** — `npx gsd-hooks` installer that wires Stop + SubagentStop hooks and copies the feature skill, with pre-mutation hooks snapshot and idempotency checks
- **12 automated tests** — Node.js built-in test runner covering all PACE and INST requirements via isolated temp environments

### What Worked

- **Windows-first Node.js constraint** held cleanly throughout — zero bash/shell in any deliverable; `os.homedir()`, `path.join()`, and `node …` invocations all resolve correctly cross-platform
- **gsd-plan-execute-all** as the primary orchestration pattern was efficient: both plan-phase and execute-phase ran as inline subagents without needing the full interactive workflow
- **YOLO + coarse granularity** config combination kept planning fast and approvals minimal — right call for a plugin package with well-understood requirements
- **Deep-clone bug (CR-01 ancestor)** was caught and auto-fixed during Phase 3 Wave 1 execution before it was ever committed in broken form
- **Pre-mutation snapshot pattern** established in Phase 1 (`economy-restore.json`) transferred cleanly to Phase 3 (`settings-hooks-restore.json`) — proving it as a durable convention

### What Was Inefficient

- **Phase 2 had to be recovered mid-execution** — session context ran out while SKILL.md was already written but SUMMARY, tracking, and code review were still pending; required careful state reconstruction at session start
- **Context handover overhead** — the plan-execute-all workflow ran across two sessions (context exhaustion), requiring a detailed summary file to reconstruct state; ~15 min of re-orientation at session start
- **3 critical review findings in Phase 3** (CR-01 array guard, CR-02 malformed-JSON overwrite, CR-03 unquoted Windows paths) were not caught by the automated test suite — tests only cover the happy path and pre-seeded valid JSON scenarios
- **`test/economy.test.js` referenced in summaries but file name was actually `test/gsd-phase-pacer.test.js`** — minor naming drift between planning artifacts and code

### Patterns Established

- **Pre-mutation deep-clone for safety snapshots:** `JSON.parse(JSON.stringify(obj))` before any mutation call, not after — enforced by passing the extracted block to snapshot functions, not the full object
- **`os.homedir()` for user-global path resolution** — replaces `~` expansion in all installer paths; works identically on Windows/macOS/Linux
- **Actions array pattern:** collect `{label, status}` records throughout an install flow, print once at the end — decouples action logging from execution logic
- **Idempotency by nested command-string scan:** `entry.hooks.some(h => h.command.includes('filename'))` rather than key-presence checks — robust against the settings.json array format
- **`require.main === module` guard + async IIFE** — standard pattern for all hook entry points that need both CLI and `require()` modes

### Key Lessons

1. **Test the error paths, not just the happy path.** The installer's malformed-JSON path (CR-02) was never exercised by tests, leaving a silent data-loss path. Any file that reads + overwrites a user config needs a test for the parse-error case.
2. **Quote all interpolated paths in command strings.** On Windows, npm/npx cache paths commonly contain spaces. `'node ' + absPath` is always wrong; use `'node ' + JSON.stringify(absPath)` or `'node "' + absPath + '"'`.
3. **`typeof [] === 'object'` is always a footgun** when guarding against non-object values. Explicit `Array.isArray` exclusion is required.
4. **Context budget management matters on long runs.** For a 3-phase project that fits in one day, crossing a context boundary mid-execution adds ~15 min of recovery overhead. Consider `/gsd-plan-execute-all --auto` for future small milestones to minimize cross-session state.
5. **Pre-mutation snapshot pattern is worth establishing in Phase 1 itself** — every subsequent phase that mutates shared config benefits from it immediately.

### Cost Observations

- Model mix: ~80% sonnet, ~20% opus (plan-phase and code-review steps)
- Sessions: 2 (Phase 1 + Phase 2/3 continuation)
- Notable: `verifier_enabled=false` + `plan_check=false` + `research=false` made each phase ~30% faster with no quality loss for this type of infrastructure package with clear, bounded requirements

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 2 | 3 | First milestone — baseline established |

### Cumulative Quality

| Milestone | Tests | Runtime LOC | Zero-Dep Additions |
|-----------|-------|-------------|-------------------|
| v1.0 | 12 | ~640 | 0 (no new dependencies) |

### Top Lessons (Verified Across Milestones)

1. Pre-mutation deep-clone is essential for any code that snapshots then mutates shared state
2. Quote all absolute paths inserted into shell command strings — spaces in Windows paths are guaranteed
