# Phase 6: Feature Workflow Enhancements — Context

**Gathered:** 2026-06-10
**Status:** Ready for planning
**Mode:** Auto-generated from ROADMAP (discuss skipped via orchestrator directive)

<domain>
## Phase Boundary

Users can ship feature work as PRs automatically and review a history of all feature runs in a project.

Success criteria (from ROADMAP):

1. User can run `/gsd-feature "<description>" --ship` and a PR is created automatically after execute+verify completes successfully
2. When execute+verify does not pass, `--ship` exits without creating a PR and reports why shipping was skipped
3. Each `/gsd-feature` run appends an entry to a project feature history log with slug, date, and completion status
4. User can read the feature history log to see all past feature runs in the project without opening individual feature directories

Requirements: FEAT-07, FEAT-08

</domain>

<decisions>
## Implementation Decisions

### D-01 — History log location

**Locked:** Per-project feature history lives at `.planning/features/HISTORY.md` (markdown table, human-readable).

### D-02 — History entry fields

**Locked:** Each append adds one table row with: `date` (YYYY-MM-DD), `slug`, `status` (`complete` | `incomplete`), `description` (first 80 chars of feature description), `pr` (PR URL or `—` when not shipped).

### D-03 — History append timing

**Locked:** Append exactly once at the end of Step 4 (after verification table and SUMMARY.md written). Do not append at bootstrap.

### D-04 — Ship gate

**Locked:** `--ship` creates a PR only when inline verification `Overall: PASS` and SUMMARY.md `Status: complete`. Any failed criterion blocks PR creation with an explicit skip reason listing failed criteria.

### D-05 — Feature branch naming

**Locked:** When `--ship` needs a branch (user on base branch), create/checkout `feature/{slug}` before commit and push.

### D-06 — Ship preflight

**Locked:** Follow gsd-ship preflight adapted for features: `gh` CLI available and authenticated, `origin` remote configured, uncommitted feature changes committed before push (single commit message `feat({slug}): {description truncated to 72 chars}`). Do not modify ROADMAP.md or STATE.md.

### D-07 — Flag parsing

**Locked:** `--ship` and `--economy` are independent optional flags; both may appear in any order after the description string. Strip flag tokens before deriving DESCRIPTION and SLUG.

### Claude's Discretion

- PR body section structure (mirror gsd-ship richness using feature PLAN.md, CONTEXT.md, SUMMARY.md)
- Whether to extract ship/history helpers into `lib/feature-ship.js` / `lib/feature-history.js` vs inline-only in SKILL.md (prefer small testable libs matching existing `hooks/lib/` patterns)
- Base branch detection (reuse gsd-ship pattern: config git.base_branch → origin/HEAD → main)

</decisions>

<code_context>
## Existing Code Insights

- `.claude/skills/gsd-feature/SKILL.md` — v1.0 workflow: discuss → plan → execute+verify; `--economy` flag only; HARD CONSTRAINT forbids writes to ROADMAP.md, STATE.md, `.planning/phases/`
- Feature artifacts: `.planning/features/{slug}/CONTEXT.md`, `PLAN.md`, `SUMMARY.md`
- `@$HOME/.claude/gsd-core/workflows/ship.md` — PR preflight, body generation, `gh pr create` pattern to adapt for features
- `bin/install.js` copies SKILL.md to `~/.claude/plugins/gsd-feature/SKILL.md` — skill changes ship via installer copy
- Test pattern: Node built-in test runner, isolated temp dirs (`test/install.test.js`, `test/gsd-phase-pacer.test.js`)

</code_context>

<specifics>
## Specific Ideas

- FEAT-08 → `lib/feature-history.js` + SKILL.md Step 4 append + `test/feature-history.test.js`
- FEAT-07 → `lib/feature-ship.js` + SKILL.md Step 5 ship + `test/feature-ship.test.js`
- Phase 7 README will document HISTORY.md location and `--ship` usage — no README in this phase

</specifics>

<deferred>
## Deferred Ideas

- `/gsd-feature resume` ship/history integration (resume mentioned in skill collision message but not in FEAT-07/08 scope)
- Auto-request code review on feature PRs (gsd-ship optional review flow)
- JSON/CLI `gsd-feature history` command (HISTORY.md read is sufficient per success criteria)

</deferred>
