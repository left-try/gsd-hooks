#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Resolve lock file path relative to the cwd where the hook is invoked
const lockPath = path.join(process.cwd(), '.planning', 'economy.lock');

// Parse delay from environment variable; default to 15s if unset or non-numeric
const rawDelay = parseInt(process.env.GSD_PHASE_DELAY_SECS, 10);
const delaySecs = isNaN(rawDelay) ? 15 : Math.max(0, rawDelay);

// PACE-02: economy mode already active — 60s cooldown from 429 guard supersedes pacing
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
