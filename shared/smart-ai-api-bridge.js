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
      this.widgetSync = null;
      this.lastSummary = null;

      this.initWidgetSync();
      this.syncFromStorage('init');
      this.attachListeners();
    }

    initWidgetSync() {
      if (!global.SmartWidgetSync) return;

      try {
        this.widgetSync = new global.SmartWidgetSync(this.appName);
        this.widgetSync.onSettingsChange(() => this.syncFromStorage('smart-widget-sync'));
      } catch (error) {
        console.warn('[Smart AI API] SmartWidgetSync unavailable:', error);
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

        const { type, action } = event.data || {};
        if (
          (type === 'smart-widget' && action === 'settings-saved') ||
          (event.data?.widgetId === 'api-settings' && ['settings-updated', 'settings-response', 'widget-ready'].includes(type))
        ) {
          this.applyIncomingSettings(event.data?.settings || event.data?.data?.settings);
          this.syncFromStorage('message');
        }
      });
    }

    isAllowedMessageOrigin(origin) {
      if (origin === 'null' || origin === global.location?.origin) return true;

      const widgetBridge = global.WidgetBridge;
      if (widgetBridge?.PROD_ORIGINS?.includes(origin)) return true;
      if (widgetBridge?.DEV_ORIGINS?.includes(origin)) return true;
      if (widgetBridge?.VERCEL_PATTERN?.test(origin)) return true;

      return false;
    }

    applyIncomingSettings(incomingSettings) {
      const parsedSettings = typeof incomingSettings === 'string'
        ? safeJsonParse(incomingSettings)
        : incomingSettings;

      if (!parsedSettings || typeof parsedSettings !== 'object') return false;

      try {
        global.localStorage?.setItem('smdeltartApiSettings', JSON.stringify(parsedSettings));
        global.localStorage?.setItem('smartApiSettings', JSON.stringify(parsedSettings));
        return true;
      } catch (error) {
        console.warn('[Smart AI API] Could not import posted API settings:', error);
        return false;
      }
    }

    readApiSettings() {
      const preferences = getStorageObject('smdeltartPreferences') || {};
      const plain =
        getStorageObject('smartApiSettings') ||
        getStorageObject('cadAiApiSettings') ||
        getStorageObject('smdeltartApiSettings') ||
        {};

      return {
        ...preferences,
        ...plain,
        preferencesSource: preferences.source || null,
        plainSource: plain.source || null,
        hasSavedSettings: Boolean(preferences.lastSaved || plain.lastSaved)
      };
    }

    syncFromStorage(source = 'manual') {
      const apiSettings = this.readApiSettings();
      const textConfig = this.getTextConfig(apiSettings);
      const imageConfig = this.getImageConfig(apiSettings);
      const textReady = Boolean(
        textConfig.provider &&
        textConfig.config?.endpoint &&
        (textConfig.apiKey || textConfig.config?.noKey)
      );
      const imageReady = Boolean(imageConfig.provider && (imageConfig.apiKey || imageConfig.provider === 'pollinations'));
      const linked = Boolean(apiSettings.hasSavedSettings && (textReady || imageReady));
      const now = new Date().toISOString();

      const summary = {
        linked,
        source,
        lastSyncedAt: now,
        textProvider: textConfig.provider,
        textProviderName: textConfig.providerName,
        textModel: textConfig.model,
        textHasKey: Boolean(textConfig.apiKey),
        imageProvider: imageConfig.provider,
        imageProviderName: imageConfig.providerName,
        imageModel: imageConfig.model,
        imageHasKey: Boolean(imageConfig.apiKey),
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

    getTextConfig(apiSettings = this.readApiSettings()) {
      const activeTier = apiSettings.activeTextProvider || (apiSettings.paidTextApiRadio ? 'paid' : apiSettings.freeTextApiRadio ? 'free' : 'paid');
      const rawProvider = activeTier === 'free' ? apiSettings.freeTextApi : apiSettings.paidTextApi;
      const provider = TEXT_PROVIDER_ALIASES[rawProvider] || rawProvider || '';
      const providerConfig = TEXT_PROVIDERS[provider];
      const apiKey =
        activeTier === 'free'
          ? apiSettings.freeTextApiKey || apiSettings.paidTextApiKey || ''
          : apiSettings.paidTextApiKey || apiSettings.freeTextApiKey || '';

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
          ? apiSettings.freeImageApiKey || apiSettings.paidImageApiKey || ''
          : apiSettings.paidImageApiKey || apiSettings.freeImageApiKey || '';

      return {
        activeTier,
        provider,
        providerName: providerConfig?.name || rawProvider || '',
        apiKey,
        model: apiSettings.openaiImageModel || providerConfig?.defaultModel || '',
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
