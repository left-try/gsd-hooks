# Requirements: gsd-hooks

**Defined:** 2026-06-08
**Core Value:** GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.

## v1 Requirements

### Economy Mode

- [x] **ECON-01**: Running `gsd-economy --on` patches `.planning/config.json` to budget model, 1 concurrent agent, and disabled optional steps (code_review, nyquist_validation, plan_check, verifier), saving original values to `.planning/economy-restore.json`
- [x] **ECON-02**: Running `gsd-economy --off` restores original config values from `.planning/economy-restore.json`
- [x] **ECON-03**: Economy mode patch triggers gsd-core's FileChanged hot-reload (no session restart needed)
- [x] **ECON-04**: Economy state is readable from a lock file so hooks can detect active economy mode

### Rate Limit Recovery

- [ ] **RATE-01**: Stop/SubagentStop hook detects 429 rate-limit signals in session transcript or output
- [ ] **RATE-02**: On 429 detection, hook automatically activates economy mode (ECON-01)
- [ ] **RATE-03**: On 429 detection, hook inserts a 60-second cooldown before allowing next phase to trigger
- [ ] **RATE-04**: Hook logs each 429 event with timestamp to `.planning/rate-limit-log.json`

### Phase Pacing

- [x] **PACE-01**: Stop hook adds a configurable base delay (default 15s, configurable via `GSD_PHASE_DELAY_SECS` env var) between phases in `gsd-plan-execute-all` chains
- [x] **PACE-02**: Pacing delay is skipped when economy mode is already active (the 60s cooldown supersedes it)

### Lightweight Feature Workflow

- [ ] **FEAT-01**: `/gsd-feature "<description>"` starts a feature workflow without requiring a ROADMAP.md or milestone setup
- [ ] **FEAT-02**: Discuss step asks 2-3 targeted questions and writes CONTEXT.md to `.planning/features/<feature-slug>/`
- [ ] **FEAT-03**: Plan step spawns a planner agent from CONTEXT.md directly (no researcher, no plan-checker)
- [ ] **FEAT-04**: Execute+verify step runs tasks and performs an inline verify pass within the same agent (no separate verifier spawn)
- [ ] **FEAT-05**: Feature workflow applies budget model, 2 concurrent agents, no research/code-review/nyquist per-invocation without permanently modifying `.planning/config.json`
- [ ] **FEAT-06**: Completed feature artifacts are isolated in `.planning/features/<slug>/` and do not interfere with active milestone phases

### NPX Installer

- [ ] **INST-01**: `npx @<scope>/gsd-hooks@latest` detects existing gsd-core installation path (global or local)
- [ ] **INST-02**: Installer wires hooks (gsd-phase-pacer, gsd-429-guard) into `~/.claude/settings.json` Stop and SubagentStop events
- [ ] **INST-03**: Installer copies the `/gsd-feature` skill into `~/.claude/plugins/`
- [ ] **INST-04**: Installer is idempotent — re-running does not duplicate hook registrations
- [ ] **INST-05**: Installer prints a clear summary of what was installed and where

## v2 Requirements

### Multi-Runtime Support

- **MULTI-01**: Economy mode hooks ported to Gemini CLI (BeforeAgent/AfterAgent events)
- **MULTI-02**: Economy mode hooks ported to Codex (SubagentStop event)

### Advanced Pacing

- **ADV-01**: Configurable per-project pacing via `.planning/config.json` extension (`hooks.phase_delay_secs`)
- **ADV-02**: Exponential backoff on repeated 429s within the same session (60s → 120s → 240s)

### Feature Workflow Enhancements

- **FEAT-07**: `/gsd-feature --ship` auto-creates a PR after execute+verify completes
- **FEAT-08**: Feature history log tracking all features run in a project

## Out of Scope

| Feature | Reason |
|---------|--------|
| Modifying gsd-core source files | This package extends, never forks — stays compatible with all gsd-core versions |
| Token counting / cost estimation | Requires direct API access not available in hooks; delay-based pacing is simpler and reliable |
| Support for runtimes other than Claude Code in v1 | Hooks are Claude Code-specific; multi-runtime is v2 |
| Full replacement of gsd-plan-execute-all | Economy mode reduces pressure on the existing command; not replacing it |
| GUI or settings UI | CLI and env vars are sufficient; /gsd-settings already handles gsd-core config |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ECON-01 | Phase 1 | Complete (01-01) |
| ECON-02 | Phase 1 | Complete (01-01) |
| ECON-03 | Phase 1 | Complete (01-01) |
| ECON-04 | Phase 1 | Complete (01-01) |
| RATE-01 | Phase 1 | Pending |
| RATE-02 | Phase 1 | Pending |
| RATE-03 | Phase 1 | Pending |
| RATE-04 | Phase 1 | Pending |
| PACE-01 | Phase 1 | Complete (01-03) |
| PACE-02 | Phase 1 | Complete (01-03) |
| FEAT-01 | Phase 2 | Pending |
| FEAT-02 | Phase 2 | Pending |
| FEAT-03 | Phase 2 | Pending |
| FEAT-04 | Phase 2 | Pending |
| FEAT-05 | Phase 2 | Pending |
| FEAT-06 | Phase 2 | Pending |
| INST-01 | Phase 3 | Pending |
| INST-02 | Phase 3 | Pending |
| INST-03 | Phase 3 | Pending |
| INST-04 | Phase 3 | Pending |
| INST-05 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-08*
*Last updated: 2026-06-08 after initial definition*
