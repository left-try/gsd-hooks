'use strict';

const path = require('path');

/**
 * Parse hook stdin JSON; return {} on empty or malformed input.
 *
 * @param {string|Buffer} buffer
 * @returns {object}
 */
function readStdinJson(buffer) {
  const text = (buffer || '').toString().trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_err) {
    return {};
  }
}

/**
 * Emit JSON-only stdout (Gemini/Codex hook contract).
 *
 * @param {object} payload
 */
function emitJsonStdout(payload) {
  process.stdout.write(JSON.stringify(payload) + '\n');
}

/**
 * Resolve session key from stdin input or transcript path.
 *
 * @param {object} input
 * @param {string} transcriptPath
 * @returns {string}
 */
function resolveSessionKeyFromInput(input, transcriptPath) {
  if (input && typeof input.session_id === 'string' && input.session_id) {
    return input.session_id;
  }
  if (transcriptPath) {
    return path.basename(path.dirname(transcriptPath));
  }
  return '';
}

module.exports = {
  readStdinJson,
  emitJsonStdout,
  resolveSessionKeyFromInput,
};
