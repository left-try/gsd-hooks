# Requirements: gsd-hooks

**Defined:** 2026-06-10
**Core Value:** GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.

## v1.1 Requirements

Requirements for milestone v1.1. Each maps to roadmap phases.

### Multi-Runtime Support

- [ ] **MULTI-01**: Economy mode hooks ported to Gemini CLI (BeforeAgent/AfterAgent events)
- [ ] **MULTI-02**: Economy mode hooks ported to Codex (SubagentStop event)

### Advanced Pacing

- [ ] **ADV-01**: Configurable per-project pacing via `.planning/config.json` extension (`hooks.phase_delay_secs`)
- [ ] **ADV-02**: Exponential backoff on repeated 429s within the same session (60s → 120s → 240s)

### Feature Workflow Enhancements

- [ ] **FEAT-07**: `/gsd-feature --ship` auto-creates a PR after execute+verify completes
- [ ] **FEAT-08**: Feature history log tracking all features run in a project

### Package Documentation

- [ ] **DOCS-01**: Project README.md with package overview, npx install instructions for Claude Code / Gemini CLI / Codex, hook behavior summary, `/gsd-feature` usage, and configuration reference (`hooks.phase_delay_secs`, env vars)

## Future Requirements

Deferred beyond v1.1.

### Additional Runtimes

- **MULTI-03**: Cursor IDE hook integration (if/when stable hook API available)

### Observability

- **OBS-01**: Dashboard or CLI summary of rate-limit events and economy activations across sessions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Modifying gsd-core source files | This package extends, never forks — stays compatible with all gsd-core versions |
| Token counting / cost estimation | Requires direct API access not available in hooks; delay-based pacing is simpler and reliable |
| Full replacement of gsd-plan-execute-all | Economy mode reduces pressure on the existing command; not replacing it |
| GUI or settings UI | CLI and env vars are sufficient; /gsd-settings already handles gsd-core config |
| Rewriting v1.0 Claude Code hooks | v1.0 hooks remain; v1.1 adds runtime adapters alongside them |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ADV-01 | Phase 4 | Pending |
| ADV-02 | Phase 4 | Pending |
| MULTI-01 | Phase 5 | Pending |
| MULTI-02 | Phase 5 | Pending |
| FEAT-07 | Phase 6 | Pending |
| FEAT-08 | Phase 6 | Pending |
| DOCS-01 | Phase 7 | Pending |
| FEAT-07 (deploy) | Phase 8 | Pending |
| FEAT-08 (deploy) | Phase 8 | Pending |

**Coverage:**

- v1.1 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-10*
*Last updated: 2026-06-10 — v1.1 traceability mapped to Phases 4-6*
