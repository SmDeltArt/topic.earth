import { LanguageManager } from './language.js?v=topic-earth-warning-panel-collapse-20260430';

const UI_TRANSLATION_CSV_URLS = [
  './shared/topic-earth-ui.csv',
  'https://raw.githubusercontent.com/SmDeltArt/fever/main/shared/topic-earth-ui.csv',
  'https://cdn.jsdelivr.net/gh/SmDeltArt/fever@main/shared/topic-earth-ui.csv'
];
const translationCache = new Map();
let uiTranslationCatalog = null;
let uiTranslationCatalogPromise = null;

function cleanText(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function getCacheKey(text, targetLang, sourceLang, route) {
  return `${route}:${sourceLang}:${targetLang}:${cleanText(text)}`;
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
  static async withDeadline(promise, milliseconds) {
    let timer;
    try {
      return await Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Translation provider timed out')), milliseconds);
      })]);
    } finally { clearTimeout(timer); }
  }

  static lastProvider = '';

  static getRouteLabel() {
    const browser = Boolean(globalThis.Translator?.create || globalThis.translation || globalThis.ai?.translator);
    const summary = globalThis.ourEarthAI?.getSummary?.();
    const linked = summary?.textProvider && (summary.textHasKey || summary.textProvider === 'ollama');
    return ['Saved translations', browser ? 'Browser Translator (availability checked per language)' : 'Browser Translator unavailable', linked ? `${summary.textProviderName || summary.textProvider} (configured)` : '', 'MyMemory free fallback (online)', this.lastProvider ? `Last used: ${this.lastProvider}` : ''].filter(Boolean).join(' → ');
  }

  static buildResult(text, provider, language) {
    this.lastProvider = provider;
    globalThis.dispatchEvent?.(new CustomEvent('translationProviderChanged'));
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
    const sourceLang = options.detectSource === false ? LanguageManager.normalizeLanguageCode(options.sourceLanguage || 'en') : await this.detectSourceLanguage(sourceText, options.sourceLanguage || 'en');

    if (!sourceText) {
      return this.buildResult(sourceText, 'original', normalizedTarget);
    }

    if (sourceLang === normalizedTarget) {
      return this.buildResult(sourceText, 'original', normalizedTarget);
    }

    const cacheKey = getCacheKey(sourceText, normalizedTarget, sourceLang, localOnly ? 'local' : options.allowFreeApi ? 'free' : 'linked');
    if (translationCache.has(cacheKey)) {
      return this.buildResult(translationCache.get(cacheKey), 'cache', normalizedTarget);
    }

    const csvTranslation = await this.tryCsvTranslation(sourceText, normalizedTarget);
    if (isUsefulTranslation(sourceText, csvTranslation)) {
      translationCache.set(cacheKey, csvTranslation);
      return this.buildResult(csvTranslation, 'csv', normalizedTarget);
    }

    const browserTranslation = await this.tryBrowserTranslation(sourceText, normalizedTarget, sourceLang);
    if (isUsefulTranslation(sourceText, browserTranslation)) {
      translationCache.set(cacheKey, browserTranslation);
      return this.buildResult(browserTranslation, 'browser', normalizedTarget);
    }

    if (localOnly) {
      console.info('[Translate Read] Local-only translation test: browser translation unavailable; skipping linked AI translation.', {
        targetLang: normalizedTarget
      });
      return this.buildResult(sourceText, 'original', sourceLang);
    }

    const aiTranslation = await this.tryAiTranslation(sourceText, normalizedTarget);
    if (isUsefulTranslation(sourceText, aiTranslation)) {
      translationCache.set(cacheKey, aiTranslation);
      return this.buildResult(aiTranslation, 'ai', normalizedTarget);
    }

    if (options.allowFreeApi && !localOnly) {
      const translated = await this.tryFreeTranslation(sourceText, normalizedTarget, sourceLang);
      if (isUsefulTranslation(sourceText, translated)) {
        translationCache.set(cacheKey, translated);
        return this.buildResult(translated, 'mymemory', normalizedTarget);
      }
    }
    return this.buildResult(sourceText, 'original', sourceLang);
  }

  static async detectSourceLanguage(text, fallback = 'en') {
    let detector;
    try {
      if (text && globalThis.LanguageDetector?.create) {
        detector = await this.withDeadline(globalThis.LanguageDetector.create({ signal: AbortSignal.timeout(3000) }), 3000);
        const [result] = await this.withDeadline(detector.detect(text), 3000);
        if (result?.confidence >= 0.5) return result.detectedLanguage.split('-')[0];
      }
    } catch { /* Use the caller's source language when detection is unavailable. */ }
    finally { detector?.destroy?.(); }
    return LanguageManager.normalizeLanguageCode(fallback);
  }

  static splitTranslationText(text, maxBytes = 500) {
    const encoder = new TextEncoder();
    const chunks = [];
    let chunk = '';
    for (const token of cleanText(text).match(/\S+\s*/gu) || []) {
      if (encoder.encode(chunk + token).length <= maxBytes) {
        chunk += token;
        continue;
      }
      if (chunk.trim()) chunks.push(chunk.trim());
      chunk = '';
      for (const char of token) {
        if (encoder.encode(chunk + char).length > maxBytes) {
          chunks.push(chunk.trim());
          chunk = '';
        }
        chunk += char;
      }
    }
    if (chunk.trim()) chunks.push(chunk.trim());
    return chunks;
  }

  static async tryFreeTranslation(text, targetLang, sourceLang = 'en') {
    if (globalThis.navigator?.onLine === false) return '';
    const chunks = this.splitTranslationText(text);
    // Bound each selection and never return a partially translated result.
    if (chunks.length > 10) return '';
    const translations = [];
    const signal = AbortSignal.timeout(15000);
    try {
      for (const chunk of chunks) {
        const url = new URL('https://api.mymemory.translated.net/get');
        url.searchParams.set('q', chunk);
        url.searchParams.set('langpair', `${sourceLang}|${targetLang}`);
        const response = await fetch(url, { signal, credentials: 'omit' });
        if (!response.ok) return '';
        const result = await response.json();
        if (Number(result.responseStatus) !== 200 || result.quotaFinished) return '';
        const translated = cleanText(result.responseData?.translatedText);
        if (!translated) return '';
        translations.push(translated);
      }
      return translations.join(' ');
    } catch (error) {
      console.info('[Translate Read] Free translation unavailable:', error?.message || error);
      return '';
    }
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
        const response = await fetch(url, { cache: 'no-cache', signal: AbortSignal.timeout(4000) });
        if (response.ok) return response.text();
      } catch (error) {
        // Try the next configured CSV source.
      }
    }
    return '';
  }

  static async tryBrowserTranslation(text, targetLang, sourceLang = 'en') {
    try {
      return await this.withDeadline(this.translateWithBrowser(text, targetLang, sourceLang), 6000);
    } catch { return ''; }
  }

  static async translateWithBrowser(text, targetLang, sourceLang) {
    const signal = AbortSignal.timeout(6000);
    const optionSets = [
      { sourceLanguage: sourceLang, targetLanguage: targetLang },
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

          if (signal.aborted) return '';
          const translator = await api.create({ ...options, signal });
          let translated;
          try { translated = await translator.translate(text); }
          finally { translator.destroy?.(); }
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

    if (globalThis.ourEarthAI.getRuntimeSettings?.().aiUpdatesUseLinkedApi === false) return '';
    const summary = globalThis.ourEarthAI.getSummary?.();
    if (!summary?.textProvider || (!summary.textHasKey && summary.textProvider !== 'ollama')) return '';

    const languageName = this.getLanguageName(targetLang);

    try {
      const completion = await this.withDeadline(globalThis.ourEarthAI.createChatCompletion({
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
      }), 8000);

      return cleanText(completion.content || '');
    } catch (error) {
      console.warn('[Translate Read] AI translation failed:', error);
      return '';
    }
  }
}
