# Requirements: gsd-hooks

**Defined:** 2026-06-11
**Core Value:** GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.

## v1.2 Requirements

Requirements for milestone v1.2. Each maps to roadmap phases.

### Test Hardening

- [x] **TEST-01**: `gsd-gemini-after` runtime integration test verifies 429 transcript triggers economy.lock (parity with `gsd-codex-429-guard.test.js`)
- [x] **DOCS-02**: `test/readme.test.js` asserts `gsd-gemini-after` is documented in README

### Verification Debt

- [x] **VERIFY-01**: Formal `05-VERIFICATION.md` retroactively documents Phase 5 multi-runtime success criteria with test evidence

### Publish Polish

- [x] **PUB-01**: `package.json` publish metadata committed (`files` whitelist, `repository` field) — no `.planning/` in npm tarball
- [x] **PUB-02**: Version bumped to `0.1.1` with README install pin updated
- [x] **PUB-03**: README documents GitHub install fallback (`npx github:left-try/gsd-hooks`) for users without npm access

## Future Requirements

Deferred beyond v1.2.

### Additional Runtimes

- **MULTI-03**: Cursor IDE hook integration (if/when stable hook API available)

### Observability

- **OBS-01**: Dashboard or CLI summary of rate-limit events and economy activations across sessions

## Out of Scope

| Feature | Reason |
|---------|--------|
| New runtime adapters | Hardening milestone only — Cursor deferred to future milestone |
| Feature workflow changes | `/gsd-feature` shipped in v1.1; no new feature scope |
| Token counting / cost estimation | Unchanged from v1.0/v1.1 out-of-scope |
| Scope migration to `@opengsd` | User lacks org access; stay on `gsd-hooks` |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 9 | Complete |
| DOCS-02 | Phase 9 | Complete |
| VERIFY-01 | Phase 10 | Complete |
| PUB-01 | Phase 11 | Complete |
| PUB-02 | Phase 11 | Complete |
| PUB-03 | Phase 11 | Complete |

**Coverage:**

- v1.2 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-11*
*Last updated: 2026-06-11 — v1.2 traceability mapped to Phases 9-11*
