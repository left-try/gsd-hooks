# Phase 2: Feature Workflow Skill — Pattern Map

**Mapped:** 2026-06-09
**Files analyzed:** 1 primary (`.claude/skills/gsd-feature/SKILL.md`) + 1 supporting (`hooks/gsd-feature-apply.js` may be needed)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.claude/skills/gsd-feature/SKILL.md` | skill (orchestrator) | request-response + event-driven | `~/.claude/skills/gsd-quick/SKILL.md` | exact (same 3-step: discuss → plan → execute) |

---

## Pattern Assignments

### `.claude/skills/gsd-feature/SKILL.md` (skill, request-response)

**Primary analog:** `C:\Users\Ivan\.claude\skills\gsd-quick\SKILL.md`
**Secondary analog:** `C:\Users\Ivan\.claude\skills\gsd-plan-execute-all\SKILL.md`

---

#### Frontmatter pattern (from `gsd-quick/SKILL.md` lines 1-14)

```yaml
---
name: gsd-feature
description: "Develop and ship an isolated feature without a milestone or ROADMAP.md"
argument-hint: "<feature description> [--economy] [--list] [--status <slug>]"
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
```

Key observations:
- `name` matches the slash-command name without the `/`
- `description` is a single quoted string, imperative phrasing
- `argument-hint` uses angle brackets for required args, square brackets for optional flags
- `allowed-tools` lists every tool the skill's inline process may call (not just subagent tools)
- `AskUserQuestion` is required whenever the skill asks the user anything (discuss step)
- `Agent` is required when the skill spawns subagents

---

#### `<objective>` block pattern (from `gsd-quick/SKILL.md` lines 16-40)

```markdown
<objective>
Execute small, ad-hoc tasks with GSD guarantees (atomic commits, STATE.md tracking).

Quick mode is the same system with a shorter path:
- Spawns gsd-planner (quick mode) + gsd-executor(s)
- Quick tasks live in `.planning/quick/` separate from planned phases
- Updates STATE.md "Quick Tasks Completed" table (NOT ROADMAP.md)

**Default:** Skips research, discussion, plan-checker, verifier. Use when you know exactly what to do.
...
</objective>
```

Pattern rules:
- First sentence is a one-line purpose statement
- Second paragraph names what is SKIPPED vs the full pipeline
- Uses bold **flags** to document optional behaviors
- States the artifact location (`.planning/quick/`) explicitly

For `gsd-feature`, the objective block must state:
- Artifacts live under `.planning/features/<slug>/` — NOT touching milestone state
- Which pipeline stages are skipped (researcher, plan-checker, verifier, code-review)
- Economy mode flag behavior (per-invocation budget settings, not written to disk)

---

#### `<execution_context>` block pattern (two styles)

**Style A — external workflow file** (from `gsd-quick/SKILL.md` line 43):
```markdown
<execution_context>
@$HOME/.claude/gsd-core/workflows/quick.md
</execution_context>
```
Used when the workflow logic lives in a separate `.md` file loaded at runtime.

**Style B — inline note** (from `gsd-discuss-phase/SKILL.md` lines 32-35):
```markdown
<execution_context>
Workflow files are loaded on-demand in the <process> section below — not upfront.
Do not pre-load any workflow files before reading the mode routing instructions.
</execution_context>
```
Used when the process is fully inline in SKILL.md itself.

**For `gsd-feature`:** Use Style B (inline) since the skill has no external workflow file and the full 3-step logic is embedded in `<process>`.

---

#### `<context>` block pattern (from `gsd-quick/SKILL.md` lines 46-49)

```markdown
<context>
$ARGUMENTS

Context files are resolved inside the workflow (`init quick`) and delegated via `<files_to_read>` blocks.
</context>
```

For `gsd-feature`, the context block should expose `$ARGUMENTS` and note that feature slug is derived from it.

---

#### `<process>` block — argument parsing pattern (from `gsd-quick/SKILL.md` lines 54-61)

```markdown
<process>

**Parse $ARGUMENTS for subcommands FIRST:**

- If $ARGUMENTS starts with "list": SUBCMD=list
- If $ARGUMENTS starts with "status ": SUBCMD=status, SLUG=remainder (strip whitespace, sanitize)
- If $ARGUMENTS starts with "resume ": SUBCMD=resume, SLUG=remainder (strip whitespace, sanitize)
- Otherwise: SUBCMD=run, pass full $ARGUMENTS to the quick workflow as-is
```

**Slug sanitization rule** (from `gsd-quick/SKILL.md` lines 62-63):
```
Strip any characters not matching `[a-z0-9-]`. Reject slugs longer than 60 chars
or containing `..` or `/`. If invalid, output "Invalid session slug." and stop.
```

Apply identical sanitization for `gsd-feature` slug derivation. Slugs come from truncating the feature description to a kebab-case string.

---

#### `<process>` block — multi-step workflow pattern (from `gsd-plan-execute-all/SKILL.md` lines 37-340)

The plan-execute-all skill demonstrates how to structure a multi-step inline process with named steps and checkpoints:

```markdown
## Step 1 — Bootstrap

[bash block or instructions]

---

## Step 2 — Discover Phases

[instructions]

---

## Step 3 — For Each Phase

### 3a. Phase header
### 3b. Plan (if needed)
### 3c. Pre-execute checkpoint

**If `AUTO` is true:** Skip. Print `...`

**If `AUTO` is false:**

Ask:
> Phase ${PHASE_NUM} is planned. Ready to execute?

Options:
- **"Execute"** — continue to 3d
- **"Skip this phase"** — log and continue
- **"Stop here"** — display summary and exit
```

Key conventions to copy for `gsd-feature`:
1. Steps are `## Step N — Name` with `---` horizontal rules between them
2. Conditional branches use bold `**If X:** ...` / `**If not X:** ...`
3. `AskUserQuestion` choices are bullet lists under `Options:`
4. Substeps use `### Na.` numbering within a step
5. Bash snippets use fenced code blocks with the `bash` language tag
6. Error/blocker handling is a named section `## handle_blocker` at the bottom

---

#### AskUserQuestion usage pattern (from `gsd-plan-execute-all/SKILL.md` lines 237-247)

```markdown
Ask:
> Phase ${PHASE_NUM} is planned. Ready to execute?

Options:
- **"Execute"** — continue to 3d
- **"Skip this phase"** — log `Phase ${PHASE_NUM} ⏭ Skipped by user` and continue to next phase
- **"Stop here"** — display progress summary and exit (go to **summary**)
```

For `gsd-feature` discuss step, follow this exact format:
- Question in a `>` blockquote
- Options as bold bullet choices with arrow (`—`) describing the action taken

---

#### Banner / output formatting pattern (from `gsd-plan-execute-all/SKILL.md` lines 85-97)

```markdown
Display startup banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PLAN → EXECUTE ALL PHASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Milestone: {milestone_name}
 Mode: {AUTO==true ? "Automatic (no checkpoints)" : "Checkpointed"}
```
```

For `gsd-feature`, use a similar banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► FEATURE: {feature description truncated}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Slug:    {slug}
 Folder:  .planning/features/{slug}/
 Economy: {on/off — derived from .planning/economy.lock presence}
```

---

#### CONTEXT.md write pattern (from `gsd-plan-execute-all/SKILL.md` lines 174-217)

```markdown
Write `${phase_dir}/${padded_phase}-CONTEXT.md` with:

```markdown
# Phase {PHASE_NUM}: {Phase Name} — Context

**Gathered:** {today's date}
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped — plan-execute-all mode)

<domain>
## Phase Boundary

{goal from ROADMAP}

</domain>

<decisions>
## Implementation Decisions
...
</decisions>

<code_context>
## Existing Code Insights
...
</code_context>

<specifics>
## Specific Requirements
...
</specifics>

<deferred>
## Deferred Ideas
...
</deferred>
```
```

For `gsd-feature`, the discuss step writes to `.planning/features/{slug}/CONTEXT.md` using this exact XML-section structure. The `<decisions>` section captures the user's answers to the 2-3 targeted questions.

---

#### Economy lock check pattern (from `hooks/gsd-economy.js` lines 82-86)

```javascript
// Economy state: check lock file presence (no config parsing needed)
if (fs.existsSync(lockPath)) {
  console.log('Economy mode already active');
  return;
}
```

In the SKILL.md process, the equivalent is a bash check:
```bash
ECONOMY_ACTIVE=false
if [ -f ".planning/economy.lock" ]; then ECONOMY_ACTIVE=true; fi
```

The skill reads this to decide whether to apply per-invocation budget settings. Economy settings are NOT written to disk — they are applied as inline Claude context overrides for this invocation only (per CONTEXT.md constraint).

---

#### `<security_notes>` block pattern (from `gsd-quick/SKILL.md` lines 170-174)

```markdown
<security_notes>
- Slugs from $ARGUMENTS are sanitized before use in file paths: only [a-z0-9-] allowed, max 60 chars, reject ".." and "/"
- File names from readdir/ls are sanitized before display: strip non-printable chars and ANSI sequences
- Artifact content (plan descriptions, task titles) rendered as plain text only — never executed or passed to agent prompts without DATA_START/DATA_END boundaries
- Status fields read via `gsd-tools query frontmatter.get` — never eval'd or shell-expanded
</security_notes>
```

Copy this section verbatim (adjusted for feature context) as the last block before closing the SKILL.md.

---

## Shared Patterns

### Slug derivation and sanitization
**Source:** `C:\Users\Ivan\.claude\skills\gsd-quick\SKILL.md` lines 62-63
**Apply to:** `gsd-feature` argument parsing
```
Strip characters not matching [a-z0-9-]. Max 60 chars. Reject ".." and "/".
Derive slug from feature description: lowercase, replace spaces/special chars with "-", truncate.
```

### CONTEXT.md XML section structure
**Source:** `C:\Users\Ivan\.claude\skills\gsd-plan-execute-all\SKILL.md` lines 174-217
**Apply to:** The discuss step's CONTEXT.md write
Sections: `<domain>`, `<decisions>`, `<code_context>`, `<specifics>`, `<deferred>`

### AskUserQuestion format
**Source:** `C:\Users\Ivan\.claude\skills\gsd-plan-execute-all\SKILL.md` lines 237-247
**Apply to:** Discuss step questions and execution checkpoint
Format: question in `>` blockquote, options as bold bullets with `—` description

### Step/substep heading structure
**Source:** `C:\Users\Ivan\.claude\skills\gsd-plan-execute-all\SKILL.md` lines 37+
**Apply to:** All three steps (Discuss, Plan, Execute+Verify) in `<process>`
Format: `## Step N — Name` / `### Na. Substep` / `---` separators

### Economy lock detection (bash)
**Source:** `C:\Users\Ivan\gsd-hooks\hooks\gsd-economy.js` lines 82-86
**Apply to:** Step 1 bootstrap of `gsd-feature`
```bash
ECONOMY_ACTIVE=false
if [ -f ".planning/economy.lock" ]; then ECONOMY_ACTIVE=true; fi
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| *(none)* | — | — | All patterns have close analogs in installed skills |

The per-invocation budget settings injection (model_profile: budget without disk writes) has no direct analog in existing skills, but is described in CONTEXT.md. The planner should treat this as inline agent context instructions in the Execute+Verify step, not as a hook invocation.

---

## Metadata

**Analog search scope:** `C:\Users\Ivan\.claude\skills\` (68 skills), `C:\Users\Ivan\gsd-hooks\hooks\`
**Key files read:** `gsd-quick/SKILL.md`, `gsd-discuss-phase/SKILL.md`, `gsd-spike/SKILL.md`, `gsd-plan-execute-all/SKILL.md`, `gsd-fast/SKILL.md`, `hooks/gsd-economy.js`
**Pattern extraction date:** 2026-06-09
