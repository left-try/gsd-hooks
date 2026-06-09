# Phase 1: Economy & Rate-Limit Layer — Context

**Gathered:** 2026-06-09
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped — plan-execute-all mode)

<domain>
## Phase Boundary

GSD sessions self-recover from rate limits and run without burst-induced crashes

</domain>

<decisions>
## Implementation Decisions

All implementation choices are at Claude's discretion. Use ROADMAP phase goal,
success criteria, and codebase conventions to guide decisions.

Key architectural constraints from PROJECT.md:
- Node.js for all hooks (not shell scripts) — cross-platform Windows/Git Bash compatibility
- Hook safety: config patching must save restore snapshot (economy-restore.json) before overwriting
- Economy state communicated via lock file (present/absent), not by parsing config
- 429 detection via scanning CLAUDE_TRANSCRIPT_PATH env var in Stop/SubagentStop hooks
- gsd-core hot-reloads .planning/config.json on FileChanged — patching config takes effect immediately

</decisions>

<code_context>
## Existing Code Insights

This is a greenfield package — no existing hooks code yet. The package will be structured as:
```
gsd-hooks/
├── bin/install.js          # npx entry point (Phase 3)
├── hooks/
│   ├── gsd-phase-pacer.js  # 15s base delay, reads GSD_PHASE_DELAY_SECS
│   ├── gsd-429-guard.js    # scans CLAUDE_TRANSCRIPT_PATH for 429 signals
│   └── gsd-economy.js      # patches config, saves economy-restore.json
├── presets/
│   └── economy.json        # economy config diff
└── package.json
```

Economy config diff to apply (presets/economy.json):
```json
{
  "model_profile": "budget",
  "parallelization": { "max_concurrent_agents": 1 },
  "workflow": {
    "code_review": false,
    "nyquist_validation": false,
    "plan_check": false,
    "verifier": false
  }
}
```

</code_context>

<specifics>
## Specific Requirements

See ROADMAP success criteria:
- Running `gsd-economy --on` switches the project to budget model and 1-agent config; running `gsd-economy --off` fully restores original settings — no manual config editing required
- When a 429 response appears in a session transcript, the Stop/SubagentStop hook automatically activates economy mode and pauses for 60 seconds before the next phase can trigger
- A `gsd-plan-execute-all` chain running in normal mode waits at least 15 seconds between phase triggers, and that gap is skippable via environment variable override
- Economy state is always readable by hooks without parsing config (lock file present/absent is sufficient signal)
- Every 429 event is logged with a timestamp so the user can review frequency after a session

Requirements coverage: ECON-01, ECON-02, ECON-03, ECON-04, RATE-01, RATE-02, RATE-03, RATE-04, PACE-01, PACE-02

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
