#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { activate } = require('./gsd-economy');

const RATE_LIMIT_SIGNALS = ['429', 'rate_limit_error', 'Too Many Requests', 'rate limit'];
const BACKOFF_SECS_LADDER = [60, 120, 240];

function computeCooldownSecs(strikeCount) {
  const n = Math.max(1, Math.floor(strikeCount));
  if (n === 1) return BACKOFF_SECS_LADDER[0];
  if (n === 2) return BACKOFF_SECS_LADDER[1];
  return BACKOFF_SECS_LADDER[2];
}

function resolveSessionKey(transcriptPath) {
  if (!transcriptPath) return '';
  return path.basename(path.dirname(transcriptPath));
}

function readBackoffState(backoffPath) {
  try {
    const raw = fs.readFileSync(backoffPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const sessionKey = typeof parsed.sessionKey === 'string' ? parsed.sessionKey : '';
      const strikeCount =
        typeof parsed.strikeCount === 'number' && Number.isFinite(parsed.strikeCount)
          ? Math.max(0, Math.floor(parsed.strikeCount))
          : 0;
      return { sessionKey, strikeCount };
    }
  } catch (_err) {
    // Missing or malformed
  }
  return { sessionKey: '', strikeCount: 0 };
}

function writeBackoffState(backoffPath, state) {
  fs.mkdirSync(path.dirname(backoffPath), { recursive: true });
  fs.writeFileSync(
    backoffPath,
    JSON.stringify({ sessionKey: state.sessionKey, strikeCount: state.strikeCount }, null, 2)
  );
}

function incrementStrike(backoffPath, sessionKey) {
  const current = readBackoffState(backoffPath);
  let strikeCount = 0;
  if (current.sessionKey === sessionKey) {
    strikeCount = current.strikeCount;
  }
  strikeCount += 1;
  writeBackoffState(backoffPath, { sessionKey, strikeCount });
  return strikeCount;
}

function detectRateLimit(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_err) {
    return false;
  }
  return RATE_LIMIT_SIGNALS.some((signal) => content.includes(signal));
}

function appendLog(logPath, entry) {
  let entries = [];
  try {
    const raw = fs.readFileSync(logPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      entries = parsed;
    }
  } catch (_err) {
    // start fresh
  }
  entries.push(entry);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(entries, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveCooldownMs(cooldownSecs) {
  const testMs = parseInt(process.env.GSD_BACKOFF_TEST_MS, 10);
  if (!isNaN(testMs) && testMs > 0) {
    return testMs;
  }
  return cooldownSecs * 1000;
}

/**
 * Core 429 recovery flow — callable from runtime adapters.
 *
 * @param {{ transcriptPath?: string, cwd?: string, sessionKey?: string }} options
 * @returns {Promise<{ activated: boolean, strikeCount?: number, cooldownSecs?: number }>}
 */
async function runGuard({ transcriptPath = '', cwd, sessionKey: sessionKeyArg } = {}) {
  const baseCwd = cwd || process.cwd();
  const logPath = path.join(baseCwd, '.planning', 'rate-limit-log.json');
  const backoffPath = path.join(baseCwd, '.planning', 'rate-limit-backoff.json');

  if (!transcriptPath || !detectRateLimit(transcriptPath)) {
    return { activated: false };
  }

  activate({ cwd: baseCwd });

  const sessionKey =
    sessionKeyArg && String(sessionKeyArg)
      ? String(sessionKeyArg)
      : resolveSessionKey(transcriptPath);
  const strikeCount = incrementStrike(backoffPath, sessionKey);
  const cooldownSecs = computeCooldownSecs(strikeCount);

  appendLog(logPath, {
    timestamp: new Date().toISOString(),
    event: '429_detected',
    source: transcriptPath,
    strikeCount,
    cooldownSecs,
  });

  const strikeLabel = strikeCount >= 3 ? '3+' : String(strikeCount);
  console.log(
    `[gsd-429-guard] Rate limit detected — economy mode activated, cooling down ${cooldownSecs}s (strike ${strikeLabel})`
  );

  await sleep(resolveCooldownMs(cooldownSecs));

  return { activated: true, strikeCount, cooldownSecs };
}

module.exports = {
  BACKOFF_SECS_LADDER,
  computeCooldownSecs,
  resolveSessionKey,
  readBackoffState,
  writeBackoffState,
  incrementStrike,
  detectRateLimit,
  appendLog,
  resolveCooldownMs,
  runGuard,
};

if (require.main === module) {
  (async () => {
    const transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH;
    if (!transcriptPath) {
      process.exit(0);
    }
    await runGuard({ transcriptPath, cwd: process.cwd() });
    process.exit(0);
  })();
}
