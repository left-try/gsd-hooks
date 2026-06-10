#!/usr/bin/env node
'use strict';

const path = require('path');
const { runGuard } = require('./gsd-429-guard');
const { readStdinJson, emitJsonStdout, resolveSessionKeyFromInput } = require('./lib/runtime-hook');

async function runGeminiAfter(input) {
  const cwd =
    typeof input.cwd === 'string' ? path.resolve(input.cwd) : process.cwd();
  const transcriptPath =
    typeof input.transcript_path === 'string' ? input.transcript_path : '';
  const sessionKey = resolveSessionKeyFromInput(input, transcriptPath);

  if (transcriptPath) {
    console.error('[gsd-gemini-after] scanning transcript for rate limits');
    await runGuard({ transcriptPath, cwd, sessionKey });
  }

  emitJsonStdout({ suppressOutput: true });
}

module.exports = { runGeminiAfter };

if (require.main === module) {
  (async () => {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = readStdinJson(Buffer.concat(chunks));
    await runGeminiAfter(input);
    process.exit(0);
  })();
}
