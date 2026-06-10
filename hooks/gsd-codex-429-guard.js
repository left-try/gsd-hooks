#!/usr/bin/env node
'use strict';

const path = require('path');
const { runGuard } = require('./gsd-429-guard');
const { readStdinJson, emitJsonStdout, resolveSessionKeyFromInput } = require('./lib/runtime-hook');

async function runCodexGuard(input) {
  const cwd =
    typeof input.cwd === 'string' ? path.resolve(input.cwd) : process.cwd();
  const transcriptPath =
    (typeof input.agent_transcript_path === 'string' && input.agent_transcript_path) ||
    (typeof input.transcript_path === 'string' && input.transcript_path) ||
    '';
  const sessionKey = resolveSessionKeyFromInput(input, transcriptPath);

  if (!transcriptPath) {
    emitJsonStdout({ continue: true });
    return;
  }

  console.error('[gsd-codex-429-guard] scanning transcript for rate limits');
  await runGuard({ transcriptPath, cwd, sessionKey });
  emitJsonStdout({ continue: true, suppressOutput: true });
}

module.exports = { runCodexGuard };

if (require.main === module) {
  (async () => {
    try {
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      const input = readStdinJson(Buffer.concat(chunks));
      await runCodexGuard(input);
      process.exit(0);
    } catch (err) {
      console.error('[gsd-codex-429-guard] error:', err.message);
      emitJsonStdout({ continue: true });
      process.exit(0);
    }
  })();
}
