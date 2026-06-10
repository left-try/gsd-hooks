# Roadmap: gsd-hooks

**Core Value:** GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.

---

## Milestones

- ✅ **v1.0 Rate-Limit Resilience & Economy** — Phases 1-3 (shipped 2026-06-09)
- ✅ **v1.1 Multi-Runtime & Workflow Enhancements** — Phases 4-8 (shipped 2026-06-10)
- 🚧 **v1.2 Hardening & Publish Polish** — Phases 9-11 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 Rate-Limit Resilience & Economy (Phases 1-3) — SHIPPED 2026-06-09</summary>

- [x] **Phase 1: Economy & Rate-Limit Layer** (3/3 plans)
- [x] **Phase 2: Feature Workflow Skill** (1/1 plan)
- [x] **Phase 3: NPX Installer & Package Wiring** (2/2 plans)

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.1 Multi-Runtime & Workflow Enhancements (Phases 4-8) — SHIPPED 2026-06-10</summary>

- [x] **Phase 4: Advanced Pacing** (2/2 plans)
- [x] **Phase 5: Multi-Runtime Support** (3/3 plans)
- [x] **Phase 6: Feature Workflow Enhancements** (2/2 plans)
- [x] **Phase 7: Package Documentation** (1/1 plan)
- [x] **Phase 8: Deploy Feature Libs** (1/1 plan)

See `.planning/milestones/v1.1-ROADMAP.md` for full phase details.

</details>

### 🚧 v1.2 Hardening & Publish Polish (In Progress)

**Milestone Goal:** Close v1.1 tech debt and ship a polished `0.1.1` npm release users can install reliably.

**Total v1.2 Requirements:** 6

- [ ] **Phase 9: Gemini Test Hardening** — `gsd-gemini-after` integration test + README doc guard
- [ ] **Phase 10: Phase 5 Verification** — Retroactive `05-VERIFICATION.md` for multi-runtime support
- [ ] **Phase 11: npm 0.1.1 Publish Polish** — Package metadata, version bump, GitHub install fallback

---

## Phase Details

### Phase 9: Gemini Test Hardening

**Goal**: Gemini CLI 429 recovery path has the same automated test coverage as Codex and README documents both hooks
**Depends on**: Phase 5 (v1.1 multi-runtime shipped)
**Requirements**: TEST-01, DOCS-02
**Success Criteria** (what must be TRUE):

  1. `test/gsd-gemini-after.test.js` exists and passes — 429 transcript creates `economy.lock` in isolated temp project
  2. Test covers no-transcript-path no-op path (no false economy activation)
  3. `test/readme.test.js` required tokens include `gsd-gemini-after`
  4. Full `npm test` suite passes with new tests included

**Plans**: 1 plan

Plans:

- [ ] 09-01-PLAN.md — gsd-gemini-after integration test + readme.test.js token (TEST-01, DOCS-02)

### Phase 10: Phase 5 Verification

**Goal**: Phase 5 multi-runtime support has formal verification artifact matching Phases 4, 6, 7
**Depends on**: Phase 9
**Requirements**: VERIFY-01
**Success Criteria** (what must be TRUE):

  1. `.planning/phases/05-multi-runtime-support/05-VERIFICATION.md` exists with `status: passed`
  2. Document lists MULTI-01 and MULTI-02 success criteria with checkmarks
  3. Evidence cites `npm test` results including Gemini installer tests and Codex guard tests
  4. Notes TEST-01 as closure of prior MULTI-01 partial status

**Plans**: 1 plan

Plans:

- [ ] 10-01-PLAN.md — Retroactive 05-VERIFICATION.md with test evidence (VERIFY-01)

### Phase 11: npm 0.1.1 Publish Polish

**Goal**: Users can install a clean, documented `gsd-hooks@0.1.1` from npm or GitHub without tarball bloat or missing metadata
**Depends on**: Phase 10
**Requirements**: PUB-01, PUB-02, PUB-03
**Success Criteria** (what must be TRUE):

  1. `package.json` has `files` whitelist and `repository` field committed; `npm pack --dry-run` excludes `.planning/`
  2. Version is `0.1.1` in `package.json`; README pin documents `npx gsd-hooks@0.1.1`
  3. README includes GitHub install fallback: `npx github:left-try/gsd-hooks`
  4. `test/readme.test.js` guards GitHub fallback string (if added to required tokens)

**Plans**: 1 plan

Plans:

- [ ] 11-01-PLAN.md — Package metadata commit, 0.1.1 bump, README GitHub fallback (PUB-01, PUB-02, PUB-03)

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–8 | v1.0–v1.1 | 15/15 | Complete | 2026-06-10 |
| 9. Gemini Test Hardening | v1.2 | 0/1 | Not started | - |
| 10. Phase 5 Verification | v1.2 | 0/1 | Not started | - |
| 11. npm 0.1.1 Publish Polish | v1.2 | 0/1 | Not started | - |

---

*Roadmap created: 2026-06-08*
*Last updated: 2026-06-11 — v1.2 milestone roadmap (Phases 9-11)*
