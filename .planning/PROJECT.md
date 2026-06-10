# gsd-hooks

## What This Is

An npx-installable plugin package that sits on top of any existing gsd-core installation and adds rate-limit resilience, cost-optimized workflow modes, and a lightweight feature development skill. Designed for GSD users who hit Anthropic API rate limits during automated phase chains or need to run GSD on tighter usage budgets without abandoning the structured workflow.

## Core Value

GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.

## Requirements

### Validated

- [x] Economy mode hook that patches `.planning/config.json` to budget model + 1 concurrent agent + disabled optional steps, with restore-on-toggle (Phase 1 — ECON-01, ECON-02, ECON-03, ECON-04)
- [x] 429 detection hook (Stop/SubagentStop) that scans transcript for rate-limit signals, activates economy mode, and inserts cooldown before retrying (Phase 1 — RATE-01, RATE-02, RATE-03, RATE-04)
- [x] Phase pacing hook (Stop) that adds a configurable base delay between phases to reduce burst pressure (Phase 1 — PACE-01, PACE-02)
- [x] `/gsd-feature` skill — lightweight feature workflow: discuss + plan as separate steps, execute+verify collapsed into one pass, no research/code-review/nyquist, no roadmap setup required (Phase 2 — FEAT-01..06)
- [x] NPX installer that detects gsd-core install, wires hooks into `~/.claude/settings.json`, and copies skills into `~/.claude/plugins/`, with idempotency and restore snapshot (Phase 3 — INST-01..05)

### Active

- [ ] Economy mode hooks ported to Gemini CLI (BeforeAgent/AfterAgent events) — MULTI-01
- [ ] Economy mode hooks ported to Codex (SubagentStop event) — MULTI-02
- [ ] Configurable per-project pacing via `.planning/config.json` extension (`hooks.phase_delay_secs`) — ADV-01
- [ ] Exponential backoff on repeated 429s within the same session (60s → 120s → 240s) — ADV-02
- [ ] `/gsd-feature --ship` auto-creates a PR after execute+verify completes — FEAT-07
- [ ] Feature history log tracking all features run in a project — FEAT-08

### Out of Scope

- Full replacement of gsd-core workflows — this package extends, never forks
- Contributing changes upstream to open-gsd/gsd-core — everything lives in this package
- Token counting or cost estimation — too brittle without direct API access; pacing by delay is simpler and reliable

## Context

- **Triggering problem:** `/gsd-plan-execute-all` (triggered on `Stop`) chains through phases and spawns parallel agents, hitting Anthropic API rate limits (429) mid-execution — corrupting or halting in-progress phases.
- **gsd-core has** a `budget` model profile, `dynamic_routing`, per-phase-type model overrides, and `max_concurrent_agents` config — but no automated 429 recovery or single-command economy toggle.
- **gsd-core hot-reloads** `.planning/config.json` on `FileChanged` — so patching config in a hook takes effect without restarting the session.
- **Hook system:** Claude Code fires `Stop` at session turn end and `SubagentStop` when a spawned subagent completes — these are the right events to intercept for pacing and recovery.
- **Existing skills install path:** `~/.claude/plugins/` — the same path gsd-core uses for Claude Code skill installation.

## Current Milestone: v1.1 Multi-Runtime & Workflow Enhancements

**Goal:** Extend gsd-hooks beyond Claude Code with smarter pacing/recovery and richer `/gsd-feature` workflow — while keeping the self-healing rate-limit core intact.

**Target features:**
- Multi-runtime support — port economy/429/pacing hooks to Gemini CLI and Codex
- Advanced pacing — per-project `hooks.phase_delay_secs` in config.json; exponential 429 backoff (60s → 120s → 240s)
- Feature workflow — `/gsd-feature --ship` auto-creates PR after execute+verify; feature history log per project

### Current State (v1.0)

- **Shipped:** 2026-06-09
- **Runtime files:** 4 Node.js hook/CLI scripts (~460 LOC) + `bin/install.js` (180 LOC) + `/gsd-feature` SKILL.md (360 lines)
- **Test coverage:** 12 automated tests (gsd-phase-pacer: 7, installer: 5) via Node.js built-in test runner
- **Tech stack:** CommonJS Node.js, no runtime dependencies, Node ≥18
- **Known installer bugs (pre-publish):** CR-01 (array hooks guard), CR-02 (malformed JSON silent overwrite), CR-03 (unquoted Windows paths) — see `.planning/phases/03-npx-installer-package-wiring/03-REVIEW.md`

## Constraints

- **Compatibility:** Must work on top of any gsd-core version >= 1.28 without modifications to gsd-core files
- **Hook safety:** Config patching must save a restore snapshot (`economy-restore.json`) before overwriting — no destructive config changes
- **Windows support:** Hooks run in Node.js (not bash) to work on Windows/Git Bash where shell hooks behave differently
- **Installer scope:** npx entry point only — no global npm install required; package runs from cache

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Option B (economy mode + 429 detect) over Option A (pacing-only) or Option C (token tracker) | Self-healing at full quality normally; economy only when rate-limited. Option C requires token estimation without API access. | ✅ Implemented — Phase 1 |
| Node.js for all hooks (not shell scripts) | Cross-platform compatibility; gsd-core already uses Node hooks | ✅ Confirmed — all hooks are `.js`, no shell scripts |
| Economy settings injected per-invocation in `/gsd-feature` (not written to config) | Avoids permanently altering project config for a feature run | ✅ Implemented — Phase 2 |
| Phase pacing as base delay inside economy system, not separate | Fewer moving parts; one hook handles both concerns | ✅ Confirmed — gsd-phase-pacer defers to economy.lock |
| `require.main === module` guard in gsd-economy.js | Allows gsd-429-guard to require() and call activate() without killing its own process | ✅ Added during Phase 1 execution |
| Pre-mutation deep-clone of `settings.hooks` before `installHooks()` call | JS pass-by-reference: `installHooks` mutates settings in-place; snapshot after the call would record the post-mutation state | ✅ Auto-fixed during Phase 3 execution |
| `saveHooksSnapshot` accepts the pre-extracted hooks block, not the full settings object | Enforces the correct call sequence at the API level — callers can't accidentally snapshot post-mutation | ✅ Phase 3 design |
| Hook idempotency scans `entry.hooks[].command` strings for filename substring | `settings.json` arrays may have multiple entries per event; substring scan of nested command is more reliable than top-level key presence | ✅ Phase 3 design |
| Restore snapshot written only when `changed === true` | No-op installs leave no trace; avoids writing an unnecessary file on fully-idempotent runs | ✅ Phase 3 design |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-10 — v1.1 milestone started*
