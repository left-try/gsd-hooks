---
phase: 03-npx-installer-package-wiring
review_depth: standard
status: issues_found
findings_count:
  critical: 3
  warning: 3
  info: 2
---

# Phase 3 Code Review

## Summary

The installer logic is structurally sound for the happy path, but contains three critical defects: a data-loss bug when `settings.hooks` is an array, silent overwrite of all settings when the JSON file is malformed, and path injection into hook commands that breaks on Windows paths with spaces. Three warnings cover non-atomic file writes, a missing source-file existence check, and excessive npm publish scope. Two info items cover test gaps and package bloat.

---

## Critical Issues

### CR-01: `hooks` array guard misses Array — silent data loss when `settings.hooks` is `[]`

**File:** `bin/install.js:52-53`

**Issue:** The guard `typeof settings.hooks !== 'object'` is `false` for arrays because `typeof [] === 'object'`. If an existing `settings.json` has `"hooks": []` (valid JSON, not uncommon in generated configs), the array is kept as-is. The code then does `settings.hooks['Stop'] = []`, which sets a named property on the Array instance. `JSON.stringify` on an array ignores non-index properties, so when the file is written back on line 162 the stored value is still `"hooks": []` — the newly wired hook entries are silently discarded. Worse, `changed` is set to `true`, so `writeFileSync` runs and overwrites the file without error, giving the user a false "WIRED" success message while no hooks are actually persisted.

Reproduction:
```json
// settings.json before install
{ "hooks": [] }
// settings.json after install — hook entries lost
{ "hooks": [] }
```

**Fix:** Replace the array-blind typeof check with an explicit `Array.isArray` exclusion:

```javascript
if (!settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks)) {
  settings.hooks = {};
}
```

---

### CR-02: Silent data loss when `settings.json` exists but contains invalid JSON

**File:** `bin/install.js:150, 162`

**Issue:** When `settings.json` exists but cannot be parsed (truncated file, encoding error, manual edit mistake), `readJsonOrEmpty` swallows the parse error and returns `{}`. The installer then treats the file as empty, wires hooks into the empty object, and calls `fs.writeFileSync(settingsPath, ...)` on line 162 — overwriting the entire file with only the new hooks block. Every other key the user had in `settings.json` (`model`, `apiKey`, `allowedTools`, etc.) is permanently destroyed. The restore snapshot saved on line 161 only contains `{}` (the "original" hooks block), so there is nothing to restore.

This is a silent, unrecoverable data loss path.

**Fix:** If `readJsonOrEmpty` encounters a parse error on a file that *exists*, abort rather than proceed:

```javascript
function readJsonOrDie(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `settings.json exists but is not valid JSON — aborting to avoid data loss. ` +
      `Fix the file manually first. Parse error: ${err.message}`
    );
  }
}
```

Replace the `readJsonOrEmpty` call on line 150 with `readJsonOrDie`.

---

### CR-03: Hook command strings contain unquoted paths — breaks on Windows paths with spaces

**File:** `bin/install.js:71, 90`

**Issue:** Hook commands are built by string concatenation:

```javascript
command: 'node ' + pacerPath   // line 71
command: 'node ' + guardPath   // line 90
```

`pacerPath` and `guardPath` are absolute paths derived from `__dirname`. On Windows, `__dirname` commonly resolves under `C:\Users\<username>\AppData\Roaming\npm\node_modules\gsd-hooks\hooks\...` or the npx cache path under `C:\Users\<name>\AppData\Local\npm-cache\_npx\...`. Both of these paths contain spaces. The resulting command string such as `node C:\Users\John Smith\AppData\...` will cause the Claude hook runner to misparse the command — the hook will fail to execute silently or throw an unexpected argument error.

**Fix:** Wrap the path in double quotes:

```javascript
command: 'node "' + pacerPath + '"',   // line 71
command: 'node "' + guardPath + '"',   // line 90
```

For robustness against embedded quotes in the path itself (rare but possible), use `JSON.stringify` for the quoting:

```javascript
command: 'node ' + JSON.stringify(pacerPath),
```

---

## Warnings

### WR-01: Non-atomic write to `settings.json` — corruption risk on process interruption

**File:** `bin/install.js:162`

**Issue:** `fs.writeFileSync(settingsPath, ...)` truncates the file and writes new content in-place. If the process is interrupted (SIGKILL, power loss, OS OOM kill) after truncation begins but before the write completes, `settings.json` is left partially written and invalid. The user would then hit the CR-02 path on every subsequent run (malformed JSON → silent overwrite), or Claude itself would fail to load settings.

**Fix:** Write to a sibling temp file, then atomically rename:

```javascript
const tmpPath = settingsPath + '.tmp';
fs.writeFileSync(tmpPath, JSON.stringify(updatedSettings, null, 2));
fs.renameSync(tmpPath, settingsPath);
```

`fs.renameSync` is atomic on POSIX and best-effort atomic on Windows (same-drive renames use `MoveFileEx` with `MOVEFILE_REPLACE_EXISTING`).

---

### WR-02: `skillSrc` existence not validated before copy — opaque ENOENT on install

**File:** `bin/install.js:118`

**Issue:** `fs.copyFileSync(skillSrc, skillDest)` on line 118 will throw `ENOENT: no such file or directory` if the skill source file does not exist at `.claude/skills/gsd-feature/SKILL.md` relative to the package root. This path is resolved from `__dirname` and depends on the npm package being installed with the `.claude/` directory intact. The outer `try/catch` will catch the error and print `[gsd-hooks] Fatal: ENOENT: no such file or directory, copyFile '...'`, which gives no actionable guidance. Currently the npm pack *does* include the skill file, but the lack of a defensive check means any packaging mistake produces a cryptic fatal error.

**Fix:** Add an explicit pre-flight check before the copy:

```javascript
function installSkill(actions) {
  if (fs.existsSync(skillDest)) {
    actions.push({ label: '/gsd-feature skill → ~/.claude/plugins/gsd-feature/SKILL.md', status: 'ALREADY PRESENT' });
    return;
  }
  if (!fs.existsSync(skillSrc)) {
    throw new Error(
      `Skill source not found: ${skillSrc}\n` +
      `This usually means the package was installed without the .claude/ directory. ` +
      `Re-install with: npx gsd-hooks@latest`
    );
  }
  fs.mkdirSync(path.dirname(skillDest), { recursive: true });
  fs.copyFileSync(skillSrc, skillDest);
  actions.push({ label: '/gsd-feature skill → ~/.claude/plugins/gsd-feature/SKILL.md', status: 'COPIED' });
}
```

---

### WR-03: `.planning/` directory and `test/` suite are bundled into the published npm package

**File:** `package.json` (no `files` field)

**Issue:** `npm pack --dry-run` confirms the published tarball includes `.planning/` (25+ internal planning documents totalling ~140 KB), `test/`, and `CLAUDE.md`. The `.planning/` files are internal GSD workflow artifacts that expose the project's internal design, roadmap, and review notes to any consumer who inspects the package. Additionally, bundling test files and planning artifacts inflates the npx download size for every user.

**Fix:** Add a `files` allowlist to `package.json` that includes only the runtime-necessary files:

```json
"files": [
  "bin/",
  "hooks/",
  "presets/",
  ".claude/skills/"
]
```

---

## Info

### IN-01: Test suite has no coverage for the malformed-JSON settings scenario (CR-02 path)

**File:** `test/install.test.js`

**Issue:** None of the five tests exercise the case where `settings.json` exists but contains invalid JSON. The current behavior (silent data loss) would pass all existing tests since the tests only provide valid JSON or no file. A test like "INST-06: exits 1 with descriptive error when settings.json is malformed" would both document the expected behavior and catch regressions if the fix from CR-02 is ever reverted.

**Fix:** Add a test that writes `{ invalid json !!` to `settings.json`, runs the installer, and asserts `status !== 0` plus a descriptive error in stderr.

---

### IN-02: `pluginsDir` module-level variable is declared but never referenced directly

**File:** `bin/install.js:10`

**Issue:** `const pluginsDir = path.join(os.homedir(), '.claude', 'plugins')` is computed at the top level but never used — `skillDest` is computed independently on line 13. The variable is dead code. This is a minor maintenance concern (future readers may wonder if it serves a purpose).

**Fix:** Remove the unused declaration, or if `pluginsDir` is intended to be used elsewhere in a future expansion, add a comment clarifying its intent.

```javascript
// Remove line 10:
// const pluginsDir = path.join(os.homedir(), '.claude', 'plugins');
```

---

## Verdict

ISSUES_FOUND — Three critical defects must be fixed before this installer ships: the array-hooks data loss bug (CR-01), the malformed-JSON silent overwrite (CR-02), and unquoted paths in hook commands breaking Windows installs with spaces in the npm cache path (CR-03). CR-01 and CR-02 both cause silent, unrecoverable destruction of the user's `settings.json`. Address all three before publishing to npm.
