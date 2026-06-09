#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Resolve paths relative to the current working directory (.planning/) and preset
const planningDir = path.join(process.cwd(), '.planning');
const configPath = path.join(planningDir, 'config.json');
const lockPath = path.join(planningDir, 'economy.lock');
const restorePath = path.join(planningDir, 'economy-restore.json');
const presetPath = path.join(__dirname, '..', 'presets', 'economy.json');

/**
 * Returns parsed JSON from filePath if it exists, otherwise returns {}.
 */
function readJsonOrEmpty(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    // If file is malformed or unreadable, return empty object
  }
  return {};
}

/**
 * Recursively merges source into a copy of target.
 * Source keys overwrite target keys at every nesting level.
 */
function deepMerge(target, source) {
  const result = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] !== null &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Extracts from `original` only the keys (at all nesting levels) that are
 * present in `diff`. Used to build a minimal restore snapshot.
 */
function extractSnapshot(original, diff) {
  const snapshot = {};
  for (const key of Object.keys(diff)) {
    if (
      diff[key] !== null &&
      typeof diff[key] === 'object' &&
      !Array.isArray(diff[key]) &&
      original[key] !== null &&
      typeof original[key] === 'object' &&
      !Array.isArray(original[key])
    ) {
      snapshot[key] = extractSnapshot(original[key], diff[key]);
    } else if (Object.prototype.hasOwnProperty.call(original, key)) {
      snapshot[key] = original[key];
    }
    // If key absent from original, don't include it — nothing to restore
  }
  return snapshot;
}

/**
 * Activates economy mode (implements ECON-01, ECON-03, ECON-04):
 * - Guards against double-activation via lock file
 * - Saves original values to economy-restore.json
 * - Patches config.json with economy diff
 * - Writes economy.lock
 */
function activate() {
  if (fs.existsSync(lockPath)) {
    console.log('Economy mode already active');
    return;
  }

  const original = readJsonOrEmpty(configPath);
  const diff = JSON.parse(fs.readFileSync(presetPath, 'utf8'));

  // Save restore snapshot: only the keys we are about to overwrite
  const snapshot = extractSnapshot(original, diff);

  // Ensure .planning/ directory exists
  fs.mkdirSync(planningDir, { recursive: true });

  // Write restore snapshot BEFORE patching config (safety first — T-01-01)
  fs.writeFileSync(restorePath, JSON.stringify(snapshot, null, 2));

  // Patch config
  const patched = deepMerge(original, diff);
  fs.writeFileSync(configPath, JSON.stringify(patched, null, 2));

  // Write lock file (timestamp is informational only)
  fs.writeFileSync(lockPath, new Date().toISOString());

  console.log('Economy mode activated');
}

/**
 * Deactivates economy mode (implements ECON-02, ECON-04):
 * - Guards against deactivation when not active
 * - Refuses to proceed if restore snapshot is missing (safety — T-01-01)
 * - Restores original config values
 * - Removes lock and restore files
 */
function deactivate() {
  if (!fs.existsSync(lockPath)) {
    console.log('Economy mode not active');
    process.exit(0);
  }

  if (!fs.existsSync(restorePath)) {
    console.error(
      'Restore snapshot missing — cannot safely restore; delete economy.lock manually'
    );
    process.exit(1);
  }

  const current = readJsonOrEmpty(configPath);
  const restore = JSON.parse(fs.readFileSync(restorePath, 'utf8'));

  // Merge restore snapshot back (restores only the keys that were saved)
  const restored = deepMerge(current, restore);
  fs.writeFileSync(configPath, JSON.stringify(restored, null, 2));

  // Remove lock and restore files
  fs.unlinkSync(lockPath);
  fs.unlinkSync(restorePath);

  console.log('Economy mode deactivated — config restored');
}

// Module exports — allows require('./gsd-economy') from other hooks (e.g. gsd-429-guard)
module.exports = { activate, deactivate };

// CLI entry point — only runs when invoked directly (not when require()'d)
if (require.main === module) {
  const flag = process.argv[2];

  if (flag === '--on') {
    activate();
  } else if (flag === '--off') {
    deactivate();
  } else {
    console.error('Usage: gsd-economy --on | --off');
    process.exit(1);
  }
}
