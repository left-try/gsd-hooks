#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const GUARD = path.resolve(__dirname, '..', 'hooks', 'gsd-429-guard.js');
const ECONOMY = path.resolve(__dirname, '..', 'hooks', 'gsd-economy.js');
const NODE = process.execPath;

const {
  computeCooldownSecs,
  resolveSessionKey,
  readBackoffState,
  writeBackoffState,
  incrementStrike,
  detectRateLimit,
} = require('../hooks/gsd-429-guard');

// ---------------------------------------------------------------------------
// Unit tests — pure helpers
// ---------------------------------------------------------------------------
test('computeCooldownSecs ladder: 60 → 120 → 240 capped', () => {
  assert.equal(computeCooldownSecs(1), 60);
  assert.equal(computeCooldownSecs(2), 120);
  assert.equal(computeCooldownSecs(3), 240);
  assert.equal(computeCooldownSecs(99), 240);
});

test('resolveSessionKey uses parent directory basename', () => {
  assert.equal(resolveSessionKey('/path/to/session-abc/transcript.jsonl'), 'session-abc');
  assert.equal(resolveSessionKey(''), '');
});

test('incrementStrike resets on sessionKey change', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-guard-unit-'));
  const backoffPath = path.join(tmpDir, 'backoff.json');
  try {
    assert.equal(incrementStrike(backoffPath, 'session-a'), 1);
    assert.equal(incrementStrike(backoffPath, 'session-a'), 2);
    assert.equal(incrementStrike(backoffPath, 'session-b'), 1);
    const state = readBackoffState(backoffPath);
    assert.equal(state.sessionKey, 'session-b');
    assert.equal(state.strikeCount, 1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('readBackoffState returns defaults for missing file', () => {
  const state = readBackoffState(path.join(os.tmpdir(), 'nonexistent-backoff.json'));
  assert.deepEqual(state, { sessionKey: '', strikeCount: 0 });
});

test('detectRateLimit finds 429 signals', () => {
  const tmpFile = path.join(os.tmpdir(), `gsd-guard-detect-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, 'HTTP 429 Too Many Requests');
  try {
    assert.equal(detectRateLimit(tmpFile), true);
    fs.writeFileSync(tmpFile, 'all good');
    assert.equal(detectRateLimit(tmpFile), false);
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

// ---------------------------------------------------------------------------
// Integration helpers
// ---------------------------------------------------------------------------
function runGuard(cwd, envOverrides = {}) {
  const env = Object.assign({}, process.env, envOverrides);
  const start = Date.now();
  const result = spawnSync(NODE, [GUARD], { cwd, env, encoding: 'utf8' });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    durationMs: Date.now() - start,
  };
}

function makeTmpDirWithTranscript(sessionId, content) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-guard-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  const transcriptDir = path.join(tmpDir, 'transcripts', sessionId);
  fs.mkdirSync(transcriptDir, { recursive: true });
  const transcriptPath = path.join(transcriptDir, 'transcript.jsonl');
  fs.writeFileSync(transcriptPath, content);
  return { tmpDir, transcriptPath };
}

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------
test('first 429 in session: 60s message, strike 1, economy.lock, log entry', () => {
  const { tmpDir, transcriptPath } = makeTmpDirWithTranscript('sess-one', 'error 429 rate limit');
  try {
    const { status, stdout } = runGuard(tmpDir, {
      CLAUDE_TRANSCRIPT_PATH: transcriptPath,
      GSD_BACKOFF_TEST_MS: '50',
    });
    assert.equal(status, 0);
    assert.ok(stdout.includes('cooling down 60s'));
    assert.ok(stdout.includes('strike 1'));

    const backoff = readBackoffState(path.join(tmpDir, '.planning', 'rate-limit-backoff.json'));
    assert.equal(backoff.sessionKey, 'sess-one');
    assert.equal(backoff.strikeCount, 1);

    assert.ok(fs.existsSync(path.join(tmpDir, '.planning', 'economy.lock')));

    const logRaw = fs.readFileSync(path.join(tmpDir, '.planning', 'rate-limit-log.json'), 'utf8');
    const log = JSON.parse(logRaw);
    assert.ok(Array.isArray(log) && log.length >= 1);
    assert.equal(log[log.length - 1].strikeCount, 1);
    assert.equal(log[log.length - 1].cooldownSecs, 60);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('second 429 same session: 120s message, strike 2', () => {
  const { tmpDir, transcriptPath } = makeTmpDirWithTranscript('sess-two', '429');
  try {
    writeBackoffState(path.join(tmpDir, '.planning', 'rate-limit-backoff.json'), {
      sessionKey: 'sess-two',
      strikeCount: 1,
    });
    const { status, stdout } = runGuard(tmpDir, {
      CLAUDE_TRANSCRIPT_PATH: transcriptPath,
      GSD_BACKOFF_TEST_MS: '50',
    });
    assert.equal(status, 0);
    assert.ok(stdout.includes('cooling down 120s'));
    assert.ok(stdout.includes('strike 2'));

    const backoff = readBackoffState(path.join(tmpDir, '.planning', 'rate-limit-backoff.json'));
    assert.equal(backoff.strikeCount, 2);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('new session resets strike count to 1', () => {
  const { tmpDir, transcriptPath } = makeTmpDirWithTranscript('new-session', '429');
  try {
    writeBackoffState(path.join(tmpDir, '.planning', 'rate-limit-backoff.json'), {
      sessionKey: 'old-session',
      strikeCount: 5,
    });
    const { status, stdout } = runGuard(tmpDir, {
      CLAUDE_TRANSCRIPT_PATH: transcriptPath,
      GSD_BACKOFF_TEST_MS: '50',
    });
    assert.equal(status, 0);
    assert.ok(stdout.includes('cooling down 60s'));
    assert.ok(stdout.includes('strike 1'));

    const backoff = readBackoffState(path.join(tmpDir, '.planning', 'rate-limit-backoff.json'));
    assert.equal(backoff.sessionKey, 'new-session');
    assert.equal(backoff.strikeCount, 1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('no 429 in transcript exits immediately without backoff write', () => {
  const { tmpDir, transcriptPath } = makeTmpDirWithTranscript('sess-clean', 'all good here');
  try {
    const { status, stdout, durationMs } = runGuard(tmpDir, {
      CLAUDE_TRANSCRIPT_PATH: transcriptPath,
    });
    assert.equal(status, 0);
    assert.equal(stdout.trim(), '');
    assert.ok(durationMs < 500);
    assert.ok(!fs.existsSync(path.join(tmpDir, '.planning', 'rate-limit-backoff.json')));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('gsd-429-guard.js passes syntax check', () => {
  const result = spawnSync(NODE, ['--check', GUARD], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
