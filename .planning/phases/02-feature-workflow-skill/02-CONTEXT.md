# Phase 2: Feature Workflow Skill — Context

**Gathered:** 2026-06-09
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped — plan-execute-all mode)

<domain>
## Phase Boundary

Users can develop and ship isolated features without needing a milestone or ROADMAP.md

</domain>

<decisions>
## Implementation Decisions

All implementation choices are at Claude's discretion. Use ROADMAP phase goal,
success criteria, and codebase conventions to guide decisions.

Key architectural constraints from CLAUDE.md and Phase 1 patterns:
- Node.js for all hooks (not shell scripts) — cross-platform Windows/Git Bash compatibility
- Skill file format: SKILL.md in `.claude/skills/<skill-name>/` directory (gsd-core convention)
- Economy settings are injected per-invocation in `/gsd-feature` — NOT written to .planning/config.json permanently
- Phase 1 lock file (`.planning/economy.lock`) is available for reuse to signal economy state
- Feature artifacts must be fully isolated under `.planning/features/<slug>/` — no milestone state touched
- The discuss step is a separate step (2-3 targeted questions); plan is spawned from CONTEXT.md directly
- Execute+verify is collapsed into a single inline agent pass (no separate verifier subagent)
- No researcher, no plan-checker, no code-review within the feature workflow per-invocation

</decisions>

<code_context>
## Existing Code Insights

Phase 1 delivered:
- `hooks/gsd-economy.js` — exports `activate()` / `deactivate()` (require-safe, module.exports)
- `.planning/economy.lock` — presence/absence signals economy state; readable without parsing config
- `presets/economy.json` — economy config diff (model_profile: budget, max_concurrent_agents: 1)

The `/gsd-feature` skill will be a Claude Code skill in SKILL.md format. gsd-core skills are installed
to `~/.claude/plugins/` (handled by Phase 3 installer). For this phase, the skill lives at:
`.claude/skills/gsd-feature/SKILL.md`

The skill needs to implement a 3-step workflow:
1. **Discuss** — ask 2-3 targeted questions, write CONTEXT.md to `.planning/features/<slug>/`
2. **Plan** — spawn gsd-planner-style inline planning directly from CONTEXT.md
3. **Execute+Verify** — run tasks inline in one agent pass with a lightweight verify at end

Budget model settings for per-invocation use (not written to disk):
- model_profile: budget
- max_concurrent_agents: 2 (slightly more than economy mode's 1)
- code_review: false, nyquist_validation: false, plan_check: false, verifier: false

</code_context>

<specifics>
## Specific Requirements

See ROADMAP success criteria:
- Invoking `/gsd-feature "<description>"` starts a structured workflow with no ROADMAP.md or milestone state present
- After the discuss step, a CONTEXT.md file exists under `.planning/features/<slug>/` capturing answers to 2-3 targeted questions
- After the plan step, a plan artifact exists under `.planning/features/<slug>/` created directly from CONTEXT.md — no researcher or plan-checker spawned
- The execute+verify step completes inline in one agent pass; no separate verifier subagent is spawned
- Feature artifacts live entirely under `.planning/features/<slug>/` and the active milestone's ROADMAP.md and phase state files are unchanged

Requirements coverage: FEAT-01, FEAT-02, FEAT-03, FEAT-04, FEAT-05, FEAT-06

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
