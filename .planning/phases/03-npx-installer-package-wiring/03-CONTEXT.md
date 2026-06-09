# Phase 3: NPX Installer & Package Wiring — Context

**Gathered:** 2026-06-09
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped — plan-execute-all mode)

<domain>
## Phase Boundary

Users can install all hooks and the feature skill onto any gsd-core setup with a single npx command

</domain>

<decisions>
## Implementation Decisions

All implementation choices are at Claude's discretion. Use ROADMAP phase goal,
success criteria, and codebase conventions to guide decisions.

Key architectural constraints from CLAUDE.md and prior phases:
- Node.js only (no bash) — Windows/Git Bash compatibility
- npx entry point only — no global npm install required; package runs from cache
- Must work on top of any gsd-core version >= 1.28 without modifying gsd-core files
- Hook safety: Config patching must save a restore snapshot before overwriting
- Installer scope: detects gsd-core install, wires hooks into `~/.claude/settings.json`,
  copies `/gsd-feature` skill to `~/.claude/plugins/`
- Idempotent: re-running on an already-configured machine must not duplicate entries
  or overwrite existing skill files
- Must print a human-readable summary of actions taken

Phase 1 delivered: `hooks/gsd-economy.js`, `hooks/gsd-429-guard.js`, `hooks/gsd-phase-pacer.js`
Phase 2 delivered: `.claude/skills/gsd-feature/SKILL.md`

The installer bin entry point should be `bin/install.js`, declared in package.json `bin` field.
`~/.claude/settings.json` hook entries format:
```json
{
  "hooks": {
    "Stop": [{ "matcher": "", "hooks": [{ "type": "command", "command": "node <path>/hooks/gsd-phase-pacer.js" }] }],
    "SubagentStop": [{ "matcher": "", "hooks": [{ "type": "command", "command": "node <path>/hooks/gsd-429-guard.js" }] }]
  }
}
```

</decisions>

<code_context>
## Existing Code Insights

Phase 1 hooks (all in `hooks/` directory):
- `hooks/gsd-economy.js` — exports activate()/deactivate(); called by gsd-429-guard
- `hooks/gsd-429-guard.js` — SubagentStop hook; 429 detection + economy activation + cooldown
- `hooks/gsd-phase-pacer.js` — Stop hook; configurable inter-phase delay
- `presets/economy.json` — economy config diff

Phase 2 skill:
- `.claude/skills/gsd-feature/SKILL.md` — /gsd-feature skill

`package.json` exists at project root with `name`, `version`, and `description` fields.
Installer needs:
1. A `bin/install.js` script (the npx entry point)
2. `package.json` updated with `"bin": { "gsd-hooks": "bin/install.js" }` field
3. `#!/usr/bin/env node` shebang on install.js

The installer detects gsd-core by checking for `~/.claude/settings.json` existence
(Claude Code's global settings file). It should also print a warning if gsd-core
doesn't appear to be installed.

</code_context>

<specifics>
## Specific Requirements

See ROADMAP success criteria:
- Running `npx @<scope>/gsd-hooks@latest` on a machine with gsd-core installed completes without error and requires no global npm install (INST-01)
- After install, `~/.claude/settings.json` contains Stop and SubagentStop hook registrations pointing to gsd-phase-pacer and gsd-429-guard (INST-02)
- After install, the `/gsd-feature` skill file is present under `~/.claude/plugins/` (INST-03)
- Re-running the installer on an already-configured machine does not add duplicate hook entries or overwrite the existing skill (INST-04)
- The installer prints a human-readable summary listing each action taken (what was wired, what was already present, where files were copied) (INST-05)

Requirements coverage: INST-01, INST-02, INST-03, INST-04, INST-05

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
