#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runCodexGuard } = require('../hooks/gsd-codex-429-guard');

test('runCodexGuard with 429 transcript creates economy.lock', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-codex-guard-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(path.join(planningDir, 'config.json'), '{}');

  const transcriptDir = path.join(tmpDir, 'transcripts', 'codex-sess');
  fs.mkdirSync(transcriptDir, { recursive: true });
  const transcriptPath = path.join(transcriptDir, 'agent.jsonl');
  fs.writeFileSync(transcriptPath, 'error 429 rate limit');

  const prev = process.env.GSD_BACKOFF_TEST_MS;
  process.env.GSD_BACKOFF_TEST_MS = '10';
  try {
    await runCodexGuard({
      cwd: tmpDir,
      agent_transcript_path: transcriptPath,
      session_id: 'codex-sess',
    });
    assert.ok(fs.existsSync(path.join(tmpDir, '.planning', 'economy.lock')));
  } finally {
    if (prev === undefined) delete process.env.GSD_BACKOFF_TEST_MS;
    else process.env.GSD_BACKOFF_TEST_MS = prev;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runCodexGuard with no transcript path does not create economy.lock', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-codex-guard-'));
  try {
    await runCodexGuard({ cwd: tmpDir });
    assert.ok(!fs.existsSync(path.join(tmpDir, '.planning', 'economy.lock')));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
