# Phase 7: Package Documentation - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning
**Mode:** Auto-generated from ROADMAP (discuss skipped via orchestrator directive)

<domain>
## Phase Boundary

New users can install, configure, and use gsd-hooks on any supported runtime from README alone.

Success criteria (from ROADMAP):

1. README.md exists at project root with a clear package overview and core value proposition
2. README documents npx install steps for Claude Code, Gemini CLI, and Codex with runtime-specific hook wiring notes
3. README explains economy mode, 429 recovery, phase pacing, and exponential backoff behavior
4. README documents `/gsd-feature` usage including `--ship` and where feature artifacts/history are stored
5. README includes configuration reference for `hooks.phase_delay_secs`, `GSD_PHASE_DELAY_SECS`, and economy toggle commands

**Depends on:** Phase 6 (FEAT-07, FEAT-08) — executor must read Phase 6 implementation for authoritative `--ship` and feature-history paths before finalizing those README sections.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All documentation structure, section ordering, and tone are at Claude's discretion — discuss phase was skipped. Use ROADMAP success criteria, DOCS-01, and the live codebase as source of truth.

Documentation constraints from project:

- README is the sole deliverable — no separate docs site or wiki
- Document actual behavior from `bin/install.js`, `hooks/*`, and `.claude/skills/gsd-feature/SKILL.md` — no aspirational features
- npx command: `npx gsd-hooks` (package bin `gsd-hooks` → `bin/install.js`); note published form `npx @<scope>/gsd-hooks@latest` when scope is known
- Prerequisites: Node.js ≥18, existing gsd-core installation (Claude: `~/.claude/settings.json`; Gemini: `~/.gemini/settings.json`; Codex: `~/.codex/` directory)
- Windows-safe paths: document that hooks use `node` with JSON-stringified absolute paths

### Runtime install reference (from implementation)

| Runtime | Config file | Hooks wired | Restore snapshot |
|---------|-------------|-------------|------------------|
| Claude Code | `~/.claude/settings.json` | Stop → `gsd-phase-pacer.js`; SubagentStop → `gsd-429-guard.js` | `~/.claude/settings-hooks-restore.json` |
| Gemini CLI | `~/.gemini/settings.json` | BeforeAgent → `gsd-gemini-before.js`; AfterAgent → `gsd-gemini-after.js` | `~/.gemini/settings-hooks-restore.json` |
| Codex | `~/.codex/hooks.json` | SubagentStop → `gsd-codex-429-guard.js` (600s timeout) | `~/.codex/hooks-restore.json` |

All runtimes: `/gsd-feature` skill copied to `~/.claude/plugins/gsd-feature/SKILL.md` (Claude Code only).

### Hook behavior reference (from implementation)

- **Economy mode** (`gsd-economy --on` / `--off`): patches `.planning/config.json` from `presets/economy.json`; saves restore to `.planning/economy-restore.json`; lock file `.planning/economy.lock`
- **429 recovery** (`gsd-429-guard` / runtime adapters): scans transcript for rate-limit signals; activates economy; exponential cooldown 60s → 120s → 240s (session-scoped via `.planning/rate-limit-backoff.json`); logs to `.planning/rate-limit-log.json`
- **Phase pacing** (Claude Stop hook only): delay from `hooks.phase_delay_secs` in config (overrides env) or `GSD_PHASE_DELAY_SECS` (default 15s); skipped when `economy.lock` present; `0` disables pacing

### `/gsd-feature` reference

- Artifacts: `.planning/features/<slug>/` (CONTEXT.md, PLAN.md, SUMMARY.md)
- Flags: `--economy` (informational; economy.lock is authoritative)
- Phase 6 additions (document per Phase 6 implementation): `--ship` auto-PR; project feature history log

</decisions>

<code_context>
## Existing Code Insights

- No README.md exists at project root today
- `package.json` — name `gsd-hooks`, bins `gsd-hooks` and `gsd-economy`, Node ≥18, MIT, no runtime dependencies
- `bin/install.js` — multi-runtime installer with idempotent wiring and restore snapshots
- `hooks/` — 7 hook scripts + `lib/runtime-hook.js` shared utilities
- `presets/economy.json` — budget model, max_concurrent_agents: 1, disabled optional workflow steps
- Tests exist for hooks/installer but no README content tests yet

</code_context>

<specifics>
## Specific Ideas

No user-specific ideas — discuss skipped. Requirements map:

- DOCS-01 → single comprehensive README.md covering overview, install (3 runtimes), hooks, `/gsd-feature`, config reference

</specifics>

<deferred>
## Deferred Ideas

- MULTI-03 Cursor IDE hook integration (deferred in REQUIREMENTS.md)
- OBS-01 rate-limit dashboard (deferred in REQUIREMENTS.md)
- Separate docs site, API reference beyond config keys, or CONTRIBUTING.md (out of DOCS-01 scope)

</deferred>
