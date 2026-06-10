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
| MULTI-01 | — | Pending |
| MULTI-02 | — | Pending |
| ADV-01 | — | Pending |
| ADV-02 | — | Pending |
| FEAT-07 | — | Pending |
| FEAT-08 | — | Pending |

**Coverage:**

- v1.1 requirements: 6 total
- Mapped to phases: 0
- Unmapped: 6 ⚠️

---
*Requirements defined: 2026-06-10*
*Last updated: 2026-06-10 — v1.1 milestone requirements defined*
