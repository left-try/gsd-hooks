# Roadmap: gsd-hooks

**Milestone:** v1 — Rate-limit resilience, economy mode, feature workflow, npx installer
**Core Value:** GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.
**Granularity:** Coarse
**Total v1 Requirements:** 21

---

## Phases

- [x] **Phase 1: Economy & Rate-Limit Layer** - Economy toggle, 429 recovery hook, and phase pacing — the self-healing core (completed 2026-06-09)
- [x] **Phase 2: Feature Workflow Skill** - /gsd-feature lightweight workflow running without a milestone setup (completed 2026-06-09)
- [ ] **Phase 3: NPX Installer & Package Wiring** - npx entry point that detects gsd-core and wires everything into place

---

## Phase Details

### Phase 1: Economy & Rate-Limit Layer

**Goal**: GSD sessions self-recover from rate limits and run without burst-induced crashes
**Depends on**: Nothing (first phase)
**Requirements**: ECON-01, ECON-02, ECON-03, ECON-04, RATE-01, RATE-02, RATE-03, RATE-04, PACE-01, PACE-02
**Success Criteria** (what must be TRUE):

  1. Running `gsd-economy --on` switches the project to budget model and 1-agent config; running `gsd-economy --off` fully restores original settings — no manual config editing required
  2. When a 429 response appears in a session transcript, the Stop/SubagentStop hook automatically activates economy mode and pauses for 60 seconds before the next phase can trigger
  3. A `gsd-plan-execute-all` chain running in normal mode waits at least 15 seconds between phase triggers, and that gap is skippable via environment variable override
  4. Economy state is always readable by hooks without parsing config (lock file present/absent is sufficient signal)
  5. Every 429 event is logged with a timestamp so the user can review frequency after a session

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Package scaffold, economy preset, and config patch/restore CLI (gsd-economy.js)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — 429 guard hook: transcript scan, economy activation, 60s cooldown, rate-limit logging
- [x] 01-03-PLAN.md — Phase pacer hook: configurable inter-phase delay with economy-mode bypass

### Phase 2: Feature Workflow Skill

**Goal**: Users can develop and ship isolated features without needing a milestone or ROADMAP.md
**Depends on**: Phase 1 (economy settings applied per-invocation; lock file detection reused)
**Requirements**: FEAT-01, FEAT-02, FEAT-03, FEAT-04, FEAT-05, FEAT-06
**Success Criteria** (what must be TRUE):

  1. Invoking `/gsd-feature "<description>"` starts a structured workflow with no ROADMAP.md or milestone state present
  2. After the discuss step, a CONTEXT.md file exists under `.planning/features/<slug>/` capturing answers to 2-3 targeted questions
  3. After the plan step, a plan artifact exists under `.planning/features/<slug>/` created directly from CONTEXT.md — no researcher or plan-checker spawned
  4. The execute+verify step completes inline in one agent pass; no separate verifier subagent is spawned
  5. Feature artifacts live entirely under `.planning/features/<slug>/` and the active milestone's ROADMAP.md and phase state files are unchanged

**Plans**: 1 plan
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Create .claude/skills/gsd-feature/SKILL.md with full 3-step feature workflow (FEAT-01 through FEAT-06)

### Phase 3: NPX Installer & Package Wiring

**Goal**: Users can install all hooks and the feature skill onto any gsd-core setup with a single npx command
**Depends on**: Phase 1, Phase 2 (installs what was built)
**Requirements**: INST-01, INST-02, INST-03, INST-04, INST-05
**Success Criteria** (what must be TRUE):

  1. Running `npx @<scope>/gsd-hooks@latest` on a machine with gsd-core installed completes without error and requires no global npm install
  2. After install, `~/.claude/settings.json` contains Stop and SubagentStop hook registrations pointing to gsd-phase-pacer and gsd-429-guard
  3. After install, the `/gsd-feature` skill file is present under `~/.claude/plugins/`
  4. Re-running the installer on an already-configured machine does not add duplicate hook entries or overwrite the existing skill
  5. The installer prints a human-readable summary listing each action taken (what was wired, what was already present, where files were copied)

**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Economy & Rate-Limit Layer | 3/3 | Complete    | 2026-06-09 |
| 2. Feature Workflow Skill | 1/1 | Complete    | 2026-06-09 |
| 3. NPX Installer & Package Wiring | 0/? | Not started | - |

---

*Roadmap created: 2026-06-08*
*Last updated: 2026-06-09 after Phase 2 planning*
