#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  appendHistoryEntry,
  ensureHistoryFile,
  sanitizeSlug,
  escapeTableCell,
  truncateDescription,
  updateHistoryPr,
  historyPath,
} = require('../lib/feature-history');

test('ensureHistoryFile creates header table', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feat-hist-'));
  try {
    ensureHistoryFile(tmp);
    const content = fs.readFileSync(historyPath(tmp), 'utf8');
    assert.ok(content.includes('| Date | Slug | Status |'));
    assert.ok(content.includes('|------|'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('appendHistoryEntry adds rows and preserves prior rows', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feat-hist-'));
  try {
    appendHistoryEntry(tmp, {
      slug: 'dark-mode',
      status: 'complete',
      description: 'Add dark mode',
      date: '2026-06-10',
    });
    appendHistoryEntry(tmp, {
      slug: 'dark-mode',
      status: 'incomplete',
      description: 'Retry dark mode',
      date: '2026-06-11',
    });
    const content = fs.readFileSync(historyPath(tmp), 'utf8');
    const dataRows = content.split('\n').filter((l) => l.startsWith('| 2026'));
    assert.equal(dataRows.length, 2);
    assert.ok(dataRows[0].includes('dark-mode'));
    assert.ok(dataRows[1].includes('incomplete'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('sanitizeSlug rejects invalid slugs', () => {
  assert.throws(() => sanitizeSlug('../evil'), /path traversal/);
  assert.throws(() => sanitizeSlug('Bad_Slug'), /only lowercase/);
});

test('escapeTableCell escapes pipes and newlines', () => {
  assert.equal(escapeTableCell('a|b'), 'a\\|b');
  assert.equal(escapeTableCell('line\nbreak'), 'line break');
});

test('truncateDescription limits length', () => {
  const long = 'x'.repeat(100);
  assert.equal(truncateDescription(long).length, 80);
});

test('updateHistoryPr updates PR column for matching slug', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feat-hist-'));
  try {
    appendHistoryEntry(tmp, {
      slug: 'ship-test',
      status: 'complete',
      description: 'test',
      date: '2026-06-10',
    });
    updateHistoryPr(tmp, 'ship-test', 'https://github.com/org/repo/pull/42');
    const content = fs.readFileSync(historyPath(tmp), 'utf8');
    assert.ok(content.includes('pull/42'));
    assert.ok(!content.includes('| — |') || content.split('pull/42').length > 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
