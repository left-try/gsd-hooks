# Phase 3: NPX Installer & Package Wiring — Pattern Map

**Mapped:** 2026-06-09
**Files analyzed:** 2 (new/modified)
**Analogs found:** 2 / 2

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `bin/install.js` | utility/CLI entrypoint | file-I/O + transform | `hooks/gsd-economy.js` | role-match (Node.js CLI, fs ops, idempotency guard) |
| `package.json` | config | — | existing `package.json` | exact |

## Pattern Assignments

### `bin/install.js` (utility, file-I/O + transform)

**Analog:** `hooks/gsd-economy.js`

**Shebang + strict mode + imports** (analog lines 1-6):
```javascript
#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
```

**Path resolution pattern** — resolve all target paths up front using `os.homedir()` and `path.join`; analog resolves with `process.cwd()` (lines 8-12):
```javascript
// Analog resolves relative to cwd:
const planningDir = path.join(process.cwd(), '.planning');
const configPath  = path.join(planningDir, 'config.json');
const lockPath    = path.join(planningDir, 'economy.lock');
const restorePath = path.join(planningDir, 'economy-restore.json');
const presetPath  = path.join(__dirname, '..', 'presets', 'economy.json');

// bin/install.js should use os.homedir() instead:
// const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
// const pluginsDir   = path.join(os.homedir(), '.claude', 'plugins');
```

**JSON read-or-empty helper** — used for safe config loading; copy directly (analog lines 17-26):
```javascript
function readJsonOrEmpty(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    // malformed or unreadable — return empty object
  }
  return {};
}
```

**Idempotency guard pattern** — check existence before acting; copy structure (analog lines 83-87):
```javascript
// activate() guards against double-run:
if (fs.existsSync(lockPath)) {
  console.log('Economy mode already active');
  return;
}
```
For the installer, apply same pattern per action:
```javascript
// Check hook already registered before pushing:
const alreadyRegistered = entries.some(e => e.command && e.command.includes('gsd-phase-pacer'));
if (!alreadyRegistered) { /* push and set changed = true */ }
```

**Safety: write restore snapshot before patching** (analog lines 96-98):
```javascript
// Write restore snapshot BEFORE patching config (safety first)
fs.writeFileSync(restorePath, JSON.stringify(snapshot, null, 2));
const patched = deepMerge(original, diff);
fs.writeFileSync(configPath, JSON.stringify(patched, null, 2));
```
Installer equivalent: write a `settings-restore.json` snapshot of the original `hooks` block before modifying `settings.json`.

**mkdirSync recursive** — ensure parent dirs exist before writing (analog line 95):
```javascript
fs.mkdirSync(planningDir, { recursive: true });
```

**Human-readable summary pattern** — analog uses `console.log` per action (lines 86, 107, 126-128, 141):
```javascript
console.log('Economy mode activated');
console.error('Restore snapshot missing — cannot safely restore; delete economy.lock manually');
```
Installer should collect action results and print a final summary table:
```javascript
// Print summary of actions
console.log('\n[gsd-hooks] Install summary:');
actions.forEach(({ label, status }) => console.log(`  ${status}  ${label}`));
```

**require.main === module guard** — only run as CLI (analog lines 148-157):
```javascript
if (require.main === module) {
  const flag = process.argv[2];
  if (flag === '--on') { activate(); }
  // ...
}
```
Installer uses same guard to wrap the async IIFE:
```javascript
if (require.main === module) {
  (async () => { /* install logic */ })();
}
```

**Async IIFE for top-level await** — used in gsd-429-guard.js (lines 71-99):
```javascript
(async () => {
  if (!transcriptPath) { process.exit(0); }
  // ...
  process.exit(0);
})();
```

**process.exit codes** — exit 0 on success, exit 1 on fatal error (analog lines 73, 98, 121, 128):
```javascript
process.exit(0); // success / no-op
process.exit(1); // fatal — missing snapshot, etc.
```

---

### `package.json` (config)

**Analog:** existing `package.json` (project root)

**Current bin field** (lines 9-11):
```json
"bin": {
  "gsd-economy": "./hooks/gsd-economy.js"
}
```

**Required change** — add installer bin entry alongside existing:
```json
"bin": {
  "gsd-economy": "./hooks/gsd-economy.js",
  "gsd-hooks":   "bin/install.js"
}
```
Keep all other fields (`name`, `version`, `description`, `type`, `engines`, `scripts`, `keywords`, `license`) unchanged.

---

## Shared Patterns

### Shebang + strict mode
**Source:** `hooks/gsd-economy.js` lines 1-2, `hooks/gsd-429-guard.js` lines 1-2
**Apply to:** `bin/install.js`
```javascript
#!/usr/bin/env node
'use strict';
```

### Safe JSON read helper
**Source:** `hooks/gsd-economy.js` lines 17-26
**Apply to:** `bin/install.js` (reading `~/.claude/settings.json`)
```javascript
function readJsonOrEmpty(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_err) {}
  return {};
}
```

### mkdirSync recursive
**Source:** `hooks/gsd-economy.js` line 95, `hooks/gsd-429-guard.js` line 56
**Apply to:** `bin/install.js` (creating `~/.claude/plugins/gsd-feature/`)
```javascript
fs.mkdirSync(targetDir, { recursive: true });
```

### console.log prefixed messages
**Source:** `hooks/gsd-429-guard.js` line 95, `hooks/gsd-phase-pacer.js` lines 16, 26
**Apply to:** `bin/install.js`
```javascript
console.log('[gsd-hooks] <message>');
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | All files have adequate analogs in the existing hooks |

## Notes for Planner

1. `bin/install.js` must use `os.homedir()` (require `os`) — not `process.cwd()` — for resolving `~/.claude/settings.json` and `~/.claude/plugins/`.
2. The `~/.claude/settings.json` `hooks` structure uses arrays; idempotency check must scan existing command strings for the hook filename, not just key presence.
3. Skill copy: check `fs.existsSync(destSkillPath)` before copying; if present, log "already present" and skip (INST-04).
4. The restore snapshot for settings should save only the original `hooks` block (parallel to how `gsd-economy.js` snapshots only the diff keys).
5. No third-party dependencies — only Node.js built-ins (`fs`, `path`, `os`), consistent with all existing hooks.

## Metadata

**Analog search scope:** `hooks/`, `package.json`
**Files scanned:** 4
**Pattern extraction date:** 2026-06-09
