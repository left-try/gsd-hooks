# gsd-hooks

## What This Is

An npx-installable plugin package that sits on top of any existing gsd-core installation and adds rate-limit resilience, cost-optimized workflow modes, and a lightweight feature development skill. Designed for GSD users who hit Anthropic API rate limits during automated phase chains or need to run GSD on tighter usage budgets without abandoning the structured workflow.

## Core Value

GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Economy mode hook that patches `.planning/config.json` to budget model + 1 concurrent agent + disabled optional steps, with restore-on-toggle
- [ ] 429 detection hook (Stop/SubagentStop) that scans transcript for rate-limit signals, activates economy mode, and inserts cooldown before retrying
- [ ] Phase pacing hook (Stop) that adds a configurable base delay between phases to reduce burst pressure
- [ ] `/gsd-feature` skill — lightweight feature workflow: discuss + plan as separate steps, execute+verify collapsed into one pass, no research/code-review/nyquist, no roadmap setup required
- [ ] NPX installer that detects gsd-core install, wires hooks into `~/.claude/settings.json`, and copies skills into `~/.claude/plugins/`

### Out of Scope

- Full replacement of gsd-core workflows — this package extends, never forks
- Contributing changes upstream to open-gsd/gsd-core — everything lives in this package
- Token counting or cost estimation — too brittle without direct API access; pacing by delay is simpler and reliable
- Support for runtimes other than Claude Code in v1 — hooks are Claude Code hooks (`Stop`, `SubagentStop`, `PreCompact`)

## Context

- **Triggering problem:** `/gsd-plan-execute-all` (triggered on `Stop`) chains through phases and spawns parallel agents, hitting Anthropic API rate limits (429) mid-execution — corrupting or halting in-progress phases.
- **gsd-core has** a `budget` model profile, `dynamic_routing`, per-phase-type model overrides, and `max_concurrent_agents` config — but no automated 429 recovery or single-command economy toggle.
- **gsd-core hot-reloads** `.planning/config.json` on `FileChanged` — so patching config in a hook takes effect without restarting the session.
- **Hook system:** Claude Code fires `Stop` at session turn end and `SubagentStop` when a spawned subagent completes — these are the right events to intercept for pacing and recovery.
- **Existing skills install path:** `~/.claude/plugins/` — the same path gsd-core uses for Claude Code skill installation.

## Constraints

- **Compatibility:** Must work on top of any gsd-core version >= 1.28 without modifications to gsd-core files
- **Hook safety:** Config patching must save a restore snapshot (`economy-restore.json`) before overwriting — no destructive config changes
- **Windows support:** Hooks run in Node.js (not bash) to work on Windows/Git Bash where shell hooks behave differently
- **Installer scope:** npx entry point only — no global npm install required; package runs from cache

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Option B (economy mode + 429 detect) over Option A (pacing-only) or Option C (token tracker) | Self-healing at full quality normally; economy only when rate-limited. Option C requires token estimation without API access. | — Pending |
| Node.js for all hooks (not shell scripts) | Cross-platform compatibility; gsd-core already uses Node hooks | — Pending |
| Economy settings injected per-invocation in `/gsd-feature` (not written to config) | Avoids permanently altering project config for a feature run | — Pending |
| Phase pacing as base delay inside economy system, not separate | Fewer moving parts; one hook handles both concerns | — Pending |

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
*Last updated: 2026-06-08 after initialization*
