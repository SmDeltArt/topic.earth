/**
 * Text-to-Speech functionality using browser SpeechSynthesis API and optional linked AI voice.
 */
const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';
const OPENAI_TTS_MODELS = new Set(['tts-1', 'tts-1-hd']);
const OPENAI_TTS_VOICES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']);
const API_SETTINGS_KEYS = [
  'smdeltartPreferences',
  'smartApiSettings',
  'cadAiApiSettings',
  'smdeltartApiSettings'
];
const VOICE_LANGUAGE_KEYWORDS = {
  fr: ['fr', 'francais', 'français', 'french', 'france', 'fr-fr', 'fr_ca', 'hortense', 'denise', 'henri'],
  en: ['en', 'english', 'united states', 'united kingdom', 'us english', 'uk english'],
  nl: ['nl', 'dutch', 'nederlands', 'netherlands'],
  de: ['de', 'german', 'deutsch', 'germany'],
  es: ['es', 'spanish', 'espanol', 'español', 'spain'],
  ru: ['ru', 'russian', 'русский'],
  hi: ['hi', 'hindi', 'हिन्दी', 'हिंदी', 'india'],
  ar: ['ar', 'arabic', 'العربية'],
  zh: ['zh', 'chinese', '中文', 'mandarin', 'china']
};
const LEGACY_API_SECRET_KEY = 'Sm\u0394rt2025!ApiKey#Secure';

function isEncryptedSecret(value = '') {
  return /^ENC:/i.test(String(value || '').trim());
}

function decryptLegacyApiKey(value = '') {
  const text = String(value || '').trim();
  if (!isEncryptedSecret(text) || typeof window.atob !== 'function') return text;

  try {
    const encoded = text.slice(4);
    const xored = decodeURIComponent(escape(window.atob(encoded)));
    let plainText = '';
    for (let index = 0; index < xored.length; index += 1) {
      plainText += String.fromCharCode(
        xored.charCodeAt(index) ^ LEGACY_API_SECRET_KEY.charCodeAt(index % LEGACY_API_SECRET_KEY.length)
      );
    }
    return plainText;
  } catch (error) {
    return '';
  }
}

function usableApiKey(value = '') {
  const key = decryptLegacyApiKey(value).trim();
  return key && !isEncryptedSecret(key) ? key : '';
}

function firstUsableApiKey(...values) {
  return values.map(usableApiKey).find(Boolean) || '';
}

export class TTSManager {
  constructor(settings) {
    this.settings = settings;
    this.synth = window.speechSynthesis;
    this.currentUtterance = null;
    this.currentAudio = null;
    this.currentAudioUrl = null;
    this.currentAiAbortController = null;
    this.speakRequestId = 0;
    this.manualSpeechHoldUntil = 0;
    this.voices = [];
    this.transcriptCallback = null;
    this.handleVoicesChanged = () => {
      this.refreshVoices();
      window.dispatchEvent(new CustomEvent('browserVoicesChanged', {
        detail: { voices: this.voices }
      }));
    };

    this.loadVoices();
  }

  loadVoices() {
    if (!this.synth) return;

    this.refreshVoices();

    if (!this.voicesChangedListenerInstalled) {
      this.synth.addEventListener('voiceschanged', this.handleVoicesChanged);
      this.voicesChangedListenerInstalled = true;
    }
  }

  refreshVoices() {
    if (!this.synth) return [];
    this.voices = this.synth.getVoices();
    return this.voices;
  }

  normalizeSpeechLang(langCode = 'en-US') {
    return String(langCode || 'en-US').trim().replace(/_/g, '-').toLowerCase();
  }

  getPrimaryLanguage(langCode = 'en-US') {
    return this.normalizeSpeechLang(langCode).split('-')[0];
  }

  voiceMatchesLanguage(voice, langCode) {
    if (!voice) return false;

    const requested = this.normalizeSpeechLang(langCode);
    const primary = this.getPrimaryLanguage(requested);
    const voiceLang = this.normalizeSpeechLang(voice.lang || '');
    if (voiceLang && (voiceLang === requested || this.getPrimaryLanguage(voiceLang) === primary)) {
      return true;
    }

    const searchable = [
      voice.name,
      voice.voiceURI,
      voice.lang
    ].filter(Boolean).join(' ').toLowerCase();
    const keywords = VOICE_LANGUAGE_KEYWORDS[primary] || [primary];
    return keywords.some(keyword => searchable.includes(String(keyword).toLowerCase()));
  }

  getVoicesForLanguage(langCode) {
    return this.voices.filter(voice => this.voiceMatchesLanguage(voice, langCode));
  }

  getBestVoice(langCode) {
    if (this.synth) {
      this.voices = this.synth.getVoices();
    }

    const langVoices = this.getVoicesForLanguage(langCode);

    // Use a manually saved voice only when it still matches the active language.
    // Otherwise language changes can leave an old English voice reading French text.
    if (this.settings.preferredBrowserVoice) {
      const preferred = this.voices.find(v =>
        v.name === this.settings.preferredBrowserVoice
      );
      if (preferred && this.voiceMatchesLanguage(preferred, langCode)) return preferred;
    }

    if (langVoices.length > 0) {
      const requested = this.normalizeSpeechLang(langCode);
      const exactLocal = langVoices.find(v => this.normalizeSpeechLang(v.lang) === requested && v.localService);
      const exact = langVoices.find(v => this.normalizeSpeechLang(v.lang) === requested);
      const defaultVoice = langVoices.find(v => v.default);
      const local = langVoices.find(v => v.localService);
      return exactLocal || exact || defaultVoice || local || langVoices[0];
    }

    // Leave voice unset so the browser can still honor utterance.lang.
    return null;
  }

  async speak(text, langCode = 'en', options = {}) {
    if (!this.settings.ttsEnabled) return;

    if (options.channel === 'fever' && this.isManualSpeechHoldActive()) {
      console.info('[TTS] Fever narration skipped while manual read is active.', { langCode });
      return false;
    }

    const cachedUrls = this.getCachedAudioUrls(options);
    if (cachedUrls.length) {
      const usedCache = await this.speakCachedAudio(cachedUrls, text, langCode, {
        ...options,
        onCacheMiss: options.onCacheMiss || (() => {
          console.info('[TTS] Recorded audio unavailable; falling back to live voice.', {
            langCode,
            urls: cachedUrls
          });
        })
      });
      if (usedCache) return true;
    }

    this.stop({ preserveManualHold: options.priority === 'manual' });
    if (options.priority === 'manual') {
      this.holdManualSpeech();
    }
    const requestId = this.speakRequestId;

    if (this.settings.aiVoiceEnabled && !options.forceBrowser) {
      const fallbackToBrowser = options.aiVoiceFallbackToBrowser ?? this.settings.aiVoiceFallbackToBrowser;
      const spokenWithAi = await this.speakWithAIVoice(text, langCode, options, requestId);
      if (spokenWithAi || requestId !== this.speakRequestId) return;
      if (fallbackToBrowser === false) {
        console.warn('[TTS] Linked AI voice failed and browser fallback is disabled for this read action.', { langCode });
        return;
      }
    } else if (options.forceBrowser) {
      console.info('[TTS] Browser voice forced for this read action.', { langCode });
    } else if (!this.settings.aiVoiceEnabled) {
      console.info('[TTS] Linked AI voice is disabled; using browser voice.', { langCode });
    }

    if (requestId === this.speakRequestId) {
      this.speakWithBrowser(text, langCode, options);
    }
  }

  getCachedAudioUrls(options = {}) {
    const urls = Array.isArray(options.cacheUrls)
      ? options.cacheUrls
      : (options.cacheUrl ? [options.cacheUrl] : []);
    const readMessageId = String(options.readMessageId || '').trim();
    if (readMessageId) {
      const safeId = readMessageId.replace(/[^a-z0-9._-]/gi, '');
      if (safeId) {
        urls.unshift(
          `./assets/audio/read-messages/${safeId}.webm`,
          `./assets/audio/read-messages/${safeId}.mp3`
        );
      }
    }

    return [...new Set(urls.filter(Boolean).flatMap(url => this.expandAudioUrlCandidates(url)))];
  }

  getExternalAudioBaseUrl() {
    return String(window.TOPIC_EARTH_AUDIO_BASE_URL || '').trim().replace(/\/+$/, '');
  }

  expandAudioUrlCandidates(url = '') {
    const value = String(url || '').trim();
    if (!value) return [];

    const candidates = [value];
    const externalBase = this.getExternalAudioBaseUrl();
    if (externalBase && /^\.?\/?assets\/audio\/read-messages\//i.test(value)) {
      const filename = value.split('/').filter(Boolean).pop();
      if (filename) candidates.push(`${externalBase}/${filename}`);
    }

    return candidates;
  }

  async speakCachedAudio(urls = [], text = '', langCode = 'en', options = {}) {
    if (!this.settings.ttsEnabled) return false;

    if (options.channel === 'fever' && this.isManualSpeechHoldActive()) {
      console.info('[TTS] Cached Fever narration skipped while manual read is active.', { langCode });
      return false;
    }

    const candidates = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean);
    if (!candidates.length || !window.Audio) return false;

    this.stop({ preserveManualHold: options.priority === 'manual' });
    if (options.priority === 'manual') {
      this.holdManualSpeech();
    }
    const requestId = this.speakRequestId;

    for (const url of candidates) {
      if (requestId !== this.speakRequestId) return true;
      const available = await this.cachedAudioUrlExists(url);
      if (!available) continue;
      const played = await this.tryPlayCachedAudio(url, options, requestId);
      if (played) return true;
    }

    this.releaseManualSpeechHold(options);
    options.onCacheMiss?.({ source: 'cache', urls: candidates, text, langCode });
    return false;
  }

  async cachedAudioUrlExists(url) {
    if (!window.fetch) return true;

    try {
      const response = await fetch(url, { method: 'HEAD', cache: 'force-cache' });
      if (response.ok) return true;
      if (response.status !== 405 && response.status !== 501) return false;
    } catch (error) {
      return true;
    }

    try {
      const response = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'force-cache' });
      return response.ok || response.status === 206;
    } catch (error) {
      return true;
    }
  }

  tryPlayCachedAudio(url, options = {}, requestId = this.speakRequestId) {
    return new Promise((resolve) => {
      this.releaseCurrentAudio();
      const audio = new Audio(url);
      this.currentAudio = audio;
      let settled = false;
      let started = false;

      const settle = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const notifyStart = () => {
        if (started) return;
        started = true;
        options.onStart?.({ source: 'cache', url });
      };

      audio.onplay = notifyStart;
      audio.onplaying = notifyStart;
      audio.onended = () => {
        this.releaseCurrentAudio();
        this.releaseManualSpeechHold(options);
        options.onEnd?.();
      };
      audio.onerror = () => {
        if (this.currentAudio === audio) {
          this.releaseCurrentAudio();
        }
        settle(false);
      };

      audio.play()
        .then(() => {
          if (requestId !== this.speakRequestId) {
            this.releaseCurrentAudio();
            settle(true);
            return;
          }
          notifyStart();
          settle(true);
        })
        .catch(() => {
          if (this.currentAudio === audio) {
            this.releaseCurrentAudio();
          }
          settle(false);
        });
    });
  }

  speakWithBrowser(text, langCode = 'en', options = {}) {
    if (!this.synth) return;

    try {
      const speechLang = String(langCode || 'en-US').trim() || 'en-US';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLang;

      const voice = this.getBestVoice(speechLang);

      if (voice) {
        utterance.voice = voice;
      }

      utterance.rate = options.rate || this.settings.speechRate;
      utterance.pitch = options.pitch || this.settings.speechPitch;

      if (this.settings.autoShowTranscript && this.transcriptCallback) {
        this.transcriptCallback(text);
      }

      utterance.onstart = () => {
        options.onStart?.({ source: 'browser' });
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        this.releaseManualSpeechHold(options);
        if (options.onEnd) options.onEnd();
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word' || event.charIndex >= 0) {
          options.onBoundary?.({
            charIndex: event.charIndex,
            charLength: event.charLength || 0,
            name: event.name
          });
        }
      };

      utterance.onerror = (e) => {
        // Only log first error to avoid spam
        if (!this.ttsErrorLogged) {
          console.warn('TTS unavailable or error:', e.error);
          this.ttsErrorLogged = true;
        }
        this.currentUtterance = null;
        this.releaseManualSpeechHold(options);
        if (options.onError) options.onError(e);
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    } catch (error) {
      if (!this.ttsErrorLogged) {
        console.warn('TTS not available:', error);
        this.ttsErrorLogged = true;
      }
    }
  }

  async speakWithAIVoice(text, langCode = 'en', options = {}, requestId = this.speakRequestId) {
    if (!window.fetch || !window.Audio) return false;

    const spokenText = this.prepareTextForSpeech(text);
    if (!spokenText) return false;

    let config;
    try {
      config = this.getAIVoiceConfig();
    } catch (error) {
      this.logAIVoiceFallback(error);
      if (options.onError) options.onError(error);
      return false;
    }

    if (!config) return false;

    const abortController = new AbortController();
    this.currentAiAbortController = abortController;

    try {
      if (this.settings.autoShowTranscript && this.transcriptCallback) {
        this.transcriptCallback(spokenText);
      }

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          voice: config.voice,
          input: spokenText,
          response_format: 'mp3'
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(await this.readApiError(response));
      }

      const audioBlob = await response.blob();
      if (requestId !== this.speakRequestId) return true;

      this.releaseCurrentAudio();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      this.currentAudio = audio;
      this.currentAudioUrl = audioUrl;
      let started = false;
      const notifyStart = () => {
        if (started) return;
        started = true;
        options.onStart?.({ source: 'ai' });
      };

      audio.onplay = notifyStart;
      audio.onplaying = notifyStart;
      audio.onended = () => {
        this.releaseCurrentAudio();
        this.releaseManualSpeechHold(options);
        if (options.onEnd) options.onEnd();
      };

      audio.onerror = () => {
        const error = new Error('AI voice audio playback failed.');
        this.releaseCurrentAudio();
        this.releaseManualSpeechHold(options);
        if (options.onError) options.onError(error);
      };

      await audio.play();
      notifyStart();
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') return true;
      this.releaseCurrentAudio();
      this.releaseManualSpeechHold(options);
      this.logAIVoiceFallback(error);
      if (options.onError) options.onError(error);
      return false;
    } finally {
      if (this.currentAiAbortController === abortController) {
        this.currentAiAbortController = null;
      }
    }
  }

  getAIVoiceConfig() {
    const bridgeTtsConfig = this.getBridgeTtsConfig();
    if (bridgeTtsConfig) {
      return bridgeTtsConfig;
    }

    const apiSettings = this.readLinkedApiSettings();
    const provider = apiSettings.externalTtsApi || this.settings.aiVoiceProvider || 'openai-tts';

    if (provider !== 'openai-tts') {
      throw new Error(`AI voice provider "${provider}" is not supported in this app yet.`);
    }

    const apiKey = firstUsableApiKey(
      apiSettings.externalTtsApiKey,
      apiSettings.paidTextApiKey,
      apiSettings.freeTextApiKey,
      apiSettings.paidImageApiKey
    );

    if (!apiKey) {
      throw new Error(`OpenAI TTS key not found on ${window.location.origin}. Save API Settings on this same origin or import same-origin settings first.`);
    }

    return {
      endpoint: OPENAI_TTS_ENDPOINT,
      apiKey,
      model: this.normalizeOpenAITTSModel(apiSettings.openaiTtsModel || this.settings.aiVoiceModel),
      voice: this.normalizeOpenAITTSVoice(
        apiSettings.openaiTtsVoice ||
        this.settings.aiVoiceVoice ||
        this.settings.preferredAIVoice ||
        'alloy'
      )
    };
  }

  getBridgeTtsConfig() {
    try {
      if (!window.ourEarthAI?.getTtsConfig) return null;
      const ttsConfig = window.ourEarthAI.getTtsConfig();
      if (!ttsConfig || ttsConfig.activeMode !== 'external') return null;
      if (ttsConfig.provider !== 'openai-tts') {
        throw new Error(`AI voice provider "${ttsConfig.provider}" is not supported in this app yet.`);
      }
      const apiKey = usableApiKey(ttsConfig.apiKey);
      if (!apiKey) {
        throw new Error(`OpenAI TTS key not found in linked API settings for ${window.location.origin}. Re-save API Settings on this same origin.`);
      }
      return {
        endpoint: OPENAI_TTS_ENDPOINT,
        apiKey,
        model: this.normalizeOpenAITTSModel(ttsConfig.model || this.settings.aiVoiceModel),
        voice: this.normalizeOpenAITTSVoice(
          ttsConfig.voice ||
          this.settings.aiVoiceVoice ||
          this.settings.preferredAIVoice ||
          'alloy'
        )
      };
    } catch (error) {
      throw error;
    }
  }

  readLinkedApiSettings() {
    try {
      if (window.ourEarthAI?.readApiSettings) {
        return window.ourEarthAI.readApiSettings() || {};
      }
    } catch (error) {
      console.warn('[TTS] Could not read linked API settings from bridge:', error);
    }

    return API_SETTINGS_KEYS.reduce((settings, storageKey) => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return settings;
        const parsed = JSON.parse(raw);
        return { ...settings, ...parsed };
      } catch (error) {
        return settings;
      }
    }, {});
  }

  normalizeOpenAITTSModel(model) {
    return OPENAI_TTS_MODELS.has(model) ? model : 'tts-1';
  }

  normalizeOpenAITTSVoice(voice) {
    return OPENAI_TTS_VOICES.has(voice) ? voice : 'alloy';
  }

  prepareTextForSpeech(text) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    return normalized.slice(0, 4096);
  }

  async readApiError(response) {
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const payload = await response.json();
        return payload?.error?.message || `AI voice request failed (${response.status})`;
      }
      const text = await response.text();
      return text ? text.slice(0, 240) : `AI voice request failed (${response.status})`;
    } catch (error) {
      return `AI voice request failed (${response.status})`;
    }
  }

  logAIVoiceFallback(error) {
    if (this.aiTtsErrorLogged) return;
    console.warn('[TTS] AI voice unavailable, using browser voice fallback:', error?.message || error);
    this.aiTtsErrorLogged = true;
  }

  releaseCurrentAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.removeAttribute('src');
      this.currentAudio.load();
      this.currentAudio = null;
    }

    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
  }

  holdManualSpeech(durationMs = 60000) {
    this.manualSpeechHoldUntil = Date.now() + durationMs;
  }

  releaseManualSpeechHold(options = {}) {
    if (options.priority !== 'manual') return;
    this.manualSpeechHoldUntil = Math.max(this.manualSpeechHoldUntil, Date.now() + 1800);
  }

  isManualSpeechHoldActive() {
    return Date.now() < this.manualSpeechHoldUntil;
  }

  stop(options = {}) {
    this.speakRequestId += 1;

    if (!options.preserveManualHold) {
      this.manualSpeechHoldUntil = 0;
    }

    if (this.currentAiAbortController) {
      this.currentAiAbortController.abort();
      this.currentAiAbortController = null;
    }

    this.releaseCurrentAudio();

    if (this.synth?.speaking || this.synth?.pending) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  isSpeaking() {
    return Boolean(
      this.synth?.speaking ||
      (this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended)
    );
  }

  setTranscriptCallback(callback) {
    this.transcriptCallback = callback;
  }

  getAllVoices() {
    this.refreshVoices();
    return this.voices;
  }

  updateSettings(settings) {
    this.settings = settings;
  }
}
