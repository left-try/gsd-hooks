#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Resolve all target paths up front
const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
const pluginsDir   = path.join(os.homedir(), '.claude', 'plugins');
const hooksDir     = path.join(__dirname, '..', 'hooks');
const skillSrc     = path.join(__dirname, '..', '.claude', 'skills', 'gsd-feature', 'SKILL.md');
const skillDest    = path.join(pluginsDir, 'gsd-feature', 'SKILL.md');
const restorePath  = path.join(os.homedir(), '.claude', 'settings-hooks-restore.json');

/**
 * Returns parsed JSON from filePath if it does not exist, returns {}.
 * If the file EXISTS but cannot be parsed, throws a descriptive error to
 * prevent silent overwrite of a corrupted settings.json (CR-02).
 */
function readJsonOrEmpty(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `${filePath} exists but is not valid JSON — aborting to avoid data loss. ` +
      `Fix the file manually first. Parse error: ${err.message}`
    );
  }
}

/**
 * Saves the provided hooks block to settings-hooks-restore.json before any
 * modification is made (safety — T-03-01).  Caller must pass the original
 * (pre-mutation) hooks block, not the full settings object.
 *
 * @param {object} originalHooksBlock - The hooks block captured before mutation.
 */
function saveHooksSnapshot(originalHooksBlock) {
  fs.writeFileSync(restorePath, JSON.stringify(originalHooksBlock, null, 2));
}

/**
 * Wires Stop (gsd-phase-pacer) and SubagentStop (gsd-429-guard) hooks into
 * settings.hooks if they are not already registered.
 *
 * @param {object} settings - Parsed settings.json.
 * @param {Array}  actions  - Mutable array to push action records onto.
 * @returns {{ settings: object, changed: boolean }}
 */
function installHooks(settings, actions) {
  // Ensure hooks object exists — explicit Array.isArray guard required because
  // typeof [] === 'object', so the simple typeof check would keep a [] value
  // and silently discard all hook entries written to named array properties (CR-01).
  if (!settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks)) {
    settings.hooks = {};
  }

  let changed = false;

  // --- Stop hook: gsd-phase-pacer ---
  const pacerPath = path.join(hooksDir, 'gsd-phase-pacer.js');
  if (!Array.isArray(settings.hooks['Stop'])) {
    settings.hooks['Stop'] = [];
  }
  const pacerRegistered = settings.hooks['Stop'].some(
    (entry) =>
      entry.hooks &&
      entry.hooks.some((h) => h.command && h.command.includes('gsd-phase-pacer'))
  );
  if (!pacerRegistered) {
    settings.hooks['Stop'].push({
      matcher: '',
      hooks: [{ type: 'command', command: 'node ' + JSON.stringify(pacerPath) }],
    });
    changed = true;
    actions.push({ label: 'Stop hook → gsd-phase-pacer.js', status: 'WIRED' });
  } else {
    actions.push({ label: 'Stop hook → gsd-phase-pacer.js', status: 'ALREADY PRESENT' });
  }

  // --- SubagentStop hook: gsd-429-guard ---
  const guardPath = path.join(hooksDir, 'gsd-429-guard.js');
  if (!Array.isArray(settings.hooks['SubagentStop'])) {
    settings.hooks['SubagentStop'] = [];
  }
  const guardRegistered = settings.hooks['SubagentStop'].some(
    (entry) =>
      entry.hooks &&
      entry.hooks.some((h) => h.command && h.command.includes('gsd-429-guard'))
  );
  if (!guardRegistered) {
    settings.hooks['SubagentStop'].push({
      matcher: '',
      hooks: [{ type: 'command', command: 'node ' + JSON.stringify(guardPath) }],
    });
    changed = true;
    actions.push({ label: 'SubagentStop hook → gsd-429-guard.js', status: 'WIRED' });
  } else {
    actions.push({ label: 'SubagentStop hook → gsd-429-guard.js', status: 'ALREADY PRESENT' });
  }

  return { settings, changed };
}

/**
 * Copies the /gsd-feature SKILL.md to ~/.claude/plugins/gsd-feature/SKILL.md
 * if it is not already present (idempotent — INST-04).
 *
 * @param {Array} actions - Mutable array to push action records onto.
 */
function installSkill(actions) {
  if (fs.existsSync(skillDest)) {
    actions.push({
      label: '/gsd-feature skill → ~/.claude/plugins/gsd-feature/SKILL.md',
      status: 'ALREADY PRESENT',
    });
    return;
  }
  fs.mkdirSync(path.dirname(skillDest), { recursive: true });
  fs.copyFileSync(skillSrc, skillDest);
  actions.push({
    label: '/gsd-feature skill → ~/.claude/plugins/gsd-feature/SKILL.md',
    status: 'COPIED',
  });
}

/**
 * Prints a human-readable install summary to stdout (INST-05).
 *
 * @param {Array<{ label: string, status: string }>} actions
 */
function printSummary(actions) {
  console.log('[gsd-hooks] Install summary:');
  actions.forEach(({ label, status }) => {
    console.log('  ' + status + '  ' + label);
  });
}

// CLI entry point — only runs when invoked directly (not when require()'d)
if (require.main === module) {
  (async () => {
    try {
      // Step 1: Check that ~/.claude/settings.json exists (gsd-core detection)
      if (!fs.existsSync(settingsPath)) {
        console.log(
          '[gsd-hooks] WARNING: ~/.claude/settings.json not found — is gsd-core installed?'
        );
        process.exit(0);
      }

      // Step 2: Read current settings
      const settings = readJsonOrEmpty(settingsPath);

      // Capture original hooks block before any mutation (safety — T-03-01)
      const originalHooks = JSON.parse(JSON.stringify(settings.hooks || {}));

      // Step 3: Wire hooks (idempotent)
      const actions = [];
      const { settings: updatedSettings, changed } = installHooks(settings, actions);

      // Step 4: If any hooks were added, save snapshot first, then write updated settings
      if (changed) {
        saveHooksSnapshot(originalHooks);
        fs.writeFileSync(settingsPath, JSON.stringify(updatedSettings, null, 2));
      }

      // Step 5: Copy skill (idempotent)
      installSkill(actions);

      // Step 6: Print summary
      printSummary(actions);

      // Step 7: Exit cleanly
      process.exit(0);
    } catch (err) {
      console.error('[gsd-hooks] Fatal:', err.message);
      process.exit(1);
    }
  })();
}
