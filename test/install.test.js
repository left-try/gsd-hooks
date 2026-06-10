#!/usr/bin/env node
'use strict';

/**
 * Tests for bin/install.js
 *
 * Uses Node.js built-in test runner (node --test).
 * Each test spawns bin/install.js as a child process with an isolated
 * HOME / USERPROFILE pointing to a fresh temp directory.  This ensures
 * tests cannot touch the developer's real ~/.claude/settings.json.
 *
 * Covers:
 *   Test 1 — INST-01: gsd-core absent (no settings.json) → exit 0 + WARNING
 *   Test 2 — INST-02: hook wiring → Stop/SubagentStop entries added to settings.json
 *   Test 3 — INST-03: skill copy → ~/.claude/plugins/gsd-feature/SKILL.md created
 *   Test 4 — INST-04: idempotency → running twice produces exactly 1 matching entry each
 *   Test 5 — INST-05: summary output → WIRED / COPIED first run, ALREADY PRESENT second run
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const INSTALLER = path.resolve(__dirname, '..', 'bin', 'install.js');
const NODE = process.execPath;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a fresh isolated temp directory.
 * Optionally creates ~/.claude/settings.json (relative to tmpDir) with the
 * given content.
 */
function makeTmpHome(settingsContent) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-install-test-'));
  if (settingsContent !== undefined) {
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(settingsContent, null, 2)
    );
  }
  return tmpDir;
}

/**
 * Run bin/install.js with HOME and USERPROFILE pointing to tmpDir.
 * Returns { status, stdout, stderr }.
 */
function runInstaller(tmpDir) {
  const result = spawnSync(
    NODE,
    [INSTALLER],
    {
      env: { ...process.env, HOME: tmpDir, USERPROFILE: tmpDir },
      encoding: 'utf8',
    }
  );
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

/**
 * Read and parse settings.json from tmpDir.
 */
function readSettings(tmpDir) {
  const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}

// ---------------------------------------------------------------------------
// Test 1 — INST-01: no settings.json → exit 0 and stdout contains 'WARNING'
// ---------------------------------------------------------------------------
test('INST-01: exits 0 with WARNING when settings.json is absent', () => {
  const tmpDir = makeTmpHome(); // no settings.json
  try {
    const { status, stdout } = runInstaller(tmpDir);
    assert.equal(status, 0, `Expected exit 0 but got ${status}`);
    assert.ok(
      stdout.includes('WARNING'),
      `Expected 'WARNING' in stdout but got:\n${stdout}`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 2 — INST-02: hook wiring → settings.json gains Stop and SubagentStop entries
// ---------------------------------------------------------------------------
test('INST-02: wires gsd-phase-pacer into Stop and gsd-429-guard into SubagentStop', () => {
  const tmpDir = makeTmpHome({ hooks: {} });
  try {
    const { status } = runInstaller(tmpDir);
    assert.equal(status, 0, `Installer exited with status ${status}`);

    const settings = readSettings(tmpDir);

    // Stop hook: at least one entry whose nested hooks[].command includes 'gsd-phase-pacer.js'
    assert.ok(
      Array.isArray(settings.hooks.Stop),
      'settings.hooks.Stop should be an array'
    );
    const pacerEntry = settings.hooks.Stop.some(
      (entry) =>
        entry.hooks &&
        entry.hooks.some(
          (h) => h.command && h.command.includes('gsd-phase-pacer')
        )
    );
    assert.ok(pacerEntry, 'Expected a Stop entry with gsd-phase-pacer in command');

    // SubagentStop hook: at least one entry whose nested hooks[].command includes 'gsd-429-guard.js'
    assert.ok(
      Array.isArray(settings.hooks.SubagentStop),
      'settings.hooks.SubagentStop should be an array'
    );
    const guardEntry = settings.hooks.SubagentStop.some(
      (entry) =>
        entry.hooks &&
        entry.hooks.some(
          (h) => h.command && h.command.includes('gsd-429-guard')
        )
    );
    assert.ok(guardEntry, 'Expected a SubagentStop entry with gsd-429-guard in command');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 3 — INST-03: skill copy → plugins/gsd-feature/SKILL.md exists after install
// ---------------------------------------------------------------------------
test('INST-03: copies /gsd-feature SKILL.md to plugins/gsd-feature/SKILL.md', () => {
  const tmpDir = makeTmpHome({ hooks: {} });
  try {
    const { status } = runInstaller(tmpDir);
    assert.equal(status, 0, `Installer exited with status ${status}`);

    const skillDest = path.join(tmpDir, '.claude', 'plugins', 'gsd-feature', 'SKILL.md');
    assert.ok(
      fs.existsSync(skillDest),
      `Expected ${skillDest} to exist after install`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('INST-06: copies feature libs to plugins/gsd-feature/lib/', () => {
  const tmpDir = makeTmpHome({ hooks: {} });
  try {
    const { status } = runInstaller(tmpDir);
    assert.equal(status, 0);
    const libDir = path.join(tmpDir, '.claude', 'plugins', 'gsd-feature', 'lib');
    assert.ok(fs.existsSync(path.join(libDir, 'feature-history.js')));
    assert.ok(fs.existsSync(path.join(libDir, 'feature-ship.js')));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 4 — INST-04: idempotency → second install produces no duplicates
// ---------------------------------------------------------------------------
test('INST-04: running installer twice produces exactly 1 Stop and 1 SubagentStop entry', () => {
  const tmpDir = makeTmpHome({ hooks: {} });
  try {
    // First run
    const first = runInstaller(tmpDir);
    assert.equal(first.status, 0, `First run exited with status ${first.status}`);

    // Second run — same tmpDir
    const second = runInstaller(tmpDir);
    assert.equal(second.status, 0, `Second run exited with status ${second.status}`);

    const settings = readSettings(tmpDir);

    // Exactly 1 Stop entry referencing gsd-phase-pacer
    const pacerCount = settings.hooks.Stop.filter(
      (entry) =>
        entry.hooks &&
        entry.hooks.some((h) => h.command && h.command.includes('gsd-phase-pacer'))
    ).length;
    assert.equal(
      pacerCount,
      1,
      `Expected exactly 1 Stop entry for gsd-phase-pacer but found ${pacerCount}`
    );

    // Exactly 1 SubagentStop entry referencing gsd-429-guard
    const guardCount = settings.hooks.SubagentStop.filter(
      (entry) =>
        entry.hooks &&
        entry.hooks.some((h) => h.command && h.command.includes('gsd-429-guard'))
    ).length;
    assert.equal(
      guardCount,
      1,
      `Expected exactly 1 SubagentStop entry for gsd-429-guard but found ${guardCount}`
    );

    // SKILL.md still exists and was not duplicated (single file, not a dir)
    const skillDest = path.join(tmpDir, '.claude', 'plugins', 'gsd-feature', 'SKILL.md');
    assert.ok(fs.existsSync(skillDest), 'SKILL.md should still exist after second run');
    const stat = fs.statSync(skillDest);
    assert.ok(stat.isFile(), 'SKILL.md should be a file, not a directory');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 5 — INST-05: summary output strings — WIRED + COPIED first run, ALREADY PRESENT second run
// ---------------------------------------------------------------------------
test('INST-05: summary contains Install summary + WIRED + COPIED on first run, ALREADY PRESENT on second', () => {
  const tmpDir = makeTmpHome({ hooks: {} });
  try {
    // First run
    const first = runInstaller(tmpDir);
    assert.equal(first.status, 0, `First run exited with status ${first.status}`);

    assert.ok(
      first.stdout.includes('Install summary'),
      `Expected 'Install summary' in first-run stdout but got:\n${first.stdout}`
    );

    // WIRED should appear at least twice (once for Stop, once for SubagentStop)
    const wiredMatches = (first.stdout.match(/WIRED/g) || []).length;
    assert.ok(
      wiredMatches >= 2,
      `Expected at least 2 'WIRED' occurrences on first run but got ${wiredMatches}:\n${first.stdout}`
    );

    assert.ok(
      first.stdout.includes('COPIED'),
      `Expected 'COPIED' in first-run stdout but got:\n${first.stdout}`
    );

    // Second run — same tmpDir
    const second = runInstaller(tmpDir);
    assert.equal(second.status, 0, `Second run exited with status ${second.status}`);

    assert.ok(
      second.stdout.includes('ALREADY PRESENT') || second.stdout.includes('UPDATED'),
      `Expected 'ALREADY PRESENT' or 'UPDATED' in second-run stdout but got:\n${second.stdout}`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
