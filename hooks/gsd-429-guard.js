#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { activate } = require('./gsd-economy');

const RATE_LIMIT_SIGNALS = ['429', 'rate_limit_error', 'Too Many Requests', 'rate limit'];

const BACKOFF_SECS_LADDER = [60, 120, 240];

/**
 * @param {number} strikeCount - 1-based strike count within a session
 * @returns {number} Cooldown seconds (60 → 120 → 240 capped)
 */
function computeCooldownSecs(strikeCount) {
  const n = Math.max(1, Math.floor(strikeCount));
  if (n === 1) return BACKOFF_SECS_LADDER[0];
  if (n === 2) return BACKOFF_SECS_LADDER[1];
  return BACKOFF_SECS_LADDER[2];
}

/**
 * Session identity from Claude Code transcript path (parent directory basename).
 *
 * @param {string} transcriptPath
 * @returns {string}
 */
function resolveSessionKey(transcriptPath) {
  if (!transcriptPath) return '';
  return path.basename(path.dirname(transcriptPath));
}

/**
 * @param {string} backoffPath
 * @returns {{ sessionKey: string, strikeCount: number }}
 */
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
    // Missing or malformed — start fresh
  }
  return { sessionKey: '', strikeCount: 0 };
}

/**
 * @param {string} backoffPath
 * @param {{ sessionKey: string, strikeCount: number }} state
 */
function writeBackoffState(backoffPath, state) {
  fs.mkdirSync(path.dirname(backoffPath), { recursive: true });
  fs.writeFileSync(
    backoffPath,
    JSON.stringify(
      {
        sessionKey: state.sessionKey,
        strikeCount: state.strikeCount,
      },
      null,
      2
    )
  );
}

/**
 * Increment strike count for sessionKey. Resets when sessionKey changes (new session).
 *
 * @param {string} backoffPath
 * @param {string} sessionKey
 * @returns {number} New strike count (1-based)
 */
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
    // File absent or malformed — start with empty array
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
};

if (require.main === module) {
  (async () => {
    const transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH;
    const logPath = path.join(process.cwd(), '.planning', 'rate-limit-log.json');
    // Session-scoped backoff state — separate from economy.lock (ADV-02)
    const backoffPath = path.join(process.cwd(), '.planning', 'rate-limit-backoff.json');

    if (!transcriptPath) {
      process.exit(0);
    }

    if (!detectRateLimit(transcriptPath)) {
      process.exit(0);
    }

    activate();

    const sessionKey = resolveSessionKey(transcriptPath);
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
    process.exit(0);
  })();
}
