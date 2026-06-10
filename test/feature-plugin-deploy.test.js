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

function pluginLibPath(homeDir, libFile) {
  return path.join(homeDir, '.claude', 'plugins', 'gsd-feature', 'lib', libFile);
}

test('appendHistoryEntry works via installed plugin lib from consumer project cwd', () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-plugin-home-'));
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-consumer-proj-'));
  try {
    const claudeDir = path.join(homeDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({ hooks: {} }));

    const install = spawnSync(NODE, [INSTALLER], {
      env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir },
      encoding: 'utf8',
    });
    assert.equal(install.status, 0, install.stderr);

    const historyLib = pluginLibPath(homeDir, 'feature-history.js');
    assert.ok(fs.existsSync(historyLib));

    const script = `
      const p = require('path');
      const h = require(process.argv[1]);
      h.appendHistoryEntry(process.argv[2], {
        slug: 'consumer-test',
        status: 'complete',
        description: 'from consumer cwd',
        date: '2026-06-10',
      });
    `;
    const result = spawnSync(NODE, ['-e', script, historyLib, projectDir], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);

    const historyFile = path.join(projectDir, '.planning', 'features', 'HISTORY.md');
    assert.ok(fs.existsSync(historyFile));
    const content = fs.readFileSync(historyFile, 'utf8');
    assert.ok(content.includes('consumer-test'));
    assert.ok(content.includes('from consumer cwd'));
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('parseFeatureFlags works via installed plugin lib', () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-plugin-home-'));
  try {
    const claudeDir = path.join(homeDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({ hooks: {} }));
    spawnSync(NODE, [INSTALLER], {
      env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir },
      encoding: 'utf8',
    });

    const shipLib = pluginLibPath(homeDir, 'feature-ship.js');
    const script = `
      const f = require(process.argv[1]);
      console.log(JSON.stringify(f.parseFeatureFlags(process.argv[2])));
    `;
    const result = spawnSync(NODE, ['-e', script, shipLib, '"dark mode" --ship'], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.description, 'dark mode');
    assert.equal(parsed.ship, true);
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});
