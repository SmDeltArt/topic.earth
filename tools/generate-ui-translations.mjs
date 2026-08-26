import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const languageColumns = ['en', 'fr', 'nl', 'de', 'es', 'ar', 'zh', 'hi', 'ja', 'ru', 'uk'];
const sourceFiles = [
  'index.html',
  'app.main.js',
  'components/DetailPanel.js',
  'components/FeverDebugBar.js',
  'components/LayerPanel.js',
  'components/RegionalMap.js',
  'components/SettingsPanel.js',
  'components/TopBar.js',
  'lib/fever-debug.js',
  'lib/fever-warming-translations.js',
  'lib/globe.js',
  'lib/meteo-realtime.js',
  'lib/read-translation.js',
  'lib/settings.js',
  'lib/storage.js',
  'lib/topic-exporter.js',
  'lib/tts.js',
  'data/layers.js',
  'data/points.js',
  'data/fever-topics.js',
  'data/research.js'
];

const htmlEntities = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['nbsp', ' '],
  ['times', 'x'],
  ['deg', 'deg']
]);

function decodeEntities(value = '') {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return htmlEntities.get(entity) || match;
  });
}

function normalizeText(value = '') {
  return decodeEntities(String(value || ''))
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\$\{[^}]*\}/g, ' {value} ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHumanText(value = '') {
  const text = normalizeText(value);
  if (text.length < 2 || text.length > 220) return false;
  if (!/[A-Za-zÀ-ž]/.test(text)) return false;
  if (/^\[[A-Za-z0-9\s:-]+\]/.test(text)) return false;
  if (/^(true|false|null|undefined|auto|none|block|inline|grid|flex|center|left|right)$/i.test(text)) return false;
  if (/^[.#]?[a-z0-9_-]+$/i.test(text) && text.length > 4) return false;
  if (/^[A-Z0-9_-]{2,}$/.test(text) && text.length > 8) return false;
  if (/^(https?:|data:|mailto:|tel:|\.\/|\.\.\/|\/)/i.test(text)) return false;
  if (/^[-_a-z0-9]+:[-_a-z0-9]+$/i.test(text)) return false;
  if (/[{}()[\]=<>]/.test(text) && !/\{[a-zA-Z0-9_]+\}/.test(text)) return false;
  if (/(^|[\s.:])#[0-9a-f]{3,8}\b/i.test(text)) return false;
  if (/\b(px|rem|em|vh|vw|rgba?|linear-gradient|translateX|translateY|rotate|scale)\b/i.test(text)) return false;
  if (/\b(addEventListener|querySelector|classList|localStorage|sessionStorage|console\.|CustomEvent)\b/.test(text)) return false;
  if (/\b(context|dataset|target|source|button|state|option|event|detail|element|className|selector)\s*[.:]/i.test(text)) return false;
  if (/\b(return|case|break|continue|const|let|var|function|async|await|import|export)\b/i.test(text)) return false;
  if (/\$\{|this\.|['"`]\s*[:?]|:\s*''|:\s*""|\|\||&&|=>|\?\./.test(text)) return false;
  if (/^[MmLlHhVvCcSsQqTtAaZz0-9,\s.-]+$/.test(text) && !/[A-Za-z]{4,}/.test(text)) return false;
  return true;
}

function slugify(text = '') {
  const normalized = normalizeText(text)
    .replace(/\{[a-zA-Z0-9_]+\}/g, ' value ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 7)
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
  return slugifiedOrFallback(normalized);
}

function slugifiedOrFallback(value) {
  if (value && /^[a-z]/.test(value)) return value;
  if (value) return `text${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  return 'text';
}

function sourcePrefix(file) {
  const parsed = path.parse(file);
  const dir = parsed.dir.split(/[\\/]/).filter(Boolean).pop();
  return [dir, parsed.name]
    .filter(Boolean)
    .map(part => part.replace(/[^a-zA-Z0-9]+/g, ' '))
    .join(' ')
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function extractStrings(source) {
  const values = new Set();
  const template = /`((?:\\.|[^`])*)`/g;
  let match;

  while ((match = template.exec(source))) {
    const raw = match[1];
    if (!raw || !raw.includes('<')) continue;
    const normalized = normalizeText(raw);
    if (isHumanText(normalized)) {
      values.add(normalized);
    }
  }

  const htmlText = source
    .replace(/\$\{[\s\S]*?\}/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const tagText = />\s*([^<>{}][^<>{}]+?)\s*</g;

  while ((match = tagText.exec(htmlText))) {
    const normalized = normalizeText(match[1]);
    if (isHumanText(normalized)) {
      values.add(normalized);
    }
  }

  const attrText = /\b(?:title|aria-label|placeholder|alt|value)=["']([^"']+)["']/g;
  while ((match = attrText.exec(source))) {
    const normalized = normalizeText(match[1]);
    if (isHumanText(normalized)) {
      values.add(normalized);
    }
  }

  const uiAssignment = /(?:textContent|innerText|placeholder|title|ariaLabel|value)\s*=\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  while ((match = uiAssignment.exec(source))) {
    const normalized = normalizeText(match[2]);
    if (isHumanText(normalized)) {
      values.add(normalized);
    }
  }

  const uiProperty = /\b(?:label|name|title|placeholder|description|summary|warning|message|hint|intro|caption|emptyText|tooltip|text)\s*:\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  while ((match = uiProperty.exec(source))) {
    const normalized = normalizeText(match[2]);
    if (isHumanText(normalized)) {
      values.add(normalized);
    }
  }

  const uiSetAttribute = /\bsetAttribute\(\s*['"](?:title|aria-label|placeholder|alt)['"]\s*,\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  while ((match = uiSetAttribute.exec(source))) {
    const normalized = normalizeText(match[2]);
    if (isHumanText(normalized)) {
      values.add(normalized);
    }
  }

  const uiCall = /\b(?:confirm|alert|showToast|showNotification)\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  while ((match = uiCall.exec(source))) {
    const normalized = normalizeText(match[2]);
    if (isHumanText(normalized)) {
      values.add(normalized);
    }
  }

  return [...values];
}

function escapeCsv(value = '') {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

async function loadCurrentCatalog() {
  const translationsUrl = pathToFileURL(path.join(rootDir, 'lib', 'translations.js')).href;
  const module = await import(`${translationsUrl}?generatedAt=${Date.now()}`);
  const existingCsvPath = path.join(rootDir, 'shared', 'topic-earth-ui.csv');

  try {
    const existingCsv = await fs.readFile(existingCsvPath, 'utf8');
    const { catalog } = module.buildTranslationCatalogFromCsv(existingCsv);
    return { UI_TRANSLATIONS: catalog };
  } catch {
    return module;
  }
}

function addRow(rowsByKey, row) {
  if (!row.key || !row.en) return;
  rowsByKey.set(row.key, {
    key: row.key,
    ...Object.fromEntries(languageColumns.map(lang => [lang, row[lang] || '']))
  });
}

async function main() {
  const { UI_TRANSLATIONS } = await loadCurrentCatalog();
  const rowsByKey = new Map();
  const keyByEnglish = new Map();
  const usedKeys = new Set();

  const existingKeys = new Set([
    ...Object.values(UI_TRANSLATIONS).flatMap(labels => Object.keys(labels || {}))
  ]);

  [...existingKeys].sort((a, b) => a.localeCompare(b)).forEach(key => {
    const row = { key };
    languageColumns.forEach(lang => {
      row[lang] = UI_TRANSLATIONS[lang]?.[key] || '';
    });
    addRow(rowsByKey, row);
    usedKeys.add(key);
    if (row.en) keyByEnglish.set(row.en, key);
  });

  for (const file of sourceFiles) {
    const absolute = path.join(rootDir, file);
    let source = '';
    try {
      source = await fs.readFile(absolute, 'utf8');
    } catch {
      continue;
    }

    const prefix = sourcePrefix(file);
    for (const text of extractStrings(source)) {
      if (keyByEnglish.has(text)) continue;

      let key = `auto.${prefix}.${slugify(text)}`;
      let suffix = 2;
      while (usedKeys.has(key)) {
        key = `auto.${prefix}.${slugify(text)}${suffix}`;
        suffix += 1;
      }

      usedKeys.add(key);
      keyByEnglish.set(text, key);
      addRow(rowsByKey, { key, en: text });
    }
  }

  const rows = [...rowsByKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  const csv = [
    languageColumns.join(',').replace(/^/, 'key,'),
    '# Smart IceOff - topic.earth UI translations',
    '# Edit in a spreadsheet. Empty cells fall back to English.',
    '# Auto-generated rows use auto.* keys. Stable hand-authored keys stay unchanged.',
    '# Use {count}, {name}, {year}, {value}, etc. as placeholders.',
    ...rows.map(row => ['key', ...languageColumns].map(column => escapeCsv(row[column])).join(','))
  ].join('\n') + '\n';

  const outFile = path.join(rootDir, 'shared', 'topic-earth-ui.csv');
  await fs.writeFile(outFile, csv, 'utf8');
  console.log(`Wrote ${rows.length} rows to ${path.relative(rootDir, outFile)}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
