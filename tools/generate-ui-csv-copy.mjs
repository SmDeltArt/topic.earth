import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandTutorialAudioMessages, expandUiTextAudioMessages } from '../lib/fever-audio-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const defaultCsvPath = resolve(repoRoot, 'shared/topic-earth-ui.csv');
const manifestPath = resolve(repoRoot, 'assets/audio/read-messages/manifest.json');
const openAiEndpoint = 'https://api.openai.com/v1/chat/completions';

function readArgValue(names) {
  const rawArgs = process.argv.slice(2);
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const normalized = arg.toLowerCase();
    const exact = names.find(name => normalized === name.toLowerCase());
    if (exact) return rawArgs[index + 1] || '';

    const assigned = names.find(name => normalized.startsWith(`${name.toLowerCase()}=`));
    if (assigned) return arg.slice(assigned.length + 1);
  }
  return '';
}

function hasFlag(names) {
  const rawArgs = process.argv.slice(2).map(arg => arg.toLowerCase());
  return names.some(name => rawArgs.includes(name.toLowerCase()));
}

const csvPath = resolve(repoRoot, readArgValue(['--csv', '-csv']) || 'shared/topic-earth-ui.csv');
const sourceLang = readArgValue(['--source', '-source']) || 'en';
const targetLangs = (readArgValue(['--langs', '-langs', '--lg', '-lg']) || 'fr')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);
const keyArg = readArgValue(['--keys', '-keys']);
const prefixArg = readArgValue(['--prefix', '-prefix']);
const tagArg = readArgValue(['--tag', '-tag']);
const model = readArgValue(['--model', '-model']) || process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini';
const limit = Number(readArgValue(['--limit', '-limit']) || 0);
const writeChanges = hasFlag(['--write', '-write']);
const force = hasFlag(['--force', '-force']);
const polish = hasFlag(['--polish', '-polish']);

function log(message, detail = '') {
  console.log(`[csv-copy] ${message}${detail ? ` ${detail}` : ''}`);
}

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
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

function formatCsvCell(value = '') {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  return rows.map(row => row.map(formatCsvCell).join(',')).join('\n') + '\n';
}

function rowToObject(headers, row) {
  const entry = {};
  headers.forEach((header, index) => {
    entry[header] = row[index] || '';
  });
  return entry;
}

function collectKeysFromManifest(manifest, tag) {
  if (!tag) return [];
  const keys = new Set();
  const tagMatches = value => Array.isArray(value) && value.includes(tag);

  (manifest.messages || []).forEach(message => {
    if (!tagMatches(message.tags)) return;
    if (message.csvKey) keys.add(message.csvKey);
    (message.csvKeys || []).forEach(key => keys.add(key));
  });

  [
    ...expandTutorialAudioMessages(manifest),
    ...expandUiTextAudioMessages(manifest)
  ].forEach(message => {
    if (!tagMatches(message.tags)) return;
    if (message.csvKey) keys.add(message.csvKey);
    (message.csvKeys || []).forEach(key => keys.add(key));
  });

  return Array.from(keys);
}

async function getSelectedKeys(headers, rows) {
  const rowKeys = rows
    .map(row => row[0])
    .filter(key => key && !String(key).startsWith('#'));

  if (keyArg) {
    return keyArg.split(',').map(key => key.trim()).filter(Boolean);
  }

  if (tagArg) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    return collectKeysFromManifest(manifest, tagArg);
  }

  if (prefixArg) {
    const prefixes = prefixArg.split(',').map(prefix => prefix.trim()).filter(Boolean);
    return rowKeys.filter(key => prefixes.some(prefix => key.startsWith(prefix)));
  }

  return rowKeys;
}

function hasPlaceholders(text = '') {
  return String(text).match(/\{[^}]+\}/g) || [];
}

async function createTextCopy({ key, sourceText, targetLang }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || '';
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for non-dry CSV copy generation.');
  }

  const placeholders = hasPlaceholders(sourceText);
  const task = polish && targetLang === sourceLang
    ? `Polish this ${targetLang} UI string for clarity and natural read-aloud transcript use.`
    : `Translate this ${sourceLang} UI string into ${targetLang}.`;

  const response = await fetch(openAiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You edit compact product UI copy for topic.earth.',
            'Return only JSON: {"text":"..."}',
            'Preserve meaning, tone, placeholders, numbers, product names, and acronyms.',
            'Do not add markdown, quotes around the string, commentary, or new placeholders.',
            'For short button labels, stay short.'
          ].join(' ')
        },
        {
          role: 'user',
          content: JSON.stringify({
            task,
            key,
            sourceLang,
            targetLang,
            placeholders,
            sourceText
          })
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI text failed for ${key}/${targetLang}: ${response.status} ${errorText.slice(0, 300)}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(content);
  return cleanText(parsed.text || '');
}

async function main() {
  const rawCsv = await readFile(csvPath, 'utf8');
  const parsedRows = parseCsv(rawCsv);
  const headers = parsedRows[0] || [];
  const dataRows = parsedRows.slice(1);
  const selectedKeys = new Set(await getSelectedKeys(headers, dataRows));
  const indexByHeader = new Map(headers.map((header, index) => [header, index]));
  const sourceIndex = indexByHeader.get(sourceLang);

  if (!Number.isInteger(sourceIndex)) {
    throw new Error(`Source language column "${sourceLang}" not found in ${basename(csvPath)}.`);
  }

  targetLangs.forEach(lang => {
    if (!indexByHeader.has(lang)) {
      throw new Error(`Target language column "${lang}" not found in ${basename(csvPath)}.`);
    }
  });

  const jobs = [];
  dataRows.forEach((row, rowIndex) => {
    const key = row[0]?.trim();
    if (!key || key.startsWith('#') || !selectedKeys.has(key)) return;
    const sourceText = cleanText(row[sourceIndex]);
    if (!sourceText || /^<[^>]+>/.test(sourceText)) return;

    targetLangs.forEach(targetLang => {
      const targetIndex = indexByHeader.get(targetLang);
      const currentValue = cleanText(row[targetIndex]);
      if (targetLang === sourceLang && !polish) return;
      if (currentValue && !force) return;

      jobs.push({ key, rowIndex, targetLang, targetIndex, sourceText, currentValue });
    });
  });

  const selectedJobs = limit > 0 ? jobs.slice(0, limit) : jobs;

  log('csv', csvPath);
  log('model', model);
  log('mode', writeChanges ? 'write' : 'dry-run');
  log('jobs', String(selectedJobs.length));

  if (!writeChanges) {
    selectedJobs.forEach(job => {
      log('would update', `${job.key} -> ${job.targetLang}${job.currentValue ? ' (overwrite)' : ''}`);
    });
    return;
  }

  const backupPath = `${csvPath}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
  await copyFile(csvPath, backupPath);
  log('backup', backupPath);

  for (const job of selectedJobs) {
    const output = await createTextCopy(job);
    if (!output) {
      log('empty result skipped', `${job.key} -> ${job.targetLang}`);
      continue;
    }

    dataRows[job.rowIndex][job.targetIndex] = output;
    log('updated', `${job.key} -> ${job.targetLang}`);
  }

  await writeFile(csvPath, toCsv([headers, ...dataRows]), 'utf8');
  log('written', csvPath);
}

main().catch(error => {
  console.error(`[csv-copy] ${error.message}`);
  process.exitCode = 1;
});
