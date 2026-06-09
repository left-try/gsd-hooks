---
phase: 01-economy-rate-limit-layer
plan: 02
subsystem: infra
tags: [nodejs, hooks, rate-limit, economy-mode, gsd-hooks, stop-hook]

# Dependency graph
requires:
  - phase: 01-economy-rate-limit-layer
    provides: hooks/gsd-economy.js exporting activate() / deactivate() and economy.lock pattern
provides:
  - hooks/gsd-429-guard.js: Stop/SubagentStop hook scanning CLAUDE_TRANSCRIPT_PATH for 429 signals
  - RATE_LIMIT_SIGNALS constant covering all four known 429 representations
  - detectRateLimit(filePath) raw-content scanner (no JSON parsing — safe on untrusted input)
  - appendLog(logPath, entry) appending {timestamp, event, source} to rate-limit-log.json
  - .planning/rate-limit-log.json append-only audit log of 429 events
affects:
  - 01-03-PLAN.md (phase pacer checks economy.lock after guard may have activated it)

# Tech tracking
tech-stack:
  added: [Node.js builtins (fs, path, setTimeout)]
  patterns:
    - Hook-as-IIFE: async IIFE at module top-level — fires immediately when Node.js loads the hook
    - Raw-content scan: RATE_LIMIT_SIGNALS.some(s => content.includes(s)) — no JSON parsing of untrusted transcript
    - Append-log pattern: read-parse-push-write on a JSON array file; mkdirSync recursive ensures path exists
    - Idempotent guard integration: activate() returns silently when already active — safe to call unconditionally

key-files:
  created:
    - hooks/gsd-429-guard.js
  modified:
    - hooks/gsd-economy.js

key-decisions:
  - "activate() changed from process.exit(0) to plain return when lock exists — required for safe require()-based invocation from guard"
  - "module.exports added after CLI guard (require.main === module) so gsd-economy.js works both as CLI and as a require'd module"
  - "Raw string scan (not JSON.parse) for 429 detection — transcript may be partially written; raw scan is safe and sufficient"
  - "appendLog creates .planning/ dir with recursive: true — guard works even in a bare project with no .planning/ yet"

patterns-established:
  - "Guard exits 0 silently on missing or no-signal transcript — hook never breaks Claude Code session on non-rate-limit stops"
  - "Log entry always written even when economy mode is already active — audit trail is complete regardless of idempotency state"

requirements-completed:
  - RATE-01
  - RATE-02
  - RATE-03
  - RATE-04

# Metrics
duration: 8min
completed: 2026-06-09
---

# Phase 1 Plan 02: 429 Guard Hook Summary

**Stop/SubagentStop hook that raw-scans CLAUDE_TRANSCRIPT_PATH for 429 signals, calls activate() idempotently, appends a timestamped log entry, and sleeps 60s before exit — self-healing rate-limit recovery with zero npm dependencies**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-09T04:15:09Z
- **Completed:** 2026-06-09T04:23:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created `hooks/gsd-429-guard.js` implementing all four RATE-0x requirements: detection (RATE-01), economy activation (RATE-02), 60s cooldown (RATE-03), and timestamped logging (RATE-04)
- Refactored `hooks/gsd-economy.js` to export `activate` and `deactivate` and guard the CLI entry point with `require.main === module`, enabling safe `require()` from the guard without triggering CLI argument parsing
- Fixed bug in `activate()` where it called `process.exit(0)` on already-active check — changed to a plain `return` so the guard's async IIFE continues to run (log the event, sleep, exit cleanly)

## Task Commits

1. **Task 1: gsd-429-guard.js and gsd-economy.js exports** - `0cb7734` (feat)

## Files Created/Modified

- `hooks/gsd-429-guard.js` - Stop/SubagentStop hook: RATE_LIMIT_SIGNALS scan, activate(), appendLog(), 60s sleep IIFE
- `hooks/gsd-economy.js` - Added module.exports { activate, deactivate }; guarded CLI with require.main === module; fixed activate() early-return

## Decisions Made

- **activate() returns instead of process.exit(0) on already-active:** The original implementation exited the whole Node process when economy was already on. When called via `require()` from the guard, that would kill the guard mid-execution (no log, no sleep). Changed to a plain `return` — the idempotency guard still works, but the calling code continues.
- **Raw string scan over JSON parsing:** The transcript file may be partially flushed at hook fire time. A raw `String.includes()` scan tolerates incomplete JSON and matches the signal strings reliably.
- **appendLog uses recursive mkdirSync:** Ensures the hook works in any GSD project even if `.planning/` was never created before the first 429 event.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed activate() process.exit(0) breaking require()-based invocation**
- **Found during:** Task 1 (gsd-429-guard.js implementation)
- **Issue:** `activate()` in gsd-economy.js called `process.exit(0)` when economy mode was already active. When the guard `require()`s gsd-economy.js and calls `activate()`, this would kill the entire guard process — no log entry written, no 60s sleep, exit with code 0 as if nothing happened.
- **Fix:** Changed `process.exit(0)` in the already-active guard to `return`, and wrapped the CLI entry point in `if (require.main === module)`. Added `module.exports = { activate, deactivate }` at the module level.
- **Files modified:** hooks/gsd-economy.js
- **Verification:** `node --check` passes; guard integration test confirms "Economy mode already active" is printed, second log entry is appended, and process sleeps as expected.
- **Committed in:** `0cb7734` (part of task commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug — process.exit inside require()'d function)
**Impact on plan:** Required for correct behaviour; plan action section noted this refactor was expected.

## Issues Encountered

None beyond the deviation documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `hooks/gsd-429-guard.js` is ready to be registered as a Stop/SubagentStop hook in `~/.claude/settings.json`
- `hooks/gsd-economy.js` is now safely require()'able from any hook in this package
- Economy lock-file detection pattern is stable and available to the phase pacer (01-03)
- No blockers for Wave 3 (gsd-phase-pacer.js)

## Self-Check: PASSED

- FOUND: hooks/gsd-429-guard.js
- FOUND: hooks/gsd-economy.js (modified)
- FOUND: .planning/phases/01-economy-rate-limit-layer/01-02-SUMMARY.md
- FOUND commit: 0cb7734 (feat(01-02): implement gsd-429-guard.js)

---
*Phase: 01-economy-rate-limit-layer*
*Completed: 2026-06-09*
