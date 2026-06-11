# gsd-hooks

Rate-limit resilience, economy mode, and a lightweight feature workflow for [GSD](https://github.com/open-gsd/gsd-core) users.

**Core value:** GSD keeps running without human intervention when it hits rate limits — self-recovering, not crashing.

## Prerequisites

- Node.js ≥ 18
- [gsd-core](https://github.com/open-gsd/gsd-core) installed in your project (`.planning/` directory)
- Per-runtime config present where you want hooks wired:
  - **Claude Code:** `~/.claude/settings.json`
  - **Gemini CLI:** `~/.gemini/settings.json`
  - **Codex:** `~/.codex/` directory

The installer skips runtimes whose config is missing and prints a `WARNING` — it does not fail the whole install.

## Quick install

```bash
npx gsd-hooks
```

Pin a version: `npx gsd-hooks@0.1.1`

**From GitHub** (if npm is unavailable):

```bash
npx github:left-try/gsd-hooks
```

**From a local clone:** `npx .` in the repo root.

Re-running the installer is idempotent — already-wired hooks show `ALREADY PRESENT` in the summary.

## Runtime-specific install

| Runtime | Config file | Hooks wired | Restore snapshot |
|---------|-------------|-------------|------------------|
| Claude Code | `~/.claude/settings.json` | `Stop` → `gsd-phase-pacer.js`; `SubagentStop` → `gsd-429-guard.js` | `~/.claude/settings-hooks-restore.json` |
| Gemini CLI | `~/.gemini/settings.json` | `BeforeAgent` → `gsd-gemini-before.js`; `AfterAgent` → `gsd-gemini-after.js` | `~/.gemini/settings-hooks-restore.json` |
| Codex | `~/.codex/hooks.json` | `SubagentStop` → `gsd-codex-429-guard.js` (600s timeout) | `~/.codex/hooks-restore.json` |

**Claude Code only:** the installer copies `/gsd-feature` to `~/.claude/plugins/gsd-feature/` (`SKILL.md` plus `lib/feature-history.js` and `lib/feature-ship.js`). Re-runs refresh these files.

### Uninstall / restore

Each runtime writes a restore snapshot before the first hook mutation. To revert, restore the saved `hooks` block from the snapshot file into the matching settings file.

Economy mode uses a separate per-project restore: `.planning/economy-restore.json` (not touched by the global installer).

## How it works

### Economy mode

```bash
npx gsd-economy --on
npx gsd-economy --off
```

Patches `.planning/config.json` using `presets/economy.json` (budget model, `max_concurrent_agents: 1`, disables optional pipeline steps). Creates `.planning/economy.lock` and saves originals to `.planning/economy-restore.json`. gsd-core hot-reloads config when the file changes.

### 429 recovery

On rate-limit signals in the session transcript, hooks:

1. Activate economy mode automatically
2. Apply session-scoped cooldown: **60s** → **120s** → **240s** (capped)
3. Log events to `.planning/rate-limit-log.json`
4. Track strike count in `.planning/rate-limit-backoff.json` (resets when `session_id` / transcript session changes)

| Runtime | Hook event | Script |
|---------|------------|--------|
| Claude Code | `SubagentStop` | `gsd-429-guard.js` |
| Gemini CLI | `AfterAgent` | `gsd-gemini-after.js` |
| Codex | `SubagentStop` | `gsd-codex-429-guard.js` |

Gemini `BeforeAgent` (`gsd-gemini-before.js`) re-ensures economy mode when `.planning/economy.lock` exists.

### Phase pacing (Claude Code only)

The `Stop` hook (`gsd-phase-pacer.js`) adds a delay between GSD phase triggers to reduce burst pressure.

- Default: **15s** via `GSD_PHASE_DELAY_SECS` environment variable
- Per-project override: `hooks.phase_delay_secs` in `.planning/config.json` (when the key is present, it overrides the env var entirely; `0` disables pacing)
- Skipped when `.planning/economy.lock` exists (429 cooldown supersedes pacing)

## Configuration reference

| Setting | Location | Description |
|---------|----------|-------------|
| `hooks.phase_delay_secs` | `.planning/config.json` | Integer seconds between phases; overrides env when key present |
| `GSD_PHASE_DELAY_SECS` | Environment | Global default delay (15 when unset/invalid) |
| `gsd-economy --on` / `--off` | CLI | Manual economy toggle |
| `GSD_BACKOFF_TEST_MS` | Environment | Test-only cooldown override (developers) |

## Project artifacts

| File | Purpose |
|------|---------|
| `.planning/economy.lock` | Economy mode active signal |
| `.planning/economy-restore.json` | Original config values before economy patch |
| `.planning/rate-limit-backoff.json` | Session strike count for exponential backoff |
| `.planning/rate-limit-log.json` | Timestamped 429 event log |

## `/gsd-feature`

Lightweight discuss → plan → execute+verify workflow without `ROADMAP.md`.

```text
/gsd-feature "add dark mode toggle"
/gsd-feature "fix login redirect" --economy
/gsd-feature "add export CSV" --ship
```

- Artifacts: `.planning/features/<slug>/` (`CONTEXT.md`, `PLAN.md`, `SUMMARY.md`)
- History log: `.planning/features/HISTORY.md` (date, slug, status, description, PR link)
- `--economy` is informational; `.planning/economy.lock` is the authoritative economy signal
- `--ship` creates a GitHub PR **only after** execute+verify passes; skipped with an explicit reason on failure
- Skill installs to Claude Code only (`~/.claude/plugins/gsd-feature/` including `lib/`); use Claude sessions for `/gsd-feature` while Gemini/Codex hooks handle rate-limit resilience

## Development

```bash
npm test
```

Runs all hook, installer, feature workflow, and README content tests with Node's built-in test runner.

## License

MIT
