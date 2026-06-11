#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runGeminiAfter } = require('../hooks/gsd-gemini-after');

test('runGeminiAfter with 429 transcript creates economy.lock', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-gemini-after-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(path.join(planningDir, 'config.json'), '{}');

  const transcriptDir = path.join(tmpDir, 'transcripts', 'gemini-sess');
  fs.mkdirSync(transcriptDir, { recursive: true });
  const transcriptPath = path.join(transcriptDir, 'agent.jsonl');
  fs.writeFileSync(transcriptPath, 'error 429 rate limit');

  const prev = process.env.GSD_BACKOFF_TEST_MS;
  process.env.GSD_BACKOFF_TEST_MS = '10';
  try {
    await runGeminiAfter({
      cwd: tmpDir,
      transcript_path: transcriptPath,
      session_id: 'gemini-sess',
    });
    assert.ok(fs.existsSync(path.join(tmpDir, '.planning', 'economy.lock')));
  } finally {
    if (prev === undefined) delete process.env.GSD_BACKOFF_TEST_MS;
    else process.env.GSD_BACKOFF_TEST_MS = prev;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runGeminiAfter with no transcript_path does not create economy.lock', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-gemini-after-'));
  try {
    await runGeminiAfter({ cwd: tmpDir });
    assert.ok(!fs.existsSync(path.join(tmpDir, '.planning', 'economy.lock')));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
