#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const README = path.resolve(__dirname, '..', 'README.md');

const REQUIRED = [
  'npx gsd-hooks',
  'Claude Code',
  'Gemini CLI',
  'Codex',
  'gsd-phase-pacer',
  'gsd-429-guard',
  'gsd-gemini-before',
  'gsd-codex-429-guard',
  'hooks.phase_delay_secs',
  'GSD_PHASE_DELAY_SECS',
  'gsd-economy',
  '/gsd-feature',
  '.planning/features/',
  '--ship',
  'HISTORY.md',
  '60',
  '120',
  '240',
];

test('README.md exists with minimum content', () => {
  assert.ok(fs.existsSync(README));
  const content = fs.readFileSync(README, 'utf8');
  const lines = content.split('\n');
  assert.ok(lines.length >= 120, `Expected ≥120 lines, got ${lines.length}`);
  for (const token of REQUIRED) {
    assert.ok(content.includes(token), `README missing required string: ${token}`);
  }
});
