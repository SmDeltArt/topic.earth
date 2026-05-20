/*
 * SmDeltArt Smart AI API Bridge v1.0
 * Shared collection-level AI provider router for apps that read api-settings.html storage.
 *
 * Responsibilities:
 * - Read provider/model/key preferences saved by api-settings.html.
 * - Route text/image requests to linked providers or fallback providers.
 * - Expose a neutral app API, without Websim-specific naming.
 * - Stay project-agnostic; apps inject settings persistence through callbacks.
 */
(function initSmartAiApiBridge(global) {
  'use strict';

  const WIDGET_ALLOWED_PROD_ORIGINS = [
    'https://smdeltart.com',
    'https://portal.smdeltart.com',
    'https://api.smdeltart.com',
    'https://clipboard.smdeltart.com',
    'https://cloudinary.smdeltart.com',
    'https://studio.smdeltart.com',
    'https://images.smdeltart.com',
    'https://widgets.smdeltart.com'
  ];
  const WIDGET_ALLOWED_DEV_ORIGINS = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:8765',
    'http://127.0.0.1:8765',
    'http://localhost:8766',
    'http://127.0.0.1:8766',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
  ];
  const WIDGET_ALLOWED_VERCEL_PATTERN = /^https:\/\/smdeltart[a-z0-9-]*\.vercel\.app$/;
  const API_SETTINGS_CHANNEL_NAME = 'smdeltart-api-settings-sync';

  const TEXT_PROVIDER_ALIASES = {
    'deepseek-free': 'deepseek',
    'google-free': 'google',
    'perplexity-free': 'perplexity'
  };

  const TEXT_PROVIDERS = {
    openai: {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      defaultModel: 'gpt-5.4'
    },
    anthropic: {
      name: 'Anthropic',
      endpoint: 'https://api.anthropic.com/v1/messages',
      defaultModel: 'claude-3-5-sonnet-latest',
      kind: 'anthropic'
    },
    mistral: {
      name: 'Mistral AI',
      endpoint: 'https://api.mistral.ai/v1/chat/completions',
      defaultModel: 'mistral-large-latest'
    },
    groq: {
      name: 'Groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      defaultModel: 'llama-3.3-70b-versatile'
    },
    deepseek: {
      name: 'DeepSeek',
      endpoint: 'https://api.deepseek.com/chat/completions',
      defaultModel: 'deepseek-chat'
    },
    xai: {
      name: 'xAI',
      endpoint: 'https://api.x.ai/v1/chat/completions',
      defaultModel: 'grok-2-latest'
    },
    'together-ai': {
      name: 'Together AI',
      endpoint: 'https://api.together.xyz/v1/chat/completions',
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
    },
    'fireworks-ai': {
      name: 'Fireworks AI',
      endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
      defaultModel: 'accounts/fireworks/models/llama-v3p1-8b-instruct'
    },
    cohere: {
      name: 'Cohere',
      endpoint: 'https://api.cohere.com/v2/chat',
      defaultModel: 'command-r-plus',
      kind: 'cohere'
    },
    cerebras: {
      name: 'Cerebras',
      endpoint: 'https://api.cerebras.ai/v1/chat/completions',
      defaultModel: 'llama3.1-8b'
    },
    ollama: {
      name: 'Ollama Local',
      endpoint: 'http://localhost:11434/api/generate',
      defaultModel: 'llama3.1:8b',
      noKey: true,
      kind: 'ollama'
    },
    perplexity: {
      name: 'Perplexity',
      endpoint: 'https://api.perplexity.ai/chat/completions',
      defaultModel: 'sonar'
    }
  };

  const IMAGE_PROVIDER_ALIASES = {
    'openai-image': 'openai-dalle'
  };

  const IMAGE_PROVIDERS = {
    'openai-dalle': {
      name: 'OpenAI Images',
      endpoint: 'https://api.openai.com/v1/images/generations',
      defaultModel: 'gpt-image-1'
    },
    pollinations: {
      name: 'Pollinations'
    }
  };

  const TTS_PROVIDERS = {
    browser: {
      name: 'Browser TTS',
      noKey: true
    },
    'openai-tts': {
      name: 'OpenAI TTS',
      defaultModel: 'tts-1',
      defaultVoice: 'alloy'
    },
    'edge-tts': {
      name: 'Edge TTS'
    },
    elevenlabs: {
      name: 'ElevenLabs'
    }
  };

  const STT_PROVIDERS = {
    browser: {
      name: 'Browser STT',
      noKey: true
    },
    'browser-speech': {
      name: 'Browser STT',
      noKey: true
    },
    'openai-whisper': {
      name: 'OpenAI STT',
      defaultModel: 'whisper-1'
    },
    'groq-whisper': {
      name: 'Groq Whisper'
    },
    deepgram: {
      name: 'Deepgram'
    },
    assemblyai: {
      name: 'AssemblyAI'
    },
    'azure-speech': {
      name: 'Azure Speech'
    },
    'google-speech': {
      name: 'Google Speech-to-Text'
    },
    'elevenlabs-scribe': {
      name: 'ElevenLabs Scribe'
    }
  };

  function safeJsonParse(value) {
    if (!value || typeof value !== 'string') return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function getStorageObject(key) {
    try {
      return safeJsonParse(global.localStorage?.getItem(key));
    } catch {
      return null;
    }
  }

  function isEncryptedSecret(value = '') {
    return /^ENC:/i.test(String(value || '').trim());
  }

  function usableApiKey(value = '') {
    const key = String(value || '').trim();
    return key && !isEncryptedSecret(key) ? key : '';
  }

  function firstUsableApiKey(...values) {
    return values.map(usableApiKey).find(Boolean) || '';
  }

  function mergeApiSettings(...sources) {
    return sources.reduce((merged, source) => {
      Object.entries(source || {}).forEach(([key, value]) => {
        if (/ApiKey$/i.test(key)) {
          const nextUsable = usableApiKey(value);
          const currentUsable = usableApiKey(merged[key]);
          if (nextUsable || !currentUsable) {
            merged[key] = value;
          }
          return;
        }

        if (value !== undefined) {
          merged[key] = value;
        }
      });

      return merged;
    }, {});
  }

  function compactMessages(messages = []) {
    return messages
      .map((message) => {
        if (!message) return '';
        const label = message.role ? `${message.role}: ` : '';
        const content = Array.isArray(message.content)
          ? message.content.map((part) => part.text || part.type || '').join(' ')
          : message.content || '';
        return `${label}${content}`.trim();
      })
      .filter(Boolean)
      .join('\n\n');
  }

  function stripUndefined(input) {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
  }

  function hasImageMessage(messages = []) {
    return messages.some((message) => Array.isArray(message?.content) && message.content.some((part) => part?.type === 'image_url'));
  }

  function isOpenAiTextModelId(id = '') {
    const value = String(id || '').toLowerCase();
    return /^gpt-/.test(value)
      && !/(image|audio|realtime|transcribe|tts|whisper|embedding|moderation)/.test(value);
  }

  function getOpenAiTextModelRank(id = '') {
    const value = String(id || '').toLowerCase();
    const familyMatch = value.match(/^gpt-(\d+(?:\.\d+)?)/);
    const family = familyMatch ? Number(familyMatch[1]) : 0;
    const miniPenalty = /\b(mini|nano|small|lite)\b/.test(value) ? -0.2 : 0;
    const previewPenalty = /\b(preview|beta|experimental)\b/.test(value) ? -0.04 : 0;
    const dated = value.match(/(?:-|_)(20\d{2})(?:-|_)?(\d{2})?(?:-|_)?(\d{2})?/);
    const dateScore = dated
      ? (Number(dated[1]) * 10000 + Number(dated[2] || 0) * 100 + Number(dated[3] || 0)) / 100000000
      : 0;

    if (family > 0) return family + miniPenalty + previewPenalty + dateScore;
    if (value.includes('4o')) return 4.05 + miniPenalty + previewPenalty + dateScore;
    return 0 + miniPenalty + previewPenalty + dateScore;
  }

  function pickHighestOpenAiTextModel(modelIds = []) {
    return modelIds
      .filter(isOpenAiTextModelId)
      .sort((a, b) => getOpenAiTextModelRank(b) - getOpenAiTextModelRank(a) || String(a).localeCompare(String(b)))
      [0] || '';
  }

  function createProviderError(providerName, response, payload = {}) {
    const errorData = payload.error || {};
    const message = errorData.message || `${providerName} failed with ${response.status}`;
    const error = new Error(message);
    error.providerName = providerName;
    error.status = response.status;
    error.statusText = response.statusText || '';
    error.code = errorData.code || '';
    error.type = errorData.type || '';
    error.raw = payload;
    return error;
  }

  function isQuotaOrBillingError(error) {
    const message = String(error?.message || '').toLowerCase();
    return error?.code === 'insufficient_quota'
      || error?.type === 'insufficient_quota'
      || message.includes('quota')
      || message.includes('billing')
      || message.includes('hard limit')
      || message.includes('maximum monthly spend');
  }

  function describeProviderFailure(error, providerConfig = {}) {
    const providerLabel = [
      providerConfig.providerName || providerConfig.provider || 'AI provider',
      providerConfig.model ? `(${providerConfig.model})` : ''
    ].filter(Boolean).join(' ');

    if (isQuotaOrBillingError(error)) {
      return `${providerLabel} is blocked by quota or billing. The key may still be valid, but the API project, organization, prepaid balance, or monthly budget cannot currently spend on this request.`;
    }

    if (error?.status === 429) {
      return `${providerLabel} is rate limited. Wait briefly, then retry with fewer parallel requests.`;
    }

    return `${providerLabel} failed: ${error?.message || error}`;
  }

  function isPollinationsDeprecationNotice(text = '') {
    return /pollinations legacy text api/i.test(text)
      || /migrate to .*enter\.pollinations\.ai/i.test(text);
  }

  class SmartAiApiBridge {
    constructor(options = {}) {
      this.appName = options.appName || 'unknown-app';
      this.getRuntimeSettings = options.getRuntimeSettings || (() => ({ aiUpdatesUseLinkedApi: true, aiWebSearchEnabled: true }));
      this.onSummary = options.onSummary || (() => {});
      this.eventName = options.eventName || 'smartAiApiSettingsChanged';
      this.syncChannel = null;
      this.lastSummary = null;

      this.initBroadcastSync();
      this.syncFromStorage('init');
      this.attachListeners();
    }

    initBroadcastSync() {
      try {
        if (!global.BroadcastChannel) return;
        this.syncChannel = new global.BroadcastChannel(API_SETTINGS_CHANNEL_NAME);
        this.syncChannel.onmessage = (event) => {
          const { type, settings } = event.data || {};
          if (!['settings-updated', 'settings-response', 'widget-ready'].includes(type)) return;
          this.applyIncomingSettings(settings, global.location?.origin);
          this.syncFromStorage('broadcast');
        };
      } catch (error) {
        console.warn('[Smart AI API] Broadcast sync unavailable:', error);
      }
    }

    attachListeners() {
      global.addEventListener?.('storage', (event) => {
        if (['smdeltartPreferences', 'smartApiSettings', 'cadAiApiSettings', 'smdeltartApiSettings'].includes(event.key)) {
          this.syncFromStorage('storage');
        }
      });

      global.addEventListener?.('message', (event) => {
        if (!this.isAllowedMessageOrigin(event.origin)) return;

        const { type, action, widgetId } = event.data || {};
        const isApiSettingsWidget = widgetId === 'api-settings'
          || event.data?.data?.widgetId === 'api-settings'
          || type === 'smart-widget'
          || type === 'smdeltart-widget-sync';

        if (
          (type === 'smart-widget' && action === 'settings-saved') ||
          (isApiSettingsWidget && ['settings-updated', 'settings-response', 'widget-ready', 'smdeltart-widget-sync'].includes(type))
        ) {
          this.applyIncomingSettings(
            event.data?.settings
            || event.data?.data?.settings
            || event.data?.data,
            event.origin
          );
          this.syncFromStorage('message');
        }
      });
    }

    isAllowedMessageOrigin(origin) {
      if (origin === 'null' || origin === global.location?.origin) return true;

      if (WIDGET_ALLOWED_PROD_ORIGINS.includes(origin)) return true;
      if (WIDGET_ALLOWED_DEV_ORIGINS.includes(origin)) return true;
      if (WIDGET_ALLOWED_VERCEL_PATTERN.test(origin)) return true;

      return false;
    }

    canAcceptSecretSettings(origin) {
      return Boolean(origin && origin === global.location?.origin);
    }

    stripSecretSettings(settings = {}) {
      return Object.fromEntries(
        Object.entries(settings || {}).filter(([key]) => !/ApiKey$/i.test(key))
      );
    }

    applyIncomingSettings(incomingSettings, origin = '') {
      const parsedSettings = typeof incomingSettings === 'string'
        ? safeJsonParse(incomingSettings)
        : incomingSettings;

      if (!parsedSettings || typeof parsedSettings !== 'object') return false;
      const hasSecrets = Object.keys(parsedSettings).some((key) => /ApiKey$/i.test(key) && parsedSettings[key]);
      const settingsToImport = hasSecrets && !this.canAcceptSecretSettings(origin)
        ? this.stripSecretSettings(parsedSettings)
        : parsedSettings;
      const storageKey = hasSecrets && !this.canAcceptSecretSettings(origin)
        ? 'smdeltartPreferences'
        : 'smdeltartApiSettings';

      try {
        global.localStorage?.setItem(storageKey, JSON.stringify(settingsToImport));
        if (storageKey === 'smdeltartApiSettings') {
          global.localStorage?.setItem('smartApiSettings', JSON.stringify(settingsToImport));
        }
        if (storageKey === 'smdeltartPreferences') {
          console.warn('[Smart AI API] Ignored API keys from cross-origin api-settings message; imported preferences only.');
        }
        return true;
      } catch (error) {
        console.warn('[Smart AI API] Could not import posted API settings:', error);
        return false;
      }
    }

    readApiSettings() {
      const preferences = getStorageObject('smdeltartPreferences') || {};
      const smdeltartSettings = getStorageObject('smdeltartApiSettings') || {};
      const cadSettings = getStorageObject('cadAiApiSettings') || {};
      const smartSettings = getStorageObject('smartApiSettings') || {};
      const plain = mergeApiSettings(smdeltartSettings, cadSettings, smartSettings);
      const merged = mergeApiSettings(preferences, plain);

      return {
        ...merged,
        preferencesSource: preferences.source || null,
        plainSource: plain.source || smartSettings.source || cadSettings.source || smdeltartSettings.source || null,
        hasSavedSettings: Boolean(preferences.lastSaved || plain.lastSaved)
      };
    }

    syncFromStorage(source = 'manual') {
      const apiSettings = this.readApiSettings();
      const textConfig = this.getTextConfig(apiSettings);
      const imageConfig = this.getImageConfig(apiSettings);
      const sttConfig = this.getSttConfig(apiSettings);
      const ttsConfig = this.getTtsConfig(apiSettings);
      const textReady = Boolean(
        textConfig.provider &&
        textConfig.config?.endpoint &&
        (textConfig.apiKey || textConfig.config?.noKey)
      );
      const imageReady = Boolean(imageConfig.provider && (imageConfig.apiKey || imageConfig.provider === 'pollinations'));
      const sttReady = Boolean(sttConfig.provider && (sttConfig.apiKey || sttConfig.config?.noKey));
      const ttsReady = Boolean(ttsConfig.activeMode === 'external' && ttsConfig.provider === 'openai-tts' && ttsConfig.apiKey);
      const providerConfigured = Boolean(textConfig.provider || imageConfig.provider || sttConfig.provider || ttsConfig.provider);
      const linked = Boolean(apiSettings.hasSavedSettings && (providerConfigured || textReady || imageReady || sttReady || ttsReady));
      const now = new Date().toISOString();

      const summary = {
        linked,
        providerConfigured,
        source,
        lastSyncedAt: now,
        textProvider: textConfig.provider,
        textProviderName: textConfig.providerName,
        textModel: textConfig.model,
        textMaxModel: getStorageObject('smdeltartApiModelStatus')?.openaiTextMaxModel || '',
        textMaxDetectedAt: getStorageObject('smdeltartApiModelStatus')?.openaiTextMaxDetectedAt || null,
        textHasKey: Boolean(textConfig.apiKey),
        imageProvider: imageConfig.provider,
        imageProviderName: imageConfig.providerName,
        imageModel: imageConfig.model,
        imageHasKey: Boolean(imageConfig.apiKey),
        sttActiveMode: sttConfig.activeMode,
        sttProvider: sttConfig.provider,
        sttProviderName: sttConfig.providerName,
        sttModel: sttConfig.model,
        sttHasKey: Boolean(sttConfig.apiKey),
        ttsActiveMode: ttsConfig.activeMode,
        ttsProvider: ttsConfig.provider,
        ttsProviderName: ttsConfig.providerName,
        ttsModel: ttsConfig.model,
        ttsVoice: ttsConfig.voice,
        ttsHasKey: Boolean(ttsConfig.apiKey),
        webSearchCapable: textConfig.provider === 'perplexity'
      };

      this.lastSummary = summary;
      this.onSummary(summary);
      global.dispatchEvent?.(new CustomEvent(this.eventName, { detail: { summary } }));
      return summary;
    }

    getSummary() {
      return this.lastSummary || this.syncFromStorage('summary');
    }

    async detectOpenAiTextModelCeiling() {
      const textConfig = this.getTextConfig();
      if (textConfig.provider !== 'openai') {
        throw new Error('Current text provider is not OpenAI.');
      }

      if (!textConfig.apiKey) {
        throw new Error('OpenAI API key is missing.');
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${textConfig.apiKey}` }
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw createProviderError('OpenAI models', response, payload);
      }

      const modelIds = Array.isArray(payload.data)
        ? payload.data.map((model) => model?.id).filter(Boolean)
        : [];
      const now = new Date().toISOString();
      const status = {
        openaiTextCurrentModel: textConfig.model,
        openaiTextMaxModel: pickHighestOpenAiTextModel(modelIds),
        openaiTextModelCount: modelIds.length,
        openaiTextMaxDetectedAt: now
      };

      global.localStorage?.setItem('smdeltartApiModelStatus', JSON.stringify(status));
      this.syncFromStorage('openai-model-detect');
      return status;
    }

    getTextConfig(apiSettings = this.readApiSettings()) {
      const activeTier = apiSettings.activeTextProvider || (apiSettings.paidTextApiRadio ? 'paid' : apiSettings.freeTextApiRadio ? 'free' : 'paid');
      const rawProvider = activeTier === 'free' ? apiSettings.freeTextApi : apiSettings.paidTextApi;
      const provider = TEXT_PROVIDER_ALIASES[rawProvider] || rawProvider || '';
      const providerConfig = TEXT_PROVIDERS[provider];
      const apiKey =
        activeTier === 'free'
          ? firstUsableApiKey(apiSettings.freeTextApiKey, apiSettings.paidTextApiKey)
          : firstUsableApiKey(apiSettings.paidTextApiKey, apiSettings.freeTextApiKey);

      return {
        activeTier,
        provider,
        providerName: providerConfig?.name || rawProvider || '',
        apiKey,
        model: this.getTextModelForProvider(provider, providerConfig, apiSettings),
        config: providerConfig
      };
    }

    getTextModelForProvider(provider, providerConfig, apiSettings = {}) {
      if (!provider) return '';

      const explicitProviderModel = apiSettings[`${provider}TextModel`];
      if (explicitProviderModel) return explicitProviderModel;

      if (provider === 'openai') {
        return apiSettings.openaiTextModel || providerConfig?.defaultModel || '';
      }

      if (provider === 'ollama') {
        return apiSettings.ollamaModel || providerConfig?.defaultModel || '';
      }

      return providerConfig?.defaultModel || '';
    }

    getImageConfig(apiSettings = this.readApiSettings()) {
      const activeTier = apiSettings.activeImageProvider || (apiSettings.paidImageApiRadio ? 'paid' : apiSettings.freeImageApiRadio ? 'free' : 'paid');
      const rawProvider = activeTier === 'free' ? apiSettings.freeImageApi : apiSettings.paidImageApi;
      const provider = IMAGE_PROVIDER_ALIASES[rawProvider] || rawProvider || '';
      const providerConfig = IMAGE_PROVIDERS[provider];
      const apiKey =
        activeTier === 'free'
          ? firstUsableApiKey(apiSettings.freeImageApiKey, apiSettings.paidImageApiKey)
          : firstUsableApiKey(apiSettings.paidImageApiKey, apiSettings.freeImageApiKey);

      return {
        activeTier,
        provider,
        providerName: providerConfig?.name || rawProvider || '',
        apiKey,
        model: apiSettings.openaiImageModel || providerConfig?.defaultModel || '',
        config: providerConfig
      };
    }

    getSttConfig(apiSettings = this.readApiSettings()) {
      const activeMode = apiSettings.activeSttProvider ||
        (apiSettings.externalSttApiRadio ? 'external' : 'browser');
      const rawProvider = activeMode === 'external' ? apiSettings.externalSttApi : 'browser';
      const provider = rawProvider || (activeMode === 'browser' ? 'browser' : '');
      const providerConfig = STT_PROVIDERS[provider];
      const apiKey =
        activeMode === 'external'
          ? firstUsableApiKey(
            apiSettings.externalSttApiKey,
            provider === 'openai-whisper' ? apiSettings.paidTextApiKey : '',
            provider === 'openai-whisper' ? apiSettings.freeTextApiKey : ''
          )
          : '';

      return {
        activeMode,
        provider,
        providerName: providerConfig?.name || rawProvider || '',
        apiKey,
        model: provider === 'openai-whisper'
          ? apiSettings.openaiSttModel || providerConfig?.defaultModel || 'whisper-1'
          : '',
        config: providerConfig
      };
    }

    getTtsConfig(apiSettings = this.readApiSettings()) {
      const activeMode = apiSettings.activeTtsProvider ||
        (apiSettings.externalTtsApiRadio ? 'external' : 'browser');
      const rawProvider = activeMode === 'external' ? apiSettings.externalTtsApi : 'browser';
      const provider = rawProvider || (activeMode === 'browser' ? 'browser' : '');
      const providerConfig = TTS_PROVIDERS[provider];
      const apiKey =
        activeMode === 'external'
          ? firstUsableApiKey(
            apiSettings.externalTtsApiKey,
            provider === 'openai-tts' ? apiSettings.paidTextApiKey : '',
            provider === 'openai-tts' ? apiSettings.freeTextApiKey : ''
          )
          : '';

      return {
        activeMode,
        provider,
        providerName: providerConfig?.name || rawProvider || '',
        apiKey,
        model: provider === 'openai-tts' ? apiSettings.openaiTtsModel || providerConfig?.defaultModel || 'tts-1' : '',
        voice: provider === 'openai-tts'
          ? apiSettings.openaiTtsVoice || providerConfig?.defaultVoice || 'alloy'
          : provider === 'edge-tts'
            ? apiSettings.edgeTtsVoice || ''
            : provider === 'elevenlabs'
              ? apiSettings.elevenlabsVoice || ''
              : apiSettings.browserTtsVoice || '',
        config: providerConfig
      };
    }

    async createChatCompletion(request = {}) {
      if (hasImageMessage(request.messages)) {
        return {
          content: '{"appropriate":true,"reason":"Local browser image accepted without remote vision moderation."}',
          provider: 'local-browser',
          model: 'image-moderation-fallback',
          raw: null
        };
      }

      const runtimeSettings = this.getRuntimeSettings();
      const apiSettings = this.readApiSettings();
      const textConfig = this.getTextConfig(apiSettings);
      const fallbackAllowed = runtimeSettings.aiWebSearchEnabled && apiSettings.enableFallback !== false;

      if (!runtimeSettings.aiUpdatesUseLinkedApi) {
        throw new Error('Linked AI API usage is disabled in this app.');
      }

      let linkedProviderFailure = '';

      try {
        if (textConfig.provider === 'google') {
          return await this.callGoogleText(request, textConfig);
        }

        if (textConfig.config?.kind === 'anthropic') {
          return await this.callAnthropicText(request, textConfig);
        }

        if (textConfig.config?.kind === 'cohere') {
          return await this.callCohereText(request, textConfig);
        }

        if (textConfig.config?.kind === 'ollama') {
          return await this.callOllamaText(request, textConfig);
        }

        if (textConfig.provider && textConfig.config?.endpoint && (textConfig.apiKey || textConfig.config?.noKey)) {
          return await this.callOpenAICompatibleText(request, textConfig);
        }
      } catch (error) {
        linkedProviderFailure = describeProviderFailure(error, textConfig);
        console.warn(`[Smart AI API] ${linkedProviderFailure}`, {
          provider: textConfig.provider,
          model: textConfig.model,
          status: error?.status,
          code: error?.code,
          type: error?.type
        });
        if (!fallbackAllowed) {
          throw error;
        }
      }

      if (!fallbackAllowed) {
        throw new Error('No linked text API is ready, and fallback AI search is disabled.');
      }

      try {
        const fallback = await this.callPollinationsText(request);
        fallback.fallbackFor = {
          provider: textConfig.provider,
          model: textConfig.model,
          reason: 'linked-provider-failed'
        };
        return fallback;
      } catch (fallbackError) {
        const fallbackFailure = describeProviderFailure(fallbackError, { providerName: 'Pollinations text fallback' });
        throw new Error(`${linkedProviderFailure || 'Linked provider failed'}; ${fallbackFailure}`);
      }
    }

    async callOpenAICompatibleText(request, textConfig) {
      const response = await fetch(textConfig.config.endpoint, {
        method: 'POST',
        headers: {
          ...(textConfig.apiKey ? { Authorization: `Bearer ${textConfig.apiKey}` } : {}),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          stripUndefined({
            model: textConfig.model,
            messages: request.messages || [],
            temperature: request.temperature ?? 0.3,
            response_format: request.json ? { type: 'json_object' } : undefined
          })
        )
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw createProviderError(textConfig.providerName || textConfig.provider || 'Text provider', response, payload);
      }

      return {
        content: payload.choices?.[0]?.message?.content || '',
        provider: textConfig.provider,
        model: textConfig.model,
        raw: payload
      };
    }

    async callAnthropicText(request, textConfig) {
      if (!textConfig.apiKey) {
        throw new Error('Anthropic API key is missing.');
      }

      const systemMessage = (request.messages || []).find((message) => message.role === 'system');
      const messages = (request.messages || [])
        .filter((message) => message.role !== 'system')
        .map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: typeof message.content === 'string' ? message.content : compactMessages([message])
        }));

      const response = await fetch(textConfig.config.endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': textConfig.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          stripUndefined({
            model: textConfig.model,
            max_tokens: request.max_tokens || 2048,
            temperature: request.temperature ?? 0.3,
            system: systemMessage?.content,
            messages
          })
        )
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error?.message || `Anthropic failed with ${response.status}`);
      }

      return {
        content: payload.content?.map((part) => part.text || '').join('\n') || '',
        provider: 'anthropic',
        model: textConfig.model,
        raw: payload
      };
    }

    async callCohereText(request, textConfig) {
      if (!textConfig.apiKey) {
        throw new Error('Cohere API key is missing.');
      }

      const response = await fetch(textConfig.config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${textConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: textConfig.model,
          messages: (request.messages || []).map((message) => ({
            role: message.role === 'assistant' ? 'assistant' : message.role === 'system' ? 'system' : 'user',
            content: typeof message.content === 'string' ? message.content : compactMessages([message])
          }))
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || `Cohere failed with ${response.status}`);
      }

      return {
        content: payload.message?.content?.map((part) => part.text || '').join('\n') || payload.text || '',
        provider: 'cohere',
        model: textConfig.model,
        raw: payload
      };
    }

    async callOllamaText(request, textConfig) {
      const response = await fetch(textConfig.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: textConfig.model || textConfig.config.defaultModel,
          prompt: compactMessages(request.messages),
          stream: false,
          options: { temperature: request.temperature ?? 0.3 }
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Ollama failed with ${response.status}`);
      }

      return {
        content: payload.response || '',
        provider: 'ollama',
        model: textConfig.model,
        raw: payload
      };
    }

    async callGoogleText(request, textConfig) {
      if (!textConfig.apiKey) {
        throw new Error('Google API key is missing.');
      }

      const model = textConfig.model || 'gemini-1.5-pro';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(textConfig.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: compactMessages(request.messages) }]
              }
            ]
          })
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error?.message || `Google AI failed with ${response.status}`);
      }

      return {
        content: payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || '',
        provider: 'google',
        model,
        raw: payload
      };
    }

    async callPollinationsText(request) {
      const prompt = compactMessages(request.messages);
      const jsonHint = request.json ? '\n\nReturn only valid JSON.' : '';
      const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt + jsonHint)}`);
      if (!response.ok) {
        throw new Error(`Pollinations text fallback failed with ${response.status}`);
      }

      const text = await response.text();
      if (isPollinationsDeprecationNotice(text)) {
        throw new Error('Pollinations text fallback returned a legacy API deprecation notice instead of a model response.');
      }

      return {
        content: text,
        provider: 'pollinations',
        model: 'text',
        raw: null
      };
    }

    async generateImage(request = {}) {
      const apiSettings = this.readApiSettings();
      const imageConfig = this.getImageConfig(apiSettings);

      if (imageConfig.provider === 'openai-dalle' && imageConfig.apiKey) {
        try {
          return await this.callOpenAIImage(request, imageConfig);
        } catch (error) {
          console.warn('[Smart AI API] OpenAI image generation failed, using fallback:', error);
        }
      }

      const width = request.aspect_ratio === '16:9' ? 1024 : 1024;
      const height = request.aspect_ratio === '16:9' ? 576 : 1024;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(request.prompt || 'earth data visualization')}?width=${width}&height=${height}&nologo=true`;
      return { url, provider: 'pollinations', model: 'image' };
    }

    async callOpenAIImage(request, imageConfig) {
      const response = await fetch(imageConfig.config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${imageConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: imageConfig.model || imageConfig.config.defaultModel,
          prompt: request.prompt || 'earth data visualization',
          size: request.aspect_ratio === '16:9' ? '1536x1024' : '1024x1024',
          n: 1
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw createProviderError(imageConfig.providerName || 'OpenAI image generation', response, payload);
      }

      const item = payload.data?.[0] || {};
      return {
        url: item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : ''),
        provider: 'openai-dalle',
        model: imageConfig.model,
        raw: payload
      };
    }

    async uploadLocalFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Failed to read local file.'));
        reader.readAsDataURL(file);
      });
    }
  }

  global.SmartAiApiBridge = SmartAiApiBridge;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartAiApiBridge;
  }
})(typeof window !== 'undefined' ? window : globalThis);
