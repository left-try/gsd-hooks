#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { activate } = require('./gsd-economy');
const { readStdinJson, emitJsonStdout } = require('./lib/runtime-hook');

async function runGeminiBefore(input) {
  const cwd =
    typeof input.cwd === 'string' ? path.resolve(input.cwd) : process.cwd();
  const lockPath = path.join(cwd, '.planning', 'economy.lock');

  if (fs.existsSync(lockPath)) {
    console.error('[gsd-gemini-before] economy.lock present — ensuring economy mode');
    activate({ cwd });
  }

  emitJsonStdout({ suppressOutput: true });
}

module.exports = { runGeminiBefore };

if (require.main === module) {
  (async () => {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = readStdinJson(Buffer.concat(chunks));
    await runGeminiBefore(input);
    process.exit(0);
  })();
}
