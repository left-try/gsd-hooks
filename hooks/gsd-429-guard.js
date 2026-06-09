#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { activate } = require('./gsd-economy');

// Resolve paths relative to cwd (project root where hooks are invoked from)
const transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH;
const logPath = path.join(process.cwd(), '.planning', 'rate-limit-log.json');

/**
 * 429 signal strings to scan for in transcript content (case-sensitive).
 * Covers the four known representations of an Anthropic rate-limit response.
 */
const RATE_LIMIT_SIGNALS = ['429', 'rate_limit_error', 'Too Many Requests', 'rate limit'];

/**
 * Reads the file at filePath as UTF-8 and returns true if any RATE_LIMIT_SIGNALS
 * string is found in the content.  Returns false if the file cannot be read
 * (ENOENT or any other error) — missing transcript is not an error condition.
 *
 * @param {string} filePath - Absolute or relative path to the transcript file.
 * @returns {boolean}
 */
function detectRateLimit(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_err) {
    return false;
  }
  return RATE_LIMIT_SIGNALS.some((signal) => content.includes(signal));
}

/**
 * Reads the existing JSON array from logPath (or [] if absent/unreadable),
 * pushes entry onto the array, then writes back as pretty-printed JSON.
 * Creates the .planning/ directory if it does not exist.
 *
 * @param {string} logPath - Path to rate-limit-log.json.
 * @param {{ timestamp: string, event: string, source: string }} entry
 */
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

/**
 * Returns a Promise that resolves after ms milliseconds.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Main async IIFE — runs when the hook fires as a Stop/SubagentStop hook
(async () => {
  // Guard: no transcript path set — nothing to scan, exit silently
  if (!transcriptPath) {
    process.exit(0);
  }

  // Guard: no 429 signals in transcript — no action needed
  if (!detectRateLimit(transcriptPath)) {
    process.exit(0);
  }

  // 429 detected — begin recovery sequence (RATE-02, RATE-03, RATE-04)

  // RATE-02: Activate economy mode (idempotent — safe even if already active)
  activate();

  // RATE-04: Append timestamped event to rate-limit log
  appendLog(logPath, {
    timestamp: new Date().toISOString(),
    event: '429_detected',
    source: transcriptPath,
  });

  // RATE-03: 60-second cooldown so Stop/SubagentStop chain waits before next phase
  console.log('[gsd-429-guard] Rate limit detected — economy mode activated, cooling down 60s');
  await sleep(60_000);

  process.exit(0);
})();
