# Phase 9 Context: Gemini Test Hardening

**Phase:** 9 — Gemini Test Hardening  
**Milestone:** v1.2 Hardening & Publish Polish  
**Requirements:** TEST-01, DOCS-02

## Problem

v1.1 milestone audit flagged MULTI-01 as **partial** because `gsd-gemini-after.js` ships and installer tests wire it, but there is no runtime integration test proving a 429 transcript activates economy mode — unlike `gsd-codex-429-guard.test.js` which already covers Codex.

`test/readme.test.js` guards `gsd-gemini-before` but not `gsd-gemini-after`, even though README already documents both hooks.

## Constraints

- **No production code changes** unless tests reveal a real bug — this phase is test + doc-guard only
- **Mirror Codex test pattern** — isolated temp HOME/cwd, `GSD_BACKOFF_TEST_MS=10`, cleanup in `finally`
- **Gemini input contract** — `runGeminiAfter` reads `transcript_path` (not `agent_transcript_path` used by Codex)
- **Zero new dependencies** — Node.js built-in test runner only

## Reference implementations

| File | Role |
|------|------|
| `test/gsd-codex-429-guard.test.js` | Template for 429 + no-op tests |
| `hooks/gsd-gemini-after.js` | Exports `runGeminiAfter(input)` |
| `test/readme.test.js` | REQUIRED token list to extend |

## Success definition

1. `npm test` passes with new `gsd-gemini-after` tests
2. `readme.test.js` fails if `gsd-gemini-after` removed from README
