#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const presetPath = path.join(__dirname, '..', 'presets', 'economy.json');

function resolvePaths(cwd) {
  const baseCwd = cwd || process.cwd();
  const planningDir = path.join(baseCwd, '.planning');
  return {
    baseCwd,
    planningDir,
    configPath: path.join(planningDir, 'config.json'),
    lockPath: path.join(planningDir, 'economy.lock'),
    restorePath: path.join(planningDir, 'economy-restore.json'),
  };
}

function readJsonOrEmpty(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_err) {
    // Malformed or unreadable
  }
  return {};
}

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
  }
  return snapshot;
}

/**
 * @param {{ cwd?: string }} [options]
 */
function activate(options = {}) {
  const { planningDir, configPath, lockPath, restorePath } = resolvePaths(options.cwd);

  if (fs.existsSync(lockPath)) {
    console.log('Economy mode already active');
    return;
  }

  const original = readJsonOrEmpty(configPath);
  const diff = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
  const snapshot = extractSnapshot(original, diff);

  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(restorePath, JSON.stringify(snapshot, null, 2));

  const patched = deepMerge(original, diff);
  fs.writeFileSync(configPath, JSON.stringify(patched, null, 2));
  fs.writeFileSync(lockPath, new Date().toISOString());

  console.log('Economy mode activated');
}

/**
 * @param {{ cwd?: string }} [options]
 */
function deactivate(options = {}) {
  const { configPath, lockPath, restorePath } = resolvePaths(options.cwd);

  if (!fs.existsSync(lockPath)) {
    console.log('Economy mode not active');
    if (require.main === module) {
      process.exit(0);
    }
    return;
  }

  if (!fs.existsSync(restorePath)) {
    console.error(
      'Restore snapshot missing — cannot safely restore; delete economy.lock manually'
    );
    if (require.main === module) {
      process.exit(1);
    }
    throw new Error('Restore snapshot missing');
  }

  const current = readJsonOrEmpty(configPath);
  const restore = JSON.parse(fs.readFileSync(restorePath, 'utf8'));
  const restored = deepMerge(current, restore);
  fs.writeFileSync(configPath, JSON.stringify(restored, null, 2));

  fs.unlinkSync(lockPath);
  fs.unlinkSync(restorePath);

  console.log('Economy mode deactivated — config restored');
}

module.exports = {
  activate,
  deactivate,
  readJsonOrEmpty,
  deepMerge,
  resolvePaths,
};

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
