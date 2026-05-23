import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandFeverAudioMessages, expandTutorialAudioMessages, expandUiTextAudioMessages } from '../lib/fever-audio-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const manifestPath = resolve(repoRoot, 'assets/audio/read-messages/manifest.json');
const audioRoot = resolve(repoRoot, 'assets/audio/read-messages');
const defaultCsvPath = resolve(repoRoot, 'shared/topic-earth-ui.csv');
const openAiEndpoint = 'https://api.openai.com/v1/audio/speech';
const defaultFfmpeg = 'C:/ffmpeg/bin/ffmpeg.exe';

function readArgValue(names) {
  const rawArgs = process.argv.slice(2);
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const normalizedArg = arg.toLowerCase();
    const match = names.find(name => normalizedArg === name.toLowerCase());
    if (match) return rawArgs[index + 1] || '';

    const assignMatch = names.find(name => normalizedArg.startsWith(`${name.toLowerCase()}=`));
    if (assignMatch) return arg.slice(assignMatch.length + 1);
  }
  return '';
}

function hasFlag(names) {
  const rawArgs = process.argv.slice(2).map(arg => arg.toLowerCase());
  return names.some(name => rawArgs.includes(name.toLowerCase()));
}

const force = hasFlag(['--force', '-force']);
const dryRun = hasFlag(['--dry-run', '-dryrun', '-dry-run']);
const skipWebm = hasFlag(['--no-webm', '-nowebm', '-no-webm']);
const idsArg = readArgValue(['--ids', '-ids']);
const lgArg = readArgValue(['--lg', '-lg']);
const tagArg = readArgValue(['--tag', '-tag', '--tags', '-tags']);
const onlyIds = idsArg
  ? new Set(idsArg.replace(/^--ids=/, '').split(',').map(id => id.trim()).filter(Boolean))
  : null;
const onlyLanguages = lgArg
  ? new Set(lgArg.replace(/^--lg=/, '').split(',').map(lg => primaryLanguage(lg.trim())).filter(Boolean))
  : null;
const onlyTags = tagArg
  ? new Set(tagArg.replace(/^--tags?=/, '').split(',').map(tag => tag.trim()).filter(Boolean))
  : null;

function log(message, detail = '') {
  console.log(`[read-audio] ${message}${detail ? ` ${detail}` : ''}`);
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readManifest() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.messages)) {
    throw new Error('Manifest must include a messages array.');
  }
  return manifest;
}

async function readFeverScenarioData(manifest) {
  const needsFeverData = Array.isArray(manifest.generatedBatches)
    && manifest.generatedBatches.some(batch => batch.type === 'fever-scenario-milestones');
  if (!needsFeverData) return null;

  const source = manifest.generatedBatches.find(batch => batch.type === 'fever-scenario-milestones')?.source || 'fever-scenarios.json';
  return JSON.parse(await readFile(resolve(repoRoot, source), 'utf8'));
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

function primaryLanguage(lang = '') {
  return String(lang || '').toLowerCase().split(/[-_]/)[0] || 'en';
}

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function appendSentence(parts, value) {
  const text = cleanText(value);
  if (!text) return parts;
  if (!parts.length) {
    parts.push(text);
    return parts;
  }

  const previous = parts[parts.length - 1];
  const joiner = /[.!?]$/.test(previous) ? ' ' : '. ';
  parts[parts.length - 1] = `${previous}${joiner}${text}`;
  return parts;
}

function resolveCsvText(message, manifest, catalog) {
  const keys = Array.isArray(message.csvKeys)
    ? message.csvKeys
    : message.csvKey
      ? [message.csvKey]
      : [];
  if (!keys.length || !catalog) return '';

  const lg = message.lg || message.languageColumn || primaryLanguage(message.lang);
  const fallbackLg = manifest.fallbackLg || 'en';
  const parts = [];

  keys.forEach(key => {
    const row = catalog.byKey.get(key);
    const value = row?.[lg] || row?.[fallbackLg] || row?.en || '';
    appendSentence(parts, value);
  });

  return cleanText(parts.join(' '));
}

function withResolvedText(message, manifest, catalog) {
  const csvText = resolveCsvText(message, manifest, catalog);
  const text = csvText || cleanText(message.text);
  if (!text) {
    throw new Error(`Message ${message.id} needs text or csvKeys.`);
  }
  return {
    ...message,
    text,
    resolvedFromCsv: Boolean(csvText)
  };
}

function messageMatchesLanguage(message) {
  if (!onlyLanguages) return true;
  const messageLanguage = primaryLanguage(message.lg || message.languageColumn || message.lang);
  return onlyLanguages.has(messageLanguage);
}

function messageMatchesTag(message) {
  if (!onlyTags) return true;
  const tags = Array.isArray(message.tags) ? message.tags : [];
  return tags.some(tag => onlyTags.has(tag));
}

async function generateMp3({ apiKey, model, message, mp3Path }) {
  if (dryRun) {
    log('would generate mp3', `${message.id}${message.resolvedFromCsv ? ' (csv)' : ''}`);
    return;
  }

  const response = await fetch(openAiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      voice: message.voice || 'alloy',
      input: message.text,
      response_format: 'mp3'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS failed for ${message.id}: ${response.status} ${errorText.slice(0, 300)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(mp3Path, buffer);
  log('generated mp3', `${message.id} (${buffer.length.toLocaleString()} bytes)`);
}

function runFfmpeg(ffmpegPath, input, output) {
  if (dryRun) {
    log('would convert webm', output);
    return Promise.resolve();
  }

  return new Promise((resolvePromise, reject) => {
    const child = spawn(ffmpegPath, [
      '-y',
      '-i', input,
      '-c:a', 'libopus',
      '-b:a', '80k',
      output
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-800)}`));
      }
    });
  });
}

async function main() {
  const manifest = await readManifest();
  const feverScenarioData = await readFeverScenarioData(manifest).catch(error => {
    log('fever scenarios unavailable; generated fever batches skipped', error.message);
    return null;
  });
  const manifestMessages = [
    ...manifest.messages,
    ...expandTutorialAudioMessages(manifest),
    ...expandUiTextAudioMessages(manifest),
    ...(feverScenarioData ? expandFeverAudioMessages(manifest, feverScenarioData) : [])
  ];
  const csvCatalog = await loadCsvCatalog(manifest).catch(error => {
    log('csv unavailable; using manifest text fallbacks', error.message);
    return null;
  });
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || '';
  const ffmpegPath = process.env.FFMPEG_PATH || defaultFfmpeg;
  const ffmpegReady = existsSync(ffmpegPath);

  await mkdir(audioRoot, { recursive: true });

  log('manifest', manifestPath);
  log('csv', csvCatalog?.csvPath || defaultCsvPath);
  log('model', manifest.defaultModel || 'tts-1-hd');
  log('ffmpeg', ffmpegReady ? ffmpegPath : 'not found');

  const messages = manifestMessages.filter(message => {
    if (onlyIds && !onlyIds.has(message.id)) return false;
    if (!messageMatchesLanguage(message)) return false;
    return messageMatchesTag(message);
  });

  if (!messages.length) {
    const filters = [
      onlyIds && `ids=${Array.from(onlyIds).join(',')}`,
      onlyLanguages && `lg=${Array.from(onlyLanguages).join(',')}`,
      onlyTags && `tag=${Array.from(onlyTags).join(',')}`
    ].filter(Boolean).join(' ');
    log('no manifest messages matched', filters);
    return;
  }

  log('batch', `${messages.length} message${messages.length === 1 ? '' : 's'}`);

  for (const rawMessage of messages) {
    const message = withResolvedText(rawMessage, manifest, csvCatalog);
    const mp3Path = resolve(audioRoot, message.mp3 || `${message.id}.mp3`);
    const webmPath = resolve(audioRoot, message.webm || `${message.id}.webm`);
    const mp3Exists = await fileExists(mp3Path);
    const webmExists = await fileExists(webmPath);

    if (!force && mp3Exists && (skipWebm || webmExists)) {
      log('cached', message.id);
      continue;
    }

    if ((force || !mp3Exists) && !apiKey && !dryRun) {
      throw new Error(`OPENAI_API_KEY is required to generate missing mp3 for ${message.id}. Existing files are reused without a key.`);
    }

    if (force || !mp3Exists) {
      await generateMp3({
        apiKey,
        model: message.model || manifest.defaultModel || 'tts-1-hd',
        message,
        mp3Path
      });
    } else {
      log('mp3 exists', message.id);
    }

    if (!skipWebm && (force || !webmExists)) {
      if (!ffmpegReady) {
        log('skip webm; ffmpeg not found', message.id);
      } else {
        await runFfmpeg(ffmpegPath, mp3Path, webmPath);
        if (!dryRun) {
          log('generated webm', message.id);
        }
      }
    }
  }

  log('done');
}

main().catch(error => {
  console.error(`[read-audio] ${error.message}`);
  process.exitCode = 1;
});
