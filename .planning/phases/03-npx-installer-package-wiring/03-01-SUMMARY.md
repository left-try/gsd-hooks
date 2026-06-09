---
phase: 03-npx-installer-package-wiring
plan: 01
subsystem: infra
tags: [nodejs, npx, installer, hooks, settings-json, idempotent]

# Dependency graph
requires:
  - phase: 01-economy-rate-limit-layer
    provides: hooks/gsd-economy.js, hooks/gsd-429-guard.js, hooks/gsd-phase-pacer.js
  - phase: 02-gsd-feature-skill
    provides: .claude/skills/gsd-feature/SKILL.md
provides:
  - bin/install.js — npx entry point that wires hooks into ~/.claude/settings.json and copies /gsd-feature skill
  - package.json bin.gsd-hooks — declares bin/install.js as the gsd-hooks npx command
affects: [users running npx gsd-hooks, gsd-core settings.json hook configuration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotency by scanning existing command strings before pushing hook entries"
    - "Safety-first snapshot: capture original hooks block before any mutation (deep-clone via JSON parse/stringify)"
    - "os.homedir() for user-global path resolution in Node.js installers"
    - "require.main === module guard wrapping async IIFE for CLI entry points"

key-files:
  created:
    - bin/install.js
  modified:
    - package.json

key-decisions:
  - "Capture originalHooks via JSON.parse(JSON.stringify(settings.hooks)) before calling installHooks, since JS object mutation would corrupt snapshot if captured after"
  - "saveHooksSnapshot accepts pre-extracted original hooks block (not full settings) to enforce correct call sequence"
  - "Hook idempotency check scans entry.hooks[].command strings for filename substring, not key presence — settings.json arrays may have multiple entries per event"
  - "Restore snapshot written only when changed=true to avoid unnecessary file writes on fully-idempotent runs"

patterns-established:
  - "os.homedir() for resolving ~/.claude/* paths in installer scripts"
  - "Pre-mutation deep-clone for safety snapshots (parallel to economy-restore.json pattern)"
  - "Actions array: collect {label, status} records throughout install flow, print once at end"

requirements-completed: [INST-01, INST-02, INST-03, INST-04, INST-05]

# Metrics
duration: 2min
completed: 2026-06-09
---

# Phase 3 Plan 01: NPX Installer Package Wiring Summary

**npx entry point bin/install.js wires gsd-phase-pacer and gsd-429-guard into ~/.claude/settings.json hooks and copies /gsd-feature skill to ~/.claude/plugins/, with full idempotency, pre-mutation snapshot, and per-action summary**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-09T05:36:29Z
- **Completed:** 2026-06-09T05:38:30Z
- **Tasks:** 2
- **Files modified:** 2 (package.json, bin/install.js created)

## Accomplishments

- Added `gsd-hooks` bin entry to package.json pointing to `bin/install.js`, enabling `npx gsd-hooks` execution
- Implemented `bin/install.js` with full hook wiring logic: Stop (gsd-phase-pacer) and SubagentStop (gsd-429-guard) entries added to `~/.claude/settings.json` only when absent
- Idempotent skill copy: `~/.claude/plugins/gsd-feature/SKILL.md` copied from `.claude/skills/gsd-feature/SKILL.md`, skipped if already present
- Pre-mutation safety snapshot: original hooks block saved to `~/.claude/settings-hooks-restore.json` before any modification (STRIDE T-03-01)
- Human-readable install summary printed per-action with WIRED / ALREADY PRESENT / COPIED status labels (INST-05)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update package.json bin field** - `11d5503` (chore)
2. **Task 2: Implement bin/install.js installer** - `5bea6ea` (feat)

## Files Created/Modified

- `bin/install.js` — npx installer entry point: readJsonOrEmpty, saveHooksSnapshot, installHooks, installSkill, printSummary, async IIFE main with require.main guard
- `package.json` — bin object extended with `"gsd-hooks": "bin/install.js"` entry

## Decisions Made

- Captured `originalHooks` via `JSON.parse(JSON.stringify(settings.hooks || {}))` before calling `installHooks()` — since `installHooks` mutates the settings object in-place, capturing after the call would record the post-mutation state, defeating the safety snapshot purpose
- `saveHooksSnapshot` function signature updated to accept the pre-extracted hooks block rather than the full settings object, enforcing correct call sequence at the type level
- Hook idempotency check uses `.some(entry => entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gsd-phase-pacer')))` — scanning the nested `hooks[].command` strings rather than top-level key presence, matching the actual settings.json structure
- Restore snapshot is only written when `changed === true` — avoids writing an unnecessary file on fully-idempotent runs (no-op installs leave no trace)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-mutation snapshot capturing post-mutation state**
- **Found during:** Task 2 (bin/install.js implementation, verification of snapshot correctness)
- **Issue:** `installHooks(settings, actions)` mutates the `settings` object in-place (JavaScript pass-by-reference). Original plan called `saveHooksSnapshot(settings)` after `installHooks`, so the snapshot would contain already-added hooks rather than the original state
- **Fix:** Added `const originalHooks = JSON.parse(JSON.stringify(settings.hooks || {}))` before the `installHooks` call to deep-clone the original hooks block; updated `saveHooksSnapshot` to accept this pre-extracted block; verified with a test asserting snapshot contains only pre-existing entries
- **Files modified:** bin/install.js
- **Verification:** Test with pre-existing `echo hello` Stop hook confirmed snapshot contains only that entry, not the newly added gsd-phase-pacer entry
- **Committed in:** `5bea6ea` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug fix)
**Impact on plan:** Required for T-03-01 threat mitigation correctness. The snapshot must capture pre-modification state to be reversible. No scope creep.

## Issues Encountered

None — plan executed smoothly after catching the snapshot mutation bug during verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03-01 complete: `bin/install.js` fully implemented and verified
- Plan 03-02 (if any) can proceed — package is ready for npx distribution testing
- All INST requirements shipped: INST-01 through INST-05

## Self-Check: PASSED

- `bin/install.js` exists: FOUND
- `package.json` bin.gsd-hooks: FOUND (verified by node -e)
- Commit `11d5503` (package.json): FOUND
- Commit `5bea6ea` (bin/install.js): FOUND
- All inline verifications: ALL PASS + IDEMPOTENCY PASS + SNAPSHOT CORRECTNESS PASS

---
*Phase: 03-npx-installer-package-wiring*
*Completed: 2026-06-09*
