#!/usr/bin/env node
'use strict';

/**
 * Tests for hooks/gsd-phase-pacer.js
 *
 * Uses Node.js built-in test runner (node --test).
 * Spawns the pacer as a child process so environment variables
 * and the lock file path are isolated per test.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PACER = path.resolve(__dirname, '..', 'hooks', 'gsd-phase-pacer.js');
const NODE = process.execPath;

/**
 * Run the pacer from a given cwd with optional env overrides.
 * Returns { status, stdout, stderr, durationMs }.
 */
function runPacer(cwd, envOverrides = {}) {
  const env = Object.assign({}, process.env, envOverrides);
  const start = Date.now();
  const result = spawnSync(NODE, [PACER], { cwd, env, encoding: 'utf8' });
  const durationMs = Date.now() - start;
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    durationMs,
  };
}

/**
 * Create a temporary directory with an optional economy.lock file.
 * Returns the tmp dir path; caller is responsible for cleanup.
 */
function makeTmpDir(withLock = false) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-pacer-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  if (withLock) {
    fs.writeFileSync(path.join(planningDir, 'economy.lock'), new Date().toISOString());
  }
  return tmpDir;
}

// ---------------------------------------------------------------------------
// Test 1: Syntax check — the file must exist and be valid JS
// ---------------------------------------------------------------------------
test('gsd-phase-pacer.js passes syntax check', () => {
  const result = spawnSync(NODE, ['--check', PACER], { encoding: 'utf8' });
  assert.equal(result.status, 0, `Syntax check failed: ${result.stderr}`);
});

// ---------------------------------------------------------------------------
// Test 2: GSD_PHASE_DELAY_SECS=0 → exits immediately (< 500ms), no output
// ---------------------------------------------------------------------------
test('exits immediately with no output when GSD_PHASE_DELAY_SECS=0', () => {
  const tmpDir = makeTmpDir(false);
  try {
    const { status, stdout, durationMs } = runPacer(tmpDir, { GSD_PHASE_DELAY_SECS: '0' });
    assert.equal(status, 0, 'Exit code should be 0');
    assert.equal(stdout.trim(), '', 'Should produce no stdout output');
    assert.ok(durationMs < 500, `Should exit in < 500ms but took ${durationMs}ms`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 3: GSD_PHASE_DELAY_SECS=1 → waits ~1s and prints the delay message
// ---------------------------------------------------------------------------
test('prints pacing delay message and waits ~1s when GSD_PHASE_DELAY_SECS=1', () => {
  const tmpDir = makeTmpDir(false);
  try {
    const { status, stdout, durationMs } = runPacer(tmpDir, { GSD_PHASE_DELAY_SECS: '1' });
    assert.equal(status, 0, 'Exit code should be 0');
    assert.ok(
      stdout.includes('[gsd-phase-pacer] Pacing delay: 1s'),
      `Expected pacing message but got: ${stdout}`
    );
    assert.ok(durationMs >= 900, `Should take at least 900ms but took ${durationMs}ms`);
    assert.ok(durationMs < 2500, `Should take less than 2500ms but took ${durationMs}ms`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 4: economy.lock present → exits immediately and prints bypass message,
//         regardless of GSD_PHASE_DELAY_SECS value
// ---------------------------------------------------------------------------
test('skips delay and prints bypass message when economy.lock is present', () => {
  const tmpDir = makeTmpDir(true); // creates .planning/economy.lock
  try {
    const { status, stdout, durationMs } = runPacer(tmpDir, { GSD_PHASE_DELAY_SECS: '30' });
    assert.equal(status, 0, 'Exit code should be 0');
    assert.ok(
      stdout.includes('[gsd-phase-pacer] Economy mode active — skipping pacing delay'),
      `Expected bypass message but got: ${stdout}`
    );
    assert.ok(durationMs < 500, `Should exit immediately (< 500ms) but took ${durationMs}ms`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 5: Default delay (GSD_PHASE_DELAY_SECS unset) → prints "15s" message
//         (We only check the message; we do NOT wait 15s in CI)
// ---------------------------------------------------------------------------
test('uses 15s default delay when GSD_PHASE_DELAY_SECS is unset (message check only)', () => {
  const tmpDir = makeTmpDir(false);
  // We kill after 1.5s to avoid waiting the full 15s in tests
  try {
    const env = Object.assign({}, process.env);
    delete env.GSD_PHASE_DELAY_SECS;
    const { spawnSync: spawn2 } = require('node:child_process');
    // Use timeout=1500 so process is killed quickly; we only care about stdout content
    const result = spawn2(NODE, [PACER], {
      cwd: tmpDir,
      env,
      encoding: 'utf8',
      timeout: 1500,
    });
    // The process will be killed by timeout (status null or non-zero) — that's fine
    // We only verify the message was printed
    assert.ok(
      (result.stdout || '').includes('[gsd-phase-pacer] Pacing delay: 15s'),
      `Expected "Pacing delay: 15s" in stdout but got: ${result.stdout}`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 6: Non-numeric GSD_PHASE_DELAY_SECS → defaults to 15s (message check)
// ---------------------------------------------------------------------------
test('defaults to 15s when GSD_PHASE_DELAY_SECS is non-numeric', () => {
  const tmpDir = makeTmpDir(false);
  try {
    const { spawnSync: spawn2 } = require('node:child_process');
    const env = Object.assign({}, process.env, { GSD_PHASE_DELAY_SECS: 'abc' });
    const result = spawn2(NODE, [PACER], {
      cwd: tmpDir,
      env,
      encoding: 'utf8',
      timeout: 1500,
    });
    assert.ok(
      (result.stdout || '').includes('[gsd-phase-pacer] Pacing delay: 15s'),
      `Expected "Pacing delay: 15s" in stdout for non-numeric env var but got: ${result.stdout}`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 7: Pacer does not create or modify any files in cwd
// ---------------------------------------------------------------------------
test('pacer does not create or modify any files when running', () => {
  const tmpDir = makeTmpDir(false);
  try {
    // Note the set of files before running
    const before = fs.readdirSync(path.join(tmpDir, '.planning')).sort();
    runPacer(tmpDir, { GSD_PHASE_DELAY_SECS: '0' });
    const after = fs.readdirSync(path.join(tmpDir, '.planning')).sort();
    assert.deepEqual(after, before, 'No files should be created or deleted in .planning/');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
