# Phase 8: Close gap — deploy feature libs with skill install

**Gathered:** 2026-06-10
**Status:** Ready for planning
**Source:** Milestone audit v1.1 gap closure

<domain>
## Phase Boundary

Close FEAT-07/FEAT-08 deploy-time wiring gap: `/gsd-feature` SKILL bash commands must resolve `lib/feature-history.js` and `lib/feature-ship.js` from the installed plugin directory, not the user project cwd.

</domain>

<decisions>
## Implementation Decisions

### D-01: Plugin layout
- Copy `lib/feature-history.js` and `lib/feature-ship.js` to `~/.claude/plugins/gsd-feature/lib/` alongside `SKILL.md`

### D-02: SKILL require paths
- Use `path.join(os.homedir(), '.claude', 'plugins', 'gsd-feature', 'lib', ...)` in all `node -e` one-liners (mirror hook absolute-path pattern)

### D-03: Install refresh
- `installSkill` always syncs SKILL.md + lib files (overwrite on each install) — fixes stale-skill tech debt

### D-04: Tests
- Extend `test/install.test.js` to assert lib files exist after install
- Add test that `appendHistoryEntry` works via plugin lib path from isolated tmp project cwd

### D-05: README
- Document plugin lib deployment under `/gsd-feature` section (minimal one-line)

</decisions>

<specifics>
## Success Criteria

1. After `npx gsd-hooks`, `~/.claude/plugins/gsd-feature/lib/feature-history.js` and `feature-ship.js` exist
2. SKILL.md `node -e` commands load libs from plugin path, not `./lib/`
3. Re-install updates skill + libs (not ALREADY PRESENT skip for libs)
4. `npm test` passes

</specifics>

<deferred>
## Deferred Ideas

- Gemini after-hook integration test (audit warning, out of phase 8 scope)

</deferred>
