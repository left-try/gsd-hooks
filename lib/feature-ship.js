'use strict';

const fs = require('fs');
const path = require('path');

function parseFeatureFlags(argString) {
  const raw = String(argString ?? '').trim();
  let ship = /\B--ship\b/.test(raw);
  let economy = /\B--economy\b/.test(raw);
  let description = raw.replace(/\B--ship\b/g, '').replace(/\B--economy\b/g, '').trim();
  if (
    (description.startsWith('"') && description.endsWith('"')) ||
    (description.startsWith("'") && description.endsWith("'"))
  ) {
    description = description.slice(1, -1).trim();
  }
  return { description, ship, economy };
}

function canShip({ overallPass, summaryStatus, failedCriteria = [] }) {
  if (overallPass === true && summaryStatus === 'complete') {
    return { ok: true };
  }
  const parts = [];
  if (summaryStatus !== 'complete') {
    parts.push(`summary status is "${summaryStatus ?? 'unknown'}"`);
  }
  if (overallPass !== true) {
    parts.push('verification did not pass');
  }
  if (failedCriteria.length > 0) {
    parts.push(`failed criteria: ${failedCriteria.join('; ')}`);
  }
  return { ok: false, reason: parts.join('; ') || 'verification incomplete' };
}

function readJsonOrEmpty(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_err) {
    // ignore
  }
  return {};
}

function resolveBaseBranch(cwd) {
  const config = readJsonOrEmpty(path.join(cwd, '.planning', 'config.json'));
  if (config.git && typeof config.git.base_branch === 'string' && config.git.base_branch) {
    return config.git.base_branch;
  }
  return 'main';
}

function featureBranchName(slug) {
  return `feature/${slug}`;
}

function buildFeaturePrBody({ slug, description, featureDir }) {
  const read = (name) => {
    const p = path.join(featureDir, name);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  };
  const summary = read('SUMMARY.md');
  const context = read('CONTEXT.md');
  const plan = read('PLAN.md');

  const title = `Feature: ${String(description).slice(0, 72)}`;
  const filesSection = summary.match(/## Files Created\/Modified[\s\S]*?(?=\n## |\n*$)/);
  const verificationSection = summary.match(/## Verification[\s\S]*?(?=\n## |\n*$)/);

  return [
    title,
    '',
    '## Summary',
    '',
    `- **Slug:** ${slug}`,
    `- **Description:** ${description}`,
    context ? `\n${context.split('\n').slice(0, 20).join('\n')}` : '',
    '',
    '## Changes',
    '',
    filesSection ? filesSection[0].replace('## Files Created/Modified', '').trim() : '_See feature SUMMARY.md_',
    '',
    '## Verification',
    '',
    verificationSection
      ? verificationSection[0].replace('## Verification', '').trim()
      : summary.includes('PASS')
        ? summary
        : '_Verification details in feature SUMMARY.md_',
    '',
    '## Plan',
    '',
    plan ? plan.split('\n').slice(0, 40).join('\n') : '_No plan file_',
    '',
  ].join('\n');
}

module.exports = {
  parseFeatureFlags,
  canShip,
  buildFeaturePrBody,
  resolveBaseBranch,
  featureBranchName,
};
