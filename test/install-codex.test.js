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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-codex-install-'));
  if (opts.claudeSettings) {
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(opts.claudeSettings, null, 2)
    );
  }
  if (opts.codex) {
    fs.mkdirSync(path.join(tmpDir, '.codex'), { recursive: true });
  }
  return tmpDir;
}

function runInstaller(tmpDir) {
  return spawnSync(NODE, [INSTALLER], {
    env: { ...process.env, HOME: tmpDir, USERPROFILE: tmpDir },
    encoding: 'utf8',
  });
}

test('CODEX-01: no .codex dir → WARNING, exit 0', () => {
  const tmpDir = makeTmpHome({ claudeSettings: { hooks: {} } });
  try {
    const result = runInstaller(tmpDir);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.includes('WARNING'));
    assert.ok(result.stdout.includes('Codex'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CODEX-02: wires SubagentStop hook', () => {
  const tmpDir = makeTmpHome({ claudeSettings: { hooks: {} }, codex: true });
  try {
    const result = runInstaller(tmpDir);
    assert.equal(result.status, 0);
    const hooksPath = path.join(tmpDir, '.codex', 'hooks.json');
    assert.ok(fs.existsSync(hooksPath));
    const settings = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    assert.ok(
      settings.hooks.SubagentStop.some((e) =>
        e.hooks.some((h) => h.command.includes('gsd-codex-429-guard'))
      )
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CODEX-03: idempotent second run', () => {
  const tmpDir = makeTmpHome({ claudeSettings: { hooks: {} }, codex: true });
  try {
    runInstaller(tmpDir);
    const second = runInstaller(tmpDir);
    assert.equal(second.status, 0);
    assert.ok(second.stdout.includes('ALREADY PRESENT'));
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.codex', 'hooks.json'), 'utf8')
    );
    assert.equal(
      settings.hooks.SubagentStop.filter((e) =>
        e.hooks.some((h) => h.command.includes('gsd-codex-429-guard'))
      ).length,
      1
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CODEX-04: hooks-restore.json created on first wire', () => {
  const tmpDir = makeTmpHome({ claudeSettings: { hooks: {} }, codex: true });
  try {
    runInstaller(tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, '.codex', 'hooks-restore.json')));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
