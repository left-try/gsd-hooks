#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const INSTALLER = path.resolve(__dirname, '..', 'bin', 'install.js');
const NODE = process.execPath;

function makeTmpHome(opts = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-gemini-install-'));
  if (opts.claudeSettings) {
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(opts.claudeSettings, null, 2)
    );
  }
  if (opts.geminiSettings) {
    const geminiDir = path.join(tmpDir, '.gemini');
    fs.mkdirSync(geminiDir, { recursive: true });
    fs.writeFileSync(
      path.join(geminiDir, 'settings.json'),
      JSON.stringify(opts.geminiSettings, null, 2)
    );
  }
  return tmpDir;
}

function runInstaller(tmpDir) {
  return spawnSync(NODE, [INSTALLER], {
    env: { ...process.env, HOME: tmpDir, USERPROFILE: tmpDir },
    encoding: 'utf8',
  });
}

test('GEMINI-01: no gemini settings.json → WARNING, exit 0', () => {
  const tmpDir = makeTmpHome({ claudeSettings: { hooks: {} } });
  try {
    const result = runInstaller(tmpDir);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.includes('WARNING'));
    assert.ok(result.stdout.includes('Gemini'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('GEMINI-02: wires BeforeAgent and AfterAgent hooks', () => {
  const tmpDir = makeTmpHome({
    claudeSettings: { hooks: {} },
    geminiSettings: { hooks: {} },
  });
  try {
    const result = runInstaller(tmpDir);
    assert.equal(result.status, 0);
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.gemini', 'settings.json'), 'utf8')
    );
    assert.ok(
      settings.hooks.BeforeAgent.some((e) =>
        e.hooks.some((h) => h.command.includes('gsd-gemini-before'))
      )
    );
    assert.ok(
      settings.hooks.AfterAgent.some((e) =>
        e.hooks.some((h) => h.command.includes('gsd-gemini-after'))
      )
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('GEMINI-03: idempotent second run', () => {
  const tmpDir = makeTmpHome({
    claudeSettings: { hooks: {} },
    geminiSettings: { hooks: {} },
  });
  try {
    runInstaller(tmpDir);
    const second = runInstaller(tmpDir);
    assert.equal(second.status, 0);
    assert.ok(second.stdout.includes('ALREADY PRESENT'));
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.gemini', 'settings.json'), 'utf8')
    );
    assert.equal(
      settings.hooks.BeforeAgent.filter((e) =>
        e.hooks.some((h) => h.command.includes('gsd-gemini-before'))
      ).length,
      1
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('GEMINI-04: restore snapshot created on first wire', () => {
  const tmpDir = makeTmpHome({
    claudeSettings: { hooks: {} },
    geminiSettings: { hooks: {} },
  });
  try {
    runInstaller(tmpDir);
    const restorePath = path.join(tmpDir, '.gemini', 'settings-hooks-restore.json');
    assert.ok(fs.existsSync(restorePath));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
