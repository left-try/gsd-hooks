# gsd-hooks

## What This Is

An npx-installable plugin package that sits on top of any existing gsd-core installation and adds rate-limit resilience, cost-optimized workflow modes, multi-runtime hook support, and a lightweight feature development skill. Designed for GSD users who hit API rate limits during automated phase chains or need to run GSD on tighter usage budgets without abandoning the structured workflow.

## Core Value

GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.

## Requirements

### Validated

- [x] Economy mode hook that patches `.planning/config.json` to budget model + 1 concurrent agent + disabled optional steps, with restore-on-toggle (v1.0 — ECON-01..04)
- [x] 429 detection hook (Stop/SubagentStop) that scans transcript for rate-limit signals, activates economy mode, and inserts cooldown before retrying (v1.0 — RATE-01..04)
- [x] Phase pacing hook (Stop) that adds a configurable base delay between phases to reduce burst pressure (v1.0 — PACE-01, PACE-02)
- [x] `/gsd-feature` skill — lightweight feature workflow without roadmap setup (v1.0 — FEAT-01..06)
- [x] NPX installer that wires hooks and copies skills with idempotency and restore snapshot (v1.0 — INST-01..05)
- [x] Configurable per-project pacing via `hooks.phase_delay_secs` (v1.1 — ADV-01)
- [x] Exponential backoff on repeated 429s within a session: 60s → 120s → 240s (v1.1 — ADV-02)
- [x] Economy mode hooks ported to Gemini CLI BeforeAgent/AfterAgent events (v1.1 — MULTI-01, installer + hooks shipped; runtime integration test deferred)
- [x] Economy mode hooks ported to Codex SubagentStop event (v1.1 — MULTI-02)
- [x] `/gsd-feature --ship` auto-creates a PR after execute+verify completes (v1.1 — FEAT-07)
- [x] Feature history log tracking all features run in a project (v1.1 — FEAT-08)
- [x] Project README.md with install and usage docs for all supported runtimes (v1.1 — DOCS-01)

### Active

- [ ] `gsd-gemini-after` runtime integration test (TEST-01)
- [ ] `readme.test.js` asserts `gsd-gemini-after` (DOCS-02)
- [ ] Retroactive Phase 5 `05-VERIFICATION.md` (VERIFY-01)
- [ ] npm publish metadata committed — `files`, `repository` (PUB-01)
- [ ] Version `0.1.1` with README pin (PUB-02)
- [ ] README GitHub install fallback (PUB-03)

### Out of Scope

- Full replacement of gsd-core workflows — this package extends, never forks
- Contributing changes upstream to open-gsd/gsd-core — everything lives in this package
- Token counting or cost estimation — too brittle without direct API access; pacing by delay is simpler and reliable
- GUI or settings UI — CLI and env vars are sufficient

## Context

- **Shipped v1.1:** 2026-06-10
- **npm package:** `gsd-hooks@0.1.0` — install via `npx gsd-hooks`
- **Runtime files:** 7 hook/CLI scripts + shared `hooks/lib/runtime-hook.js` + `bin/install.js` + feature libs + `/gsd-feature` SKILL.md
- **Test coverage:** 56 automated tests via Node.js built-in test runner (zero runtime dependencies)
- **Supported runtimes:** Claude Code, Gemini CLI, Codex
- **Known tech debt:** No `gsd-gemini-after` runtime integration test; Phase 5 lacks formal VERIFICATION.md

## Current Milestone: v1.2 Hardening & Publish Polish

**Goal:** Close v1.1 tech debt and ship a reliable `gsd-hooks@0.1.1` npm release.

**Target features:**

- `gsd-gemini-after` integration test (closes MULTI-01 partial)
- Retroactive Phase 5 verification artifact
- npm publish polish: metadata, 0.1.1 bump, GitHub install fallback

## Current State (v1.1 shipped)

- **Shipped:** 2026-06-10
- **npm:** `gsd-hooks@0.1.0`
- **Tests:** 56 passing
- **Tech debt driving v1.2:** Gemini after test, Phase 5 VERIFICATION.md, uncommitted publish metadata

## Constraints

- **Compatibility:** Must work on top of any gsd-core version >= 1.28 without modifications to gsd-core files
- **Hook safety:** Config patching must save a restore snapshot before overwriting — no destructive config changes
- **Windows support:** Hooks run in Node.js (not bash) to work on Windows/Git Bash where shell hooks behave differently
- **Installer scope:** npx entry point only — no global npm install required; package runs from cache

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Option B (economy mode + 429 detect) over pacing-only or token tracker | Self-healing at full quality normally; economy only when rate-limited | ✅ v1.0 |
| Node.js for all hooks (not shell scripts) | Cross-platform compatibility | ✅ All runtimes |
| Economy settings injected per-invocation in `/gsd-feature` | Avoids permanently altering project config | ✅ v1.0 |
| Phase pacing defers to economy.lock | 429 cooldown supersedes pacing delay | ✅ v1.0 + v1.1 |
| Shared `runGuard` across Claude/Gemini/Codex adapters | One 429-scan + backoff + activate path | ✅ v1.1 |
| `activate({ cwd })` cwd-aware economy | Multi-runtime hooks resolve project config from hook cwd | ✅ v1.1 |
| Feature libs deployed to plugin dir, not project cwd | Consumer projects can't `require('./lib/...')` from skill | ✅ v1.1 Phase 8 |
| Unscoped npm name `gsd-hooks` on personal account | No `@opengsd` org access; name available on registry | ✅ Published 0.1.0 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-06-11 — v1.2 milestone started*
