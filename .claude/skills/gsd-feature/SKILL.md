---
name: gsd-feature
description: "Develop and ship an isolated feature without a milestone or ROADMAP.md"
argument-hint: "<feature description> [--ship] [--economy]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Agent
  - AskUserQuestion
---

<objective>
Lightweight feature workflow — discuss → plan → execute+verify — for isolated features that don't require a milestone or ROADMAP.md.

**Artifact isolation:** All output lives under `.planning/features/<slug>/`. The files ROADMAP.md, STATE.md, and anything under `.planning/phases/` are NEVER touched by this skill.

**Pipeline stages skipped (per-invocation):** researcher, plan-checker, verifier, code-review. All planning and verification happens inline in the same agent pass.

**Per-invocation budget settings** (applied as inline context instructions — NOT written to `.planning/config.json`):
- `model_profile: budget`
- `max_concurrent_agents: 2`
- `code_review: false`
- `nyquist_validation: false`
- `plan_check: false`
- `verifier: false`

These settings govern only this feature run. No permanent config changes are made.

**`--economy` flag:** Informational only. Check `.planning/economy.lock` presence for authoritative economy state. If already active, log "Economy mode already active" and continue. If not active, per-invocation budget settings still apply regardless.
</objective>

<execution_context>
Workflow files are loaded on-demand in the <process> section below — not upfront.
Do not pre-load any workflow files before reading the mode routing instructions.
</execution_context>

<context>
$ARGUMENTS

Feature slug is derived from $ARGUMENTS (or the feature description portion of it).
Slug sanitization: strip chars not matching [a-z0-9-], lowercase, replace spaces and special chars with "-", collapse consecutive "-" into one, strip leading/trailing "-", max 60 chars, reject ".." and "/".
</context>

<process>

## Step 1 — Bootstrap

Parse `$ARGUMENTS` with the package flag parser (or equivalent inline logic matching `lib/feature-ship.js`):

```bash
node -e "const f=require('./lib/feature-ship'); console.log(JSON.stringify(f.parseFeatureFlags(process.argv[1])))" "$ARGUMENTS"
```

Set `DESCRIPTION`, `SHIP_FLAG`, and `ECONOMY_FLAG` from the result (`ship` → `SHIP_FLAG`, `economy` → `ECONOMY_FLAG`). If `DESCRIPTION` is empty after parsing, output usage and stop:

```
Usage: /gsd-feature "<feature description>" [--ship] [--economy]
Example: /gsd-feature "add dark mode toggle to settings page"
Example: /gsd-feature "fix login redirect" --ship
```

Derive `SLUG` from `DESCRIPTION`:
1. Lowercase the entire string
2. Replace any character not in `[a-z0-9]` with `-`
3. Collapse multiple consecutive `-` into one
4. Strip leading and trailing `-`
5. Truncate to 60 characters
6. If result contains `..` or `/`, output "Invalid feature description — slug cannot contain path traversal." and stop
7. If result is empty after sanitization, output "Invalid feature description — could not derive a valid slug." and stop

Check economy state:
```bash
ECONOMY_ACTIVE=false
if [ -f ".planning/economy.lock" ]; then ECONOMY_ACTIVE=true; fi
```

Set `FEATURE_DIR=.planning/features/${SLUG}`

Check if feature already exists:
```bash
if [ -d "${FEATURE_DIR}" ]; then echo "exists"; fi
```
If exists: display "Feature '${SLUG}' already exists at ${FEATURE_DIR}. Use /gsd-feature resume ${SLUG} to continue." and stop.

Create the feature directory:
```bash
mkdir -p "${FEATURE_DIR}"
```

Display startup banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► FEATURE: {DESCRIPTION truncated to 50 chars}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Slug:    {SLUG}
 Folder:  .planning/features/{SLUG}/
 Ship:    {SHIP_FLAG==true ? "on (auto-PR after verify)" : "off"}
 Economy: {ECONOMY_ACTIVE==true ? "on (economy.lock present)" : "off (per-invocation budget settings apply)"}
```

Print per-invocation budget notice (always, regardless of ECONOMY_ACTIVE):
```
◆ Per-invocation settings: model_profile=budget, max_concurrent_agents=2,
  code_review=false, nyquist_validation=false, plan_check=false, verifier=false
  (not written to .planning/config.json — these settings apply to this feature run only)
```

---

## Step 2 — Discuss

Print `◆ Step 2: Discuss — gathering feature context`

Generate 2-3 targeted clarifying questions based on `DESCRIPTION`. Questions must focus on:
1. **Scope / acceptance** — What does "done" look like? What is the single most important behavior?
2. **Constraints / stack** — Any specific library, pattern, or file this must follow or avoid?
3. **Edge cases** (optional, only if the description is ambiguous) — What should happen when X fails or X is missing?

Use `AskUserQuestion` to ask all questions in a single prompt. Format:

```
> Feature: {DESCRIPTION}
>
> Before planning, I need a few details:
>
> 1. {Question about scope/acceptance}
> 2. {Question about constraints/stack}
> [3. {Question about edge cases — only if warranted}]
```

Capture the user's answers. If the user's response is empty or "skip", proceed with defaults (derive best-guess answers from `DESCRIPTION` alone and note "User skipped discuss — defaults applied").

Write `${FEATURE_DIR}/CONTEXT.md` using the XML-section structure:

```markdown
# Feature: {DESCRIPTION} — Context

**Slug:** {SLUG}
**Gathered:** {today's date in YYYY-MM-DD}
**Status:** Ready for planning

<domain>
## Feature Scope

{DESCRIPTION — full description as provided}

</domain>

<decisions>
## Implementation Decisions

- Acceptance criterion: {answer to Q1}
- Stack/constraints: {answer to Q2}
- Edge cases: {answer to Q3 if asked, otherwise "N/A — not raised during discuss"}

</decisions>

<code_context>
## Codebase Context

{Scan the project root for relevant files related to DESCRIPTION using Glob/Grep.
List 3-5 most relevant existing files with one-line description of each.
If nothing relevant found, write "No existing code found for this feature domain."}

</code_context>

<specifics>
## Acceptance Criteria

{Derive 3-5 numbered acceptance criteria from the discuss answers and DESCRIPTION.
Each criterion must be a testable, observable behavior.}

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
```

Print `◆ CONTEXT.md written to ${FEATURE_DIR}/CONTEXT.md`

---

## Step 3 — Plan

Print `◆ Step 3: Plan — creating feature plan from CONTEXT.md`

Read `${FEATURE_DIR}/CONTEXT.md`.

Produce a `PLAN.md` inline (no researcher subagent, no plan-checker subagent). Write the plan to `${FEATURE_DIR}/PLAN.md` using this format:

```markdown
# Feature Plan: {DESCRIPTION}

**Slug:** {SLUG}
**Created:** {today's date}
**Economy:** per-invocation (budget model, 2 agents, no optional pipeline steps)

## Objective

{1-2 sentences: what the feature does and why it matters}

## Tasks

### Task 1: {Action-oriented name}

**Files:** {exact file paths to create or modify}
**Action:** {Specific implementation steps}
**Verify:** {Command or observable behavior that proves task is complete}
**Done:** {Acceptance criterion from CONTEXT.md that this task satisfies}

### Task 2: {Action-oriented name}

{same structure}

[Task 3 if needed — maximum 3 tasks total]

## Success Criteria

{Copy the numbered acceptance criteria from CONTEXT.md <specifics> section verbatim}

## Artifacts

- {List every file this plan creates or modifies}
```

Keep the plan to 2-3 tasks. Each task must be completable by Claude autonomously.

Print `◆ PLAN.md written to ${FEATURE_DIR}/PLAN.md`

Ask the user to review before execution:

> Feature plan created at ${FEATURE_DIR}/PLAN.md
>
> Ready to execute?

Options (use AskUserQuestion):
- **"Execute"** — continue to Step 4
- **"Edit plan first"** — pause; user edits PLAN.md manually; after user signals "done editing", continue to Step 4
- **"Stop"** — print summary and exit

---

## Step 4 — Execute + Verify

Print `◆ Step 4: Execute + Verify — running tasks inline`

Read `${FEATURE_DIR}/PLAN.md` to extract the task list.

Execute each task in sequence. For each task:
- Print `◆ Task {N}: {task name}`
- Use Read/Write/Edit/Bash/Glob/Grep as needed to implement the task
- After completing, print `◆ Task {N} done`

After all tasks complete, perform **inline self-verification** (no separate verifier subagent):

1. Re-read `${FEATURE_DIR}/CONTEXT.md` `<specifics>` section (the acceptance criteria)
2. For each criterion, verify it is satisfied:
   - Run the verify command from PLAN.md if one was given
   - Otherwise inspect the created/modified files directly
3. Build a verification table:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► FEATURE: {SLUG} ▸ VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Criterion 1: {text} — PASS / FAIL
Criterion 2: {text} — PASS / FAIL
...

Overall: PASS / FAIL ({N} of {M} criteria met)
```

Write a `SUMMARY.md` to `${FEATURE_DIR}/SUMMARY.md`:

```markdown
# Feature Summary: {DESCRIPTION}

**Slug:** {SLUG}
**Completed:** {today's date}
**Status:** {complete | incomplete}

## Files Created/Modified

{list}

## Verification

{copy the verification table}

## Deviations

{any deviation from PLAN.md, or "None"}
```

### Step 4b — Record history

After `SUMMARY.md` is written, append a row to the project feature history log (FEAT-08):

```bash
node -e "const h=require('./lib/feature-history'); h.appendHistoryEntry(process.cwd(), { slug: process.argv[1], status: process.argv[2], description: process.argv[3], pr: '—' });" "{SLUG}" "{complete|incomplete}" "{DESCRIPTION}"
```

- `status` is `complete` when Overall verification is PASS; otherwise `incomplete`.
- Print: `◆ History updated: .planning/features/HISTORY.md`
- The PR column is updated by Step 5 when `--ship` succeeds.

---

## Step 5 — Ship (optional, `--ship` only)

Skip this step entirely when `SHIP_FLAG` is false.

When `SHIP_FLAG` is true, run after Step 4b:

1. **Gate** — load `canShip` from `lib/feature-ship.js` with verification Overall result and `SUMMARY.md` status. If blocked, print `◆ Ship skipped: {reason}` and stop (no PR, no push).

2. **Preflight**
   - `gh --version` and `gh auth status` — if missing, print setup help and skip
   - `git remote -v` — require `origin`
   - If working tree dirty: stage and commit with message `feat({SLUG}): {description truncated to 72 chars}`

3. **Branch** — if current branch equals base (`resolveBaseBranch` from `lib/feature-ship.js`), create `feature/{SLUG}`

4. **Push** — `git push -u origin HEAD` (skip PR on failure)

5. **PR** — write body via `buildFeaturePrBody({ slug, description, featureDir })` to a temp file; run `gh pr create --title "Feature: {description}" --body-file {tmp} --base {BASE}`

6. **History** — on success, `updateHistoryPr(cwd, SLUG, prUrl)` and print PR URL

Never pass raw `DESCRIPTION` unquoted to shell; use `--body-file` for `gh pr create`.

---

Display final banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► FEATURE: {SLUG} ▸ DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Feature:   {DESCRIPTION}
 Artifacts: .planning/features/{SLUG}/
 History:   .planning/features/HISTORY.md
 Status:    {complete | incomplete — see SUMMARY.md for gaps}
```

If any criterion FAILED, ask the user:

> {N} verification criterion/criteria failed. How do you want to proceed?

Options:
- **"Retry failed tasks"** — re-run only the tasks whose criteria failed; re-verify after retry
- **"Accept as-is"** — mark complete with known gaps in SUMMARY.md
- **"Stop"** — leave SUMMARY.md with incomplete status for manual follow-up

---

## handle_blocker

When a step fails unexpectedly:
```
⚠ Step {N} — {description of failure}
```
Ask:
> How do you want to proceed?

Options:
- **"Retry"** — re-run the failed step (limit: 2 retries)
- **"Skip"** — log and continue to next step
- **"Stop"** — exit with current SUMMARY.md state

**HARD CONSTRAINT throughout all steps:** Never write to ROADMAP.md, STATE.md, or any file under `.planning/phases/`. Feature artifacts are isolated to `.planning/features/{SLUG}/` and `.planning/features/HISTORY.md` only. If any step would produce output outside this boundary, stop and report the conflict.

</process>

<notes>
- Feature artifacts live entirely in `.planning/features/<slug>/` — not tracked in ROADMAP.md or STATE.md
- Per-invocation economy settings are inline instructions to this agent instance, not disk writes — `.planning/config.json` is never modified
- The `--economy` flag is informational; `.planning/economy.lock` presence is the authoritative economy state signal
- No subagents are spawned for planning, plan-checking, or verification — all work happens inline in one pass (satisfies FEAT-03, FEAT-04)
- Slug collision (feature directory already exists) is reported as an error; use a different description or clean up the old directory
- This skill works with no ROADMAP.md present — there is no `require roadmap` gate (satisfies FEAT-01)
</notes>

<security_notes>
- Slugs from $ARGUMENTS are sanitized before use in any file path: only `[a-z0-9-]` characters allowed, max 60 chars, and the result must not contain `..` or `/`
- Directory existence check (`[ -d "${FEATURE_DIR}" ]`) uses the sanitized slug — never the raw $ARGUMENTS string
- File names from Glob/ls results are sanitized before display: strip non-printable chars and ANSI escape sequences using `name.replace(/[^\x20-\x7E]/g, '').replace(/[\/\\]/g, '')`
- Artifact content (feature descriptions, task names) is rendered as plain text only — never shell-executed or passed raw to Bash without explicit data boundaries
- PLAN.md and CONTEXT.md task content is read and acted on by this Claude instance only — no external subagent receives them
- ROADMAP.md and STATE.md are read-only within this skill — any code path that would write to them must stop and report an error (satisfies FEAT-06)
- T-02-01 (Slug injection via $ARGUMENTS): mitigated by `[a-z0-9-]` filter + `..`/`/` rejection before first file path use
- T-02-02 (Privilege escalation via ROADMAP/STATE writes): mitigated by HARD CONSTRAINT in every step + explicit prohibition in this section
- T-02-03 (ANSI injection via Glob output): mitigated by sanitization regex before display
</security_notes>
