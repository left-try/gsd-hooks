---
phase: 02-feature-workflow-skill
reviewed: 2026-06-09T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - .claude/skills/gsd-feature/SKILL.md
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-09
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Reviewed `.claude/skills/gsd-feature/SKILL.md` — the `/gsd-feature` Claude Code skill implementing the 3-step lightweight feature workflow (discuss → plan → execute+verify).

The skill is well-structured and covers the core isolation contract (artifacts limited to `.planning/features/<slug>/`, no milestone state touched). The security notes are present and the slug sanitization logic is sound in effect. However, one critical logic flaw undermines the stated security guarantee for path-traversal detection, and several behavioral gaps could cause confusing or broken user-facing outcomes. The `--economy` flag parsing also introduces a dead variable and an edge-case description-corruption risk.

---

## Critical Issues

### CR-01: Path-traversal check (steps 6–7 of slug derivation) can never trigger — security claim is misleading

**File:** `.claude/skills/gsd-feature/SKILL.md:61-68`

**Issue:** The slug derivation steps are ordered as: (1) lowercase, (2) replace chars not in `[a-z0-9]` with `-`, (3) collapse consecutive `-`, (4) strip leading/trailing `-`, (5) truncate to 60 chars, (6) reject if result contains `..` or `/`, (7) reject if empty. Step 2 already replaces `.` and `/` with `-`. By the time steps 6 and 7 execute, the string can only contain `[a-z0-9-]` — neither `..` nor `/` can survive to be detected. Steps 6 and 7 are dead checks.

The `<security_notes>` section (line 350) and the STRIDE entry T-02-01 (line 356) both claim `..`/`/` rejection as an active mitigation. This is factually wrong: the characters are neutralised in step 2 but the explicit rejection never fires. Any future reader who moves the truncation before the replacement (a plausible refactor) would silently lose all path-traversal protection with no runtime gate remaining.

**Fix:** Either (a) move the `..`/`/` rejection to run against the raw, pre-sanitized description *before* step 2, so it catches literal path-traversal attempts as early as possible and the intent is clearly a defence-in-depth gate:

```
Derive SLUG from DESCRIPTION:
1. If DESCRIPTION contains ".." or "/", output "Invalid feature description — slug cannot contain path traversal." and stop.
2. Lowercase the entire string
3. Replace any character not in [a-z0-9] with "-"
4. Collapse multiple consecutive "-" into one
5. Strip leading and trailing "-"
6. Truncate to 60 characters
7. If result is empty after sanitization, output "Invalid feature description — could not derive a valid slug." and stop
```

Or (b) update `<security_notes>` to accurately state that `.` and `/` are neutralised by character replacement (step 2), not by an explicit post-truncation rejection gate, and remove the dead steps 6-7 to avoid misleading future maintainers.

---

## Warnings

### WR-01: `resume` subcommand advertised in collision message but not implemented

**File:** `.claude/skills/gsd-feature/SKILL.md:82`

**Issue:** When a feature slug already exists, the skill displays: `"Feature '${SLUG}' already exists at ${FEATURE_DIR}. Use /gsd-feature resume ${SLUG} to continue."` — but the `<process>` block contains no `resume` subcommand handler and the `argument-hint` frontmatter does not list `resume`. A user who follows this instruction will have `/gsd-feature resume <slug>` interpreted as a new feature with DESCRIPTION = `"resume <slug>"`, producing a new (wrong) slug and creating an unintended feature directory rather than resuming the intended one.

**Fix:** Either implement the `resume` subcommand in Step 1 argument parsing (check if `$ARGUMENTS` starts with `resume `, extract the slug, skip Discuss and Plan, go directly to Step 4 reading existing PLAN.md), or change the collision message to remove the false instruction:

```
Feature '<SLUG>' already exists at <FEATURE_DIR>.
To continue, open <FEATURE_DIR>/PLAN.md and re-invoke manually,
or delete the directory and re-run /gsd-feature.
```

Also update the `argument-hint` to include `[resume <slug>]` if the subcommand is implemented.

---

### WR-02: `Stop` option at plan-review checkpoint references a summary that does not yet exist

**File:** `.claude/skills/gsd-feature/SKILL.md:242`

**Issue:** The Step 3 plan-review checkpoint offers `"Stop" — print summary and exit`. At this point in the workflow, no SUMMARY.md has been written (that only happens in Step 4 after execution). There is no artifact to summarise and no instruction on what to display. The agent has no defined fallback and will improvise or print nothing useful.

The same gap exists if `handle_blocker`'s "Stop" option fires during Steps 1, 2, or 3: line 334 says "exit with current SUMMARY.md state" but SUMMARY.md does not yet exist at those stages.

**Fix:** Define the pre-execution stop behaviour explicitly. For the Step 3 checkpoint:

```
- "Stop" — write a minimal SUMMARY.md to ${FEATURE_DIR}/SUMMARY.md with:
  Status: abandoned-before-execution
  Files Created/Modified: none
  Verification: not run
  Then exit.
```

For `handle_blocker`, qualify the stop option by stage:

```
- "Stop" — if SUMMARY.md already exists (Steps 4+), exit with current state.
  If not yet in Step 4, write a stub SUMMARY.md with status: abandoned-at-step-{N} and exit.
```

---

### WR-03: Bash snippets used for economy-lock check and directory operations violate the project's Windows/Node.js constraint

**File:** `.claude/skills/gsd-feature/SKILL.md:71-73, 79-81, 85-87`

**Issue:** `CLAUDE.md` states: "Windows support: Hooks run in Node.js (not bash) to work on Windows/Git Bash where shell hooks behave differently." The skill embeds POSIX bash syntax at three points in Step 1:

- Economy lock check: `ECONOMY_ACTIVE=false; if [ -f ".planning/economy.lock" ]; then ECONOMY_ACTIVE=true; fi`
- Collision check: `if [ -d "${FEATURE_DIR}" ]; then echo "exists"; fi`
- Directory creation: `mkdir -p "${FEATURE_DIR}"`

While these snippets are instructions to the Claude agent (not executed hooks), the `Bash` tool is in `allowed-tools` and the agent will use it to run these commands. On Windows without WSL, `[ -f ... ]` in Git Bash may behave inconsistently and `mkdir -p` may fail on paths with backslash separators. Existing Phase 1 hooks are Node.js scripts specifically to avoid this problem.

**Fix:** Replace the bash snippets with prose instructions that the agent should implement using `Bash` with POSIX-safe constructs or using the `Read`/`Glob` tools instead:

```
Check economy state using the Glob tool:
- If Glob(".planning/economy.lock") returns a result, set ECONOMY_ACTIVE=true
- Otherwise set ECONOMY_ACTIVE=false

Check if feature directory already exists using the Glob tool:
- If Glob("${FEATURE_DIR}/**") returns any result or Glob("${FEATURE_DIR}/") is non-empty, treat as exists

Create the feature directory using the Write tool (write a placeholder) or Bash with:
  mkdir -p "${FEATURE_DIR}" (POSIX) — note: on Windows, use the Write tool to create
  the first file in the directory instead of mkdir -p
```

---

### WR-04: `--economy` flag inside a feature description string corrupts DESCRIPTION

**File:** `.claude/skills/gsd-feature/SKILL.md:52`

**Issue:** The parsing instruction says: "If `$ARGUMENTS` contains `--economy`, set `ECONOMY_FLAG=true` and remove the flag token from the description string." This uses a substring match, not a token-boundary match. A user running `/gsd-feature "add --economy toggle to settings"` would have `--economy` stripped from the middle of the description, yielding DESCRIPTION = `"add  toggle to settings"` (double space, corrupted intent). The resulting slug `add-toggle-to-settings` silently discards the word "economy" from the feature name.

**Fix:** Match `--economy` only when it appears as a standalone whitespace-delimited token:

```
If $ARGUMENTS, after trimming, ends with " --economy" or equals "--economy",
set ECONOMY_FLAG=true and strip the trailing " --economy" token.
If "--economy" appears elsewhere in the string, treat the entire $ARGUMENTS as
DESCRIPTION (the flag is not present in a parseable position).
```

Alternatively, require the flag to appear only as a trailing token and document this in the `argument-hint`.

---

## Info

### IN-01: `ECONOMY_FLAG` variable is set but never referenced — dead variable

**File:** `.claude/skills/gsd-feature/SKILL.md:52`

**Issue:** Step 1 sets `ECONOMY_FLAG=true/false` based on `--economy` presence in `$ARGUMENTS`. This variable is never used in any subsequent step. The authoritative economy state is `ECONOMY_ACTIVE` (derived from `economy.lock` presence). `ECONOMY_FLAG` occupies cognitive space and implies it controls something, but it controls nothing. The `<objective>` block (line 33) confirms the flag is informational only.

**Fix:** Remove the `ECONOMY_FLAG` assignment entirely, or if it is intended for future use (e.g., a resume subcommand that respects an explicit flag), add a comment explaining its deferred purpose:

```
# ECONOMY_FLAG is recorded for informational display only.
# Authoritative economy state is ECONOMY_ACTIVE (economy.lock presence).
```

---

### IN-02: `argument-hint` does not reflect the `resume` behaviour advertised in the collision message

**File:** `.claude/skills/gsd-feature/SKILL.md:4`

**Issue:** The frontmatter `argument-hint` is `"<feature description> [--economy]"`. The collision error message at line 82 tells users to run `/gsd-feature resume ${SLUG}`, implying `resume <slug>` is a valid invocation form. The hint shown to users (e.g., in tab-completion or skill documentation) does not include this form, so the advertised usage is invisible in the hint. This is a lower-severity manifestation of the same gap as WR-01.

**Fix:** If `resume` is implemented (per WR-01 fix), update the hint:
```yaml
argument-hint: "<feature description> [--economy] | resume <slug>"
```
If `resume` is not implemented, this info item is resolved by fixing WR-01's collision message instead.

---

_Reviewed: 2026-06-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
