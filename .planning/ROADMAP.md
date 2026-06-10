# Roadmap: gsd-hooks

**Core Value:** GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.

---

## Milestones

- ✅ **v1.0 Rate-Limit Resilience & Economy** — Phases 1-3 (shipped 2026-06-09)
- ✅ **v1.1 Multi-Runtime & Workflow Enhancements** — Phases 4-8 (shipped 2026-06-10)

---

## Phases

<details>
<summary>✅ v1.0 Rate-Limit Resilience & Economy (Phases 1-3) — SHIPPED 2026-06-09</summary>

- [x] **Phase 1: Economy & Rate-Limit Layer** — Economy toggle, 429 recovery hook, and phase pacing (3/3 plans)
- [x] **Phase 2: Feature Workflow Skill** — `/gsd-feature` lightweight workflow (1/1 plan)
- [x] **Phase 3: NPX Installer & Package Wiring** — `npx gsd-hooks` installer (2/2 plans)

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.1 Multi-Runtime & Workflow Enhancements (Phases 4-8) — SHIPPED 2026-06-10</summary>

- [x] **Phase 4: Advanced Pacing** — Per-project `hooks.phase_delay_secs` + exponential 429 backoff (2/2 plans)
- [x] **Phase 5: Multi-Runtime Support** — Gemini CLI and Codex hook adapters (3/3 plans)
- [x] **Phase 6: Feature Workflow Enhancements** — `--ship` auto-PR + feature history log (2/2 plans)
- [x] **Phase 7: Package Documentation** — Multi-runtime README and doc tests (1/1 plan)
- [x] **Phase 8: Deploy Feature Libs** — Skill install syncs feature libs to plugin dir (1/1 plan)

See `.planning/milestones/v1.1-ROADMAP.md` for full phase details.

</details>

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Economy & Rate-Limit Layer | v1.0 | 3/3 | Complete | 2026-06-09 |
| 2. Feature Workflow Skill | v1.0 | 1/1 | Complete | 2026-06-09 |
| 3. NPX Installer & Package Wiring | v1.0 | 2/2 | Complete | 2026-06-09 |
| 4. Advanced Pacing | v1.1 | 2/2 | Complete | 2026-06-10 |
| 5. Multi-Runtime Support | v1.1 | 3/3 | Complete | 2026-06-10 |
| 6. Feature Workflow Enhancements | v1.1 | 2/2 | Complete | 2026-06-10 |
| 7. Package Documentation | v1.1 | 1/1 | Complete | 2026-06-10 |
| 8. Deploy Feature Libs | v1.1 | 1/1 | Complete | 2026-06-10 |

---

*Roadmap created: 2026-06-08*
*Last updated: 2026-06-11 — v1.1 milestone shipped*
