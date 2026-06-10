#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Returns parsed JSON from filePath if it exists, otherwise returns {}.
 */
function readJsonOrEmpty(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_err) {
    // Malformed or unreadable — treat as empty
  }
  return {};
}

/**
 * Resolve phase pacing delay in seconds (ADV-01).
 * Config hooks.phase_delay_secs overrides GSD_PHASE_DELAY_SECS when the key is present.
 *
 * @param {string} cwd - Project root (hook invocation cwd)
 * @returns {number} Non-negative integer seconds
 */
function resolveDelaySecs(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const config = readJsonOrEmpty(configPath);
  const hooks = config.hooks;

  if (hooks && Object.prototype.hasOwnProperty.call(hooks, 'phase_delay_secs')) {
    const parsed = parseInt(hooks.phase_delay_secs, 10);
    if (!isNaN(parsed)) {
      return Math.max(0, parsed);
    }
  }

  const rawDelay = parseInt(process.env.GSD_PHASE_DELAY_SECS, 10);
  return isNaN(rawDelay) ? 15 : Math.max(0, rawDelay);
}

module.exports = {
  readJsonOrEmpty,
  resolveDelaySecs,
};

if (require.main === module) {
  const lockPath = path.join(process.cwd(), '.planning', 'economy.lock');
  const delaySecs = resolveDelaySecs(process.cwd());

  // PACE-02: economy mode already active — 429 guard cooldown supersedes pacing
  if (fs.existsSync(lockPath)) {
    console.log('[gsd-phase-pacer] Economy mode active — skipping pacing delay');
    process.exit(0);
  }

  // Zero delay: no output, exit immediately
  if (delaySecs === 0) {
    process.exit(0);
  }

  // PACE-01: apply configurable pacing delay
  console.log(`[gsd-phase-pacer] Pacing delay: ${delaySecs}s`);
  setTimeout(() => process.exit(0), delaySecs * 1000);
}
