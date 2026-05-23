import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandFeverAudioMessages, expandTutorialAudioMessages, expandUiTextAudioMessages } from '../lib/fever-audio-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const manifestPath = resolve(repoRoot, 'assets/audio/read-messages/manifest.json');
const audioRoot = resolve(repoRoot, 'assets/audio/read-messages');
const trackingJsonPath = resolve(audioRoot, 'tracking.json');
const trackingCsvPath = resolve(repoRoot, 'shared/read-message-tracking.csv');
const args = process.argv.slice(2).map(arg => arg.toLowerCase());
const writeOutputs = !args.includes('--no-write');
const failOnNewEnglish = args.includes('--fail-on-new-en');

function log(message, detail = '') {
  console.log(`[read-message-track] ${message}${detail ? ` ${detail}` : ''}`);
}

function primaryLanguage(lang = '') {
  return String(lang || '').toLowerCase().split(/[-_]/)[0] || 'en';
}

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function hashText(value = '') {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex').slice(0, 16);
}

function csvEscape(value = '') {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readManifest() {
  const manifest = await readJson(manifestPath);
  if (!manifest || !Array.isArray(manifest.messages)) {
    throw new Error('Read-audio manifest must include a messages array.');
  }
  return manifest;
}

async function readFeverScenarioData(manifest) {
  const needsFeverData = Array.isArray(manifest.generatedBatches)
    && manifest.generatedBatches.some(batch => batch.type === 'fever-scenario-milestones');
  if (!needsFeverData) return null;

  const source = manifest.generatedBatches.find(batch => batch.type === 'fever-scenario-milestones')?.source || 'fever-scenarios.json';
  return readJson(resolve(repoRoot, source), null);
}

async function loadCsvCatalog(manifest) {
  const csvPath = resolve(repoRoot, manifest.csvPath || 'shared/topic-earth-ui.csv');
  const rows = parseCsv(await readFile(csvPath, 'utf8'));
  const headers = rows.shift() || [];
  const byKey = new Map();

  rows.forEach(row => {
    const key = row[0]?.trim();
    if (!key || key.startsWith('#')) return;
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index] || '';
    });
    byKey.set(key, entry);
  });

  return { byKey, csvPath };
}

function resolveCsvText(message, manifest, catalog) {
  const keys = Array.isArray(message.csvKeys)
    ? message.csvKeys
    : message.csvKey
      ? [message.csvKey]
      : [];
  if (!keys.length || !catalog) return '';

  const lg = primaryLanguage(message.lg || message.languageColumn || message.lang);
  const fallbackLg = primaryLanguage(manifest.fallbackLg || 'en');
  const parts = [];

  keys.forEach(key => {
    const row = catalog.byKey.get(key);
    if (!row) return;
    const value = row[lg] || row[fallbackLg] || row.en || '';
    if (value) parts.push(value);
  });

  return cleanText(parts.join('. '));
}

function getMessageKeys(message = {}) {
  return Array.isArray(message.csvKeys)
    ? message.csvKeys
    : message.csvKey
      ? [message.csvKey]
      : [];
}

function buildRows(messages, manifest, catalog, previousIds) {
  return messages.map(rawMessage => {
    const lg = primaryLanguage(rawMessage.lg || rawMessage.languageColumn || rawMessage.lang);
    const csvKeys = getMessageKeys(rawMessage);
    const missingCsvKeys = csvKeys.filter(key => !catalog?.byKey?.has(key));
    const text = cleanText(resolveCsvText(rawMessage, manifest, catalog) || rawMessage.text || '');
    const mp3 = rawMessage.mp3 || `${rawMessage.id}.mp3`;
    const webm = rawMessage.webm || `${rawMessage.id}.webm`;
    const mp3Exists = existsSync(resolve(audioRoot, mp3));
    const webmExists = existsSync(resolve(audioRoot, webm));

    return {
      id: rawMessage.id,
      lg,
      lang: rawMessage.lang || '',
      voice: rawMessage.voice || '',
      source: rawMessage.source || '',
      tags: Array.isArray(rawMessage.tags) ? rawMessage.tags.join('|') : '',
      csvKeys: csvKeys.join('|'),
      missingCsvKeys: missingCsvKeys.join('|'),
      textHash: hashText(text),
      text,
      mp3,
      webm,
      mp3Exists,
      webmExists,
      generated: Boolean(rawMessage.generated),
      newSinceLastRun: !previousIds.has(rawMessage.id)
    };
  });
}

function toCsv(rows) {
  const headers = [
    'id',
    'lg',
    'lang',
    'voice',
    'source',
    'tags',
    'csvKeys',
    'missingCsvKeys',
    'textHash',
    'mp3',
    'webm',
    'mp3Exists',
    'webmExists',
    'generated',
    'newSinceLastRun',
    'text'
  ];
  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => csvEscape(row[header])).join(','))
  ].join('\n') + '\n';
}

async function main() {
  const manifest = await readManifest();
  const previousTracking = await readJson(trackingJsonPath, { messages: [] });
  const previousIds = new Set((previousTracking?.messages || []).map(row => row.id).filter(Boolean));
  const feverScenarioData = await readFeverScenarioData(manifest);
  const catalog = await loadCsvCatalog(manifest);
  const messages = [
    ...manifest.messages,
    ...expandTutorialAudioMessages(manifest),
    ...expandUiTextAudioMessages(manifest),
    ...(feverScenarioData ? expandFeverAudioMessages(manifest, feverScenarioData) : [])
  ];
  const rows = buildRows(messages, manifest, catalog, previousIds)
    .sort((a, b) => a.id.localeCompare(b.id));
  const englishRows = rows.filter(row => row.lg === 'en');
  const newEnglishRows = englishRows.filter(row => row.newSinceLastRun);
  const missingCsvRows = rows.filter(row => row.missingCsvKeys);
  const missingAudioRows = rows.filter(row => !row.mp3Exists || !row.webmExists);
  const summary = {
    generatedAt: new Date().toISOString(),
    manifestPath: 'assets/audio/read-messages/manifest.json',
    csvPath: manifest.csvPath || 'shared/topic-earth-ui.csv',
    totalMessages: rows.length,
    englishMessages: englishRows.length,
    newEnglishMessages: newEnglishRows.length,
    missingCsvRows: missingCsvRows.length,
    missingAudioRows: missingAudioRows.length,
    mp3FilesTracked: rows.filter(row => row.mp3Exists).length,
    webmFilesTracked: rows.filter(row => row.webmExists).length
  };

  log('messages', String(summary.totalMessages));
  log('english', `${summary.englishMessages} (${summary.newEnglishMessages} new since last tracking run)`);
  log('missing csv rows', String(summary.missingCsvRows));
  log('missing audio rows', String(summary.missingAudioRows));

  if (writeOutputs) {
    await mkdir(audioRoot, { recursive: true });
    await writeFile(trackingJsonPath, JSON.stringify({ ...summary, messages: rows }, null, 2) + '\n');
    await writeFile(trackingCsvPath, toCsv(rows));
    log('wrote', trackingJsonPath);
    log('wrote', trackingCsvPath);
  }

  if (failOnNewEnglish && newEnglishRows.length > 0) {
    console.error(`[read-message-track] ${newEnglishRows.length} new English message(s) need CSV/audio review.`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(`[read-message-track] ${error.message}`);
  process.exitCode = 1;
});
