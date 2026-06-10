#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');
const claudeRestorePath = path.join(os.homedir(), '.claude', 'settings-hooks-restore.json');
const geminiSettingsPath = path.join(os.homedir(), '.gemini', 'settings.json');
const geminiRestorePath = path.join(os.homedir(), '.gemini', 'settings-hooks-restore.json');
const codexDir = path.join(os.homedir(), '.codex');
const codexHooksPath = path.join(codexDir, 'hooks.json');
const codexRestorePath = path.join(codexDir, 'hooks-restore.json');

const pluginsDir = path.join(os.homedir(), '.claude', 'plugins');
const hooksDir = path.join(__dirname, '..', 'hooks');
const skillSrc = path.join(__dirname, '..', '.claude', 'skills', 'gsd-feature', 'SKILL.md');
const skillDest = path.join(pluginsDir, 'gsd-feature', 'SKILL.md');

function readJsonOrEmpty(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `${filePath} exists but is not valid JSON — aborting to avoid data loss. ` +
        `Fix the file manually first. Parse error: ${err.message}`
    );
  }
}

function ensureHooksObject(settings) {
  if (!settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks)) {
    settings.hooks = {};
  }
}

function saveSnapshot(restorePath, hooksBlock) {
  fs.mkdirSync(path.dirname(restorePath), { recursive: true });
  fs.writeFileSync(restorePath, JSON.stringify(hooksBlock, null, 2));
}

function wireCommandHook(settings, eventName, hookFilename, substring, actions, label) {
  ensureHooksObject(settings);
  if (!Array.isArray(settings.hooks[eventName])) {
    settings.hooks[eventName] = [];
  }
  const hookPath = path.join(hooksDir, hookFilename);
  const registered = settings.hooks[eventName].some(
    (entry) =>
      entry.hooks && entry.hooks.some((h) => h.command && h.command.includes(substring))
  );
  if (!registered) {
    settings.hooks[eventName].push({
      matcher: '',
      hooks: [{ type: 'command', command: 'node ' + JSON.stringify(hookPath) }],
    });
    actions.push({ label, status: 'WIRED' });
    return true;
  }
  actions.push({ label, status: 'ALREADY PRESENT' });
  return false;
}

function installClaude(actions) {
  if (!fs.existsSync(claudeSettingsPath)) {
    actions.push({
      label: 'Claude Code settings',
      status: 'WARNING: ~/.claude/settings.json not found — is gsd-core installed?',
    });
    return;
  }

  const settings = readJsonOrEmpty(claudeSettingsPath);
  const originalHooks = JSON.parse(JSON.stringify(settings.hooks || {}));
  let changed = false;

  changed =
    wireCommandHook(
      settings,
      'Stop',
      'gsd-phase-pacer.js',
      'gsd-phase-pacer',
      actions,
      'Stop hook → gsd-phase-pacer.js'
    ) || changed;
  changed =
    wireCommandHook(
      settings,
      'SubagentStop',
      'gsd-429-guard.js',
      'gsd-429-guard',
      actions,
      'SubagentStop hook → gsd-429-guard.js'
    ) || changed;

  if (changed) {
    saveSnapshot(claudeRestorePath, originalHooks);
    fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));
  }
}

function installGemini(actions) {
  if (!fs.existsSync(geminiSettingsPath)) {
    actions.push({
      label: 'Gemini CLI settings',
      status: 'WARNING: ~/.gemini/settings.json not found — skipping Gemini hooks',
    });
    return;
  }

  const settings = readJsonOrEmpty(geminiSettingsPath);
  const originalHooks = JSON.parse(JSON.stringify(settings.hooks || {}));
  let changed = false;

  changed =
    wireCommandHook(
      settings,
      'BeforeAgent',
      'gsd-gemini-before.js',
      'gsd-gemini-before',
      actions,
      'BeforeAgent hook → gsd-gemini-before.js'
    ) || changed;
  changed =
    wireCommandHook(
      settings,
      'AfterAgent',
      'gsd-gemini-after.js',
      'gsd-gemini-after',
      actions,
      'AfterAgent hook → gsd-gemini-after.js'
    ) || changed;

  if (changed) {
    saveSnapshot(geminiRestorePath, originalHooks);
    fs.writeFileSync(geminiSettingsPath, JSON.stringify(settings, null, 2));
  }
}

function installCodex(actions) {
  if (!fs.existsSync(codexDir)) {
    actions.push({
      label: 'Codex config',
      status: 'WARNING: ~/.codex not found — skipping Codex hooks',
    });
    return;
  }

  let settings = readJsonOrEmpty(codexHooksPath);
  if (!fs.existsSync(codexHooksPath)) {
    settings = { hooks: {} };
  }
  const originalHooks = JSON.parse(JSON.stringify(settings.hooks || {}));
  ensureHooksObject(settings);

  const hookPath = path.join(hooksDir, 'gsd-codex-429-guard.js');
  if (!Array.isArray(settings.hooks.SubagentStop)) {
    settings.hooks.SubagentStop = [];
  }

  const registered = settings.hooks.SubagentStop.some(
    (entry) =>
      entry.hooks &&
      entry.hooks.some((h) => h.command && h.command.includes('gsd-codex-429-guard'))
  );

  let changed = false;
  if (!registered) {
    settings.hooks.SubagentStop.push({
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: 'node ' + JSON.stringify(hookPath),
          timeout: 600,
        },
      ],
    });
    changed = true;
    actions.push({ label: 'SubagentStop hook → gsd-codex-429-guard.js', status: 'WIRED' });
  } else {
    actions.push({ label: 'SubagentStop hook → gsd-codex-429-guard.js', status: 'ALREADY PRESENT' });
  }

  if (changed) {
    saveSnapshot(codexRestorePath, originalHooks);
    fs.mkdirSync(codexDir, { recursive: true });
    fs.writeFileSync(codexHooksPath, JSON.stringify(settings, null, 2));
  }
}

function installSkill(actions) {
  if (fs.existsSync(skillDest)) {
    actions.push({
      label: '/gsd-feature skill → ~/.claude/plugins/gsd-feature/SKILL.md',
      status: 'ALREADY PRESENT',
    });
    return;
  }
  fs.mkdirSync(path.dirname(skillDest), { recursive: true });
  fs.copyFileSync(skillSrc, skillDest);
  actions.push({
    label: '/gsd-feature skill → ~/.claude/plugins/gsd-feature/SKILL.md',
    status: 'COPIED',
  });
}

function printSummary(actions) {
  console.log('[gsd-hooks] Install summary:');
  actions.forEach(({ label, status }) => {
    console.log('  ' + status + '  ' + label);
  });
}

module.exports = {
  readJsonOrEmpty,
  installClaude,
  installGemini,
  installCodex,
  installSkill,
  printSummary,
};

if (require.main === module) {
  (async () => {
    try {
      const actions = [];
      installClaude(actions);
      installGemini(actions);
      installCodex(actions);
      installSkill(actions);
      printSummary(actions);
      process.exit(0);
    } catch (err) {
      console.error('[gsd-hooks] Fatal:', err.message);
      process.exit(1);
    }
  })();
}
