import { LanguageManager } from './language.js?v=topic-earth-warning-panel-collapse-20260430';

const UI_TRANSLATION_CSV_URLS = [
  'https://raw.githubusercontent.com/SmDeltArt/fever/main/shared/topic-earth-ui.csv',
  'https://cdn.jsdelivr.net/gh/SmDeltArt/fever@main/shared/topic-earth-ui.csv',
  './shared/topic-earth-ui.csv'
];
const translationCache = new Map();
let uiTranslationCatalog = null;
let uiTranslationCatalogPromise = null;

function cleanText(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function getCacheKey(text, targetLang) {
  return `${targetLang}:${cleanText(text)}`;
}

function isUsefulTranslation(original, translated) {
  const source = cleanText(original);
  const output = cleanText(translated);
  return output && output !== source;
}

function parseCsvRows(text = '') {
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

export class ReadTranslationService {
  static buildResult(text, provider, language) {
    const normalizedLanguage = LanguageManager.normalizeLanguageCode(language);
    return {
      text,
      provider,
      language: normalizedLanguage,
      speechLang: LanguageManager.getSpeechCode(normalizedLanguage)
    };
  }

  static shouldTranslate(targetLang) {
    return LanguageManager.normalizeLanguageCode(targetLang) !== 'en';
  }

  static getLanguageName(targetLang) {
    const info = LanguageManager.getLanguageInfo(targetLang);
    return info ? `${info.name} (${info.nativeName})` : targetLang;
  }

  static async translateText(text, targetLang, options = {}) {
    const sourceText = cleanText(text);
    const normalizedTarget = LanguageManager.normalizeLanguageCode(targetLang);
    const localOnly = Boolean(options.localOnly);

    if (!sourceText) {
      return this.buildResult(sourceText, 'original', normalizedTarget);
    }

    if (!this.shouldTranslate(normalizedTarget)) {
      return this.buildResult(sourceText, 'original', normalizedTarget);
    }

    const cacheKey = getCacheKey(sourceText, normalizedTarget);
    if (translationCache.has(cacheKey)) {
      return this.buildResult(translationCache.get(cacheKey), 'cache', normalizedTarget);
    }

    const csvTranslation = await this.tryCsvTranslation(sourceText, normalizedTarget);
    if (isUsefulTranslation(sourceText, csvTranslation)) {
      translationCache.set(cacheKey, csvTranslation);
      return this.buildResult(csvTranslation, 'csv', normalizedTarget);
    }

    const browserTranslation = await this.tryBrowserTranslation(sourceText, normalizedTarget);
    if (isUsefulTranslation(sourceText, browserTranslation)) {
      translationCache.set(cacheKey, browserTranslation);
      return this.buildResult(browserTranslation, 'browser', normalizedTarget);
    }

    if (localOnly) {
      console.info('[Translate Read] Local-only translation test: browser translation unavailable; skipping linked AI translation.', {
        targetLang: normalizedTarget
      });
      return this.buildResult(sourceText, 'original', 'en');
    }

    const aiTranslation = await this.tryAiTranslation(sourceText, normalizedTarget);
    if (isUsefulTranslation(sourceText, aiTranslation)) {
      translationCache.set(cacheKey, aiTranslation);
      return this.buildResult(aiTranslation, 'ai', normalizedTarget);
    }

    return this.buildResult(sourceText, 'original', 'en');
  }

  static async tryCsvTranslation(text, targetLang) {
    const catalog = await this.loadUiTranslationCatalog();
    if (!catalog?.length) return '';

    const sourceText = cleanText(text).toLowerCase();
    const match = catalog.find(row => {
      return ['en', 'fr', 'nl', 'de', 'es'].some(lang => cleanText(row[lang]).toLowerCase() === sourceText);
    });

    return cleanText(match?.[targetLang] || '');
  }

  static async loadUiTranslationCatalog() {
    if (uiTranslationCatalog) return uiTranslationCatalog;
    if (uiTranslationCatalogPromise) return uiTranslationCatalogPromise;

    uiTranslationCatalogPromise = this.fetchFirstText(UI_TRANSLATION_CSV_URLS)
      .then(text => {
        const rows = parseCsvRows(text);
        const headers = rows.shift() || [];
        uiTranslationCatalog = rows
          .map(row => {
            const entry = {};
            headers.forEach((header, index) => {
              entry[header] = row[index] || '';
            });
            return entry;
          })
          .filter(entry => entry.key && !entry.key.startsWith('#'));
        return uiTranslationCatalog;
      })
      .catch(error => {
        console.info('[Translate Read] UI CSV unavailable; trying browser/local translation next.', error?.message || error);
        return [];
      })
      .finally(() => {
        uiTranslationCatalogPromise = null;
      });

    return uiTranslationCatalogPromise;
  }

  static async fetchFirstText(urls = []) {
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) return response.text();
      } catch (error) {
        // Try the next configured CSV source.
      }
    }
    return '';
  }

  static async tryBrowserTranslation(text, targetLang) {
    const optionSets = [
      { sourceLanguage: 'en', targetLanguage: targetLang },
      { sourceLanguage: 'auto', targetLanguage: targetLang },
      { targetLanguage: targetLang }
    ];

    const browserApis = [
      globalThis.Translator && {
        availability: globalThis.Translator.availability?.bind(globalThis.Translator),
        create: globalThis.Translator.create?.bind(globalThis.Translator)
      },
      globalThis.translation && {
        availability: (globalThis.translation.canTranslate || globalThis.translation.availability)?.bind(globalThis.translation),
        create: (globalThis.translation.createTranslator || globalThis.translation.create)?.bind(globalThis.translation)
      },
      globalThis.ai?.translator && {
        availability: globalThis.ai.translator.availability?.bind(globalThis.ai.translator),
        create: globalThis.ai.translator.create?.bind(globalThis.ai.translator)
      }
    ].filter(api => api?.create);

    for (const api of browserApis) {
      for (const options of optionSets) {
        try {
          if (api.availability) {
            const availability = await api.availability(options);
            if (availability === 'unavailable' || availability === 'no') {
              continue;
            }
          }

          const translator = await api.create(options);
          const translated = await translator.translate(text);
          translator.destroy?.();
          if (translated) return translated;
        } catch (error) {
          console.debug('[Translate Read] Browser translation unavailable for options:', options, error);
        }
      }
    }

    return '';
  }

  static async tryAiTranslation(text, targetLang) {
    if (!globalThis.ourEarthAI?.createChatCompletion) {
      return '';
    }

    const languageName = this.getLanguageName(targetLang);

    try {
      const completion = await globalThis.ourEarthAI.createChatCompletion({
        messages: [
          {
            role: 'system',
            content: [
              'You translate app content for read-aloud.',
              'Return only the translated text.',
              'Keep names, dates, numbers, URLs, and scientific terms accurate.',
              'Do not add explanations, markdown, headings, or notes.'
            ].join(' ')
          },
          {
            role: 'user',
            content: `Translate this text into ${languageName}:\n\n${text}`
          }
        ]
      });

      return cleanText(completion.content || '');
    } catch (error) {
      console.warn('[Translate Read] AI translation failed:', error);
      return '';
    }
  }
}
