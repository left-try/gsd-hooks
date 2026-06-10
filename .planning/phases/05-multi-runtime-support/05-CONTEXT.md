# Phase 5: Multi-Runtime Support - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via orchestrator directive)

<domain>
## Phase Boundary

Users running GSD on Gemini CLI and Codex get the same self-healing economy and 429 recovery without manual hook wiring.

Success criteria (from ROADMAP):

1. Gemini CLI user can install gsd-hooks via npx and economy mode activates/deactivates on BeforeAgent/AfterAgent events
2. Gemini CLI user hitting a 429 gets automatic economy activation and cooldown — no manual intervention required
3. Codex user can install gsd-hooks via npx with SubagentStop hook wired for 429 recovery
4. Codex user hitting a 429 gets automatic economy activation and cooldown — same self-healing behavior as Claude Code
5. Multi-runtime installs are idempotent and write restore snapshots before mutating runtime config (same safety guarantees as v1.0 installer)

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation choices are at Claude's discretion — discuss phase was skipped. Use ROADMAP success criteria, REQUIREMENTS.md (MULTI-01, MULTI-02), and existing v1.0 hook/installer patterns to guide decisions.

Preferred constraints from project:

- Node.js hooks only; no new npm dependencies
- Windows support (node commands, JSON.stringify paths)
- Extend `bin/install.js` with runtime-specific installers matching v1.0 idempotency + restore snapshot pattern
- Reuse `gsd-economy.js` and `gsd-429-guard.js` core logic; add thin runtime adapters for stdin/stdout JSON contracts

### Runtime reference (research summary)

**Gemini CLI**

- User settings: `~/.gemini/settings.json` (project: `.gemini/settings.json`)
- Hook events for MULTI-01: `BeforeAgent`, `AfterAgent`
- Hooks receive JSON on stdin (`transcript_path`, `session_id`, `cwd`, …)
- stdout must be valid JSON only (logs to stderr)

**Codex**

- User hooks file: `~/.codex/hooks.json` (also supports inline `[hooks]` in `config.toml`; prefer `hooks.json` for installer parity with JSON snapshot pattern)
- Hook event for MULTI-02: `SubagentStop`
- Hooks receive JSON on stdin (`agent_transcript_path`, `transcript_path`, `session_id`, `cwd`, …)
- `SubagentStop` requires valid JSON on stdout when exiting 0

</decisions>

<code_context>
## Existing Code Insights

- `bin/install.js` — Claude Code installer: wires Stop/SubagentStop, saves `settings-hooks-restore.json`, idempotent registration checks
- `hooks/gsd-429-guard.js` — reads `CLAUDE_TRANSCRIPT_PATH` env, activates economy, session backoff (ADV-02), cooldown sleep
- `hooks/gsd-economy.js` — `activate()`/`deactivate()` patch `.planning/config.json` with restore snapshot
- `hooks/gsd-phase-pacer.js` — Claude Stop hook only; not required for MULTI-01/02
- `test/install.test.js` — isolated HOME pattern for installer tests

</code_context>

<specifics>
## Specific Ideas

No user-specific ideas — discuss skipped. Requirements map:

- MULTI-01 → Gemini CLI BeforeAgent/AfterAgent economy + 429 recovery
- MULTI-02 → Codex SubagentStop 429 recovery (economy activation via existing guard)

</specifics>

<deferred>
## Deferred Ideas

- MULTI-03 Cursor IDE hook integration (deferred in REQUIREMENTS.md future section)
- Phase pacing (Stop) on Gemini/Codex — out of MULTI-01/02 scope; Claude-only in v1.0

</deferred>
