# Milestones

## v1.1 Multi-Runtime & Workflow Enhancements (Shipped: 2026-06-10)

**Phases completed:** 5 phases (4–8), 9 plans

**Key accomplishments:**

- Per-project phase pacing via `hooks.phase_delay_secs` in `.planning/config.json` and session-scoped exponential 429 backoff (60s → 120s → 240s) in `gsd-429-guard.js`
- Multi-runtime hook adapters: Gemini CLI (`gsd-gemini-before.js` / `gsd-gemini-after.js`) and Codex (`gsd-codex-429-guard.js`) with shared `runGuard` and cwd-aware economy activation
- `/gsd-feature --ship` auto-PR gate (`lib/feature-ship.js`) and per-project feature history log (`lib/feature-history.js` → `.planning/features/HISTORY.md`)
- README.md with multi-runtime install, hook behavior, `/gsd-feature` usage, and configuration reference — guarded by `test/readme.test.js`
- Feature lib deploy fix: `installSkill` syncs SKILL.md + libs to `~/.claude/plugins/gsd-feature/` with consumer E2E coverage (`feature-plugin-deploy.test.js`)
- Published to npm as `gsd-hooks@0.1.0` — 56 automated tests pass

**Known gaps at close (tech debt):**

- MULTI-01 partial: no `gsd-gemini-after` runtime integration test (installer wiring verified)
- Phase 5 lacks formal `05-VERIFICATION.md`

---

## v1.0 Rate-Limit Resilience & Economy (Shipped: 2026-06-09)

**Phases completed:** 3 phases, 6 plans, 7 tasks

**Key accomplishments:**

- CommonJS package scaffold with gsd-economy CLI: --on patches config.json to budget model via deepMerge, --off restores original values from pre-saved snapshot; economy.lock is the sole state signal
- Stop/SubagentStop hook that raw-scans CLAUDE_TRANSCRIPT_PATH for 429 signals, calls activate() idempotently, appends a timestamped log entry, and sleeps 60s before exit — self-healing rate-limit recovery with zero npm dependencies
- Node.js Stop hook that sleeps GSD_PHASE_DELAY_SECS (default 15s) between phases to smooth burst throughput; bypasses delay immediately when economy.lock is present since the 429 guard's 60s cooldown supersedes pacing
- npx entry point bin/install.js wires gsd-phase-pacer and gsd-429-guard into ~/.claude/settings.json hooks and copies /gsd-feature skill to ~/.claude/plugins/, with full idempotency, pre-mutation snapshot, and per-action summary
- 5-test Node.js built-in test suite for bin/install.js, exercising all INST requirements via isolated temp HOME directories — zero side-effects on the developer machine

---
