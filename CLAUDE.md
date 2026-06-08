<!-- GSD:project-start source:PROJECT.md -->

## Project

**gsd-hooks**

An npx-installable plugin package that sits on top of any existing gsd-core installation and adds rate-limit resilience, cost-optimized workflow modes, and a lightweight feature development skill. Designed for GSD users who hit Anthropic API rate limits during automated phase chains or need to run GSD on tighter usage budgets without abandoning the structured workflow.

**Core Value:** GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.

### Constraints

- **Compatibility:** Must work on top of any gsd-core version >= 1.28 without modifications to gsd-core files
- **Hook safety:** Config patching must save a restore snapshot (`economy-restore.json`) before overwriting — no destructive config changes
- **Windows support:** Hooks run in Node.js (not bash) to work on Windows/Git Bash where shell hooks behave differently
- **Installer scope:** npx entry point only — no global npm install required; package runs from cache

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
