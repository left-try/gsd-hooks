#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  parseFeatureFlags,
  canShip,
  buildFeaturePrBody,
  resolveBaseBranch,
  featureBranchName,
} = require('../lib/feature-ship');

test('parseFeatureFlags extracts --ship and --economy', () => {
  assert.deepEqual(parseFeatureFlags('"add dark mode" --ship --economy'), {
    description: 'add dark mode',
    ship: true,
    economy: true,
  });
  assert.deepEqual(parseFeatureFlags('"only economy" --economy'), {
    description: 'only economy',
    ship: false,
    economy: true,
  });
});

test('canShip gates on overall pass and complete status', () => {
  assert.deepEqual(canShip({ overallPass: true, summaryStatus: 'complete' }), { ok: true });
  const blocked = canShip({
    overallPass: false,
    summaryStatus: 'incomplete',
    failedCriteria: ['criterion 2'],
  });
  assert.equal(blocked.ok, false);
  assert.ok(blocked.reason.includes('criterion 2'));
});

test('buildFeaturePrBody includes summary sections', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feat-ship-'));
  const featureDir = path.join(tmp, 'feat');
  fs.mkdirSync(featureDir, { recursive: true });
  fs.writeFileSync(
    path.join(featureDir, 'SUMMARY.md'),
    '# Summary\n\n## Files Created/Modified\n\n- README.md\n\n## Verification\n\nCriterion 1 — PASS\n'
  );
  try {
    const body = buildFeaturePrBody({
      slug: 'readme',
      description: 'Add README',
      featureDir,
    });
    assert.ok(body.includes('Feature: Add README'));
    assert.ok(body.includes('README.md'));
    assert.ok(body.includes('PASS'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('resolveBaseBranch defaults to main', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feat-ship-'));
  try {
    assert.equal(resolveBaseBranch(tmp), 'main');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('featureBranchName prefixes slug', () => {
  assert.equal(featureBranchName('dark-mode'), 'feature/dark-mode');
});
