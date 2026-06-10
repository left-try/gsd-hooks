'use strict';

const fs = require('fs');
const path = require('path');

const HISTORY_REL_SEGMENTS = ['.planning', 'features', 'HISTORY.md'];
const TABLE_HEADER =
  '# Feature History\n\n| Date | Slug | Status | Description | PR |\n|------|------|--------|-------------|----|\n';

function historyPath(cwd) {
  return path.join(cwd, ...HISTORY_REL_SEGMENTS);
}

function sanitizeSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Invalid slug: empty');
  }
  if (slug.includes('..') || slug.includes('/')) {
    throw new Error('Invalid slug: path traversal not allowed');
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Invalid slug: only lowercase letters, digits, and hyphens allowed');
  }
  return slug;
}

function escapeTableCell(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
}

function truncateDescription(desc, max = 80) {
  const text = String(desc ?? '').trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

function ensureHistoryFile(cwd) {
  const filePath = historyPath(cwd);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, TABLE_HEADER, 'utf8');
  }
}

function formatHistoryRow({ date, slug, status, description, pr }) {
  const normalizedStatus = status === 'incomplete' ? 'incomplete' : 'complete';
  const row = `| ${escapeTableCell(date)} | ${escapeTableCell(slug)} | ${normalizedStatus} | ${escapeTableCell(description)} | ${escapeTableCell(pr ?? '—')} |\n`;
  return row;
}

function appendHistoryEntry(cwd, entry) {
  const slug = sanitizeSlug(entry.slug);
  const date = entry.date || new Date().toISOString().slice(0, 10);
  const status = entry.status === 'incomplete' ? 'incomplete' : 'complete';
  const description = truncateDescription(entry.description);
  const pr = entry.pr ?? '—';

  ensureHistoryFile(cwd);
  const row = formatHistoryRow({ date, slug, status, description, pr });
  fs.appendFileSync(historyPath(cwd), row, 'utf8');
}

function updateHistoryPr(cwd, slug, prUrl) {
  const safeSlug = sanitizeSlug(slug);
  const filePath = historyPath(cwd);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  let updated = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.startsWith('|') || line.includes('------')) continue;
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length >= 3 && parts[2] === safeSlug) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      if (cells.length >= 5) {
        cells[4] = ` ${escapeTableCell(prUrl)} `;
        lines[i] = `|${cells.join('|')}|`;
        updated = true;
        break;
      }
    }
  }
  if (updated) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  }
}

module.exports = {
  HISTORY_REL_SEGMENTS,
  TABLE_HEADER,
  historyPath,
  sanitizeSlug,
  escapeTableCell,
  truncateDescription,
  ensureHistoryFile,
  formatHistoryRow,
  appendHistoryEntry,
  updateHistoryPr,
};
