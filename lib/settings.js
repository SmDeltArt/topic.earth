/**
 * Settings management and persistence
 */
export class Settings {
  static KEYS = {
    SETTINGS: 'euroearth_settings'
  };

  static API_SETTINGS_WIDGET_URLS = {
    USER: './api-settings.html',
    ADMIN: './api-settings.html'
  };

  static DEFAULT_SETTINGS = {
    // Language settings
    uiLanguage: null, // null = auto-detect
    translationLanguage: null, // null = follow UI language
    detectedBrowserLanguage: null,
    autoDetectLanguage: true,
    
    // Voice settings
    preferredBrowserVoice: null,
    preferredAIVoice: 'alloy',
    speechRate: 1.0,
    speechPitch: 1.0,
    
    // TTS settings
    autoShowTranscript: false,
    ttsEnabled: true,
    aiVoiceEnabled: false,
    aiVoiceProvider: 'openai-tts',
    aiVoiceModel: 'tts-1',
    aiVoiceVoice: 'alloy',
    aiVoiceFallbackToBrowser: true,

    // AI API bridge settings
    aiApiLinked: false,
    aiApiLastSyncedAt: null,
    aiApiTextProvider: '',
    aiApiTextModel: '',
    aiApiTextMaxModel: '',
    aiApiTextMaxDetectedAt: null,
    aiApiImageProvider: '',
    aiApiImageModel: '',
    aiApiSttProvider: '',
    aiApiSttModel: '',
    aiWebSearchEnabled: true,
    aiUpdatesUseLinkedApi: true,
    aiApiSettingsFrameUrl: './api-settings.html',

    // Regional settings
    regionalAutoLocate: true,
    regionalLocationPrecision: 'region',

    // Interface guidance
    tutorialModeEnabled: true,
    tutorialLevel: 'guided',
    
    // Globe settings
    showCountryHover: false,
    baseTextureQuality: 'auto', // 'auto', '1k', '4k', '8k'
    
    // Fever loop settings
    feverLoopResolution: 'auto', // 'auto', '1k', '4k'
    mainTextureResolution: 'auto', // future-ready for main globe quality
    preferLowResOnNonChromium: true
  };

  static isLocalApiSettingsUrl(url = '') {
    const value = String(url || '').trim();
    if (!value) return true;

    try {
      const parsed = new URL(value, 'http://topic-earth.local/');
      const localHosts = new Set(['topic-earth.local', 'localhost', '127.0.0.1', '::1']);
      return localHosts.has(parsed.hostname) && parsed.pathname.endsWith('/api-settings.html');
    } catch {
      return /^\.{0,2}\/?api-settings\.html/i.test(value);
    }
  }

  static isLocalAppHost() {
    try {
      return ['localhost', '127.0.0.1', '::1'].includes(globalThis.location?.hostname);
    } catch {
      return false;
    }
  }

  static isRemoteWidgetApiSettingsUrl(url = '') {
    try {
      const parsed = new URL(String(url || ''), 'https://topic.earth/');
      return parsed.hostname === 'widgets.smdeltart.com' && parsed.pathname.endsWith('/api-settings.html');
    } catch {
      return false;
    }
  }

  static sanitize(settings = {}) {
    const sanitized = { ...this.DEFAULT_SETTINGS, ...settings };
    const mainAllowed = ['auto', '1k', '4k', '8k'];
    const feverAllowed = ['auto', '1k', '4k'];
    const aiVoiceModels = ['tts-1', 'tts-1-hd'];
    const aiVoiceVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const regionalPrecisions = ['continent', 'country', 'region', 'city', 'address'];
    const tutorialLevels = ['essential', 'guided', 'expert'];
    const supportedLanguages = ['en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'zh'];

    if (!mainAllowed.includes(sanitized.baseTextureQuality)) {
      console.log(`[Settings] Invalid main texture quality "${sanitized.baseTextureQuality}" reset to auto`);
      sanitized.baseTextureQuality = 'auto';
    }

    if (sanitized.feverLoopResolution === '8k') {
      console.log('[Settings] Fever loop 8k setting downgraded to 4k');
      sanitized.feverLoopResolution = '4k';
    } else if (!feverAllowed.includes(sanitized.feverLoopResolution)) {
      console.log(`[Settings] Invalid Fever texture quality "${sanitized.feverLoopResolution}" reset to auto`);
      sanitized.feverLoopResolution = 'auto';
    }

    if (!aiVoiceModels.includes(sanitized.aiVoiceModel)) {
      sanitized.aiVoiceModel = 'tts-1';
    }

    if (!aiVoiceVoices.includes(sanitized.aiVoiceVoice)) {
      sanitized.aiVoiceVoice = sanitized.preferredAIVoice && aiVoiceVoices.includes(sanitized.preferredAIVoice)
        ? sanitized.preferredAIVoice
        : 'alloy';
    }

    sanitized.preferredAIVoice = sanitized.aiVoiceVoice;

    if (!regionalPrecisions.includes(sanitized.regionalLocationPrecision)) {
      sanitized.regionalLocationPrecision = 'region';
    }

    sanitized.regionalAutoLocate = sanitized.regionalAutoLocate !== false;

    if (sanitized.translationLanguage && !supportedLanguages.includes(sanitized.translationLanguage)) {
      sanitized.translationLanguage = null;
    }

    if (!tutorialLevels.includes(sanitized.tutorialLevel)) {
      sanitized.tutorialLevel = 'guided';
    }

    if (this.isRemoteWidgetApiSettingsUrl(sanitized.aiApiSettingsFrameUrl) || this.isLocalApiSettingsUrl(sanitized.aiApiSettingsFrameUrl)) {
      sanitized.aiApiSettingsFrameUrl = './api-settings.html';
    }

    return sanitized;
  }

  static get() {
    try {
      const stored = localStorage.getItem(this.KEYS.SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = this.sanitize(parsed);
        if (
          parsed.feverLoopResolution !== merged.feverLoopResolution
          || parsed.baseTextureQuality !== merged.baseTextureQuality
          || parsed.aiApiSettingsFrameUrl !== merged.aiApiSettingsFrameUrl
          || parsed.tutorialLevel !== merged.tutorialLevel
        ) {
          localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(merged));
        }
        return merged;
      }
      return this.sanitize();
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.sanitize();
    }
  }

  static set(settings) {
    try {
      const current = this.get();
      const updated = this.sanitize({ ...current, ...settings });
      localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  static update(key, value) {
    const settings = this.get();
    settings[key] = value;
    return this.set(settings);
  }

  static reset() {
    localStorage.removeItem(this.KEYS.SETTINGS);
    return { ...this.DEFAULT_SETTINGS };
  }
}
