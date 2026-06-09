---
phase: 01-economy-rate-limit-layer
reviewed: 2026-06-09T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - presets/economy.json
  - hooks/gsd-economy.js
  - hooks/gsd-429-guard.js
  - hooks/gsd-phase-pacer.js
  - test/gsd-phase-pacer.test.js
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-06-09T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the five files comprising the economy/rate-limit layer: the economy preset, two hooks (`gsd-economy.js`, `gsd-429-guard.js`), the phase pacer, and its test suite. The hooks are logically coherent and the safety-first ordering (snapshot before patch) is correct. However, three critical defects were found: two unguarded `JSON.parse` calls that will throw uncaught exceptions on malformed or missing files, and a deactivation correctness bug where keys added by activation (absent from original config) are never removed on restore. Five warnings cover a blocking-sleep anti-pattern in the 429 guard, path-traversal exposure on an env-var-sourced file path, an unhandled promise rejection surface, missing upper bound on pacer delay, and partial cleanup on unlock failure. Three info items cover test duplication and coverage gaps.

---

## Critical Issues

### CR-01: Unguarded `JSON.parse` in `activate()` crashes on missing or malformed preset

**File:** `hooks/gsd-economy.js:89`
**Issue:** `fs.readFileSync(presetPath, 'utf8')` and the surrounding `JSON.parse` call are not wrapped in any try/catch. If `presets/economy.json` is missing (e.g., the package is run from cache without the presets directory), or if the file contains invalid JSON, the function throws an uncaught `Error` or `SyntaxError` that propagates as an unhandled exception, producing a raw stack trace instead of a clean error message. The `readJsonOrEmpty` helper already exists for exactly this purpose but is not used here.
**Fix:**
```js
// Replace line 89 in activate():
let diff;
try {
  diff = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
} catch (err) {
  console.error(`Economy preset unreadable or invalid JSON: ${presetPath}\n${err.message}`);
  process.exit(1);
}
```

---

### CR-02: Unguarded `JSON.parse` in `deactivate()` crashes on corrupt restore snapshot

**File:** `hooks/gsd-economy.js:131`
**Issue:** `JSON.parse(fs.readFileSync(restorePath, 'utf8'))` is unguarded. If the restore snapshot was partially written (e.g., disk full mid-write) or is otherwise corrupt, this throws a `SyntaxError`. At this point the lock file still exists, so re-running `--off` will hit the same crash every time — the user is stuck with no recovery path short of manually deleting files. The code path at line 123-128 correctly handles a *missing* restore file, but silently assumes a present file is always valid JSON.
**Fix:**
```js
// Replace lines 131 in deactivate():
let restore;
try {
  restore = JSON.parse(fs.readFileSync(restorePath, 'utf8'));
} catch (err) {
  console.error(
    `Restore snapshot is present but unreadable or malformed: ${restorePath}\n` +
    `${err.message}\n` +
    'Cannot safely restore — delete economy.lock and economy-restore.json manually.'
  );
  process.exit(1);
}
```

---

### CR-03: Keys added by activation (absent from original config) are never removed on deactivation

**File:** `hooks/gsd-economy.js:55-73` (extractSnapshot), `hooks/gsd-economy.js:134` (deactivate)
**Issue:** `extractSnapshot` only captures keys that already exist in `original`. If a key in the preset diff does not exist in the original config (e.g., `original` has no `parallelization` key at all), that key is not saved in the restore snapshot. During deactivation, `deepMerge(current, restore)` merges the snapshot back, but since the key was never saved it is not removed — the economy value remains permanently in `config.json` after deactivation. This silently corrupts the config for users whose original config did not have every preset key.
**Fix:** Extend `extractSnapshot` to record absent keys explicitly as a sentinel (e.g., `null`) and extend `deactivate` to delete those keys from the restored config:
```js
// In extractSnapshot — track keys absent from original:
} else {
  // Key absent from original — record as null sentinel so deactivation can delete it
  snapshot[key] = null;
}

// In deactivate — after deepMerge, delete null-sentinel keys:
function deleteNullKeys(obj) {
  for (const key of Object.keys(obj)) {
    if (obj[key] === null) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      deleteNullKeys(obj[key]);
    }
  }
}
const restored = deepMerge(current, restore);
deleteNullKeys(restored);
fs.writeFileSync(configPath, JSON.stringify(restored, null, 2));
```
Note: this requires that `null` is not a valid config value itself. If that assumption does not hold, a distinct out-of-band sentinel object is needed instead.

---

## Warnings

### WR-01: 60-second blocking sleep in a Stop hook will stall the entire hook chain

**File:** `hooks/gsd-429-guard.js:96`
**Issue:** The hook calls `await sleep(60_000)` before exiting. GSD's Stop/SubagentStop hooks fire synchronously in sequence — a hook that takes 60 seconds blocks everything downstream (subsequent hooks, the next phase starting, the terminal returning). If the hook runner has a per-hook timeout shorter than 60 seconds, the process will be killed before `process.exit(0)` is reached, leaving the economy-mode activation and log write as the last observable side effects but with an abnormal exit code that may confuse GSD. Even if no timeout exists, the UX is a 60-second frozen terminal with a single log line and no progress indicator.

Consider instead writing the cooldown intent to a state file and having the *next* phase's pre-hook (`gsd-phase-pacer`) enforce the cooldown window based on the timestamp in `rate-limit-log.json`, keeping each hook's execution time under 1 second.

---

### WR-02: `CLAUDE_TRANSCRIPT_PATH` env var accepted without path validation — path traversal exposure

**File:** `hooks/gsd-429-guard.js:9,26-33`
**Issue:** `transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH` is used directly as a file path passed to `fs.readFileSync`. There is no check that the path stays within an expected directory. An attacker who can set environment variables (e.g., through a compromised `.env` file or a confused-deputy attack via a shell that sources untrusted env) could point this variable at `/etc/passwd`, `~/.ssh/id_rsa`, or any other readable file. While the hook only reads and does not write the file, the signal detection (`content.includes('429')`) would silently pass for most non-transcript content, and the raw content of sensitive files could be passed as `source` in the log entry written to `rate-limit-log.json`.

**Fix:**
```js
const transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH;
// Validate path is within project root before reading
const projectRoot = process.cwd();
if (transcriptPath) {
  const resolved = path.resolve(transcriptPath);
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    console.error('[gsd-429-guard] CLAUDE_TRANSCRIPT_PATH is outside project root — ignoring');
    process.exit(0);
  }
}
```

---

### WR-03: `activate()` called without error handling inside async IIFE — unhandled promise rejection

**File:** `hooks/gsd-429-guard.js:85`
**Issue:** `activate()` is a synchronous function that can throw (see CR-01 and CR-02). It is called inside an `async` IIFE without a try/catch. An exception from `activate()` is caught by the async wrapper and becomes an unhandled promise rejection. In Node.js >= 15, unhandled promise rejections terminate the process with exit code 1, but without the clean error messages added by CR-01's fix. This also means the log append (line 88) and cooldown (line 96) are skipped.
**Fix:**
```js
try {
  activate();
} catch (err) {
  console.error(`[gsd-429-guard] Failed to activate economy mode: ${err.message}`);
  process.exit(1);
}
```

---

### WR-04: `unlinkSync` calls in `deactivate()` are not atomic — partial cleanup leaves inconsistent state

**File:** `hooks/gsd-economy.js:138-139`
**Issue:** `fs.unlinkSync(lockPath)` and `fs.unlinkSync(restorePath)` are called sequentially with no error handling. If the lock file is deleted (line 138) but the `unlinkSync(restorePath)` at line 139 throws (e.g., permissions error, file already deleted by a racing process), the function exits with an uncaught exception. At this point `economy.lock` is gone but `economy-restore.json` remains as a stale orphan. On the next `--on` invocation, `activate()` will see no lock and overwrite the restore snapshot — silently destroying the previous backup.
**Fix:** Wrap both unlinks in try/catch, or at minimum handle the case where the restore file unlink fails after the lock has already been removed:
```js
fs.unlinkSync(lockPath);
try {
  fs.unlinkSync(restorePath);
} catch (err) {
  console.error(`Warning: could not delete restore snapshot: ${err.message}`);
  // Lock is already gone; economy mode IS deactivated but snapshot is orphaned
}
```

---

### WR-05: No upper bound on `GSD_PHASE_DELAY_SECS` — misconfiguration causes indefinite hang

**File:** `hooks/gsd-phase-pacer.js:11-12`
**Issue:** `Math.max(0, rawDelay)` clamps negative values to 0 but places no ceiling on positive values. A misconfigured value such as `GSD_PHASE_DELAY_SECS=99999` would cause the hook to hang for ~27 hours with no timeout, no additional log output, and no way to distinguish it from a stalled process. A reasonable upper bound (e.g., 3600 seconds) would make misconfiguration obvious rather than silently catastrophic.
**Fix:**
```js
const MAX_DELAY_SECS = 3600;
const delaySecs = isNaN(rawDelay) ? 15 : Math.min(MAX_DELAY_SECS, Math.max(0, rawDelay));
if (!isNaN(rawDelay) && rawDelay > MAX_DELAY_SECS) {
  console.warn(`[gsd-phase-pacer] GSD_PHASE_DELAY_SECS=${rawDelay} exceeds maximum ${MAX_DELAY_SECS}s — clamped`);
}
```

---

## Info

### IN-01: `node:child_process` re-required redundantly inside test bodies

**File:** `test/gsd-phase-pacer.test.js:124,149`
**Issue:** Tests 5 and 6 call `require('node:child_process')` inside the test body and assign the result to a local `spawn2` alias, even though `spawnSync` was already destructured from the same module at the top of the file (line 14). The local aliases shadow nothing and add noise. This is dead redundancy that could mislead a reader into thinking a different module instance is needed.
**Fix:** Remove the inner `require` calls and use the already-imported `spawnSync` directly.

---

### IN-02: No tests for `gsd-economy.js` or `gsd-429-guard.js`

**File:** `test/` (directory-level gap)
**Issue:** The test suite only covers `gsd-phase-pacer.js`. The two more complex hooks — `gsd-economy.js` (which performs irreversible config mutations) and `gsd-429-guard.js` (which drives the entire 429 recovery chain) — have zero test coverage. Given that `gsd-economy.js` writes and deletes files and `gsd-429-guard.js` calls into it, bugs like CR-01 through CR-03 would not be caught by the existing test suite.

---

### IN-03: Type mismatch between preset and real config for `parallelization` key

**File:** `presets/economy.json:3-5`, compared against `.planning/config.json:3`
**Issue:** `economy.json` defines `parallelization` as an object (`{"max_concurrent_agents": 1}`), but the real `config.json` uses `parallelization: true` (a boolean). The `deepMerge` logic correctly handles this (it will overwrite `true` with the object because `true` is not typeof object), and `extractSnapshot` will correctly save `true` for restoration. There is no runtime bug here, but the schema inconsistency between the preset and the actual GSD config shape suggests the preset was written against a different config version than what is deployed. If GSD reads `parallelization` expecting a boolean, it will receive an object after economy mode activates, which may cause undefined behavior in gsd-core.

---

_Reviewed: 2026-06-09T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
