import { LanguageManager } from './language.js?v=topic-earth-warning-panel-collapse-20260430';

const translationCache = new Map();

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

  static async translateText(text, targetLang) {
    const sourceText = cleanText(text);
    const normalizedTarget = LanguageManager.normalizeLanguageCode(targetLang);

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

    const browserTranslation = await this.tryBrowserTranslation(sourceText, normalizedTarget);
    if (isUsefulTranslation(sourceText, browserTranslation)) {
      translationCache.set(cacheKey, browserTranslation);
      return this.buildResult(browserTranslation, 'browser', normalizedTarget);
    }

    const aiTranslation = await this.tryAiTranslation(sourceText, normalizedTarget);
    if (isUsefulTranslation(sourceText, aiTranslation)) {
      translationCache.set(cacheKey, aiTranslation);
      return this.buildResult(aiTranslation, 'ai', normalizedTarget);
    }

    return this.buildResult(sourceText, 'original', 'en');
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
