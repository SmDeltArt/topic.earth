const STORAGE_KEY = 'topicEarthTranslationsV1';
const FIELDS = ['title', 'summary', 'insight'];

export function topicSourceRevision(topic) {
  return JSON.stringify(['v1', topic.language || 'en', ...FIELDS.map(field => String(topic[field] || ''))]);
}

export function plainTopicText(text = '') {
  const spaced = String(text).replace(/<\/(?:p|div|li|h[1-6]|tr)>|<br\s*\/?>/gi, '$& ');
  return typeof DOMParser === 'undefined' ? spaced.replace(/<[^>]*>/g, '')
    : new DOMParser().parseFromString(spaced, 'text/html').body.textContent;
}

export function translationIsCurrent(record, topic, language) {
  return record?.language === language && record.sourceRevision === topicSourceRevision(topic)
    && FIELDS.every(field => typeof record[field] === 'string');
}

export class TopicTranslations {
  static selectionsForExport(topic) {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(`${STORAGE_KEY}Selections`) || '{}')[String(topic.id)] || []; }
    catch { /* Keep packaged selections when browser storage is unavailable. */ }
    const records = [...(Array.isArray(topic.readingSelections) ? topic.readingSelections : []), ...(Array.isArray(saved) ? saved : [])];
    return [...new Map(records.filter(record => record && typeof record.originalText === 'string' && typeof record.translatedText === 'string')
      .map(record => [JSON.stringify([record.sourceRevision, record.language, record.originalText]), record])).values()];
  }

  static saveSelection(topic, { originalText, translatedText, language, provider }) {
    if (!originalText || !translatedText) throw new Error('No text to save yet.');
    const key = `${STORAGE_KEY}Selections`;
    let cache;
    try { cache = JSON.parse(localStorage.getItem(key) || '{}'); } catch { cache = {}; }
    const record = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      topicId: topic.id, sourceRevision: topicSourceRevision(topic), version: 'v001',
      originalText, translatedText, language, provider, savedAt: new Date().toISOString() };
    const records = this.selectionsForExport(topic).filter(item =>
      !(item.originalText === originalText && item.language === language && item.sourceRevision === record.sourceRevision));
    delete cache[String(topic.id)];
    cache[String(topic.id)] = [...records, record].slice(-20);
    localStorage.setItem(key, JSON.stringify(Object.fromEntries(Object.entries(cache).slice(-100))));
    return { ...topic, translations: this.forExport(topic), readingSelections: cache[String(topic.id)] };
  }

  static readCache() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  static get(topic, language) {
    const packaged = topic.translations?.[language];
    if (translationIsCurrent(packaged, topic, language)) return packaged;
    const record = this.readCache()[String(topic.id)]?.[language];
    return translationIsCurrent(record, topic, language) ? record : null;
  }

  static hasSaved(topic, language) {
    return Boolean(topic.translations?.[language] || this.readCache()[String(topic.id)]?.[language]);
  }

  static save(topic, record) {
    const cache = this.readCache();
    cache[String(topic.id)] = { ...(cache[String(topic.id)] || {}), [record.language]: record };
    // Bound browser storage while retaining the most recently translated topics.
    const entries = Object.entries(cache).filter(([id]) => id !== String(topic.id));
    entries.push([String(topic.id), cache[String(topic.id)]]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries.slice(-100))));
  }

  static async loadPackaged(topic, language) {
    const saved = this.get(topic, language);
    if (saved) return saved;
    const file = topic.translationFiles?.[language];
    if (!file?.url) return null;
    try {
      const response = await fetch(file.url, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) return null;
      const record = await response.json();
      if (!translationIsCurrent(record, topic, language)) return null;
      this.save(topic, record);
      return record;
    } catch { return null; }
  }

  static async translate(topic, language, service) {
    const saved = await this.loadPackaged(topic, language);
    if (saved) return saved;
    const sourceLanguage = String(topic.language || 'en').split('-')[0];
    const record = {
      language, sourceRevision: topicSourceRevision(topic), version: 'v001',
      savedAt: new Date().toISOString(), provider: 'original'
    };
    for (const field of FIELDS) {
      const text = String(topic[field] || '');
      if (!text) { record[field] = ''; continue; }
      // Translate prose, including HTML analysis, as plain text.
      const plain = plainTopicText(text);
      const result = await service.translateText(plain, language, {
        sourceLanguage, detectSource: false, allowFreeApi: true
      });
      if (result.provider === 'original' && sourceLanguage !== language) {
        throw new Error('Translation unavailable. The original topic is still shown.');
      }
      record[field] = result.text;
      record.provider = result.provider;
    }
    this.save(topic, record);
    return record;
  }

  static forExport(topic) {
    const candidates = { ...(this.readCache()[String(topic.id)] || {}), ...(topic.translations || {}) };
    return Object.fromEntries(Object.entries(candidates)
      .filter(([language, record]) => translationIsCurrent(record, topic, language)));
  }
}
