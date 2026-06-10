# Roadmap: gsd-hooks

**Core Value:** GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.

---

## Milestones

- ✅ **v1.0 Rate-Limit Resilience & Economy** — Phases 1-3 (shipped 2026-06-09)
- 🚧 **v1.1 Multi-Runtime & Workflow Enhancements** — Phases 4-7 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 Rate-Limit Resilience & Economy (Phases 1-3) — SHIPPED 2026-06-09</summary>

**Total v1 Requirements:** 21

- [x] **Phase 1: Economy & Rate-Limit Layer** — Economy toggle, 429 recovery hook, and phase pacing — the self-healing core (3/3 plans, completed 2026-06-09)
- [x] **Phase 2: Feature Workflow Skill** — /gsd-feature lightweight workflow running without a milestone setup (1/1 plan, completed 2026-06-09)
- [x] **Phase 3: NPX Installer & Package Wiring** — npx entry point that detects gsd-core and wires everything into place (2/2 plans, completed 2026-06-09)

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

### 🚧 v1.1 Multi-Runtime & Workflow Enhancements (In Progress)

**Milestone Goal:** Extend gsd-hooks beyond Claude Code with smarter pacing/recovery and richer `/gsd-feature` workflow — while keeping the self-healing rate-limit core intact.

**Total v1.1 Requirements:** 7

- [ ] **Phase 4: Advanced Pacing** — Per-project phase delay config and exponential 429 backoff within a session
- [ ] **Phase 5: Multi-Runtime Support** — Economy and 429 recovery hooks ported to Gemini CLI and Codex
- [ ] **Phase 6: Feature Workflow Enhancements** — `/gsd-feature --ship` auto-PR and per-project feature history log
- [ ] **Phase 7: Package Documentation** — README.md with install and usage docs for all supported runtimes

---

## Phase Details

### Phase 4: Advanced Pacing
**Goal**: Users can tune phase pacing per project and recover smarter from repeated rate limits within a session
**Depends on**: Phase 3 (v1.0 hooks shipped)
**Requirements**: ADV-01, ADV-02
**Success Criteria** (what must be TRUE):
  1. User can set `hooks.phase_delay_secs` in `.planning/config.json` and phase pacing between GSD phases uses that value
  2. Per-project `hooks.phase_delay_secs` overrides the `GSD_PHASE_DELAY_SECS` env default when set; setting it to `0` disables pacing for that project
  3. First 429 in a session triggers a 60s cooldown before retry (existing behavior preserved)
  4. Second 429 in the same session triggers a 120s cooldown; third and subsequent 429s trigger 240s (capped)
  5. A new session resets backoff to 60s — backoff does not persist across sessions
**Plans**: TBD

### Phase 5: Multi-Runtime Support
**Goal**: Users running GSD on Gemini CLI and Codex get the same self-healing economy and 429 recovery without manual hook wiring
**Depends on**: Phase 4
**Requirements**: MULTI-01, MULTI-02
**Success Criteria** (what must be TRUE):
  1. Gemini CLI user can install gsd-hooks via npx and economy mode activates/deactivates on BeforeAgent/AfterAgent events
  2. Gemini CLI user hitting a 429 gets automatic economy activation and cooldown — no manual intervention required
  3. Codex user can install gsd-hooks via npx with SubagentStop hook wired for 429 recovery
  4. Codex user hitting a 429 gets automatic economy activation and cooldown — same self-healing behavior as Claude Code
  5. Multi-runtime installs are idempotent and write restore snapshots before mutating runtime config (same safety guarantees as v1.0 installer)
**Plans**: TBD

### Phase 6: Feature Workflow Enhancements
**Goal**: Users can ship feature work as PRs automatically and review a history of all feature runs in a project
**Depends on**: Phase 5
**Requirements**: FEAT-07, FEAT-08
**Success Criteria** (what must be TRUE):
  1. User can run `/gsd-feature "<description>" --ship` and a PR is created automatically after execute+verify completes successfully
  2. When execute+verify does not pass, `--ship` exits without creating a PR and reports why shipping was skipped
  3. Each `/gsd-feature` run appends an entry to a project feature history log with slug, date, and completion status
  4. User can read the feature history log to see all past feature runs in the project without opening individual feature directories
**Plans**: TBD

### Phase 7: Package Documentation
**Goal**: New users can install, configure, and use gsd-hooks on any supported runtime from README alone
**Depends on**: Phase 6
**Requirements**: DOCS-01
**Success Criteria** (what must be TRUE):
  1. README.md exists at project root with a clear package overview and core value proposition
  2. README documents npx install steps for Claude Code, Gemini CLI, and Codex with runtime-specific hook wiring notes
  3. README explains economy mode, 429 recovery, phase pacing, and exponential backoff behavior
  4. README documents `/gsd-feature` usage including `--ship` and where feature artifacts/history are stored
  5. README includes configuration reference for `hooks.phase_delay_secs`, `GSD_PHASE_DELAY_SECS`, and economy toggle commands
**Plans**: TBD

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Economy & Rate-Limit Layer | v1.0 | 3/3 | Complete | 2026-06-09 |
| 2. Feature Workflow Skill | v1.0 | 1/1 | Complete | 2026-06-09 |
| 3. NPX Installer & Package Wiring | v1.0 | 2/2 | Complete | 2026-06-09 |
| 4. Advanced Pacing | v1.1 | 0/TBD | Not started | - |
| 5. Multi-Runtime Support | v1.1 | 0/TBD | Not started | - |
| 6. Feature Workflow Enhancements | v1.1 | 0/TBD | Not started | - |
| 7. Package Documentation | v1.1 | 0/TBD | Not started | - |

---

*Roadmap created: 2026-06-08*
*Last updated: 2026-06-10 — v1.1 milestone roadmap (Phases 4-7)*
