const TOPIC_ASSET_DB = 'euroearth_topic_assets';
const TOPIC_ASSET_STORE = 'assets';
const MAX_TEXT_LENGTH = 80000;
const MAX_SUMMARY_LENGTH = 12000;
const MAX_SHORT_TEXT_LENGTH = 2000;
const MAX_SOURCES = 30;

function isInlineDataUrl(value) {
  return typeof value === 'string' && /^data:/i.test(value);
}

function isQuotaExceeded(error) {
  return error?.name === 'QuotaExceededError'
    || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || error?.code === 22
    || error?.code === 1014;
}

function trimText(value, limit = MAX_TEXT_LENGTH) {
  if (value === undefined || value === null) return '';
  const text = String(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n[Trimmed for browser storage. Export/cache original assets before deploying.]`;
}

function clonePlain(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

/**
 * Local storage helper for persisting user data.
 *
 * Browser localStorage is tiny, so saved topics must stay lightweight. Inline
 * data URLs are moved into IndexedDB and referenced from the topic record.
 */
export class LocalStorage {
  static KEYS = {
    CUSTOM_LAYERS: 'euroearth_custom_layers',
    CUSTOM_POINTS: 'euroearth_custom_points',
    FAVORITE_SOURCES: 'euroearth_favorite_sources',
    LAST_UPDATE: 'euroearth_last_update',
    TOPIC_UPDATES: 'euroearth_topic_updates'
  };

  static assetDbPromise = null;

  static get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  static set(key, value) {
    const serialized = JSON.stringify(value);

    try {
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      if (isQuotaExceeded(error)) {
        console.warn(`[Storage] localStorage quota exceeded while writing ${key}.`);

        try {
          const previous = localStorage.getItem(key) || '';
          if (serialized.length < previous.length) {
            localStorage.removeItem(key);
            localStorage.setItem(key, serialized);
            return true;
          }
        } catch (retryError) {
          console.error('Error retrying compact localStorage write:', retryError);
        }
      }

      console.error('Error writing to localStorage:', error);
      return false;
    }
  }

  static getCustomLayers() {
    return this.get(this.KEYS.CUSTOM_LAYERS) || [];
  }

  static saveCustomLayers(layers) {
    return this.set(this.KEYS.CUSTOM_LAYERS, layers);
  }

  static getCustomPoints() {
    return this.get(this.KEYS.CUSTOM_POINTS) || [];
  }

  static saveCustomPoints(points) {
    const compacted = this.prepareCustomPointsForStorage(points);
    return this.set(this.KEYS.CUSTOM_POINTS, compacted);
  }

  static prepareCustomPointsForStorage(points = []) {
    return (Array.isArray(points) ? points : [])
      .filter(Boolean)
      .map((point, index) => this.compactTopicForStorage(point, index));
  }

  static compactTopicForStorage(topic = {}, index = 0) {
    const topicId = topic.id ?? `topic-${index}`;
    const mediaTokens = this.compactMediaTokens(topic, topicId);
    const media = mediaTokens.map((token) => token.url).filter(Boolean);

    const compact = {
      id: topic.id ?? Date.now(),
      title: trimText(topic.title || 'Untitled topic', MAX_SHORT_TEXT_LENGTH),
      category: trimText(topic.category || 'world', MAX_SHORT_TEXT_LENGTH),
      date: trimText(topic.date || new Date().toISOString().slice(0, 10), MAX_SHORT_TEXT_LENGTH),
      country: trimText(topic.country || 'Unknown', MAX_SHORT_TEXT_LENGTH),
      region: trimText(topic.region || 'Unknown', MAX_SHORT_TEXT_LENGTH),
      lat: Number(topic.lat),
      lon: Number(topic.lon),
      summary: trimText(topic.summary || '', MAX_SUMMARY_LENGTH),
      source: trimText(topic.source || '', MAX_SHORT_TEXT_LENGTH),
      sourceUrl: this.compactUrl(topic.sourceUrl || '', topicId, 'source-url'),
      insight: trimText(topic.insight || '', MAX_TEXT_LENGTH),
      media,
      mediaTokens,
      isCustom: topic.isCustom !== false,
      originalTopicId: topic.originalTopicId || '',
      originalTitle: trimText(topic.originalTitle || '', MAX_SHORT_TEXT_LENGTH),
      topicStatus: trimText(topic.topicStatus || 'browser-draft', MAX_SHORT_TEXT_LENGTH),
      review: this.compactTopicReview(topic.review),
      storage: this.compactTopicStorage(topic.storage),
      researchSettings: this.compactResearchSettings(topic.researchSettings),
      researchSources: this.compactResearchSources(topic.researchSources, topicId),
      storageMeta: {
        ...(topic.storageMeta || {}),
        compactedAt: new Date().toISOString(),
        localStorageSafe: true
      }
    };

    if (!Number.isFinite(compact.lat)) compact.lat = 48.8566;
    if (!Number.isFinite(compact.lon)) compact.lon = 2.3522;

    [
      'isFeverWarning',
      'isTippingPoint',
      'isAMOC',
      'isPlanet',
      'year',
      'level',
      'scenario',
      'boundary',
      'locationPrecision',
      'city',
      'initiativeType',
      'communityStatus',
      'regionalScope'
    ].forEach((key) => {
      if (topic[key] !== undefined) compact[key] = topic[key];
    });

    if (topic.scenarios) {
      compact.scenarios = clonePlain(topic.scenarios);
    }

    if (Array.isArray(topic.engagementTypes)) {
      compact.engagementTypes = topic.engagementTypes
        .slice(0, 12)
        .map((value) => trimText(value, MAX_SHORT_TEXT_LENGTH));
    }

    if (topic.ttsText) {
      compact.ttsText = trimText(topic.ttsText, MAX_SUMMARY_LENGTH);
    }

    return compact;
  }

  static compactTopicReview(review = {}) {
    const source = review && typeof review === 'object' ? review : {};

    return {
      needsHumanReview: source.needsHumanReview !== false,
      stage: trimText(source.stage || 'browser-draft', MAX_SHORT_TEXT_LENGTH),
      requestedBy: trimText(source.requestedBy || 'browser-user', MAX_SHORT_TEXT_LENGTH),
      adminNotes: trimText(source.adminNotes || '', MAX_SUMMARY_LENGTH),
      userMessage: trimText(source.userMessage || '', MAX_SUMMARY_LENGTH),
      missing: Array.isArray(source.missing)
        ? source.missing.slice(0, 20).map(item => trimText(item, MAX_SHORT_TEXT_LENGTH))
        : []
    };
  }

  static compactTopicStorage(storage = {}) {
    const source = storage && typeof storage === 'object' ? storage : {};

    return {
      origin: trimText(source.origin || 'browser-localStorage', MAX_SHORT_TEXT_LENGTH),
      savedAt: trimText(source.savedAt || new Date().toISOString(), MAX_SHORT_TEXT_LENGTH),
      downloadedAt: trimText(source.downloadedAt || '', MAX_SHORT_TEXT_LENGTH),
      submittedAt: trimText(source.submittedAt || '', MAX_SHORT_TEXT_LENGTH),
      publishedAt: trimText(source.publishedAt || '', MAX_SHORT_TEXT_LENGTH)
    };
  }

  static compactMediaTokens(topic = {}, topicId = 'topic') {
    const sourceTokens = Array.isArray(topic.mediaTokens) && topic.mediaTokens.length > 0
      ? topic.mediaTokens
      : (Array.isArray(topic.media) ? topic.media : []);

    return sourceTokens
      .map((token, index) => this.compactMediaToken(token, topicId, index))
      .filter(Boolean)
      .slice(0, 3);
  }

  static compactMediaToken(input, topicId, index) {
    const token = typeof input === 'string' ? { url: input } : { ...(input || {}) };
    const tokenId = token.id || `media-${index + 1}`;
    const inlineUrl = isInlineDataUrl(token.url || '');
    const compactUrl = this.compactUrl(token.url || '', topicId, tokenId);

    if (!compactUrl && !token.browserAssetKey && !inlineUrl) return null;

    const compact = {
      id: trimText(tokenId, MAX_SHORT_TEXT_LENGTH),
      url: compactUrl,
      sourceUrl: this.compactUrl(token.sourceUrl || '', topicId, `${tokenId}-source`),
      sourceName: trimText(token.sourceName || 'Media source', MAX_SHORT_TEXT_LENGTH),
      sourceHost: trimText(token.sourceHost || '', MAX_SHORT_TEXT_LENGTH),
      watermarkText: trimText(token.watermarkText || '', MAX_SHORT_TEXT_LENGTH),
      query: trimText(token.query || '', MAX_SHORT_TEXT_LENGTH),
      generated: Boolean(token.generated),
      provider: trimText(token.provider || '', MAX_SHORT_TEXT_LENGTH),
      createdAt: token.createdAt || new Date().toISOString()
    };

    if (token.browserAssetKey) {
      compact.browserAssetKey = token.browserAssetKey;
      compact.browserAssetMime = token.browserAssetMime || '';
      compact.storage = token.storage || 'indexeddb';
      compact.browserOnly = true;
    }

    if (inlineUrl) {
      const assetKey = this.buildAssetKey(topicId, tokenId, token.url);
      this.cacheInlineAsset(assetKey, token.url);
      compact.url = '';
      compact.browserAssetKey = assetKey;
      compact.browserAssetMime = this.getDataUrlMime(token.url);
      compact.storage = 'indexeddb';
      compact.browserOnly = true;
    }

    return compact;
  }

  static compactUrl(url = '', topicId = 'topic', tokenId = 'asset') {
    if (!url) return '';

    if (isInlineDataUrl(url)) {
      const assetKey = this.buildAssetKey(topicId, tokenId, url);
      this.cacheInlineAsset(assetKey, url);
      return '';
    }

    const text = String(url);
    return text.length > MAX_TEXT_LENGTH ? trimText(text, MAX_SHORT_TEXT_LENGTH) : text;
  }

  static compactResearchSettings(settings = {}) {
    return {
      sources: Array.isArray(settings.sources) ? settings.sources.slice(0, 12) : [],
      trustedOnly: Boolean(settings.trustedOnly),
      researchMode: trimText(settings.researchMode || '', MAX_SHORT_TEXT_LENGTH),
      geographicScope: trimText(settings.geographicScope || '', MAX_SHORT_TEXT_LENGTH),
      timeScope: trimText(settings.timeScope || '', MAX_SHORT_TEXT_LENGTH),
      outputIntent: trimText(settings.outputIntent || '', MAX_SHORT_TEXT_LENGTH)
    };
  }

  static compactResearchSources(sources = [], topicId = 'topic') {
    return (Array.isArray(sources) ? sources : [])
      .filter(Boolean)
      .slice(0, MAX_SOURCES)
      .map((source, index) => {
        const tokenId = source.mediaTokenId || `source-${index + 1}`;
        const compactUrl = this.compactUrl(source.url || '', topicId, tokenId);
        const compact = {
          name: trimText(source.name || 'Source', MAX_SHORT_TEXT_LENGTH),
          url: compactUrl,
          category: trimText(source.category || '', MAX_SHORT_TEXT_LENGTH),
          reliability: trimText(source.reliability || '', MAX_SHORT_TEXT_LENGTH),
          verified: Boolean(source.verified),
          mediaTokenId: trimText(source.mediaTokenId || '', MAX_SHORT_TEXT_LENGTH)
        };

        if (isInlineDataUrl(source.url || '')) {
          compact.browserAssetKey = this.buildAssetKey(topicId, tokenId, source.url);
          compact.browserAssetMime = this.getDataUrlMime(source.url);
          compact.browserOnly = true;
        }

        return compact;
      });
  }

  static buildAssetKey(topicId, tokenId, value = '') {
    const safeTopic = String(topicId || 'topic').replace(/[^\w.-]+/g, '-').slice(0, 80);
    const safeToken = String(tokenId || 'asset').replace(/[^\w.-]+/g, '-').slice(0, 80);
    const fingerprint = String(value.length || 0);
    return `${safeTopic}/${safeToken}/${fingerprint}`;
  }

  static getDataUrlMime(dataUrl = '') {
    const match = String(dataUrl).match(/^data:([^;,]+)?/i);
    return match?.[1] || 'application/octet-stream';
  }

  static cacheInlineAsset(assetKey, dataUrl) {
    if (!assetKey || !dataUrl || !window.indexedDB) return;

    this.putBrowserAsset({
      key: assetKey,
      dataUrl,
      mime: this.getDataUrlMime(dataUrl),
      size: dataUrl.length,
      createdAt: new Date().toISOString()
    }).catch((error) => {
      console.warn('[Storage] Could not cache inline media asset:', error);
    });
  }

  static openAssetDb() {
    if (!window.indexedDB) {
      return Promise.reject(new Error('IndexedDB is not available in this browser.'));
    }

    if (this.assetDbPromise) return this.assetDbPromise;

    this.assetDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(TOPIC_ASSET_DB, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(TOPIC_ASSET_STORE)) {
          db.createObjectStore(TOPIC_ASSET_STORE, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open topic asset cache.'));
    });

    return this.assetDbPromise;
  }

  static async putBrowserAsset(record) {
    const db = await this.openAssetDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(TOPIC_ASSET_STORE, 'readwrite');
      const store = tx.objectStore(TOPIC_ASSET_STORE);
      store.put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Could not write topic asset.'));
    });
  }

  static async getBrowserAsset(assetKey) {
    if (!assetKey) return null;
    const db = await this.openAssetDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(TOPIC_ASSET_STORE, 'readonly');
      const store = tx.objectStore(TOPIC_ASSET_STORE);
      const request = store.get(assetKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Could not read topic asset.'));
    });
  }

  static getFavoriteSources() {
    return this.get(this.KEYS.FAVORITE_SOURCES) || [];
  }

  static saveFavoriteSources(sources) {
    return this.set(this.KEYS.FAVORITE_SOURCES, sources);
  }

  static getLastUpdate() {
    return this.get(this.KEYS.LAST_UPDATE) || null;
  }

  static saveLastUpdate(date) {
    return this.set(this.KEYS.LAST_UPDATE, date);
  }

  static getTopicUpdates() {
    return this.get(this.KEYS.TOPIC_UPDATES) || {};
  }

  static saveTopicUpdates(updates) {
    return this.set(this.KEYS.TOPIC_UPDATES, updates);
  }

  static markTopicUpdated(topicId) {
    const updates = this.getTopicUpdates();
    updates[topicId] = new Date().toISOString();
    return this.saveTopicUpdates(updates);
  }

  static clearTopicUpdate(topicId) {
    const updates = this.getTopicUpdates();
    delete updates[topicId];
    return this.saveTopicUpdates(updates);
  }
}
