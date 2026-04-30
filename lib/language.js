import {
  SUPPORTED_UI_LANGUAGES,
  UI_TRANSLATIONS,
  UI_TEXT_TRANSLATIONS,
  applyTranslationCsv
} from './translations.js?v=topic-earth-warning-panel-collapse-20260430';

/**
 * Language detection, labels, and CSV-backed DOM translation helpers.
 */
export class LanguageManager {
  static LEGACY_SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' }
  ];

  static SUPPORTED_LANGUAGES = SUPPORTED_UI_LANGUAGES;
  static translationCatalogLoaded = false;
  static textNodeSources = new WeakMap();
  static attributeSources = new WeakMap();
  static domTranslator = null;
  static translatingDom = false;

  static normalizeLanguageCode(code = '') {
    return String(code || 'en').split('-')[0].toLowerCase();
  }

  static async loadTranslationCatalog(url = './shared/topic-earth-ui.csv') {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      applyTranslationCsv(await response.text());
      this.translationCatalogLoaded = true;
      return true;
    } catch (error) {
      console.warn('[Translations] Could not load CSV catalog, using fallback labels:', error);
      return false;
    }
  }

  static applyTranslationCatalogFromCsv(csvText = '') {
    applyTranslationCsv(csvText);
    this.translationCatalogLoaded = true;
  }

  static detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    const langCode = this.normalizeLanguageCode(browserLang);
    
    // Check if supported
    const supported = this.SUPPORTED_LANGUAGES.find(l => l.code === langCode);
    return supported ? langCode : 'en';
  }

  static getLanguageInfo(code) {
    const langCode = this.normalizeLanguageCode(code);
    return this.SUPPORTED_LANGUAGES.find(l => l.code === langCode);
  }

  static getAllLanguages() {
    return this.SUPPORTED_LANGUAGES;
  }

  static getSpeechCode(code) {
    return this.getLanguageInfo(code)?.speechCode || 'en-US';
  }

  static getTextDirection(code) {
    return this.getLanguageInfo(code)?.textDirection || 'ltr';
  }

  static getCatalog(langCode = 'en') {
    const normalized = this.normalizeLanguageCode(langCode);
    return {
      ...(UI_TRANSLATIONS.en || {}),
      ...(UI_TRANSLATIONS[normalized] || {})
    };
  }

  static getLabel(key, langCode = 'en') {
    const catalog = this.getCatalog(langCode);
    return catalog[key] || key;
  }

  static formatLabel(key, langCode = 'en', values = {}) {
    const template = this.getLabel(key, langCode);
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => (
      values[name] === undefined || values[name] === null ? '' : String(values[name])
    ));
  }

  static normalizeTextForLookup(text = '') {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  static translatePlainText(text = '', langCode = 'en') {
    const normalizedLang = this.normalizeLanguageCode(langCode);
    if (normalizedLang === 'en') return text;

    const original = String(text || '');
    const trimmed = this.normalizeTextForLookup(original);
    if (!trimmed) return original;

    const exact = UI_TEXT_TRANSLATIONS.exact[normalizedLang]?.[trimmed];
    if (exact) {
      return this.preserveOuterWhitespace(original, exact);
    }

    const patterns = UI_TEXT_TRANSLATIONS.patterns[normalizedLang] || [];
    for (const pattern of patterns) {
      const match = trimmed.match(pattern.regex);
      if (!match) continue;

      let translated = pattern.template;
      pattern.placeholders.forEach((placeholder, index) => {
        translated = translated.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), match[index + 1] || '');
      });
      return this.preserveOuterWhitespace(original, translated);
    }

    return original;
  }

  static preserveOuterWhitespace(original = '', translated = '') {
    const leading = String(original).match(/^\s*/)?.[0] || '';
    const trailing = String(original).match(/\s*$/)?.[0] || '';
    return `${leading}${translated}${trailing}`;
  }

  static shouldSkipDomNode(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return true;

    return Boolean(element.closest('script, style, code, pre, textarea, input, select, option, canvas, svg, [data-i18n-skip]'));
  }

  static translateTextNode(node, langCode) {
    if (!node?.nodeValue || !this.normalizeTextForLookup(node.nodeValue) || this.shouldSkipDomNode(node)) {
      return;
    }

    const record = this.textNodeSources.get(node);
    const source = !record || node.nodeValue !== record.rendered ? node.nodeValue : record.source;
    const rendered = this.translatePlainText(source, langCode);
    this.textNodeSources.set(node, { source, rendered });

    if (node.nodeValue !== rendered) {
      node.nodeValue = rendered;
    }
  }

  static translateElementAttributes(element, langCode) {
    if (!element || this.shouldSkipDomNode(element)) return;

    const attributes = ['title', 'aria-label', 'placeholder', 'alt'];
    const records = this.attributeSources.get(element) || {};

    attributes.forEach(attribute => {
      if (!element.hasAttribute(attribute)) return;

      const current = element.getAttribute(attribute);
      if (!this.normalizeTextForLookup(current)) return;

      const record = records[attribute];
      const source = !record || current !== record.rendered ? current : record.source;
      const rendered = this.translatePlainText(source, langCode);
      records[attribute] = { source, rendered };

      if (current !== rendered) {
        element.setAttribute(attribute, rendered);
      }
    });

    this.attributeSources.set(element, records);
  }

  static translateDom(root = document.body, langCode = 'en') {
    if (!root || typeof document === 'undefined' || this.translatingDom) return;

    this.translatingDom = true;
    try {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: node => this.shouldSkipDomNode(node)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT
        }
      );

      let node = root.nodeType === Node.TEXT_NODE ? root : walker.currentNode;
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          this.translateTextNode(node, langCode);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          this.translateElementAttributes(node, langCode);
        }
        node = walker.nextNode();
      }
    } finally {
      this.translatingDom = false;
    }
  }

  static installDomTranslator({
    root = document.body,
    getLanguage = () => 'en'
  } = {}) {
    if (!root || typeof MutationObserver === 'undefined') return;

    this.domTranslator?.observer?.disconnect();

    const translator = {
      root,
      getLanguage,
      pending: false,
      observer: null
    };

    const schedule = () => {
      if (this.translatingDom || translator.pending) return;
      translator.pending = true;
      requestAnimationFrame(() => {
        translator.pending = false;
        this.translateDom(translator.root, translator.getLanguage());
      });
    };

    translator.observer = new MutationObserver(schedule);
    translator.observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['title', 'aria-label', 'placeholder', 'alt']
    });

    this.domTranslator = translator;
    this.translateDom(root, getLanguage());
  }
}
