#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  readStdinJson,
  emitJsonStdout,
  resolveSessionKeyFromInput,
} = require('../hooks/lib/runtime-hook');

test('readStdinJson parses valid JSON', () => {
  assert.deepEqual(readStdinJson('{"cwd":"/tmp"}'), { cwd: '/tmp' });
});

test('readStdinJson returns {} on empty or malformed', () => {
  assert.deepEqual(readStdinJson(''), {});
  assert.deepEqual(readStdinJson('   '), {});
  assert.deepEqual(readStdinJson('{bad'), {});
});

test('resolveSessionKeyFromInput prefers session_id', () => {
  assert.equal(
    resolveSessionKeyFromInput({ session_id: 'abc-123' }, '/x/y/transcript.jsonl'),
    'abc-123'
  );
});

test('resolveSessionKeyFromInput falls back to transcript parent dir', () => {
  assert.equal(resolveSessionKeyFromInput({}, '/path/sess-9/transcript.jsonl'), 'sess-9');
  assert.equal(resolveSessionKeyFromInput({}, ''), '');
});
