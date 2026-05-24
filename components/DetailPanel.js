import { Settings } from '../lib/settings.js?v=topic-earth-fever-scenario-layer-20260521';
import { AppAccess } from '../lib/capabilities.js?v=topic-earth-admin-unlock-20260519';
import { LanguageManager } from '../lib/language.js?v=topic-earth-fever-scenario-layer-20260521';
import { ReadTranslationService } from '../lib/read-translation.js';
import { getFeverWarmingTranslation } from '../lib/fever-warming-translations.js?v=topic-earth-fever-json-i18n-20260422';
import { LocalStorage } from '../lib/storage.js?v=topic-earth-regional-initiative-20260424';
import {
  createMediaToken as createTopicMediaToken,
  getDirectImageUrl as getTopicDirectImageUrl,
  getHostFromUrl as getTopicHostFromUrl,
  getMediaTokensForPoint as getTopicMediaTokensForPoint,
  normalizeMediaToken as normalizeTopicMediaToken
} from '../lib/media-utils.js';
import {
  downloadAdminTopicPackage,
  downloadTopicAdminSubmission,
  getAdminTopicExportSummary
} from '../lib/topic-exporter.js?v=topic-earth-embedded-story-20260521';

/**
 * Detail panel component
 * Displays detailed information about selected data points
 */
export class DetailPanel {
  constructor(container, layers, callbacks = {}) {
    this.container = container;
    this.layers = layers;
    this.callbacks = callbacks;
    this.currentPoint = null;
    this.mode = 'detail'; // 'detail', 'research', 'create-layer', or 'create-topic'
    this.researchContext = null;
    this.selectedSources = new Set(['official', 'scientific', 'media']);
    this.selectedAction = 'post-draft';
    this.topicSources = [];
    this.topicFormState = {};
    this.editingTopicId = null;
    this.topicBuilderTab = 'describe';
    this.showSourceEditor = false;
    this.currentNewsData = null;
    this.newsUpdateContext = {};
    this.topicDraftStatus = null;
    this.topicBuilderContext = null;
    this.pendingResearchAutoApply = false;
    this.composerSmartInput = '';
    this.topicDictationTarget = null;
    this.topicDictationRecognition = null;
    this.showMediaUrlInput = false;
    this.mediaUrlDraftUrl = '';
    this.mediaUrlPreviewToken = null;
    this.topicStoryDraft = {
      enabled: false,
      title: '',
      style: 'story-card',
      audience: 'general',
      under16Only: false,
      html: ''
    };
    this.isCompact = false;
    this.panelSize = 'middle';
    
    this.installVisibilityObserver();
    this.setupCloseButton();
    this.installFeverAudioUnlockHandlers();
    window.addEventListener('browserVoicesChanged', () => {
      if (this.mode !== 'settings') return;
      const content = this.container.querySelector('#detail-content');
      if (!content) return;
      const { currentLang } = this.getSettingsLanguageState(Settings.get());
      this.updateBrowserVoicePicker(content, currentLang, Settings.get().preferredBrowserVoice || '');
    });
  }

  installVisibilityObserver() {
    const sync = () => {
      const isOpen = !this.container.classList.contains('hidden');
      document.body.classList.toggle('detail-panel-open', isOpen);
      document.body.classList.toggle('detail-panel-compact', isOpen && this.isCompact);
      document.body.classList.toggle('detail-panel-top', isOpen && this.panelSize === 'top');
      if (isOpen) this.updateCompactSummary();
    };

    this.visibilityObserver = new MutationObserver(sync);
    this.visibilityObserver.observe(this.container, {
      attributes: true,
      attributeFilter: ['class']
    });
    sync();
  }

  getCurrentLanguage() {
    const settings = Settings.get();
    const detectedLang = settings.detectedBrowserLanguage || LanguageManager.detectBrowserLanguage();
    return settings.autoDetectLanguage ? detectedLang : (settings.uiLanguage || detectedLang);
  }

  t(key, values = null) {
    const langCode = this.getCurrentLanguage();
    return values
      ? LanguageManager.formatLabel(key, langCode, values)
      : LanguageManager.getLabel(key, langCode);
  }

  emitTutorialEvent(name, detail = {}, delay = 0) {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(name, {
        detail: {
          mode: this.mode,
          tab: this.topicBuilderTab,
          sourceCount: (this.topicSources || []).filter(source => source?.name || source?.url).length,
          mediaCount: this.getMediaTokensForPoint(this.currentPoint || {}).length,
          ...detail
        }
      }));
    }, delay);
  }

  getLocalizedFeverWarming(scenario, year, fallbackTitle, fallbackMessage) {
    const language = LanguageManager.normalizeLanguageCode(this.getCurrentLanguage());
    const scenarioTranslation = this.getScenarioMilestoneData(year, scenario)?.warningTranslations?.[language];

    if (scenarioTranslation) {
      return {
        title: scenarioTranslation.warningTitle || fallbackTitle,
        message: scenarioTranslation.warningText || fallbackMessage,
        language,
        translationProvider: 'scenario'
      };
    }

    const localized = getFeverWarmingTranslation(scenario, year, language);

    if (!localized) {
      return {
        title: fallbackTitle,
        message: fallbackMessage,
        language: 'en',
        translationProvider: 'original'
      };
    }

    return {
      title: localized.title || fallbackTitle,
      message: localized.message || fallbackMessage,
      language: localized.language,
      translationProvider: 'static'
    };
  }

  getFeverTranslationKey(text, langCode) {
    return `${LanguageManager.normalizeLanguageCode(langCode)}:${String(text || '').trim()}`;
  }

  getFeverTranslationCache() {
    if (!this.feverTranslationCache) {
      this.feverTranslationCache = new Map();
    }
    if (!this.feverTranslationPending) {
      this.feverTranslationPending = new Map();
    }
    return {
      cache: this.feverTranslationCache,
      pending: this.feverTranslationPending
    };
  }

  async translateFeverText(text, langCode = this.getCurrentLanguage()) {
    const sourceText = String(text || '').trim();
    const normalizedLang = LanguageManager.normalizeLanguageCode(langCode);

    if (!sourceText || normalizedLang === 'en') {
      return { text: sourceText, provider: 'original', language: 'en' };
    }

    const { cache, pending } = this.getFeverTranslationCache();
    const cacheKey = this.getFeverTranslationKey(sourceText, normalizedLang);

    if (cache.has(cacheKey)) {
      return { text: cache.get(cacheKey), provider: 'cache', language: normalizedLang };
    }

    const catalogTranslation = LanguageManager.translatePlainText(sourceText, normalizedLang);
    if (catalogTranslation && catalogTranslation !== sourceText) {
      cache.set(cacheKey, catalogTranslation);
      return { text: catalogTranslation, provider: 'catalog', language: normalizedLang };
    }

    if (pending.has(cacheKey)) {
      return pending.get(cacheKey);
    }

    const translationPromise = ReadTranslationService.translateText(sourceText, normalizedLang)
      .then((result) => {
        const translatedText = result?.text || sourceText;
        cache.set(cacheKey, translatedText);
        return {
          text: translatedText,
          provider: result?.provider || 'original',
          language: normalizedLang
        };
      })
      .catch((error) => {
        console.warn('[Fever Translation] Warning text translation failed:', error);
        return { text: sourceText, provider: 'original', language: 'en' };
      })
      .finally(() => {
        pending.delete(cacheKey);
      });

    pending.set(cacheKey, translationPromise);
    return translationPromise;
  }

  getFeverTtsLanguage(localizedResult) {
    const language = localizedResult?.language || this.getCurrentLanguage();
    const provider = localizedResult?.provider || localizedResult?.translationProvider || 'original';

    if (provider === 'original' && LanguageManager.normalizeLanguageCode(language) !== 'en') {
      return LanguageManager.getSpeechCode('en');
    }

    return LanguageManager.getSpeechCode(language);
  }

  async speakLocalizedFeverText(text) {
    if (!window.ttsManager) return;

    const localized = await this.translateFeverText(text);
    this.speakFeverNarration(localized.text, this.getFeverTtsLanguage(localized));
  }

  speakFeverNarration(text, language, extraOptions = {}) {
    if (!window.ttsManager) return;

    window.ttsManager.speak(text, language, {
      channel: 'fever',
      forceBrowser: true,
      ...extraOptions
    });
  }

  getFeverNarrationProfile() {
    const speed = Number(this.currentGlobe?.feverSpeed || 2 / 3);
    if (Number.isFinite(speed) && speed >= 0.99) return 'short';
    if (Number.isFinite(speed) && speed >= 0.6) return 'normal';
    return 'full';
  }

  getFeverNarrationLanguage(language) {
    return LanguageManager.normalizeLanguageCode(language || this.getCurrentLanguage());
  }

  getFeverNarrationCacheUrls({ scenario, year, language }) {
    const lg = this.getFeverNarrationLanguage(language);
    const profile = this.getFeverNarrationProfile();
    const id = `fever-loop-${scenario}-${year}-${profile}-${lg}`;
    const base = `./assets/audio/read-messages/${id}`;
    return [`${base}.webm`, `${base}.mp3`];
  }

  async speakFeverNarrationWithCache(text, language, context = {}) {
    if (!window.ttsManager) return;

    const urls = this.getFeverNarrationCacheUrls({
      scenario: context.scenario || this.currentGlobe?.getFeverScenario?.() || 'objective',
      year: context.year,
      language
    });

    const usedCache = await window.ttsManager.speakCachedAudio(urls, text, language, {
      channel: 'fever',
      onCacheMiss: () => {
        console.info('[Fever Voice] Cached narration unavailable; using browser speech.', { urls });
      }
    });

    if (!usedCache) {
      this.speakFeverNarration(text, language);
    }
  }

  getFeverSegmentSeconds() {
    const speed = Number(this.currentGlobe?.feverSpeed || 2 / 3);
    const safeSpeed = Math.max(speed, 0.01);
    return 3 / (safeSpeed * safeSpeed);
  }

  getFeverNarrationWordBudget() {
    const segmentSeconds = this.getFeverSegmentSeconds();
    return Math.max(7, Math.min(58, Math.floor(segmentSeconds * 2.15)));
  }

  firstSentence(text) {
    return String(text || '').trim().split(/(?<=[.!?])\s+/)[0] || '';
  }

  trimWords(text, maxWords) {
    const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (words.length <= maxWords) return words.join(' ');
    return `${words.slice(0, Math.max(1, maxWords)).join(' ')}...`;
  }

  getWordCount(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
  }

  normalizeNarrationSentence(text) {
    const sentence = String(text || '').replace(/\s+/g, ' ').trim();
    if (!sentence) return '';
    return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
  }

  appendNarrationSentence(parts, sentence, maxWords) {
    const normalized = this.normalizeNarrationSentence(sentence);
    if (!normalized) return false;

    const next = [...parts, normalized].join(' ');
    if (this.getWordCount(next) > maxWords) return false;

    parts.push(normalized);
    return true;
  }

  getFeverMetricSentence(year, scenario) {
    const data = this.getScenarioMilestoneData(year, scenario);
    if (!data) return '';

    const metrics = [];
    if (Number.isFinite(Number(data.temperatureDeltaC))) {
      metrics.push(`warming is plus ${Number(data.temperatureDeltaC).toFixed(1)} degrees`);
    }
    if (Number.isFinite(Number(data.amocStrengthPct))) {
      metrics.push(`AMOC strength is ${Math.round(Number(data.amocStrengthPct))} percent`);
    }
    if (Number.isFinite(Number(data.tippingRiskPct))) {
      metrics.push(`tipping risk is ${Math.round(Number(data.tippingRiskPct))} percent`);
    }

    if (!metrics.length) return '';
    return `The signal reads: ${metrics.join(', ')}.`;
  }

  getFeverBridgeSentence(scenario) {
    return 'The signal continues into the next twenty-five year step.';
  }

  getFeverNarrationText({ year, scenario, title, text }) {
    const speed = Number(this.currentGlobe?.feverSpeed || 2 / 3);
    const maxWords = this.getFeverNarrationWordBudget();
    const lead = this.normalizeNarrationSentence(title || this.firstSentence(text) || text);
    const firstMessage = this.normalizeNarrationSentence(this.firstSentence(text));
    const fullMessage = this.normalizeNarrationSentence(text);
    const metricSentence = this.getFeverMetricSentence(year, scenario);
    const bridgeSentence = this.getFeverBridgeSentence(scenario);
    const parts = [];

    if (speed >= 0.99) {
      return this.trimWords(title || this.firstSentence(text) || text, maxWords);
    }

    this.appendNarrationSentence(parts, lead, maxWords);

    if (speed >= 0.6) {
      if (firstMessage && firstMessage !== lead) {
        this.appendNarrationSentence(parts, firstMessage, maxWords);
      }
      this.appendNarrationSentence(parts, metricSentence, maxWords);
      return parts.join(' ') || this.trimWords(lead, maxWords);
    }

    if (fullMessage && fullMessage !== lead) {
      this.appendNarrationSentence(parts, fullMessage, maxWords);
    }
    this.appendNarrationSentence(parts, metricSentence, maxWords);
    this.appendNarrationSentence(parts, bridgeSentence, maxWords);

    return parts.join(' ') || this.trimWords(lead, maxWords);
  }

  async localizeFeverWarning(warning) {
    const targetLang = this.getCurrentLanguage();

    if (warning.translationProvider === 'static' || warning.translationProvider === 'scenario') {
      const language = warning.language || targetLang;
      return {
        ...warning,
        originalTitle: warning.originalTitle || warning.title || '',
        originalFull: warning.originalFull || warning.full || '',
        language,
        translationProvider: warning.translationProvider,
        ttsLanguage: LanguageManager.getSpeechCode(language)
      };
    }

    const [titleResult, textResult] = await Promise.all([
      this.translateFeverText(warning.title || '', targetLang),
      this.translateFeverText(warning.full || '', targetLang)
    ]);

    return {
      ...warning,
      originalTitle: warning.title || '',
      originalFull: warning.full || '',
      title: titleResult.text || warning.title,
      full: textResult.text || warning.full,
      language: textResult.language || targetLang,
      translationProvider: textResult.provider || 'original',
      ttsLanguage: this.getFeverTtsLanguage(textResult)
    };
  }

  getLocalizedFeverWarningTopic(topic = {}) {
    if (!topic?.isFeverWarning || !topic.year) return topic;

    const scenario = topic.scenario || this.currentGlobe?.getFeverScenario?.() || 'objective';
    const fallbackTitle = topic.originalTitle || topic.title || `Climate Year ${topic.year}`;
    const fallbackMessage = topic.originalSummary || topic.originalFull || topic.ttsText || topic.summary || topic.insight || '';
    const localized = this.getLocalizedFeverWarming(scenario, topic.year, fallbackTitle, fallbackMessage);

    if (!['static', 'scenario'].includes(localized.translationProvider)) return topic;

    return {
      ...topic,
      title: localized.title,
      summary: localized.message,
      insight: localized.message,
      source: this.getLocalizedFeverWarningSource(scenario),
      ttsText: localized.message,
      language: localized.language,
      translationProvider: localized.translationProvider,
      originalTitle: topic.originalTitle || fallbackTitle,
      originalSummary: topic.originalSummary || fallbackMessage,
      ttsLanguage: LanguageManager.getSpeechCode(localized.language)
    };
  }

  getLocalizedFeverWarningSource(scenario = 'objective') {
    const scenarioLabel = this.t(`fever.${scenario}`);
    return `${this.t('fever.earthsFever')} - ${scenarioLabel} ${this.t('fever.scenario').toLowerCase()}`;
  }

  setupCloseButton() {
    const closeBtn = this.container.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    const collapseBtn = this.container.querySelector('.detail-collapse-btn');
    if (collapseBtn && collapseBtn.dataset.boundDetailCollapse !== 'true') {
      collapseBtn.dataset.boundDetailCollapse = 'true';
      const handlePanelSizeToggle = (event) => {
        const now = Date.now();
        if (now - (this.lastPanelSizeToggleAt || 0) < 260) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        this.lastPanelSizeToggleAt = now;
        event.preventDefault();
        event.stopPropagation();
        this.toggleCompactMode();
      };
      collapseBtn.addEventListener('click', handlePanelSizeToggle);
      collapseBtn.addEventListener('pointerup', handlePanelSizeToggle);
    }
    
    // Listen for settings button from TopBar
    window.addEventListener('openSettings', () => {
      this.showSettings(window.ttsManager);
    });

    window.addEventListener('aiApiSettingsChanged', (e) => {
      if (this.mode === 'settings') {
        this.updateAiApiStatus(e.detail?.summary);
      }
    });
    
    // Listen for pause/reverse state changes
    window.addEventListener('feverPauseChanged', (e) => {
      this.updateControlButton('toggle-fever-pause', !e.detail.paused);
      this.updatePauseNotice();
    });
    
    window.addEventListener('feverReverseChanged', (e) => {
      this.updateControlButton('toggle-fever-reverse', e.detail.reversed);
    });
    
    // Handle source input changes
    this.container.addEventListener('input', (e) => {
      if (e.target.classList.contains('source-name-input') || e.target.classList.contains('source-url-input')) {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        if (!isNaN(index) && this.topicSources[index]) {
          this.topicSources[index][field] = e.target.value;
        }
      }
    });
    
    // Delegate event handling for dynamic content
    this.container.addEventListener('click', (e) => {
      const disclosureSummary = e.target.closest('#monitoring-tab-content details > summary');
      if (disclosureSummary) {
        const details = disclosureSummary.closest('details');
        if (details) {
          e.preventDefault();
          e.stopPropagation();
          details.open = !details.open;
        }
        return;
      }

      const externalLink = e.target.closest('.research-output-content a[href], .source-link[href]');
      if (externalLink) {
        const safeHref = this.sanitizeUrl(externalLink.getAttribute('href') || externalLink.href || '');
        if (safeHref) {
          e.preventDefault();
          e.stopPropagation();
          window.open(safeHref, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;

      const adminOnlyAction = this.getAdminOnlyActionMessage(action);
      if (adminOnlyAction && !this.isAdminMode()) {
        e.preventDefault();
        e.stopPropagation();
        this.blockUserMutation(adminOnlyAction);
        this.handleAdminModeChanged(false);
        return;
      }
      
      if (action === 'toggle-fever-sound') {
        this.toggleFeverSound();
      } else if (action === 'toggle-fever-voice') {
        this.toggleFeverVoice();
      } else if (action === 'toggle-source') {
        this.toggleSource(target.dataset.sourceId);
      } else if (action === 'select-action') {
        this.selectAction(target.dataset.actionId);
      } else if (action === 'copy-prompt') {
        this.copyPrompt();
      } else if (action === 'generate-research') {
        this.generateResearch();
      } else if (action === 'submit-layer') {
        this.submitLayer();
      } else if (action === 'submit-topic') {
        this.submitTopic();
      } else if (action === 'switch-tab') {
        this.switchTab(target.dataset.tab);
      } else if (action === 'toggle-research-source') {
        this.toggleResearchSource(target.dataset.sourceId);
      } else if (action === 'select-research-mode') {
        this.selectResearchMode(target.dataset.modeId);
      } else if (action === 'save-topic') {
        this.submitTopic('save');
      } else if (action === 'save-and-research') {
        this.submitTopic('save');
      } else if (action === 'cancel-topic') {
        this.hide();
      } else if (action === 'copy-output') {
        this.copyOutput();
      } else if (action === 'apply-composer-input') {
        this.applyComposerInput();
      } else if (action === 'toggle-topic-dictation') {
        this.toggleTopicDictation(target);
      } else if (action === 'generate-summary') {
        this.generateSummary();
      } else if (action === 'check-draft-www') {
        this.checkDraftWebEvidence(target);
      } else if (action === 'generate-insight') {
        this.generateInsight();
      } else if (action === 'delete-media') {
        this.deleteMedia(target);
      } else if (action === 'post-to-topic') {
        this.postToTopic();
      } else if (action === 'initiative-regional-flow') {
        this.handleInitiativeRegionalFlow(target);
      } else if (action === 'generate-research-media') {
        this.generateResearchMedia(target);
      } else if (action === 'edit-topic') {
        this.editTopic();
      } else if (action === 'generate-coordinates') {
        this.generateCoordinates();
      } else if (action === 'toggle-source-editor') {
        this.toggleSourceEditor();
      } else if (action === 'ai-suggest-sources') {
        this.aiSuggestSources();
      } else if (action === 'add-source') {
        this.addSource();
      } else if (action === 'remove-source') {
        this.removeSource(target);
      } else if (action === 'verify-source') {
        this.verifySource(target);
      } else if (action === 'ai-generate-image') {
        this.aiGenerateImage();
      } else if (action === 'import-media') {
        this.importMedia();
      } else if (action === 'import-file') {
        this.importFile();
      } else if (action === 'import-url') {
        this.importURL();
      } else if (action === 'show-media-url-input') {
        this.showMediaUrlInput = true;
        this.saveFormState();
        this.renderCreateTopic();
        this.emitTutorialEvent('topicMediaUrlOpened', { source: 'media-action' }, 60);
      } else if (action === 'add-media-url') {
        this.addMediaUrlFromInput(target);
      } else if (action === 'preview-media-url') {
        this.previewMediaUrlFromInput(target);
      } else if (action === 'preview-topic-story') {
        this.previewTopicStory();
      } else if (action === 'generate-topic-story') {
        this.generateTopicStoryFromAi(target);
      } else if (action === 'apply-topic-story-preset') {
        this.applyTopicStoryPreset(target);
      } else if (action === 'insert-topic-story-starter') {
        this.insertTopicStoryStarter();
      } else if (action === 'clear-topic-story') {
        this.clearTopicStory();
      } else if (action === 'source-media-search') {
        this.findMediaFromSources();
      } else if (action === 'ai-gen-update') {
        this.submitTopic('save');
      } else if (action === 'manage-sources') {
        this.manageSources();
      } else if (action === 'check-topic-update') {
        this.checkTopicUpdate();
      } else if (action === 'apply-topic-window-update') {
        this.applyTopicWindowUpdate();
      } else if (action === 'add-topic-window-source') {
        this.applyTopicWindowUpdate({ sourceOnly: true });
      } else if (action === 'cancel-topic-update') {
        this.show(this.newsUpdateTargetTopic || this.currentPoint);
      } else if (action === 'submit-topic-package') {
        this.submitCurrentTopicPackage(target);
      } else if (action === 'delete-topic') {
        this.deleteCurrentTopic();
      } else if (action === 'set-response-size') {
        this.setResponseSize(target.dataset.size);
      } else if (action === 'edit-source') {
        this.editSource(target);
      } else if (action === 'set-fever-speed') {
        this.setFeverSpeed(target);
      } else if (action === 'set-fever-scenario') {
        this.setFeverScenario(target);
      } else if (action === 'show-fever-history') {
        this.showFeverWarningHistory();
      } else if (action === 'toggle-fever-pause') {
        this.toggleFeverPause();
      } else if (action === 'toggle-fever-reverse') {
        this.toggleFeverReverse();
      } else if (action === 'toggle-tipping-overlay') {
        this.toggleTippingOverlay();
      } else if (action === 'toggle-amoc-overlay') {
        this.toggleAMOCOverlay();
      } else if (action === 'toggle-detail-compact') {
        this.toggleCompactMode();
      } else if (action === 'navigate-topic') {
        this.navigateTopic(target.dataset.direction || 'next');
      } else if (action === 'jump-to-year') {
        this.jumpToFeverYear(target);
      } else if (action === 'search-topic-update') {
        this.searchTopicUpdate();
      } else if (action === 'generate-news-media') {
        this.generateNewsMedia(target);
      } else if (action === 'zoom-topic-media') {
        this.showTopicMediaZoom(target.dataset.mediaUrl, target.dataset.mediaCaption);
      } else if (action === 'close-topic-media-zoom') {
        this.closeTopicMediaZoom();
      }
    });
    
    // Add listeners for coordinate changes to update globe
    this.container.addEventListener('change', (e) => {
      if ((e.target.id === 'topic-lat' || e.target.id === 'topic-lon') && this.currentPoint) {
        const latInput = this.container.querySelector('#topic-lat');
        const lonInput = this.container.querySelector('#topic-lon');
        
        if (latInput && lonInput && latInput.value && lonInput.value) {
          const lat = parseFloat(latInput.value);
          const lon = parseFloat(lonInput.value);
          
          if (!isNaN(lat) && !isNaN(lon) && this.callbacks.onShow) {
            this.callbacks.onShow({ lat, lon });
          }
        }
      }
    });

    this.container.addEventListener('focusin', (e) => {
      if (this.mode !== 'create-topic') return;
      if (this.isTopicDictationTarget(e.target)) {
        this.topicDictationTarget = e.target;
      }
    });
  }

  getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  isTopicDictationTarget(element) {
    if (!element || !this.container.contains(element)) return false;
    if (!element.closest('#topic-form')) return false;
    const tag = element.tagName?.toLowerCase();
    return tag === 'textarea'
      || (tag === 'input' && !['button', 'submit', 'reset', 'file', 'checkbox', 'radio'].includes(element.type))
      || element.isContentEditable;
  }

  getTopicDictationTarget() {
    const active = document.activeElement;
    if (this.isTopicDictationTarget(active)) {
      this.topicDictationTarget = active;
      return active;
    }

    if (this.isTopicDictationTarget(this.topicDictationTarget)) {
      return this.topicDictationTarget;
    }

    return this.container.querySelector('#topic-smart-input');
  }

  setTopicDictationStatus(message, state = '') {
    const status = this.container.querySelector('[data-topic-dictation-status]');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  }

  insertDictationText(target, text) {
    const value = String(text || '').trim();
    if (!target || !value) return;

    if (target.isContentEditable) {
      target.focus();
      document.execCommand('insertText', false, value);
      target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      return;
    }

    const current = target.value || '';
    const start = Number.isFinite(target.selectionStart) ? target.selectionStart : current.length;
    const end = Number.isFinite(target.selectionEnd) ? target.selectionEnd : current.length;
    const prefix = current.slice(0, start);
    const suffix = current.slice(end);
    const spacer = prefix && !/\s$/.test(prefix) ? ' ' : '';
    const nextText = `${spacer}${value}`;
    target.value = `${prefix}${nextText}${suffix}`;
    const nextCursor = start + nextText.length;
    target.focus();
    target.setSelectionRange?.(nextCursor, nextCursor);
    target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  }

  toggleTopicDictation(button = null) {
    if (this.topicDictationRecognition) {
      this.topicDictationRecognition.stop();
      return;
    }

    const Recognition = this.getSpeechRecognitionConstructor();
    if (!Recognition) {
      this.setTopicDictationStatus('Browser speech recognition is not available here. Configure external STT for higher quality.', 'error');
      return;
    }

    const target = this.getTopicDictationTarget();
    if (!target) return;

    const recognition = new Recognition();
    const lang = LanguageManager.getSpeechCode(this.getCurrentLanguage()) || 'en-US';
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.continuous = false;

    this.topicDictationRecognition = recognition;
    button?.classList.add('active');
    this.setTopicDictationStatus(`Listening for ${target.getAttribute('name') || target.id || 'focused field'}...`, 'listening');

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map(result => result?.[0]?.transcript || '')
        .join(' ')
        .trim();
      this.insertDictationText(target, transcript);
      this.saveFormState?.();
      this.setTopicDictationStatus('Dictation inserted. Focus another field and press Mic to continue.', 'ready');
    };

    recognition.onerror = (event) => {
      this.setTopicDictationStatus(`Dictation stopped: ${event.error || 'speech recognition error'}`, 'error');
    };

    recognition.onend = () => {
      this.topicDictationRecognition = null;
      button?.classList.remove('active');
      if (this.container.querySelector('[data-topic-dictation-status]')?.dataset.state === 'listening') {
        this.setTopicDictationStatus('Dictation stopped. Focus any topic field and press Mic.', 'ready');
      }
    };

    try {
      recognition.start();
    } catch (error) {
      this.topicDictationRecognition = null;
      button?.classList.remove('active');
      this.setTopicDictationStatus(`Dictation could not start: ${error.message || error}`, 'error');
    }
  }

  toggleCompactMode() {
    this.cyclePanelSize();
  }

  setCompactMode(compact) {
    this.setPanelSize(compact ? 'compact' : 'middle');
  }

  cyclePanelSize() {
    const nextSize = this.panelSize === 'middle'
      ? 'compact'
      : this.panelSize === 'compact'
        ? 'top'
        : 'middle';
    this.setPanelSize(nextSize);
  }

  setPanelSize(size = 'middle') {
    this.panelSize = ['top', 'middle', 'compact'].includes(size) ? size : 'middle';
    this.isCompact = this.panelSize === 'compact';
    this.container.classList.toggle('compact', this.isCompact);
    this.container.classList.toggle('expanded-top', this.panelSize === 'top');
    this.container.classList.toggle('middle', this.panelSize === 'middle');

    const button = this.container.querySelector('.detail-collapse-btn');
    if (button) {
      const titleKey = this.panelSize === 'middle'
        ? 'detail.collapseShort'
        : this.panelSize === 'compact'
          ? 'detail.expandTop'
          : 'detail.restoreMiddle';
      button.setAttribute('aria-expanded', String(this.panelSize !== 'compact'));
      button.setAttribute('aria-label', this.t(titleKey));
      button.title = this.t(titleKey);
      button.classList.toggle('is-extend', this.isCompact);
      button.classList.toggle('is-top', this.panelSize === 'top');
    }

    document.body.classList.toggle('detail-panel-compact', !this.container.classList.contains('hidden') && this.isCompact);
    document.body.classList.toggle('detail-panel-top', !this.container.classList.contains('hidden') && this.panelSize === 'top');

    this.updateCompactSummary();
  }

  getAdjacentTopic(direction = 'next') {
    if (this.mode !== 'detail' || !this.currentPoint || this.currentPoint.isCluster || this.currentPoint.isCountry) {
      return null;
    }
    return this.callbacks.getAdjacentTopic?.(this.currentPoint, direction) || null;
  }

  navigateTopic(direction = 'next') {
    const topic = this.getAdjacentTopic(direction);
    if (!topic) return;

    if (this.callbacks.onNavigateTopic) {
      this.callbacks.onNavigateTopic(topic);
    } else {
      this.show(topic);
    }
  }

  updateTopicNavigation() {
    const buttons = [
      {
        direction: 'previous',
        selector: '.detail-nav-prev',
        labelKey: 'detail.previousTopic',
        emptyKey: 'detail.noPreviousTopic'
      },
      {
        direction: 'next',
        selector: '.detail-nav-next',
        labelKey: 'detail.nextTopic',
        emptyKey: 'detail.noNextTopic'
      }
    ];

    buttons.forEach(config => {
      const button = this.container.querySelector(config.selector);
      if (!button) return;

      const topic = this.getAdjacentTopic(config.direction);
      const hasTopic = Boolean(topic);
      const label = hasTopic
        ? `${this.t(config.labelKey)}: ${topic.title || this.t(config.labelKey)}`
        : this.t(config.emptyKey);

      button.disabled = !hasTopic;
      button.setAttribute('aria-label', label);
      button.title = label;
    });
  }

  updateCompactSummary() {
    const summary = this.container.querySelector('#detail-compact-summary');
    if (!summary) return;

    summary.innerHTML = this.renderCompactSummary();
  }

  renderCompactSummary() {
    if (this.mode === 'fever-simulation') {
      const currentYear = this.currentGlobe ? this.currentGlobe.getFeverCurrentYear() : 1950;
      const progress = this.currentGlobe ? Math.round(this.currentGlobe.getFeverProgress() * 100) : 0;
      const scenario = this.currentGlobe ? this.currentGlobe.getFeverScenario() : 'objective';
      const title = this.container.querySelector('#warming-title')?.textContent || this.t('fever.climateBaseline');
      const message = this.container.querySelector('#warming-message')?.textContent || this.t('fever.industrialBaseline');
      const tempDelta = this.container.querySelector('#temp-delta')?.textContent || '+0.0\u00B0C';

      return `
        <div class="compact-kicker">${this.escapeHtml(this.t('fever.earthsFever'))}</div>
        <div class="compact-title">${this.escapeHtml(title)}</div>
        <div class="compact-message">${this.escapeHtml(message)}</div>
        <div class="compact-metrics">
          <span>${this.escapeHtml(this.t('fever.year'))}: ${this.escapeHtml(currentYear)}</span>
          <span>${this.escapeHtml(this.t('fever.progress'))}: ${progress}%</span>
          <span>${this.escapeHtml(tempDelta)}</span>
          <span>${this.escapeHtml(this.t('fever.scenario'))}: ${this.escapeHtml(this.t(`fever.${scenario}`))}</span>
        </div>
      `;
    }

    const point = this.currentPoint;
    if (!point) {
      return `
        <div class="compact-kicker">${this.escapeHtml(this.t('common.settings'))}</div>
        <div class="compact-title">${this.escapeHtml(this.t('detail.expandFull'))}</div>
      `;
    }

    const layer = this.layers.find(l => l.id === point.category);
    const progress = point.isFeverWarning && Number.isFinite(Number(point.year))
      ? Math.round(((Number(point.year) - 1950) / (2125 - 1950)) * 100)
      : null;
    const summaryText = point.summary || point.ttsText || point.insight || '';

    return `
      <div class="compact-kicker">${this.escapeHtml(layer ? `${layer.icon} ${layer.name}` : (point.category || 'Topic'))}</div>
      <div class="compact-title">${this.escapeHtml(point.title || 'Untitled topic')}</div>
      <div class="compact-message">${this.escapeHtml(summaryText)}</div>
      <div class="compact-metrics">
        ${point.region || point.country ? `<span>${this.escapeHtml([point.region, point.country].filter(Boolean).join(', '))}</span>` : ''}
        ${point.date ? `<span>${this.escapeHtml(point.date)}</span>` : ''}
        ${progress !== null ? `<span>${this.escapeHtml(this.t('fever.progress'))}: ${Math.max(0, Math.min(100, progress))}%</span>` : ''}
        ${point.scenario ? `<span>${this.escapeHtml(this.t('fever.scenario'))}: ${this.escapeHtml(this.t(`fever.${point.scenario}`))}</span>` : ''}
      </div>
    `;
  }

  isAdminMode() {
    return AppAccess.isAdminMode();
  }

  canModifyCurrentTopic() {
    return AppAccess.canModifyTopic(this.currentPoint);
  }

  canDeleteCurrentTopic() {
    return AppAccess.canDeleteTopic(this.currentPoint);
  }

  canManageCurrentTopicSources() {
    return AppAccess.canManageTopicSources(this.currentPoint);
  }

  canApplyResearchToCurrentTopic() {
    return this.isAdminMode() || this.canModifyCurrentTopic();
  }

  isRegionalProposalWorkspace() {
    return this.topicDraftStatus?.source === 'regional-proposal';
  }

  isRegionalProposalTopic(point = this.currentPoint) {
    return AppAccess.isRegionalProposalTopic(point);
  }

  getCurrentRegionalTopicState(topic = {}) {
    const category = topic.category || this.topicFormState.category || this.currentPoint?.category || '';
    const shouldCapture = this.isRegionalProposalWorkspace()
      || this.isRegionalResearchLayer(category)
      || Boolean(topic.regionalState || this.currentPoint?.regionalState);

    if (!shouldCapture) return topic.regionalState || this.currentPoint?.regionalState || null;

    try {
      return this.callbacks.getRegionalTopicState?.({
        topic,
        layerId: category,
        restoreMode: category === 'bike-ways' ? 'route' : ''
      }) || topic.regionalState || this.currentPoint?.regionalState || null;
    } catch (error) {
      console.warn('[Regional] Could not capture topic path state:', error);
      return topic.regionalState || this.currentPoint?.regionalState || null;
    }
  }

  getRegionalProposalLayerOptions() {
    const regionalLayers = this.layers.filter(layer => this.isRegionalResearchLayer(layer.id));
    return regionalLayers.length > 0 ? regionalLayers : this.layers;
  }

  getRegionalProposalDefaultLayerId(defaultLayerId = '') {
    const regionalLayers = this.getRegionalProposalLayerOptions();
    return regionalLayers.find(layer => layer.id === defaultLayerId)?.id
      || regionalLayers.find(layer => layer.id === 'community-projects')?.id
      || regionalLayers[0]?.id
      || '';
  }

  getRegionalProposalContext(point = this.currentPoint) {
    if (this.topicBuilderContext?.regionalContext) {
      return this.topicBuilderContext.regionalContext;
    }
    if (!point) return null;

    return {
      label: point.storageMeta?.regionalLabel || '',
      city: point.city || '',
      region: point.region || '',
      country: point.country || '',
      lat: point.lat,
      lon: point.lon,
      precision: point.locationPrecision || point.storageMeta?.mapPrecision || '',
      zoom: point.storageMeta?.mapZoom || ''
    };
  }

  getRegionalProposalContextLabel(context = this.getRegionalProposalContext() || {}) {
    const parts = [context.city, context.region, context.country]
      .map(value => String(value || '').trim())
      .filter(Boolean);

    return parts.join(', ') || String(context.label || '').trim();
  }

  formatInitiativeLabel(value = '') {
    return String(value || '')
      .trim()
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  isInitiativeTopic(point = this.currentPoint) {
    if (!point) return false;
    return Boolean(
      String(point.initiativeType || '').trim()
      || String(point.communityStatus || '').trim()
      || (Array.isArray(point.engagementTypes) && point.engagementTypes.length)
    );
  }

  getInitiativeActionItems(point = this.currentPoint) {
    if (!this.isInitiativeTopic(point)) return [];

    const items = [];
    const seen = new Set();
    const pushItem = (value, type) => {
      const normalizedValue = String(value || '').trim();
      if (!normalizedValue) return;
      const key = normalizedValue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!key || seen.has(`${type}:${key}`)) return;
      seen.add(`${type}:${key}`);
      items.push({
        key,
        label: this.formatInitiativeLabel(normalizedValue),
        type
      });
    };

    pushItem(point.initiativeType, 'initiative');
    pushItem(point.communityStatus, 'status');
    (Array.isArray(point.engagementTypes) ? point.engagementTypes : []).forEach(value => pushItem(value, 'engagement'));

    return items;
  }

  renderInitiativeRegionalSection(point) {
    const actionItems = this.getInitiativeActionItems(point);
    if (actionItems.length === 0) return '';

    return `
      <div class="detail-section">
        <div class="section-label">Regional Action Match</div>
        <div class="initiative-match-grid">
          ${actionItems.map(item => `
            <button
              type="button"
              class="initiative-match-chip initiative-match-chip-${this.escapeHtml(item.type)}"
              data-action="initiative-regional-flow"
              data-initiative-key="${this.escapeHtml(item.key)}"
              data-initiative-label="${this.escapeHtml(item.label)}"
              data-initiative-type="${this.escapeHtml(item.type)}"
              title="Switch to Regional 2D and save a local proposal around your detected or chosen area"
            >
              ${this.escapeHtml(item.label)}
            </button>
          `).join('')}
        </div>
        <div class="initiative-match-note">
          Switches to Regional 2D and keeps a local proposal on this device for later community or admin review flows.
        </div>
      </div>
    `;
  }

  formatMetadataLabel(value = '') {
    return String(value || '')
      .trim()
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  getTopicYear(point = {}) {
    const dateValue = point.carbonHistory?.periodStart || point.date || '';
    const match = String(dateValue || '').match(/^(\d{4})/);
    return match ? match[1] : '';
  }

  getDetailTitle(point = {}) {
    const title = String(point.title || 'Untitled topic').trim();
    if (!point?.isCarbonHistory && !point?.carbonHistory) return title;

    const year = this.getTopicYear(point);
    if (!year || title.startsWith(`${year}:`) || title.startsWith(`${year} -`)) {
      return title;
    }

    return `${year}: ${title}`;
  }

  renderGeneratedCarbonHistoryBanner(point = {}) {
    if (!point?.isCarbonHistory && !point?.carbonHistory) return '';

    const meta = point.carbonHistory || {};
    const year = this.getTopicYear(point) || 'History';
    const track = this.formatMetadataLabel(meta.track || 'Carbon history');
    const title = point.title || 'Carbon History';

    return `
      <div class="carbon-history-banner carbon-history-banner-generated" aria-label="Generated visual banner">
        <div class="carbon-history-generated-orbit"></div>
        <div class="carbon-history-generated-copy">
          <span>${this.escapeHtml(year)}</span>
          <strong>${this.escapeHtml(title)}</strong>
          <small>${this.escapeHtml(track)}</small>
        </div>
      </div>
    `;
  }

  renderCarbonHistorySection(point) {
    if (!point?.isCarbonHistory && !point?.carbonHistory) return '';

    const meta = point.carbonHistory || {};
    const chips = [
      meta.track,
      meta.confidence ? `confidence: ${meta.confidence}` : '',
      meta.sensitivity ? `sensitivity: ${meta.sensitivity}` : '',
      meta.reviewStatus ? `review: ${meta.reviewStatus}` : ''
    ].filter(Boolean);
    return `
      <div class="detail-section carbon-history-review">
        <div class="section-label">Chronology Review</div>
        <div class="carbon-history-chip-grid">
          ${chips.map(chip => `<span class="carbon-history-chip">${this.escapeHtml(this.formatMetadataLabel(chip))}</span>`).join('')}
        </div>
        <div class="initiative-match-note">
          Source-led history marker. Keep fact, interpretation, and sensitive accountability claims separated.
        </div>
      </div>
    `;
  }

  handleInitiativeRegionalFlow(target) {
    if (!this.currentPoint || !this.callbacks.onRegionalInitiativeAction) return;

    this.callbacks.onRegionalInitiativeAction(this.currentPoint, {
      actionKey: target.dataset.initiativeKey || '',
      actionLabel: target.dataset.initiativeLabel || target.textContent?.trim() || '',
      actionType: target.dataset.initiativeType || ''
    });
  }

  getAdminOnlyActionMessage(action) {
    const topicActionBypass = {
      'edit-topic': this.canModifyCurrentTopic(),
      'manage-sources': this.canManageCurrentTopicSources(),
      'delete-topic': this.canDeleteCurrentTopic(),
      'edit-source': this.canManageCurrentTopicSources(),
      'post-to-topic': this.canApplyResearchToCurrentTopic()
    };

    if (topicActionBypass[action]) {
      return '';
    }

    const adminOnlyActions = {
      'submit-layer': 'create layers',
      'edit-topic': 'edit or update posts',
      'manage-sources': 'manage sources and media',
      'submit-topic-package': 'download admin submit packages',
      'delete-topic': 'remove topics',
      'edit-source': 'edit topic sources',
      'show-fever-history': 'view admin warning history',
      'post-to-topic': 'apply generated output to a topic',
      'export-admin-topic-zip': 'download admin review packages'
    };

    return adminOnlyActions[action] || '';
  }

  blockUserMutation(actionLabel = 'modify published topics') {
    alert(`User mode can save local drafts on this device, but only admin mode can ${actionLabel}.`);
  }

  handleAdminModeChanged(isAdmin = this.isAdminMode()) {
    if (!isAdmin) {
      this.container.querySelectorAll('[data-admin-only="true"]').forEach(element => element.remove());

      const adminTopicDraftSources = new Set(['new-topic', 'saved-topic', 'draft-copy']);
      const isAdminOnlyWorkspace = this.mode === 'create-layer'
        || (this.mode === 'create-topic' && adminTopicDraftSources.has(this.topicDraftStatus?.source))
        || this.mode === 'fever-warning-history';

      if (isAdminOnlyWorkspace) {
        this.hide();
        return;
      }
    }

    if (this.mode === 'detail' && this.currentPoint) {
      this.renderDetail(this.currentPoint);
    } else if (this.mode === 'settings') {
      this.renderSettings();
    } else if (this.mode === 'fever-simulation') {
      this.renderFeverSimulation();
    }
  }

  showLocationInfo(locationData) {
    this.currentPoint = locationData;
    this.mode = 'location-info';
    this.renderLocationInfo(locationData);
    this.container.classList.remove('hidden');
    this.updateTopicNavigation();

    if (this.callbacks.onShow && locationData.lat && locationData.lon) {
      this.callbacks.onShow(locationData);
    }
  }
  
  showFeverSimulation(globe) {
    this.mode = 'fever-simulation';
    this.currentGlobe = globe;
    this.feverYears = this.getFeverYearsFromConfig();
    this.renderFeverSimulation();
    this.container.classList.remove('hidden');
    this.updateTopicNavigation();
    
    // Hide year overlay when monitoring panel is visible
    if (this.currentGlobe) {
      this.currentGlobe.hideFeverYearOverlay();
    }
    
    // Listen for year changes
    this.feverYearListener = (e) => {
      this.updateFeverDisplay(e.detail.year, e.detail.milestoneYear, e.detail.progress);
      this.showFeverWarning(e.detail.year, e.detail.milestoneYear, e.detail.progress);
      
      // Update selected boundary content if one is active
      if (this.currentGlobe) {
        const selectedBoundary = this.currentGlobe.getSelectedBoundary();
        if (selectedBoundary) {
          const boundaryData = window.TIPPING_BOUNDARIES?.[selectedBoundary];
          const tippingTopic = window.app?.allPoints?.find(p => 
            p.isTippingPoint && p.boundary === selectedBoundary
          );
          if (boundaryData && tippingTopic) {
            this.updateMonitoringTabContent();
          }
        } else if (this.currentGlobe.getAMOCOverlayVisible()) {
          // If no boundary selected but AMOC is visible, update AMOC monitoring
          this.updateAMOCMonitoring();
        }
      }
    };
    window.addEventListener('feverYearChanged', this.feverYearListener);
    
    // Initialize heartbeat sound
    this.initHeartbeatSound();
    if (this.currentGlobe?.getFeverSoundEnabled()) {
      this.pendingHeartbeatAutostart = true;
      if (this.ensureAudioContext()) {
        this.pendingHeartbeatAutostart = false;
        this.playHeartbeatBeep();
      }
      this.startFeverHeartbeatAudioLoop();
    }
  }
  
  initHeartbeatSound() {
    this.audioContextReady = this.audioContext?.state === 'running';
    this.pendingHeartbeatAutostart = this.currentGlobe?.getFeverSoundEnabled() || false;
    this.lastHeartbeatSound = 0;
    this.lastHeartbeat = 0;
  }

  primeFeverAudioFromGesture() {
    this.pendingHeartbeatAutostart = true;
    return this.ensureAudioContext();
  }

  installFeverAudioUnlockHandlers() {
    if (this.feverAudioUnlockInstalled) return;
    this.feverAudioUnlockInstalled = true;

    this.handleFeverAudioUnlock = () => {
      if (this.mode !== 'fever-simulation' && !this.currentGlobe?.inFeverMode) return;
      if (!this.currentGlobe?.getFeverSoundEnabled()) return;

      this.pendingHeartbeatAutostart = true;
      if (this.ensureAudioContext()) {
        this.pendingHeartbeatAutostart = false;
        this.playHeartbeatBeep();
        this.startFeverHeartbeatAudioLoop();
      }
    };

    ['pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
      window.addEventListener(eventName, this.handleFeverAudioUnlock, { passive: true });
    });
  }
  
  ensureAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('[Fever Sound] AudioContext created:', this.audioContext.state);
      } catch (error) {
        this.audioContextReady = false;
        console.warn('AudioContext not available');
        return false;
      }
    }

    if (this.audioContext.state === 'running') {
      this.audioContextReady = true;
      return true;
    }

    this.audioContextReady = false;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
        .then(() => {
          this.audioContextReady = this.audioContext?.state === 'running';
          if (this.audioContextReady) {
            console.log('[Fever Sound] AudioContext resumed from suspended state');
            if (this.pendingHeartbeatAutostart && this.currentGlobe?.inFeverMode && this.currentGlobe?.getFeverSoundEnabled()) {
              this.pendingHeartbeatAutostart = false;
              this.playHeartbeatBeep();
              this.startFeverHeartbeatAudioLoop();
            }
          }
        })
        .catch((error) => {
          this.audioContextReady = false;
          console.debug('[Fever Sound] Audio resume is waiting for a user gesture:', error);
        });
    }

    return false;
  }

  playHeartbeatPulse(startTime, frequency, peakGain, duration) {
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, frequency * 0.58), startTime + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, startTime);
    filter.frequency.exponentialRampToValueAtTime(70, startTime + duration);
    filter.Q.setValueAtTime(0.9, startTime);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.018);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.04);

    const noiseDuration = duration * 0.75;
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * noiseDuration));
    const noiseBuffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      const decay = 1 - (i / sampleCount);
      channel[i] = (Math.random() * 2 - 1) * decay * 0.22;
    }

    const noise = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();

    noise.buffer = noiseBuffer;
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(95, startTime);
    noiseGain.gain.setValueAtTime(0.0001, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(peakGain * 0.34, startTime + 0.012);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseDuration);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(startTime);
    noise.stop(startTime + noiseDuration + 0.02);
  }

  playHeartbeatBeep() {
    const soundAllowed = this.currentGlobe ? this.currentGlobe.isFeverAudioAllowed() : true;
    if (!soundAllowed) return;

    this.ensureAudioContext();
    if (!this.audioContext || this.audioContext.state !== 'running') {
      this.audioContextReady = false;
      this.pendingHeartbeatAutostart = true;
      return;
    }
    this.audioContextReady = true;
    
    const now = this.audioContext.currentTime;

    // "Lub-dub" heartbeat: two low thumps with a soft filtered body tone.
    this.playHeartbeatPulse(now, 54, 0.42, 0.16);
    this.playHeartbeatPulse(now + 0.19, 42, 0.28, 0.13);
    
    this.lastHeartbeatSound = Date.now();
  }

  startFeverHeartbeatAudioLoop() {
    if (this.heartbeatAudioTimer) return;

    const getBeatInterval = () => {
      const progress = this.currentGlobe?.getFeverProgress?.() || 0;
      const bpm = 60 + progress * 120;
      return Math.max(280, (60 / bpm) * 1000);
    };

    const tick = () => {
      this.heartbeatAudioTimer = null;
      if (!this.currentGlobe?.inFeverMode || !this.currentGlobe.getFeverSoundEnabled()) {
        return;
      }

      this.playHeartbeatBeep();
      this.heartbeatAudioTimer = window.setTimeout(tick, getBeatInterval());
    };

    this.heartbeatAudioTimer = window.setTimeout(tick, getBeatInterval());
  }

  stopFeverHeartbeatAudioLoop({ closeContext = false } = {}) {
    if (this.heartbeatAudioTimer) {
      window.clearTimeout(this.heartbeatAudioTimer);
      this.heartbeatAudioTimer = null;
    }

    if (!closeContext || !this.audioContext) return;

    this.audioContext.close();
    this.audioContext = null;
    this.audioContextReady = false;
  }
  
  renderFeverSimulation() {
    if (this.currentGlobe) {
      this.currentGlobe.hideFeverYearOverlay();
    }
    
    // Import monitoring content
    import('../data/fever-topics.js').then(module => {
      this.feverMonitoringContent = module.FEVER_MONITORING_CONTENT;
    }).catch(() => {
      this.feverMonitoringContent = null;
    });
    
    const content = this.container.querySelector('#detail-content');
    const currentYear = this.currentGlobe ? this.currentGlobe.getFeverCurrentYear() : 1950;
    const progress = this.currentGlobe ? this.currentGlobe.getFeverProgress() : 0;
    const scenario = this.currentGlobe ? this.currentGlobe.getFeverScenario() : 'objective';
    const speed = this.currentGlobe ? this.currentGlobe.feverSpeed : 2 / 3;
    const isFeverSpeedActive = (target) => Math.abs(speed - target) < 0.001;
    const soundEnabled = this.currentGlobe ? this.currentGlobe.getFeverSoundEnabled() : true;
    const voiceEnabled = this.currentGlobe ? this.currentGlobe.getFeverVoiceEnabled() : true;
    const isPaused = this.currentGlobe ? this.currentGlobe.isFeverPaused() : false;
    const isReversed = this.currentGlobe ? this.currentGlobe.isFeverReversed() : false;
    const tippingVisible = this.currentGlobe ? this.currentGlobe.getTippingOverlayVisible() : true;
    const selectedBoundary = this.currentGlobe ? this.currentGlobe.getSelectedBoundary() : null;
    const isAdmin = AppAccess.isAdminMode();
    
    // Active monitoring tab (default to Earth's Fever)
    if (!this.activeMonitoringTab) {
      this.activeMonitoringTab = 'fever';
    }
    
    content.innerHTML = `
      <div class="detail-header fever-detail-header" data-tutorial-id="topic-composer-header">
        <div class="fever-monitor-header">
          <div class="fever-monitor-title">
            <div class="fever-monitor-icon">&#127777;&#65039;</div>
            <div class="fever-monitor-text">
              <div class="fever-monitor-label">${this.escapeHtml(this.t('fever.heartbeatMonitor'))}</div>
              <div class="fever-year-display">
                <span class="fever-year-pulse" id="fever-year-counter">${currentYear}</span>
              </div>
            </div>
          </div>
          <div class="fever-monitor-controls">
            ${isAdmin ? `<button class="fever-control-btn" data-action="show-fever-history" data-admin-only="true" title="${this.escapeHtml(this.t('fever.viewWarningHistory'))}"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1C3.686 1 1 3.686 1 7s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>` : ''}
            <button class="fever-control-btn ${!isPaused ? 'active' : ''}" data-action="toggle-fever-pause" title="${this.escapeHtml(this.t('fever.pauseResume'))}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                ${isPaused ? '<path d="M4 2L10 7L4 12V2Z" fill="currentColor"/>' : '<rect x="4" y="2" width="2" height="10" fill="currentColor"/><rect x="8" y="2" width="2" height="10" fill="currentColor"/>'}
              </svg>
            </button>
            <button class="fever-control-btn ${isReversed ? 'active' : ''}" data-action="toggle-fever-reverse" title="${this.escapeHtml(this.t('fever.reverse'))}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M10 2L4 7L10 12V2Z" fill="currentColor"/>
              </svg>
            </button>
            <span class="fever-sound-control">
              <button class="fever-control-btn ${soundEnabled ? 'active' : ''}" data-action="toggle-fever-sound" title="${this.escapeHtml(this.t('fever.sound'))}">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 5L2 9L5 9L9 12L9 2L5 5L2 5Z" fill="currentColor"/>
                  ${soundEnabled ? '<path d="M11 4C12 5 12 9 11 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' : '<path d="M10 4L12 10M12 4L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'}
                </svg>
              </button>
              <span id="fever-volume-bars" class="fever-volume-bars ${soundEnabled ? '' : 'muted'}" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </span>
            </span>
            <button class="fever-control-btn ${voiceEnabled ? 'active' : ''}" data-action="toggle-fever-voice" title="${this.escapeHtml(this.t('fever.voice'))}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2L4 5H2V9H4L7 12V2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                ${voiceEnabled ? '<path d="M9 5C10 6 10 8 9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' : '<path d="M9 5L11 9M11 5L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'}
              </svg>
            </button>
            <button class="fever-control-btn ${tippingVisible ? 'active' : ''}" data-action="toggle-tipping-overlay" title="${this.escapeHtml(this.t('fever.tippingOverlay'))}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M7 3V7L10 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="fever-control-btn ${this.currentGlobe && this.currentGlobe.getAMOCOverlayVisible() ? 'active' : ''}" data-action="toggle-amoc-overlay" title="${this.escapeHtml(this.t('fever.amocWatchOverlay'))}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2C4 2 2 4 2 7C2 10 4 12 7 12C10 12 12 10 12 7C12 4 10 2 7 2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M7 5V9M5 7H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="fever-scenario-controls">
          <div class="fever-scenario-group">
            <span style="font-size: 10px; opacity: 0.7; margin-right: 6px;">${this.escapeHtml(this.t('fever.scenarioLabel'))}</span>
            <button class="speed-btn ${scenario === 'best' ? 'active' : ''}" data-action="set-fever-scenario" data-scenario="best">${this.escapeHtml(this.t('fever.best'))}</button>
            <button class="speed-btn ${scenario === 'objective' ? 'active' : ''}" data-action="set-fever-scenario" data-scenario="objective">${this.escapeHtml(this.t('fever.objective'))}</button>
            <button class="speed-btn ${scenario === 'high' ? 'active' : ''}" data-action="set-fever-scenario" data-scenario="high">${this.escapeHtml(this.t('fever.high'))}</button>
          </div>
          <div class="fever-scenario-group">
            <span style="font-size: 10px; opacity: 0.7; margin-right: 6px;">${this.escapeHtml(this.t('fever.speedLabel'))}</span>
            <button class="speed-btn ${isFeverSpeedActive(1 / 3) ? 'active' : ''}" data-action="set-fever-speed" data-speed="0.3333333333">1/3</button>
            <button class="speed-btn ${isFeverSpeedActive(2 / 3) ? 'active' : ''}" data-action="set-fever-speed" data-speed="0.6666666667">2/3</button>
            <button class="speed-btn ${isFeverSpeedActive(1) ? 'active' : ''}" data-action="set-fever-speed" data-speed="1">3/3</button>
          </div>
        </div>
      </div>
      
      <div id="fever-pause-notice" class="fever-pause-notice ${isPaused ? '' : 'hidden'}">
        &#9208;&#65039; ${this.escapeHtml(this.t('fever.simulationPaused'))}
      </div>

      <div class="fever-simulation-container">
        <!-- 1. Cardio monitoring on top -->
        <div class="fever-cardio-monitor">
          <div class="heartbeat-display">
            <canvas id="heartbeat-canvas" width="520" height="80"></canvas>
          </div>
          <div class="heartbeat-stats">
            <div class="stat-item">
              <span class="stat-label">BPM</span>
              <span class="stat-value" id="heartbeat-bpm">60</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${this.escapeHtml(this.t('fever.temperatureDelta'))}</span>
              <span class="stat-value" id="temp-delta">+0.0&deg;C</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${this.escapeHtml(this.t('fever.progress'))}</span>
              <span class="stat-value" id="progress-percent">0%</span>
            </div>
          </div>
        </div>

        <!-- 2. Warming title message block -->
        <div id="fever-warming-message" class="fever-warming-message">
          <div class="warming-title" id="warming-title">${this.escapeHtml(this.t('fever.climateBaseline'))}</div>
          <div class="warming-message" id="warming-message">${this.escapeHtml(this.t('fever.industrialBaseline'))}</div>
        </div>

        <div id="fever-warning-display" class="fever-warning-display hidden">
          <div id="fever-warning-content" class="fever-warning-content"></div>
        </div>

        <!-- 3. Combined climate chart -->
        <div class="fever-combined-monitor">
          <div class="section-label">${this.escapeHtml(this.t('fever.climateImpactTrends'))}</div>
          <div class="heartbeat-display">
            <canvas id="combined-chart" width="520" height="240"></canvas>
          </div>
        </div>

        <!-- 4. Tabbed information area -->
        <div class="fever-monitoring-tabs">
          <div class="monitoring-tabs-header">
            <button class="monitoring-tab ${this.activeMonitoringTab === 'fever' ? 'active' : ''}" data-tab="fever">${this.escapeHtml(this.t('fever.earthsFever'))}</button>
            <button class="monitoring-tab ${this.activeMonitoringTab === 'amoc' ? 'active' : ''}" data-tab="amoc">${this.escapeHtml(this.t('fever.amocWatch'))}</button>
            <button class="monitoring-tab ${this.activeMonitoringTab === 'tipping' ? 'active' : ''}" data-tab="tipping">${this.escapeHtml(this.t('fever.tippingPoints'))}</button>
            <button class="monitoring-tab ${this.activeMonitoringTab === 'interactions' ? 'active' : ''}" data-tab="interactions">${this.escapeHtml(this.t('fever.interactions'))}</button>
          </div>
          <div class="monitoring-tab-content" id="monitoring-tab-content">
            ${this.renderMonitoringTabContent(this.activeMonitoringTab, currentYear, scenario, selectedBoundary)}
          </div>
        </div>

        <div class="fever-timeline">
          <div class="section-label">${this.escapeHtml(this.t('fever.timelineLabel'))}</div>
          <div class="timeline-bar">
            <div class="timeline-progress" id="timeline-progress" style="width: ${progress * 100}%"></div>
            <div class="timeline-markers">
              <div class="timeline-marker" style="left: 0%"><span>1950</span></div>
              <div class="timeline-marker" style="left: 14.3%"><span>1975</span></div>
              <div class="timeline-marker" style="left: 28.6%"><span>2000</span></div>
              <div class="timeline-marker" style="left: 42.9%"><span>2025</span></div>
              <div class="timeline-marker" style="left: 57.1%"><span>2050</span></div>
              <div class="timeline-marker" style="left: 71.4%"><span>2075</span></div>
              <div class="timeline-marker" style="left: 85.7%"><span>2100</span></div>
              <div class="timeline-marker" style="left: 100%"><span>2125</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
    this.updateCompactSummary();
    
    // Initialize visualizations
    this.initHeartbeatCanvas();
    this.initCombinedChart();
    
    // Start animations
    this.startHeartbeatAnimation();
    
    // Start warning system
    this.startWarningSystem();
    
    // Listen for tipping threshold warnings
    this.tippingWarningListener = (e) => {
      this.showTippingThresholdWarning(e.detail);
    };
    window.addEventListener('tippingThresholdCrossed', this.tippingWarningListener);
    

    
    // Monitoring tab click handler (ensures tabs switch and content updates)
    const monitoringHeader = this.container.querySelector('.monitoring-tabs-header');
    if (monitoringHeader) {
      monitoringHeader.addEventListener('click', (evt) => {
        const btn = evt.target.closest('.monitoring-tab');
        if (!btn) return;
        const tab = btn.dataset.tab;
        if (!tab) return;
        // update active tab state
        this.activeMonitoringTab = tab;
        // update tab button active classes
        this.container.querySelectorAll('.monitoring-tab').forEach(t => {
          t.classList.toggle('active', t.dataset.tab === tab);
        });
        // refresh content for the newly selected tab
        this.updateMonitoringTabContent();
      });
    }
  }
  

  
  initHeartbeatCanvas() {
    const canvas = this.container.querySelector('#heartbeat-canvas');
    if (!canvas) return;
    
    this.heartbeatCanvas = canvas;
    this.heartbeatCtx = canvas.getContext('2d');
    this.heartbeatData = [];
  }
  
  getFeverYearsFromConfig() {
    return this.currentGlobe?.getFeverYears?.() || [1950, 1975, 2000, 2025, 2050, 2075, 2100, 2125];
  }

  getScenarioMilestones(scenario) {
    return this.currentGlobe?.getFeverScenarioData?.(scenario)?.milestones || null;
  }

  getScenarioMilestoneData(year, scenario) {
    const milestones = this.getScenarioMilestones(scenario);
    if (!milestones) return null;
    const years = Object.keys(milestones).map(Number);
    const closestYear = years.reduce((closest, candidate) => {
      return Math.abs(candidate - year) < Math.abs(closest - year) ? candidate : closest;
    }, years[0]);
    return milestones[String(closestYear)] || null;
  }

  getWarningSeverity(level) {
    const map = {
      baseline: 'info',
      watch: 'warning',
      warning: 'warning',
      elevated: 'danger',
      severe: 'danger',
      critical: 'critical'
    };
    return map[level] || 'info';
  }

  getScenarioChartSeries(scenario) {
    const years = this.getFeverYearsFromConfig();
    const milestones = this.getScenarioMilestones(scenario);
    if (milestones) {
      return {
        labels: years.map(String),
        temp: years.map(year => milestones[String(year)]?.temperatureDeltaC ?? 0),
        ice: years.map(year => Math.max(0, 100 - (milestones[String(year)]?.arcticIceLossPct ?? 0))),
        sea: years.map(year => milestones[String(year)]?.seaLevelCm ?? 0)
      };
    }

    const fallback = {
      best: {
        temp: [0, 0.4, 0.6, 0.9, 1.2, 1.4, 1.5, 1.6],
        ice: [100, 98, 95, 92, 88, 85, 82, 80],
        sea: [0, 5, 10, 18, 28, 38, 45, 50]
      },
      objective: {
        temp: [0, 0.5, 0.8, 1.2, 1.8, 2.5, 3.0, 3.5],
        ice: [100, 97, 93, 88, 80, 70, 60, 50],
        sea: [0, 8, 15, 25, 40, 60, 80, 100]
      },
      high: {
        temp: [0, 0.6, 1.0, 1.5, 2.4, 3.5, 4.5, 5.5],
        ice: [100, 95, 88, 78, 65, 50, 35, 20],
        sea: [0, 10, 20, 35, 55, 85, 120, 160]
      }
    };
    return { labels: years.map(String), ...(fallback[scenario] || fallback.objective) };
  }
  initCombinedChart() {
    const canvas = this.container.querySelector('#combined-chart');
    if (!canvas || !window.Chart) return;
    
    const ctx = canvas.getContext('2d');
    const scenario = this.currentGlobe ? this.currentGlobe.getFeverScenario() : 'objective';
    const chartSeries = this.getScenarioChartSeries(scenario);
    
    this.combinedChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartSeries.labels,
        datasets: [
          {
            label: this.t('fever.temperatureDataset'),
            data: chartSeries.temp,
            borderColor: '#ef5350',
            backgroundColor: 'rgba(239, 83, 80, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ef5350',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            pointHoverBorderWidth: 2,
            yAxisID: 'yTemp'
          },
          {
            label: this.t('fever.iceSheetDataset'),
            data: chartSeries.ice,
            borderColor: '#64b5f6',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#64b5f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            pointHoverBorderWidth: 2,
            yAxisID: 'yIce'
          },
          {
            label: this.t('fever.seaLevelDataset'),
            data: chartSeries.sea,
            borderColor: '#4fc3f7',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#4fc3f7',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            pointHoverBorderWidth: 2,
            yAxisID: 'ySea'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#e8eaed',
              font: { family: 'Space Mono', size: 9 },
              boxWidth: 12,
              padding: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(20, 24, 36, 0.98)',
            titleColor: '#e8eaed',
            bodyColor: '#e8eaed',
            borderColor: '#ef5350',
            borderWidth: 2,
            titleFont: { family: 'Space Mono', size: 12 },
            bodyFont: { family: 'Space Mono', size: 11 },
            padding: 12,
            displayColors: true,
            callbacks: {
              title: function(tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += context.parsed.y.toFixed(1);
                return label;
              }
            }
          }
        },
        scales: {
          yTemp: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            max: 6,
            ticks: {
              color: '#ef5350',
              font: { family: 'Space Mono', size: 8 },
              callback: (value) => `+${value}\u00B0C`
            },
            grid: {
              color: 'rgba(239, 83, 80, 0.1)'
            }
          },
          yIce: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            max: 100,
            ticks: {
              color: '#64b5f6',
              font: { family: 'Space Mono', size: 8 },
              callback: (value) => `${value}%`
            },
            grid: {
              drawOnChartArea: false
            }
          },
          ySea: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            max: 180,
            display: false
          },
          x: {
            ticks: {
              color: '#9aa0a6',
              font: { family: 'Space Mono', size: 8 }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          }
        }
      }
    });
  }
  
  startHeartbeatAnimation() {
    if (this.heartbeatAnimationFrame) {
      cancelAnimationFrame(this.heartbeatAnimationFrame);
    }
    
    const animate = () => {
      if (this.mode !== 'fever-simulation') return;
      
      const progress = this.currentGlobe ? this.currentGlobe.getFeverProgress() : 0;
      const bpm = 60 + progress * 120; // BPM increases from 60 to 180
      const beatInterval = (60 / bpm) * 1000;
      
      // Add heartbeat data point
      const now = Date.now();
      if (!this.lastHeartbeat || now - this.lastHeartbeat > beatInterval) {
        this.lastHeartbeat = now;
        this.heartbeatData.push({ time: now, value: 1 });
      }
      
      // Add normal data points
      this.heartbeatData.push({ time: now, value: 0 });
      
      // Keep only last 5 seconds of data
      const cutoff = now - 5000;
      this.heartbeatData = this.heartbeatData.filter(d => d.time > cutoff);
      
      // Draw heartbeat
      this.drawHeartbeat();
      
      this.heartbeatAnimationFrame = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  drawHeartbeat() {
    if (!this.heartbeatCtx || !this.heartbeatCanvas) return;
    
    const ctx = this.heartbeatCtx;
    const width = this.heartbeatCanvas.width;
    const height = this.heartbeatCanvas.height;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(20, 24, 36, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
    
    // Draw heartbeat line
    if (this.heartbeatData.length > 1) {
      const now = Date.now();
      const timeRange = 5000; // 5 seconds
      
      ctx.strokeStyle = '#ef5350';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      this.heartbeatData.forEach((point, i) => {
        const x = width - ((now - point.time) / timeRange) * width;
        const y = height / 2 - point.value * (height / 3);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }
  }
  
  renderMonitoringTabContent(tab, year, scenario, selectedBoundary) {
    switch (tab) {
      case 'fever':
        return `
          <div class="tab-content-inner">
            <p style="font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
              ${this.escapeHtml(this.t('fever.monitoringIntro'))}
            </p>
            <p style="font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
              ${this.escapeHtml(this.t('fever.monitoringChart'))}
            </p>
            <details style="margin-top: 12px;">
              <summary style="cursor: pointer; font-size: 12px; font-weight: 700; color: var(--accent);">${this.escapeHtml(this.t('fever.scenariosExplained'))}</summary>
              <div style="margin-top: 8px; padding-left: 12px; font-size: 12px; line-height: 1.5; color: var(--text-secondary);">
                <p style="margin-bottom: 8px;"><strong>${this.escapeHtml(this.t('fever.best'))}:</strong> ${this.escapeHtml(this.t('fever.bestExplained'))}</p>
                <p style="margin-bottom: 8px;"><strong>${this.escapeHtml(this.t('fever.objective'))}:</strong> ${this.escapeHtml(this.t('fever.objectiveExplained'))}</p>
                <p><strong>${this.escapeHtml(this.t('fever.high'))}:</strong> ${this.escapeHtml(this.t('fever.highExplained'))}</p>
              </div>
            </details>
          </div>
        `;
      
      case 'amoc':
        const amocState = this.currentGlobe ? this.currentGlobe.getAMOCState() : null;
        if (!amocState) {
          return `
            <div class="tab-content-inner">
              <p style="text-align: center; color: var(--text-secondary); padding: 20px;">
                ${this.escapeHtml(this.t('fever.amocLoading'))}
              </p>
            </div>
          `;
        }
        
        let riskLevel = this.t('fever.riskNormal');
        let riskColor = '#81c784';
        if (amocState.flowStrength < 0.3) {
          riskLevel = this.t('fever.riskCritical');
          riskColor = '#ef5350';
        } else if (amocState.flowStrength < 0.5) {
          riskLevel = this.t('fever.riskHigh');
          riskColor = '#ff8a65';
        } else if (amocState.flowStrength < 0.7) {
          riskLevel = this.t('fever.riskModerate');
          riskColor = '#ffb74d';
        }
        
        return `
          <div class="tab-content-inner">
            <p style="font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
              ${this.escapeHtml(this.t('fever.amocIntro'))}
            </p>
            <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
              <div style="font-size: 12px; margin-bottom: 8px;"><strong>${this.escapeHtml(this.t('fever.circulationStrength'))}:</strong> ${(amocState.flowStrength * 100).toFixed(0)}%</div>
              <div style="font-size: 12px; margin-bottom: 8px;"><strong>${this.escapeHtml(this.t('fever.warmBranchHeat'))}:</strong> ${(amocState.warmHeat * 100).toFixed(0)}%</div>
              <div style="font-size: 12px; margin-bottom: 8px;"><strong>${this.escapeHtml(this.t('fever.coldBranch'))}:</strong> ${(amocState.coldStrength * 100).toFixed(0)}%</div>
              <div style="font-size: 12px; margin-bottom: 8px;"><strong>${this.escapeHtml(this.t('fever.northAtlanticSink'))}:</strong> ${(amocState.sinkStrength * 100).toFixed(0)}%</div>
              <div style="font-size: 12px; margin-bottom: 8px;"><strong>${this.escapeHtml(this.t('fever.southernReturn'))}:</strong> ${(amocState.returnStrength * 100).toFixed(0)}%</div>
              <div style="font-size: 13px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);"><strong>${this.escapeHtml(this.t('fever.riskLevel'))}:</strong> <span style="color: ${riskColor}; font-weight: 700;">${this.escapeHtml(riskLevel)}</span></div>
            </div>
            ${amocState.flowStrength < 0.5 ? `<p style="font-size: 12px; color: #ef5350; line-height: 1.5;"><strong>&#9888;&#65039; ${this.escapeHtml(this.t('fever.warning'))}:</strong> ${this.escapeHtml(this.t('fever.amocWarning'))}</p>` : ''}
            <details style="margin-top: 12px;">
              <summary style="cursor: pointer; font-size: 12px; font-weight: 700; color: var(--accent);">${this.escapeHtml(this.t('fever.whatThisMeans'))}</summary>
              <div style="margin-top: 8px; padding-left: 12px; font-size: 12px; line-height: 1.5; color: var(--text-secondary);">
                <p style="margin-bottom: 8px;"><strong>${this.escapeHtml(this.t('fever.amocStrong'))}:</strong> ${this.escapeHtml(this.t('fever.amocStrongText'))}</p>
                <p style="margin-bottom: 8px;"><strong>${this.escapeHtml(this.t('fever.amocWeakening'))}:</strong> ${this.escapeHtml(this.t('fever.amocWeakeningText'))}</p>
                <p><strong>${this.escapeHtml(this.t('fever.amocWeak'))}:</strong> ${this.escapeHtml(this.t('fever.amocWeakText'))}</p>
              </div>
            </details>
          </div>
        `;
      
      case 'tipping':
        if (selectedBoundary) {
          const boundaryData = window.TIPPING_BOUNDARIES?.[selectedBoundary];
          if (boundaryData) {
            return `
              <div class="tab-content-inner">
                <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: var(--accent);">${boundaryData.title}</h3>
                <p style="font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
                  ${this.escapeHtml(this.t('fever.boundaryIntro'))}
                </p>
                <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                  <div style="font-size: 12px; margin-bottom: 6px;"><strong>${this.escapeHtml(this.t('fever.currentYear'))}:</strong> ${year}</div>
                  <div style="font-size: 12px; margin-bottom: 6px;"><strong>${this.escapeHtml(this.t('fever.scenario'))}:</strong> ${this.escapeHtml(this.t(`fever.${scenario}`))}</div>
                  <div style="font-size: 12px;"><strong>${this.escapeHtml(this.t('fever.status'))}:</strong> ${this.escapeHtml(this.t('fever.coloredRingStatus'))}</div>
                </div>
              </div>
            `;
          }
        }
        return `
          <div class="tab-content-inner">
            <p style="font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
              ${this.escapeHtml(this.t('fever.tippingIntro'))}
            </p>
            <p style="font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
              <strong>${this.escapeHtml(this.t('fever.whyItMatters'))}:</strong> ${this.escapeHtml(this.t('fever.tippingWhy'))}
            </p>
            <p style="font-size: 12px; line-height: 1.5; color: var(--text-secondary);">
              ${this.escapeHtml(this.t('fever.tippingRingLegend'))}
            </p>
          </div>
        `;
      
      case 'interactions':
        return `
          <div class="tab-content-inner">
            <p style="font-size: 13px; line-height: 1.6; margin-bottom: 12px; font-weight: 700;">
              ${this.escapeHtml(this.t('fever.everythingConnected'))}
            </p>
            <p style="font-size: 12px; line-height: 1.6; margin-bottom: 12px; color: var(--text-secondary);">
              ${this.escapeHtml(this.t('fever.feedbackLoop'))}
            </p>
            <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; padding: 12px; margin-top: 12px;">
              <div style="font-size: 11px; font-weight: 700; margin-bottom: 8px; color: var(--accent);">${this.escapeHtml(this.t('fever.keyConnections'))}:</div>
              <ul style="margin: 0; padding-left: 20px; font-size: 11px; line-height: 1.6; color: var(--text-secondary);">
                <li style="margin-bottom: 6px;">${this.escapeHtml(this.t('fever.connectionWarming'))}</li>
                <li style="margin-bottom: 6px;">${this.escapeHtml(this.t('fever.connectionAmoc'))}</li>
                <li style="margin-bottom: 6px;">${this.escapeHtml(this.t('fever.connectionTipping'))}</li>
                <li>${this.escapeHtml(this.t('fever.connectionForest'))}</li>
              </ul>
            </div>
            <p style="font-size: 12px; line-height: 1.5; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-weight: 700;">
              ${this.escapeHtml(this.t('fever.watchTogether'))}
            </p>
          </div>
        `;
      
      default:
        return `<div class="tab-content-inner"><p>${this.escapeHtml(this.t('fever.selectTab'))}</p></div>`;
    }
  }
  
  updateMonitoringTabContent() {
    const tabContent = this.container.querySelector('#monitoring-tab-content');
    if (!tabContent) return;
    
    const currentYear = this.currentGlobe ? this.currentGlobe.getFeverCurrentYear() : 1950;
    const scenario = this.currentGlobe ? this.currentGlobe.getFeverScenario() : 'objective';
    const selectedBoundary = this.currentGlobe ? this.currentGlobe.getSelectedBoundary() : null;
    
    tabContent.innerHTML = this.renderMonitoringTabContent(this.activeMonitoringTab, currentYear, scenario, selectedBoundary);
    
    console.log(`[Monitoring] ${this.activeMonitoringTab} tab content rendered`);
  }
  
  getWarningData(year, scenario) {
    const milestones = this.getFeverYearsFromConfig();
    let closestMilestone = milestones[0];
    let minDiff = Math.abs(year - milestones[0]);

    for (const milestone of milestones) {
      const diff = Math.abs(year - milestone);
      if (diff < minDiff) {
        minDiff = diff;
        closestMilestone = milestone;
      }
    }

    const scenarioMilestone = this.getScenarioMilestoneData(closestMilestone, scenario);
    if (scenarioMilestone?.warningTitle || scenarioMilestone?.warningText) {
      const fallbackTitle = scenarioMilestone.warningTitle || `Climate Year ${closestMilestone}`;
      const fallbackMessage = scenarioMilestone.warningText || `Climate simulation at year ${closestMilestone}`;
      const localized = this.getLocalizedFeverWarming(scenario, closestMilestone, fallbackTitle, fallbackMessage);

      return {
        title: localized.title,
        severity: this.getWarningSeverity(scenarioMilestone.warningLevel),
        level: this.getWarningSeverity(scenarioMilestone.warningLevel),
        message: localized.message,
        language: localized.language,
        translationProvider: localized.translationProvider,
        originalTitle: fallbackTitle,
        originalMessage: fallbackMessage
      };
    }

    if (this.feverMonitoringContent && this.feverMonitoringContent.warningTitles) {
      const warningData = this.feverMonitoringContent.warningTitles[scenario]?.[closestMilestone];
      if (warningData) {
        return warningData;
      }
    }

    return {
      title: `Climate Year ${year}`,
      severity: 'info',
      level: 'info',
      message: `Climate simulation at year ${year}`
    };
  }

  updateLocalizedWarningMessage(warningData, warningTitle, warningMessage) {
    const targetLang = this.getCurrentLanguage();
    const messageToken = [
      LanguageManager.normalizeLanguageCode(targetLang),
      warningData.title || '',
      warningData.message || ''
    ].join('|');

    this.latestFeverWarningMessageToken = messageToken;
    warningTitle.textContent = warningData.title;
    warningMessage.textContent = warningData.message;

    if (warningData.translationProvider === 'static' || warningData.translationProvider === 'scenario') return;
    if (LanguageManager.normalizeLanguageCode(targetLang) === 'en') return;

    Promise.all([
      this.translateFeverText(warningData.title, targetLang),
      this.translateFeverText(warningData.message, targetLang)
    ]).then(([titleResult, messageResult]) => {
      if (this.latestFeverWarningMessageToken !== messageToken) return;
      if (!warningTitle.isConnected || !warningMessage.isConnected) return;

      warningTitle.textContent = titleResult.text || warningData.title;
      warningMessage.textContent = messageResult.text || warningData.message;
    });
  }

  updateFeverDisplay(year, milestoneYear, progress) {
    const yearCounter = this.container.querySelector('#fever-year-counter');
    const timelineProgress = this.container.querySelector('#timeline-progress');
    const bpmDisplay = this.container.querySelector('#heartbeat-bpm');
    const tempDelta = this.container.querySelector('#temp-delta');
    const progressPercent = this.container.querySelector('#progress-percent');
    
    if (yearCounter) {
      yearCounter.textContent = year;
    }
    
    if (timelineProgress) timelineProgress.style.width = `${progress * 100}%`;
    if (progressPercent) progressPercent.textContent = `${Math.round(progress * 100)}%`;
    
    // Calculate BPM (accelerates with progress)
    const bpm = Math.round(60 + progress * 120);
    if (bpmDisplay) bpmDisplay.textContent = bpm;
    
    // Get scenario once at the top
    const scenario = this.currentGlobe ? this.currentGlobe.getFeverScenario() : 'objective';
    
    // Update warming message block
    const warningData = this.getWarningData(year, scenario);
    const warningTitle = this.container.querySelector('#warming-title');
    const warningMessage = this.container.querySelector('#warming-message');
    
    if (warningTitle && warningMessage) {
      this.updateLocalizedWarningMessage(warningData, warningTitle, warningMessage);
      
      const messageBlock = this.container.querySelector('#fever-warming-message');
      if (messageBlock) {
        messageBlock.className = `fever-warming-message severity-${warningData.severity}`;
      }
    }
    
    // Update active tab content if it's AMOC or depends on current year
    if (this.activeMonitoringTab === 'amoc' || this.activeMonitoringTab === 'tipping') {
      this.updateMonitoringTabContent();
    }
    
    // Calculate temperature delta based on scenario (using scenario from above)
    const milestoneData = this.getScenarioMilestoneData(year, scenario);
    const maxTemp = { best: 1.6, objective: 3.5, high: 5.5 };
    const tempIncrease = milestoneData?.temperatureDeltaC ?? progress * (maxTemp[scenario] ?? maxTemp.objective);
    if (tempDelta) {
      tempDelta.textContent = `+${tempIncrease.toFixed(1)}\u00B0C`;
      tempDelta.style.color = tempIncrease > 2.0 ? '#ef5350' : tempIncrease > 1.0 ? '#ffb74d' : '#81c784';
    }
    this.updateCompactSummary();
    
    // Update chart highlights
    const yearIndex = milestoneYear ? this.feverYears.indexOf(milestoneYear) : -1;
    if (yearIndex !== -1 && milestoneYear && this.combinedChart) {
      this.combinedChart.data.datasets.forEach(dataset => {
        dataset.pointRadius = this.feverYears.map((_, i) => i === yearIndex ? 5 : 3);
      });
      this.combinedChart.update('none');
    }
  }
  
  startWarningSystem() {
    this.lastWarningYear = null;
    this.feverYears = this.getFeverYearsFromConfig();
  }
  
  async showTippingThresholdWarning(detail) {
    const { boundary, year, scenario, warningText } = detail;
    
    // Display monitoring-style warning in the fever warning display area
    const warningDisplay = this.container.querySelector('#fever-warning-display');
    if (!warningDisplay) return;
    const warningContent = warningDisplay.querySelector('#fever-warning-content');
    if (!warningContent) return;
    
    // Flash the warning briefly
    warningDisplay.className = 'fever-warning-display fever-level-critical';
    const localizedWarning = await this.translateFeverText(warningText);
    warningContent.textContent = localizedWarning.text;
    warningDisplay.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      warningDisplay.classList.add('hidden');
    }, 5000);
    
    // Speak warning if voice enabled
    if (this.currentGlobe && this.currentGlobe.getFeverVoiceEnabled() && window.ttsManager) {
      const spokenWarning = this.getFeverNarrationText({
        year,
        scenario,
        text: localizedWarning.text
      });
      this.speakFeverNarrationWithCache(spokenWarning, this.getFeverTtsLanguage(localizedWarning), { scenario, year });
    }
  }
  
  async showFeverWarning(year, milestoneYear, progress) {
    // Only show warnings at milestone years
    if (!milestoneYear || this.lastWarningYear === milestoneYear) return;
    
    // Skip 1950 - it's only for loop restart, not for display
    if (milestoneYear === 1950) return;
    
    this.lastWarningYear = milestoneYear;
    
    // Use milestone year for warning lookup
    year = milestoneYear;
    
    const scenario = this.currentGlobe ? this.currentGlobe.getFeverScenario() : 'objective';

    const scenarioMilestone = this.getScenarioMilestoneData(year, scenario);
    let jsonWarning = null;
    if (scenarioMilestone?.warningText) {
      const level = this.getWarningSeverity(scenarioMilestone.warningLevel);
      const fallbackTitle = scenarioMilestone.warningTitle || `Climate Year ${year}`;
      const localized = this.getLocalizedFeverWarming(scenario, year, fallbackTitle, scenarioMilestone.warningText);

      jsonWarning = {
        level,
        title: localized.title,
        full: localized.message,
        language: localized.language,
        translationProvider: localized.translationProvider,
        originalTitle: fallbackTitle,
        originalFull: scenarioMilestone.warningText
      };
    }

    const getWarningText = (level, long) => ({
      level,
      full: long
    });
    
    const warnings = {
      best: {
        1950: getWarningText('info', 'Industrial baseline established. Global cooperation begins shaping a sustainable future path.'),
        1975: getWarningText('info', 'Early environmental awareness emerges. Initial progress in emission controls shows promise.'),
        2000: getWarningText('warning', 'International climate frameworks taking shape. Temperature rise remains within manageable limits.'),
        2025: getWarningText('warning', 'Renewable transition accelerates worldwide. Stabilization efforts show measurable impact.'),
        2050: getWarningText('warning', 'Net-zero targets achieved in major economies. Climate systems begin stabilizing.'),
        2075: getWarningText('danger', 'Temperature plateau holding below critical thresholds. Ecosystem recovery programs expand.'),
        2100: getWarningText('danger', 'Climate stabilization confirmed. Legacy emissions gradually declining across systems.'),
        2125: getWarningText('danger', 'Sustainable equilibrium achieved. Careful monitoring ensures long-term stability.')
      },
      objective: {
        1950: getWarningText('info', 'Industrial era baseline. The climate system remains relatively stable before acceleration.'),
        1975: getWarningText('warning', 'First measurable warming detected. Scientific community begins raising early concerns.'),
        2000: getWarningText('warning', 'Warming trend accelerating beyond natural variation. Extreme weather events increasing.'),
        2025: getWarningText('danger', 'Critical warming threshold approaching. Ice sheet instability and ecosystem shifts observable.'),
        2050: getWarningText('danger', 'Severe climate disruption underway. Coastal flooding, drought cycles intensifying globally.'),
        2075: getWarningText('critical', 'Cascading ecosystem collapse spreading. Mass migration and resource conflicts emerging.'),
        2100: getWarningText('critical', 'Multiple tipping points crossed. Climate feedback loops accelerating beyond control.'),
        2125: getWarningText('critical', 'Civilization-scale disruption. Habitable zones shrinking, survival challenges mounting.')
      },
      high: {
        1950: getWarningText('info', 'Pre-acceleration baseline period.'),
        1975: getWarningText('warning', 'Rapid warming signal emerging. Early warning signs ignored as economic growth prioritized.'),
        2000: getWarningText('danger', 'Accelerated warming confirmed. Extreme weather becoming the new normal worldwide.'),
        2025: getWarningText('danger', 'Climate emergency declared. Ice sheet collapse imminent, sea level rise accelerating.'),
        2050: getWarningText('critical', 'Catastrophic warming impacts. Agriculture failing, water scarcity crisis, mass displacement.'),
        2075: getWarningText('critical', 'Planetary crisis deepens. Multiple breadbasket regions becoming uninhabitable desert.'),
        2100: getWarningText('critical', 'Severe habitability loss. Tropical zones abandoned, polar regions experiencing extreme heat.'),
        2125: getWarningText('critical', 'Existential threat level. Earth system approaching conditions incompatible with civilization.')
      }
    };
    
    const warning = jsonWarning || warnings[scenario]?.[year];
    if (!warning) return;
    const localizedWarning = await this.localizeFeverWarning(warning);
    
    // Show warning in dedicated display area
    const warningDisplay = this.container.querySelector('#fever-warning-display');
    const warningContent = this.container.querySelector('#fever-warning-content');
    if (warningDisplay && warningContent) {
      warningDisplay.className = `fever-warning-display fever-level-${localizedWarning.level}`;
      warningContent.textContent = localizedWarning.full;
      warningDisplay.classList.remove('hidden');
    }
    
    // Create warning topic for layer panel
    this.createWarningTopic(year, localizedWarning, scenario);
    
    // Update selected topic display if this year's topic is in view
    this.updateSelectedFeverTopic(year);
    
    // Read warning with TTS if enabled
    if (this.currentGlobe && this.currentGlobe.getFeverVoiceEnabled() && window.ttsManager) {
      const spokenWarning = this.getFeverNarrationText({
        year,
        scenario,
        title: localizedWarning.title,
        text: localizedWarning.full
      });
      this.speakFeverNarrationWithCache(spokenWarning, localizedWarning.ttsLanguage, { scenario, year });
    }
  }
  
  updateSelectedFeverTopic(year) {
    const selectedTopicDiv = this.container.querySelector('#fever-selected-topic');
    const selectedContentDiv = this.container.querySelector('#fever-selected-content');
    
    if (!selectedTopicDiv || !selectedContentDiv) return;
    
    // Always show topic for current year
    const history = this.getFeverWarningHistory();
    const scenario = this.currentGlobe ? this.currentGlobe.getFeverScenario() : 'objective';
    const key = `${year}_${scenario}`;
    const topic = history[key];
    
    // Animate content change
    selectedContentDiv.style.opacity = '0';
    selectedContentDiv.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      if (topic) {
        selectedContentDiv.innerHTML = `
          <div class="insight-content">
            <p><strong>${this.escapeHtml(this.t('fever.year'))}:</strong> ${topic.year}</p>
            <p><strong>${this.escapeHtml(this.t('fever.scenario'))}:</strong> ${this.escapeHtml(this.t(`fever.${topic.scenario}`))}</p>
            <p><strong>${this.escapeHtml(this.t('fever.warning'))}:</strong> ${this.escapeHtml(topic.summary)}</p>
            ${topic.insight ? `<p><strong>${this.escapeHtml(this.t('fever.analysis'))}:</strong> ${this.escapeHtml(topic.insight)}</p>` : ''}
          </div>
        `;
      } else {
        const scenarioLabel = this.t(`fever.${scenario}`);
        selectedContentDiv.innerHTML = `
          <div class="insight-content" style="text-align: center; color: var(--text-secondary);">
            ${this.escapeHtml(this.t('fever.climateDataForScenario', { year, scenario: scenarioLabel }))}
          </div>
        `;
      }
      
      selectedContentDiv.style.opacity = '1';
      selectedContentDiv.style.transform = 'translateY(0)';
    }, 150);
  }
  
  createWarningTopic(year, warning, scenario) {
    // Create a topic object for the warning
    const warningTopic = {
      id: `fever_warning_${year}`,
      year: year,
      title: warning.title || `Climate Year ${year}`,
      category: 'earths-fever',
      date: new Date().toISOString().split('T')[0],
      country: 'Global',
      region: 'Worldwide',
      summary: warning.full,
      source: this.getLocalizedFeverWarningSource(scenario),
      insight: warning.full,
      level: warning.level,
      scenario: scenario,
      isFeverWarning: true,
      ttsText: warning.full,
      language: warning.language || this.getCurrentLanguage(),
      translationProvider: warning.translationProvider || 'original',
      originalTitle: warning.originalTitle || warning.title,
      originalSummary: warning.originalFull || warning.full,
      ttsLanguage: warning.ttsLanguage || LanguageManager.getSpeechCode(warning.language || this.getCurrentLanguage())
    };
    
    // Store in warning history
    this.storeFeverWarning(warningTopic);
    
    // Dispatch event to update layer panel
    window.dispatchEvent(new CustomEvent('feverWarningCreated', { 
      detail: { warning: warningTopic } 
    }));
  }
  
  storeFeverWarning(warning) {
    const history = this.getFeverWarningHistory();
    // Replace warning for same year/scenario combo
    const key = `${warning.year}_${warning.scenario}`;
    history[key] = warning;
    localStorage.setItem('euroearth_fever_warnings', JSON.stringify(history));
  }
  
  getFeverWarningHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('euroearth_fever_warnings') || '{}');
      return Object.fromEntries(
        Object.entries(history).map(([key, warning]) => [key, this.getLocalizedFeverWarningTopic(warning)])
      );
    } catch (error) {
      return {};
    }
  }
  
  showFeverWarningHistory() {
    const isAdmin = AppAccess.isAdminMode();
    if (!isAdmin) return;
    
    const history = this.getFeverWarningHistory();
    const warnings = Object.values(history).sort((a, b) => a.year - b.year);
    
    const content = this.container.querySelector('#detail-content');
    content.innerHTML = `
      <div class="detail-header">
        <h2 class="detail-title">&#127777;&#65039; ${this.escapeHtml(this.t('fever.warningHistory'))}</h2>
        <div class="detail-meta">
          <span>${this.escapeHtml(this.t('fever.warningsRecorded', { count: warnings.length }))}</span>
        </div>
      </div>
      
      <div class="fever-warning-history">
        ${warnings.length === 0 ? `
          <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
            ${this.escapeHtml(this.t('fever.noWarningsRecorded'))}
          </div>
        ` : ''}
        ${warnings.map(warning => `
          <div class="fever-history-item fever-level-${warning.level}" data-warning-id="${warning.id}">
            <div class="fever-history-header">
              <div class="fever-history-year">${warning.year}</div>
              <div class="fever-history-scenario">${warning.scenario}</div>
            </div>
            <div class="fever-history-content">
              <div class="fever-history-text">${this.escapeHtml(warning.ttsText || warning.summary)}</div>
            </div>
            <div class="fever-history-actions">
              <button class="btn-secondary" data-action="play-warning-tts" data-language="${this.escapeHtml(warning.language || this.getCurrentLanguage())}" data-text="${this.escapeHtml(warning.ttsText || warning.summary)}" style="padding: 6px 12px; font-size: 11px;">
                &#128266; ${this.escapeHtml(this.t('fever.playTts'))}
              </button>
              <button class="btn-secondary" data-action="view-warning-detail" data-warning-id="${warning.id}" style="padding: 6px 12px; font-size: 11px;">
                ${this.escapeHtml(this.t('fever.viewDetail'))}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div style="margin-top: 20px;">
        <button class="btn-secondary" data-action="clear-warning-history" style="width: 100%;">
          ${this.escapeHtml(this.t('fever.clearHistory'))}
        </button>
      </div>
    `;
    
    this.mode = 'fever-warning-history';
    this.container.classList.remove('hidden');
    this.updateTopicNavigation();
    
    // Add event listeners
    content.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      
      const action = target.dataset.action;
      if (action === 'play-warning-tts') {
        const text = target.dataset.text;
        if (window.ttsManager) {
          const language = target.dataset.language || this.getCurrentLanguage();
          window.ttsManager.speak(text, LanguageManager.getSpeechCode(language), {
            priority: 'manual',
            channel: 'selection',
            forceBrowser: true
          });
        }
      } else if (action === 'view-warning-detail') {
        const warningId = target.dataset.warningId;
        const warning = warnings.find(w => w.id === warningId);
        if (warning) {
          this.show(warning);
        }
      } else if (action === 'clear-warning-history') {
        if (confirm(this.t('fever.clearHistoryConfirm'))) {
          localStorage.removeItem('euroearth_fever_warnings');
          this.showFeverWarningHistory();
        }
      }
    });
  }
  

  
  async toggleFeverSound() {
    if (!this.currentGlobe) return;

    const newState = !this.currentGlobe.getFeverSoundEnabled();
    this.currentGlobe.setFeverSoundEnabled(newState);
    this.updateControlButton('toggle-fever-sound', newState);

    if (newState) {
      // Turn sound ON
      this.ensureAudioContext();
      
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('[Fever Sound] AudioContext resumed on toggle ON');
          if (this.currentGlobe.inFeverMode) {
            this.playHeartbeatBeep();
          }
        });
      } else if (this.currentGlobe.inFeverMode) {
        this.playHeartbeatBeep();
      }
      this.startFeverHeartbeatAudioLoop();
      this.showFeverVolumeBars(newState);
      console.log('[Fever Sound] User enabled sound');
    } else {
      // Turn sound OFF
      this.stopFeverHeartbeatAudioLoop();
      this.showFeverVolumeBars(newState);
      if (this.audioContext && this.audioContext.state === 'running') {
        this.audioContext.suspend().then(() => {
          console.log('[Fever Sound] AudioContext suspended on toggle OFF');
        });
      }
      console.log('[Fever Sound] User disabled sound');
    }
  }

  showFeverVolumeBars(enabled) {
    const indicator = this.container.querySelector('#fever-volume-bars');
    if (!indicator) return;

    indicator.classList.toggle('muted', !enabled);
    indicator.classList.add('active');

    window.clearTimeout(this.feverVolumeBarsTimer);
    this.feverVolumeBarsTimer = window.setTimeout(() => {
      indicator.classList.remove('active');
    }, 1300);
  }
  
  toggleFeverVoice() {
    if (this.currentGlobe) {
      const newState = !this.currentGlobe.getFeverVoiceEnabled();
      this.currentGlobe.setFeverVoiceEnabled(newState);
      this.updateControlButton('toggle-fever-voice', newState);
    }
  }
  
  toggleTippingOverlay() {
    if (this.currentGlobe) {
      const newState = !this.currentGlobe.getTippingOverlayVisible();
      this.currentGlobe.setTippingOverlayVisible(newState);
      this.updateControlButton('toggle-tipping-overlay', newState);
    }
  }
  
  toggleAMOCOverlay() {
    if (!this.currentGlobe) return;
    
    const newState = !this.currentGlobe.getAMOCOverlayVisible();
    this.currentGlobe.setAMOCOverlayVisible(newState);
    this.updateControlButton('toggle-amoc-overlay', newState);
    
    console.log(`[AMOC Toggle] Monitoring panel clicked -> ${newState ? 'ON' : 'OFF'}, syncing to layer panel`);
    
    if (newState && this.mode === 'fever-simulation') {
      this.updateAMOCMonitoring();
    }
  }
  

  
  updateAMOCMonitoring() {
    if (!this.currentGlobe) return;
    
    const amocState = this.currentGlobe.getAMOCState();
    if (!amocState) return;
    
    const selectedContentDiv = this.container.querySelector('#fever-selected-content');
    if (!selectedContentDiv) return;
    
    const year = this.currentGlobe.getFeverCurrentYear();
    const scenario = this.currentGlobe.getFeverScenario();
    
    let riskLevel = this.t('fever.riskNormal');
    let riskColor = '#81c784';
    
    if (amocState.flowStrength < 0.3) {
      riskLevel = this.t('fever.riskCritical');
      riskColor = '#ef5350';
    } else if (amocState.flowStrength < 0.5) {
      riskLevel = this.t('fever.riskHigh');
      riskColor = '#ff8a65';
    } else if (amocState.flowStrength < 0.7) {
      riskLevel = this.t('fever.riskModerate');
      riskColor = '#ffb74d';
    }
    
    selectedContentDiv.style.opacity = '0';
    setTimeout(() => {
      selectedContentDiv.innerHTML = `
        <div class="insight-content">
          <h3 style="color: ${riskColor}; margin-bottom: 12px;">${this.escapeHtml(this.t('fever.amocWatch'))} - ${year}</h3>
          <p><strong>${this.escapeHtml(this.t('fever.scenario'))}:</strong> ${this.escapeHtml(this.t(`fever.${scenario}`))}</p>
          <p><strong>${this.escapeHtml(this.t('fever.circulationStrength'))}:</strong> ${(amocState.flowStrength * 100).toFixed(0)}%</p>
          <p><strong>${this.escapeHtml(this.t('fever.warmBranchHeat'))}:</strong> ${(amocState.warmHeat * 100).toFixed(0)}%</p>
          <p><strong>${this.escapeHtml(this.t('fever.coldBranch'))}:</strong> ${(amocState.coldStrength * 100).toFixed(0)}%</p>
          <p><strong>${this.escapeHtml(this.t('fever.northAtlanticSink'))}:</strong> ${(amocState.sinkStrength * 100).toFixed(0)}%</p>
          <p><strong>${this.escapeHtml(this.t('fever.southernReturn'))}:</strong> ${(amocState.returnStrength * 100).toFixed(0)}%</p>
          <p><strong>${this.escapeHtml(this.t('fever.riskLevel'))}:</strong> <span style="color: ${riskColor}; font-weight: 700;">${this.escapeHtml(riskLevel)}</span></p>
          ${amocState.flowStrength < 0.5 ? `<p style="margin-top: 8px; color: #ef5350;"><strong>&#9888;&#65039; ${this.escapeHtml(this.t('fever.warning'))}:</strong> ${this.escapeHtml(this.t('fever.amocWarning'))}</p>` : ''}
        </div>
      `;
      selectedContentDiv.style.opacity = '1';
    }, 150);
  }
  
  toggleFeverPause() {
    if (this.currentGlobe) {
      const isPaused = this.currentGlobe.toggleFeverPause();
      this.updateControlButton('toggle-fever-pause', !isPaused);
      this.updatePauseNotice();
    }
  }
  
  toggleFeverReverse() {
    if (this.currentGlobe) {
      const isReversed = this.currentGlobe.toggleFeverReverse();
      this.updateControlButton('toggle-fever-reverse', isReversed);
    }
  }
  
  updateControlButton(action, active) {
    const btn = this.container.querySelector(`[data-action="${action}"]`);
    if (btn) {
      if (active) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }
  
  updatePauseNotice() {
    const pauseNotice = this.container.querySelector('#fever-pause-notice');
    const isPaused = this.currentGlobe && this.currentGlobe.isFeverPaused();
    if (pauseNotice) {
      if (isPaused) {
        pauseNotice.classList.remove('hidden');
      } else {
        pauseNotice.classList.add('hidden');
      }
    }
  }
  
  jumpToFeverYear(btn) {
    const year = parseInt(btn.dataset.year);
    if (this.currentGlobe && year) {
      this.currentGlobe.seekToYear(year);
      this.currentGlobe.pauseFeverLoop();
      this.updatePauseNotice();
    }
  }
  
  async searchTopicUpdate() {
    const currentYear = this.currentGlobe ? this.currentGlobe.getFeverCurrentYear() : 1950;
    const scenario = this.currentGlobe ? this.currentGlobe.getFeverScenario() : 'objective';
    
    const btn = this.container.querySelector('[data-action="search-topic-update"]');
    if (!btn) return;
    
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-small"></div> Searching...';
    btn.disabled = true;
    
    try {
      const prompt = `Search for the latest climate news and developments for the year ${currentYear} under a ${scenario} climate scenario.
      
Provide:
1. Key climate events or projections for this year
2. Scientific updates or warnings
3. Policy developments or international actions

Keep response concise (3-4 sentences).`;
      
      const completion = await window.ourEarthAI.createChatCompletion({
        messages: [
          {
            role: "system",
            content: "You are a climate science assistant. Provide latest information about climate developments."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });
      
      const selectedContentDiv = this.container.querySelector('#fever-selected-content');
      if (selectedContentDiv) {
        selectedContentDiv.innerHTML = `
          <div class="insight-content">
            <p><strong>${this.escapeHtml(this.t('fever.year'))}:</strong> ${currentYear}</p>
            <p><strong>${this.escapeHtml(this.t('fever.scenario'))}:</strong> ${this.escapeHtml(this.t(`fever.${scenario}`))}</p>
            <p><strong>${this.escapeHtml(this.t('fever.latestResearch'))}:</strong> ${completion.content}</p>
          </div>
        `;
      }
      
      btn.innerHTML = this.escapeHtml(this.t('fever.updated'));
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Search error:', error);
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }

  renderLocationInfo(location) {
    const content = this.container.querySelector('#detail-content');

    content.innerHTML = `
      <div class="detail-header">
        <div class="detail-category" style="background: rgba(186, 104, 200, 0.2); color: #ba68c8">
          &#127757; Location Info
        </div>
        <h2 class="detail-title">${location.title}</h2>
        <div class="detail-meta">
          <span>&#128205; ${location.region}, ${location.country}</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="section-label">Coordinates</div>
        <div class="section-content">
          Latitude: ${location.lat.toFixed(6)}&deg;<br>
          Longitude: ${location.lon.toFixed(6)}&deg;
        </div>
      </div>

      <div class="detail-section">
        <div class="section-label">Description</div>
        <div class="section-content">${location.summary}</div>
      </div>
    `;
  }

  show(point) {
    if (point?.isFeverWarning) {
      point = this.getLocalizedFeverWarningTopic(point);
    }

    // Pause fever loop FIRST if showing a fever warning
    if (point.isFeverWarning && this.currentGlobe && this.currentGlobe.inFeverMode) {
      this.currentGlobe.pauseFeverLoop();
    }

    this.currentPoint = point;
    this.mode = 'detail';
    this.topicDraftStatus = null;
    this.topicBuilderContext = null;
    this.pendingResearchAutoApply = false;
    this.renderDetail(point);
    this.container.classList.remove('hidden');
    this.updateTopicNavigation();

    // Show pause notice after render
    if (point.isFeverWarning && this.currentGlobe && this.currentGlobe.inFeverMode) {
      const pauseNotice = this.container.querySelector('#fever-pause-notice');
      if (pauseNotice) {
        pauseNotice.classList.remove('hidden');
      }
    }

    // Always trigger focus on coordinates when showing a point
    if (this.callbacks.onShow && point.lat && point.lon) {
      this.callbacks.onShow(point);
    }

    window.dispatchEvent(new CustomEvent('topicDetailOpened', { detail: { point } }));
  }

  renderDetail(point) {
    const content = this.container.querySelector('#detail-content');
    const layer = this.layers.find(l => l.id === point.category);

    if (!layer) return;
    
    // Handle cluster display
    if (point.isCluster) {
      this.renderClusterDetail(point, layer);
      return;
    }
    
    // Handle country display
    if (point.isCountry) {
      this.renderCountryDetail(point);
      return;
    }
    
    // Handle planet display
    if (point.isPlanet) {
      this.renderPlanetDetail(point);
      return;
    }

    const isAdmin = AppAccess.isAdminMode();
    const canManageTopicSources = AppAccess.canManageTopicSources(point);
    const canModifyTopic = AppAccess.canModifyTopic(point);
    const canDeleteTopic = AppAccess.canDeleteTopic(point);
    const isRegionalProposal = AppAccess.isRegionalProposalTopic(point);
    const initiativeRegionalHtml = this.renderInitiativeRegionalSection(point);
    const carbonHistoryHtml = this.renderCarbonHistorySection(point);
    const feverScenarioTransparencyHtml = this.renderFeverScenarioTransparencySection(point);

    let mediaHtml = '';
    const mediaTokens = this.getMediaTokensForPoint(point);
    const hasCarbonHistory = point.isCarbonHistory || point.carbonHistory;
    const hasCarbonHistoryBanner = hasCarbonHistory && mediaTokens.length > 0;
    const bannerToken = hasCarbonHistoryBanner ? mediaTokens[0] : null;
    const mediaGridTokens = hasCarbonHistoryBanner ? mediaTokens.slice(1) : mediaTokens;
    const carbonHistoryBannerHtml = bannerToken ? `
      <div class="carbon-history-banner">
        <button
          type="button"
          class="carbon-history-banner-zoom"
          data-action="zoom-topic-media"
          data-media-url="${this.escapeHtml(bannerToken.url)}"
          data-media-caption="${this.escapeHtml(bannerToken.watermarkText || `${point.title || 'Carbon History'} banner`)}"
          title="Zoom image inside the detail panel"
        >
          ${this.renderMediaTokenImage(bannerToken, 'carbon-history-banner-image', `${point.title || 'Carbon History'} banner`)}
        </button>
      </div>
    ` : (hasCarbonHistory ? this.renderGeneratedCarbonHistoryBanner(point) : '');

    if (mediaGridTokens.length > 0) {
      mediaHtml = `
        <div class="detail-section">
          <div class="section-label">Media</div>
          <div class="topic-media-grid">
            ${mediaGridTokens.map((token, index) => `
              <div class="topic-media-item">
                <button 
                  type="button" 
                  class="topic-media-zoom-btn" 
                  data-action="zoom-topic-media"
                  data-media-url="${this.escapeHtml(token.url)}"
                  data-media-caption="${this.escapeHtml(token.watermarkText || `${point.title || 'Topic'} image ${index + 1}`)}"
                  title="Zoom image inside the detail panel"
                >
                  ${this.renderMediaTokenImage(token, 'topic-media-image', `${point.title || 'Topic'} image ${index + 1}`)}
                  <span class="topic-media-zoom-label">Zoom</span>
                </button>
              </div>
            `).join('')}
          </div>
          ${canManageTopicSources ? `<button class="manage-sources-btn media-manage-btn" data-action="manage-sources" title="Manage evidence and media">Evidence & Media</button>` : ''}
        </div>
      `;
    }
    let sourcesHtml = '';
    if (point.researchSources && point.researchSources.length > 0) {
      sourcesHtml = `
        <div class="detail-section" data-tutorial-id="topic-evidence">
          <div class="section-label" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Sources (${point.researchSources.length})</span>
            ${canManageTopicSources ? `<button class="manage-sources-btn" data-action="manage-sources" title="Manage this topic draft's evidence and media">Evidence</button>` : ''}
          </div>
          <div class="sources-list">
            ${point.researchSources.slice(0, 3).map(source => `
              <div class="source-item">
                <span class="source-icon">${source.verified ? '&#10003;' : '&#128279;'}</span>
                <div class="source-content">
                  <div class="source-text">${this.escapeHtml(source.name || 'Source')}</div>
                  ${source.url ? `<a href="${this.escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer" class="source-link">${this.escapeHtml(this.getHostFromUrl(source.url) || source.url)}</a>` : ''}
                </div>
                ${point.isCustom && canManageTopicSources ? `
                  <button class="source-edit-btn" data-action="edit-source" title="Edit this source">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 8L1 11L4 11L10 5L7 2L1 8Z" stroke="currentColor" stroke-width="1.2" fill="none"/>
                      <path d="M7 2L10 5" stroke="currentColor" stroke-width="1.2"/>
                    </svg>
                  </button>
                ` : ''}
              </div>
            `).join('')}
            ${point.researchSources.length > 3 ? `<div class="sources-more">+${point.researchSources.length - 3} more</div>` : ''}
          </div>
        </div>
      `;
    }

    const topicActions = `
      <div class="topic-detail-actions">
        <button class="btn-secondary topic-action-btn" data-action="check-topic-update" title="Check latest news against this topic">
          Check Topic Update
        </button>
        ${canManageTopicSources ? `
          <button class="btn-secondary topic-action-btn" data-action="manage-sources" title="Manage evidence and add media">
            Evidence & Media
          </button>
        ` : ''}
        ${canModifyTopic ? `
      <button class="btn-primary topic-action-btn" data-action="edit-topic">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="display: inline-block; margin-right: 6px;">
          <path d="M1 10L1 13L4 13L11.5 5.5L8.5 2.5L1 10Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M8.5 2.5L11.5 5.5" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        ${point.isCustom || point.isFeverWarning || point.isTippingPoint ? 'Edit Topic' : 'Edit as Draft Copy'}
      </button>
        ` : ''}
        ${isAdmin ? `
      <button class="btn-primary-alt topic-action-btn" data-action="submit-topic-package" data-admin-only="true" title="Download this topic as a ZIP package for admin review">
        Submit ZIP
      </button>
      <div id="topic-submit-status" class="admin-submit-note" data-admin-only="true">
        Submit downloads this topic as a ZIP for admin review.
      </div>
        ` : ''}
        ${canDeleteTopic ? `
      <button class="btn-danger topic-action-btn" data-action="delete-topic" title="${point.isCustom ? 'Remove this browser topic' : 'Remove this local proposal'}">
        Remove Topic
      </button>
        ` : ''}
        ${!isAdmin && !canModifyTopic ? `
      <div class="readonly-user-note">
        User mode is read-only for published posts. Save proposals as browser drafts, then let admin review them.
      </div>
        ` : ''}
        ${!isAdmin && isRegionalProposal ? `
      <div class="readonly-user-note">
        Saved locally on this device. You can refine, research, or remove this proposal anytime before any later admin review.
      </div>
        ` : ''}
      </div>
    `;

    // Format insight with research output styling if it contains HTML
    const insightHtml = point.insight && point.insight.includes('<') 
      ? `<div class="insight-content">${point.insight}</div>`
      : `<div class="section-content compact">${point.insight || 'No analysis available.'}</div>`;

    content.innerHTML = `
      <div class="detail-header" data-tutorial-id="topic-detail">
        <div class="detail-category" style="background: ${layer.color}33; color: ${layer.color}">
          ${layer.icon} ${layer.name}
        </div>
        <h2 class="detail-title">${this.escapeHtml(this.getDetailTitle(point))}</h2>
        <div class="detail-meta">
          <span>&#128205; ${point.region}, ${point.country}</span>
          <span>&#128197; ${point.date}</span>
        </div>
      </div>

      ${carbonHistoryBannerHtml}
      ${mediaHtml}

      <div class="detail-section">
        <div class="section-label">Summary</div>
        <div class="section-content compact">${point.summary}</div>
      </div>

      ${carbonHistoryHtml}

      ${initiativeRegionalHtml}

      ${feverScenarioTransparencyHtml}

      ${sourcesHtml}

      ${point.source ? `
      <div class="detail-section">
        <div class="section-label">Source</div>
        <div class="section-content compact">${point.source}</div>
      </div>
      ` : ''}

      <div class="detail-section">
        <div class="section-label">Analysis & Insight</div>
        <div class="insight-card">
          ${insightHtml}
        </div>
      </div>

      ${topicActions}
    `;
    this.initFeverScenarioTransparencyChart(point);
    this.updateCompactSummary();
  }

  getFeverScenarioTransparencySeries() {
    const scenarios = ['best', 'objective', 'high'];
    const years = this.getFeverYearsFromConfig();

    return scenarios.map(scenario => {
      const milestones = this.getScenarioMilestones(scenario) || {};
      return {
        scenario,
        label: scenario === 'best' ? 'Best' : scenario === 'high' ? 'High' : 'Objective',
        years,
        temp: years.map(year => Number(milestones[String(year)]?.temperatureDeltaC ?? 0)),
        tipping: years.map(year => Number(milestones[String(year)]?.tippingRiskPct ?? 0)),
        amoc: years.map(year => Number(milestones[String(year)]?.amocStrengthPct ?? 100)),
        sea: years.map(year => Number(milestones[String(year)]?.seaLevelCm ?? 0))
      };
    });
  }

  renderFeverScenarioTransparencySection(point = {}) {
    if (!point.isFeverScenarioTopic) return '';

    const transparency = point.scenarioTransparency || {};
    const series = this.getFeverScenarioTransparencySeries();
    const years = series[0]?.years || this.getFeverYearsFromConfig();
    const currentScenario = this.currentGlobe?.getFeverScenario?.() || 'objective';
    const currentMilestones = this.getScenarioMilestones(currentScenario) || {};
    const metrics = transparency.metrics || [];

    const metricRows = metrics.map(metric => {
      const first = currentMilestones[String(years[0])]?.[metric.key];
      const latest = currentMilestones[String(years[years.length - 1])]?.[metric.key];
      return `
        <tr>
          <td>${this.escapeHtml(metric.label)}</td>
          <td>${this.escapeHtml(metric.unit)}</td>
          <td>${this.escapeHtml(first ?? '-')}</td>
          <td>${this.escapeHtml(latest ?? '-')}</td>
          <td>${this.escapeHtml(metric.sourceNeed || '')}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="detail-section fever-scenario-transparency">
        <div class="section-label">Scenario Transparency</div>
        <div class="fever-transparency-card">
          <div class="fever-transparency-grid">
            <div>
              <span class="fever-transparency-label">Data file</span>
              <strong>${this.escapeHtml(transparency.dataFile || 'fever-scenarios.json')}</strong>
            </div>
            <div>
              <span class="fever-transparency-label">Status</span>
              <strong>${this.escapeHtml(transparency.status || 'provisional')}</strong>
            </div>
            <div>
              <span class="fever-transparency-label">Version</span>
              <strong>${this.escapeHtml(transparency.version || '0.1.0')}</strong>
            </div>
            <div>
              <span class="fever-transparency-label">Updated</span>
              <strong>${this.escapeHtml(transparency.updatedAt || 'unknown')}</strong>
            </div>
          </div>
          <p>${this.escapeHtml(transparency.updateRule || 'Scenario updates need reviewed sources and a short logic note.')}</p>
        </div>

        <div class="fever-transparency-chart-wrap">
          <canvas id="fever-scenario-transparency-chart" width="520" height="260"></canvas>
        </div>

        <div class="fever-transparency-table-wrap">
          <table class="fever-transparency-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Unit</th>
                <th>${this.escapeHtml(String(years[0] || 'Start'))}</th>
                <th>${this.escapeHtml(String(years[years.length - 1] || 'End'))}</th>
                <th>Source needed</th>
              </tr>
            </thead>
            <tbody>${metricRows}</tbody>
          </table>
        </div>

        <div class="fever-transparency-logic">
          ${(transparency.sourceLogic || []).map(item => `
            <div class="fever-transparency-logic-item">${this.escapeHtml(item)}</div>
          `).join('')}
        </div>
      </div>
    `;
  }

  initFeverScenarioTransparencyChart(point = {}) {
    if (!point.isFeverScenarioTopic || !window.Chart) return;
    const canvas = this.container.querySelector('#fever-scenario-transparency-chart');
    if (!canvas) return;

    if (this.feverScenarioTransparencyChart) {
      this.feverScenarioTransparencyChart.destroy();
      this.feverScenarioTransparencyChart = null;
    }

    const series = this.getFeverScenarioTransparencySeries();
    const colors = {
      best: '#7cffd6',
      objective: '#00d4ff',
      high: '#ff5f57'
    };

    this.feverScenarioTransparencyChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: series[0]?.years?.map(String) || [],
        datasets: [
          ...series.map(item => ({
            label: `${item.label} temp`,
            data: item.temp,
            borderColor: colors[item.scenario],
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.32,
            pointRadius: 3,
            yAxisID: 'yTemp'
          })),
          ...series.map(item => ({
            label: `${item.label} tipping`,
            data: item.tipping,
            borderColor: colors[item.scenario],
            backgroundColor: 'transparent',
            borderDash: [5, 4],
            borderWidth: 2,
            tension: 0.32,
            pointRadius: 2,
            yAxisID: 'yRisk'
          }))
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: {
              color: '#e8eaed',
              font: { family: 'Space Mono', size: 9 },
              boxWidth: 12
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#9aa0a6', font: { family: 'Space Mono', size: 9 } },
            grid: { color: 'rgba(255,255,255,0.06)' }
          },
          yTemp: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'deg C', color: '#e8eaed' },
            ticks: { color: '#9aa0a6', font: { family: 'Space Mono', size: 9 } },
            grid: { color: 'rgba(255,255,255,0.06)' }
          },
          yRisk: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'risk %', color: '#e8eaed' },
            min: 0,
            max: 100,
            ticks: { color: '#9aa0a6', font: { family: 'Space Mono', size: 9 } },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }
  
  renderClusterDetail(cluster, layer) {
    const content = this.container.querySelector('#detail-content');
    
    content.innerHTML = `
      <div class="detail-header">
        <div class="detail-category" style="background: ${layer.color}33; color: ${layer.color}">
          ${layer.icon} ${layer.name} Cluster
        </div>
        <h2 class="detail-title">${cluster.count} Events in ${cluster.region}</h2>
        <div class="detail-meta">
          <span>&#128205; ${cluster.region}, ${cluster.country}</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="section-label">Summary</div>
        <div class="section-content compact">${cluster.summary}</div>
      </div>

      <div class="detail-section">
        <div class="section-label">Events in this Cluster</div>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">
          ${cluster.points.map(p => `
            <div class="news-summary-item" style="border: 1px solid var(--border); border-radius: 6px; padding: 12px; cursor: pointer;" data-point-id="${p.id}">
              <div class="news-summary-title">${p.title}</div>
              <div class="news-summary-text" style="margin-top: 6px;">${p.summary.substring(0, 100)}...</div>
              <div class="news-summary-meta" style="margin-top: 8px;">
                <div class="news-summary-source">&#128197; ${p.date}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="detail-section">
        <div class="section-label">Future Detail Mode</div>
        <div class="section-content compact" style="color: var(--text-secondary); font-style: italic;">
          For deeper local exploration, this view will transition to a Google Maps detail mode showing individual event locations, boundaries, and street-level context.
        </div>
      </div>
    `;
    
    // Add click handlers for cluster items
    content.querySelectorAll('[data-point-id]').forEach(item => {
      item.addEventListener('click', () => {
        const pointId = parseInt(item.dataset.pointId);
        const point = cluster.points.find(p => p.id === pointId);
        if (point) {
          this.show(point);
        }
      });
    });
  }
  
  renderCountryDetail(country) {
    const content = this.container.querySelector('#detail-content');
    
    content.innerHTML = `
      <div class="detail-header">
        <div class="detail-category" style="background: rgba(100, 181, 246, 0.2); color: #64b5f6">
          &#127757; Country Intelligence
        </div>
        <h2 class="detail-title">${country.title}</h2>
        <div class="detail-meta">
          <span>&#128205; ${country.region}</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="section-label">Overview</div>
        <div class="section-content compact">${country.summary}</div>
      </div>

      <div class="detail-section">
        <div class="section-label">Key Information</div>
        <div class="insight-card">
          <div class="insight-content">${country.insight}</div>
        </div>
      </div>

      <div class="detail-section">
        <div class="section-label">Atlas & Boundaries</div>
        <div class="section-content compact" style="color: var(--text-secondary); font-style: italic;">
          Future updates will include interactive country boundary overlays, administrative regions, and detailed geographic information layers.
        </div>
      </div>

      <div class="detail-section">
        <div class="section-label">Architecture Note</div>
        <div class="section-content compact" style="color: var(--text-secondary); font-style: italic;">
          This globe view is optimized for world, continent, and country-level intelligence. For city and local-level detail, the application will transition to a Google Maps detail mode with street-level context and local event precision.
        </div>
      </div>
    `;
  }
  
  renderPlanetDetail(planet) {
    const content = this.container.querySelector('#detail-content');
    
    content.innerHTML = `
      <div class="detail-header">
        <div class="detail-category" style="background: rgba(149, 117, 205, 0.2); color: #9575cd">
          &#127756; ${planet.region}
        </div>
        <h2 class="detail-title">${planet.title}</h2>
        <div class="detail-meta">
          <span>${planet.planetData?.diameter || 'Unknown size'}</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="section-label">Description</div>
        <div class="section-content compact">${planet.summary}</div>
      </div>

      ${planet.planetData ? `
        <div class="detail-section">
          <div class="section-label">Physical Properties</div>
          <div class="insight-card">
            <div class="insight-content">
              <p><strong>Diameter:</strong> ${planet.planetData.diameter}</p>
              <p><strong>Temperature:</strong> ${planet.planetData.temperature}</p>
              <p><strong>Composition:</strong> ${planet.planetData.composition}</p>
              <p><strong>Atmosphere:</strong> ${planet.planetData.atmosphere}</p>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="detail-section">
        <div class="section-label">Navigation</div>
        <div class="insight-card">
          <div class="insight-content">${planet.insight}</div>
        </div>
      </div>
      
      ${planet.planetData?.latestNews ? `
        <div class="detail-section">
          <div class="section-label">Latest Updates</div>
          <button class="btn-primary" data-action="search-latest-news" style="width: 100%;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M11 11L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Search Latest News for ${planet.planetData.name}
          </button>
        </div>
      ` : ''}

      <div class="detail-section">
        <div class="section-label">Solar System View</div>
        <div class="section-content compact" style="color: var(--text-secondary); font-style: italic;">
          Click on any planet or celestial body to focus on it. The rotation will center on the selected object. Click Earth to return to the detailed globe view.
        </div>
      </div>
    `;
    
    // Add search handler
    const searchBtn = content.querySelector('[data-action="search-latest-news"]');
    if (searchBtn) {
      searchBtn.addEventListener('click', async () => {
        const originalHTML = searchBtn.innerHTML;
        searchBtn.innerHTML = '<div class="spinner-small"></div> Searching...';
        searchBtn.disabled = true;
        
        try {
          await this.searchLatestNewsFor(planet.planetData.name);
          searchBtn.innerHTML = originalHTML;
          searchBtn.disabled = false;
        } catch (error) {
          console.error('Search error:', error);
          searchBtn.innerHTML = originalHTML;
          searchBtn.disabled = false;
        }
      });
    }
  }
  
  async searchLatestNewsFor(objectName) {
    // Show loading
    const content = this.container.querySelector('#detail-content');
    const searchSection = content.querySelector('[data-action="search-latest-news"]')?.closest('.detail-section');
    
    if (searchSection) {
      const resultDiv = document.createElement('div');
      resultDiv.className = 'insight-card';
      resultDiv.style.marginTop = '12px';
      resultDiv.innerHTML = `
        <div class="insight-content">
          <div class="spinner-small"></div>
          <span style="margin-left: 8px;">Searching for latest news about ${objectName}...</span>
        </div>
      `;
      searchSection.appendChild(resultDiv);
      
      try {
        const prompt = `Search for the very latest news and recent developments about ${objectName}. 
Focus on the most recent information from the last 30 days.

Return a brief summary (3-4 sentences) of the latest news, updates, or developments. Be specific about dates and sources where possible.`;
        
        const completion = await window.ourEarthAI.createChatCompletion({
          messages: [
            {
              role: "system",
              content: "You are a space news assistant. Provide the latest, most recent information."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        });
        
        resultDiv.innerHTML = `
          <div class="insight-content">
            <p>${completion.content}</p>
          </div>
        `;
        
      } catch (error) {
        resultDiv.innerHTML = `
          <div class="insight-content" style="color: #ef5350;">
            Failed to fetch latest news. Please try again.
          </div>
        `;
      }
    }
  }

  showResearch(point) {
    if (!point) return;
    this.currentPoint = point;
    this.showNewsUpdate([point], { topic: point, scoped: true });
  }

  buildResearchContext(point) {
    const layer = this.layers.find(l => l.id === point.category);
    return {
      layer: layer?.name || 'Unknown',
      layerId: point.category,
      date: point.date || this.formatDateOnly(this.getTodayDateOnly()),
      region: point.region,
      country: point.country,
      topic: point.title,
      summary: point.summary,
      searchHint: point.review?.userMessage || '',
      locationPrecision: point.locationPrecision || point.storageMeta?.mapPrecision || '',
      regionalLabel: point.storageMeta?.regionalLabel || '',
      timeScope: point.researchSettings?.timeScope || '',
      geographicScope: point.researchSettings?.geographicScope || '',
      isRegionalProposal: AppAccess.isRegionalProposalTopic(point),
      isRegionalLayer: Boolean(layer?.sortByRegionalContext),
      sources: point.researchSources || [],
      mediaTokens: this.getMediaTokensForPoint(point)
    };
  }

  renderResearch() {
    const content = this.container.querySelector('#detail-content');
    const layer = this.layers.find(l => l.id === this.currentPoint.category);

    if (!layer) return;

    const { SOURCE_CATEGORIES, AI_ACTIONS, LAYER_SOURCE_MAPPING } = this.getResearchData();
    const recommendedSources = LAYER_SOURCE_MAPPING[this.researchContext.layerId] || [];
    const generatedPrompt = this.generateFullPrompt();
    const temporalStrategy = this.getResearchTemporalStrategy(this.researchContext);
    
    // Initialize response size if not set
    if (!this.responseSize) {
      this.responseSize = 'short';
    }

    content.innerHTML = `
      <div class="research-header">
        <div class="research-context-badge" style="background: ${layer.color}33; color: ${layer.color}">
          ${layer.icon} Research Mode
        </div>
        <h2 class="research-title">AI Assist</h2>
        <div class="research-workspace-note">
          AI writes a suggestion first. Review the output, then apply it to the topic draft when it is useful.
        </div>
      </div>

      <div class="research-context-card">
        <div class="context-label">Context</div>
        <div class="context-items">
          <span class="context-chip">${this.researchContext.layer}</span>
          <span class="context-chip">&#128205; ${this.researchContext.region}</span>
          <span class="context-chip">&#128197; ${this.escapeHtml(temporalStrategy.contextChipLabel)}</span>
        </div>
        <div class="context-topic">${this.researchContext.topic}</div>
        ${temporalStrategy.detailLabel ? `<div class="setting-hint">Timing: ${this.escapeHtml(temporalStrategy.detailLabel)}</div>` : ''}
        ${this.researchContext.searchHint ? `<div class="setting-hint">User focus: ${this.escapeHtml(this.researchContext.searchHint)}</div>` : ''}
      </div>

      <div class="research-section">
        <div class="section-label">Sources</div>
        <div class="source-categories">
          ${SOURCE_CATEGORIES.map(cat => `
            <div class="source-category ${recommendedSources.includes(cat.id) ? 'recommended' : ''}">
              <button 
                class="source-toggle ${this.selectedSources.has(cat.id) ? 'active' : ''}"
                data-action="toggle-source"
                data-source-id="${cat.id}"
                style="--source-color: ${cat.color}"
              >
                <span class="source-icon">${cat.icon}</span>
                <span class="source-name">${cat.name}</span>
                ${recommendedSources.includes(cat.id) ? '<span class="recommended-badge">&#9733;</span>' : ''}
              </button>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="research-section">
        <div class="section-label">AI Action</div>
        <div class="action-grid">
          ${AI_ACTIONS.map(action => `
            <button 
              class="action-card ${this.selectedAction === action.id ? 'selected' : ''}"
              data-action="select-action"
              data-action-id="${action.id}"
            >
              <div class="action-icon">${action.icon}</div>
              <div class="action-label">${action.label}</div>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="research-section">
        <div class="section-label">Response Length</div>
        <div class="response-size-selector">
          <button class="size-btn ${this.responseSize === 'very-short' ? 'active' : ''}" data-action="set-response-size" data-size="very-short">Very Short</button>
          <button class="size-btn ${this.responseSize === 'short' ? 'active' : ''}" data-action="set-response-size" data-size="short">Short</button>
          <button class="size-btn ${this.responseSize === 'medium' ? 'active' : ''}" data-action="set-response-size" data-size="medium">Medium</button>
          <button class="size-btn ${this.responseSize === 'detailed' ? 'active' : ''}" data-action="set-response-size" data-size="detailed">Detailed</button>
          <button class="size-btn ${this.responseSize === 'in-depth' ? 'active' : ''}" data-action="set-response-size" data-size="in-depth">In-Depth</button>
        </div>
      </div>

      <div class="research-section">
        <div class="section-label">Research Prompt (Editable)</div>
        <textarea class="prompt-textarea" id="research-prompt" rows="6">${generatedPrompt}</textarea>
      </div>

      <div class="research-actions">
        <button class="research-copy-btn" data-action="copy-prompt">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="4" y="4" width="8" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 2H10V10" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
          Copy Prompt
        </button>
        <button class="research-execute-btn" data-action="generate-research">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L15 8L8 15M15 8H1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Generate with AI
        </button>
      </div>
      
      <div id="research-output" class="research-output hidden"></div>
    `;
  }

  getResearchData() {
    // Import research data - in real app this would be a proper import
    return {
      SOURCE_CATEGORIES: [
        {
          id: 'official',
          name: 'Official Sources',
          icon: '&#127963;&#65039;',
          color: '#64b5f6'
        },
        {
          id: 'scientific',
          name: 'Scientific',
          icon: '&#128300;',
          color: '#81c784'
        },
        {
          id: 'media',
          name: 'Major Media',
          icon: '&#128240;',
          color: '#ffb74d'
        },
        {
          id: 'favorites',
          name: 'Favorites',
          icon: '&#11088;',
          color: '#ba68c8'
        }
      ],
      AI_ACTIONS: [
        { id: 'post-draft', label: 'Social Post', icon: '&#9997;&#65039;' },
        { id: 'research-brief', label: 'Research Brief', icon: '&#128203;' },
        { id: 'compare-sources', label: 'Compare Sources', icon: '&#9878;&#65039;' },
        { id: 'suggest-angles', label: 'Angles', icon: '&#128269;' }
      ],
      LAYER_SOURCE_MAPPING: {
        'meteo': ['scientific', 'official'],
        'climate': ['scientific', 'official'],
        'carbon-history': ['official', 'scientific', 'media'],
        'eu': ['official', 'media'],
        'country-news': ['media', 'official'],
        'regional-news': ['media', 'official'],
        'world': ['media', 'official'],
        'extreme': ['scientific', 'media', 'official']
      }
    };
  }

  getTodayDateOnly() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  parseDateOnly(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const candidate = new Date(year, month - 1, day);
      if (
        candidate.getFullYear() === year
        && candidate.getMonth() === month - 1
        && candidate.getDate() === day
      ) {
        return candidate;
      }
      return null;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  formatDateOnly(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  addDays(date, days) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + Number(days || 0));
    return next;
  }

  isRegionalResearchLayer(layerId = '') {
    const layer = this.layers.find(item => item.id === layerId);
    if (!layer) return false;
    if (Array.isArray(layer.modeTabs)) {
      return layer.modeTabs.includes('regional');
    }
    return false;
  }

  getResearchTemporalStrategy(context = {}) {
    const today = this.getTodayDateOnly();
    const targetDate = this.parseDateOnly(context.date) || today;
    const targetDateLabel = this.formatDateOnly(targetDate) || String(context.date || '').trim() || this.formatDateOnly(today);
    const layerId = String(context.layerId || '').trim();
    const timeScope = String(context.timeScope || '').trim() || 'recent';
    const geographicScope = String(context.geographicScope || '').trim();
    const isRegional = Boolean(
      context.isRegionalProposal
      || this.isRegionalResearchLayer(layerId)
      || context.regionalLabel
      || geographicScope === 'local'
      || geographicScope === 'regional'
    );

    const meteoLayerIds = new Set(['meteo', 'meteo-live', 'meteo-clouds']);
    const regionalActionLayerIds = new Set([
      'regional-news',
      'community-projects',
      'bike-ways',
      'ev-charging',
      'hydrogen-charging'
    ]);

    if (isRegional && meteoLayerIds.has(layerId)) {
      const forecastStart = today;
      const forecastEnd = this.addDays(forecastStart, 5);
      const forecastStartLabel = this.formatDateOnly(forecastStart);
      const forecastEndLabel = this.formatDateOnly(forecastEnd);

      return {
        mode: 'regional-meteo-window',
        promptDateLine: `Forecast Window: ${forecastStartLabel} to ${forecastEndLabel}`,
        contextChipLabel: 'Forecast +5d',
        detailLabel: `${forecastStartLabel} to ${forecastEndLabel}`,
        dateContext: `TEMPORAL CONTEXT: SHORT-RANGE REGIONAL FORECAST WINDOW (${forecastStartLabel} to ${forecastEndLabel})\nUse the next 5 days as the main search horizon. Do NOT focus only on the exact target day (${targetDateLabel}). Search across the full forecast window for the user's area. Prioritize forecast updates, alerts, precipitation, temperature, wind, cloud cover, air quality, and forecast confidence. If a source only provides a narrower daily view, say so clearly.`,
        researchApproach: `Research approach: Search for near-term forecast and alert information across ${forecastStartLabel} to ${forecastEndLabel}. Prioritize the next 5 days rather than one exact date.`,
        compareInstruction: 'Compare how selected sources describe the short-range forecast, alert levels, and uncertainty across the full 5-day window.',
        suggestAnglesInstruction: 'Suggest useful local angles across the next 5 days, including weather impacts, mobility, air quality, preparedness, and public health.'
      };
    }

    if (isRegional && (regionalActionLayerIds.has(layerId) || geographicScope === 'local' || geographicScope === 'regional')) {
      const windowConfig = {
        today: { lookbackDays: 7, lookaheadDays: 21 },
        recent: { lookbackDays: 30, lookaheadDays: 30 },
        month: { lookbackDays: 45, lookaheadDays: 60 },
        custom: { lookbackDays: 30, lookaheadDays: 45 }
      };
      const resolvedWindow = windowConfig[timeScope] || windowConfig.recent;
      const windowEnd = this.addDays(today, resolvedWindow.lookaheadDays);
      const windowEndLabel = this.formatDateOnly(windowEnd);

      return {
        mode: 'regional-active-window',
        promptDateLine: `Search Window: active now through ${windowEndLabel} (use last ${resolvedWindow.lookbackDays} days for context)`,
        contextChipLabel: `Now +${resolvedWindow.lookaheadDays}d`,
        detailLabel: `Active now through ${windowEndLabel}; use last ${resolvedWindow.lookbackDays} days for context`,
        dateContext: `TEMPORAL CONTEXT: REGIONAL ACTIVE + UPCOMING WINDOW (today to ${windowEndLabel})\nDo NOT focus only on the exact target day (${targetDateLabel}). Search for what is active now, opening soon, scheduled soon, or publicly discussed soon in the user's area. Use the latest reliable context from the last ${resolvedWindow.lookbackDays} days for background. Prioritize local initiatives, consultations, volunteer opportunities, funding calls, route changes, station availability, deployments, and community activity the user can actually act on.`,
        researchApproach: `Research approach: Prioritize what the user can act on now or in the next ${resolvedWindow.lookaheadDays} days, backed by the most recent reliable updates from the last ${resolvedWindow.lookbackDays} days.`,
        compareInstruction: 'Compare how selected sources describe what is already active, what is upcoming soon, and what is still proposed within this regional window.',
        suggestAnglesInstruction: 'Suggest angles that help the user act locally soon, including nearby initiatives, openings, consultations, volunteer calls, grants, route changes, and infrastructure availability.'
      };
    }

    if (targetDate.getTime() < today.getTime()) {
      return {
        mode: 'past',
        promptDateLine: `Date: ${targetDateLabel}`,
        contextChipLabel: targetDateLabel,
        detailLabel: `Historical reference date: ${targetDateLabel}`,
        dateContext: `TEMPORAL CONTEXT: PAST EVENT (${targetDateLabel})\nSearch for ACTUAL historical information about this specific event. This is NOT hypothetical - find real reports, coverage, and documented facts from ${targetDateLabel} and any follow-up analysis since then.`,
        researchApproach: 'Research approach: Find documented historical facts, initial reports, and subsequent analysis/updates.',
        compareInstruction: 'Compare how selected sources covered this historical event, including early reporting versus later analysis.',
        suggestAnglesInstruction: 'Suggest research angles that examine causes, consequences, accountability, follow-up, and lessons since the event.'
      };
    }

    if (targetDate.getTime() > today.getTime()) {
      return {
        mode: 'future',
        promptDateLine: `Date: ${targetDateLabel}`,
        contextChipLabel: targetDateLabel,
        detailLabel: `Target future date: ${targetDateLabel}`,
        dateContext: `TEMPORAL CONTEXT: FUTURE PROJECTION (${targetDateLabel})\nThis is a predictive scenario or simulation. Search for:\n- Current scientific projections and models for this timeframe\n- Expert predictions and forecasts\n- Scenario analysis and simulation data\n- Climate/environmental modeling for this year\n- Tipping point predictions and planetary boundary research\nFocus on evidence-based projections, not speculation.`,
        researchApproach: 'Research approach: Find current scientific projections, expert forecasts, scenario models, and evidence-based predictions for this timeframe.',
        compareInstruction: 'Compare how selected sources project, model, and forecast this future scenario.',
        suggestAnglesInstruction: 'Suggest research angles for this future projection, including scenario modeling, predictive frameworks, and complementary forecasting approaches.'
      };
    }

    return {
      mode: 'current',
      promptDateLine: `Date: ${targetDateLabel}`,
      contextChipLabel: targetDateLabel,
      detailLabel: `Current or recent reference date: ${targetDateLabel}`,
      dateContext: `TEMPORAL CONTEXT: CURRENT/RECENT EVENT (${targetDateLabel})\nSearch for the LATEST real-time information and most recent developments.`,
      researchApproach: 'Research approach: Find the latest real-time information and most recent developments.',
      compareInstruction: 'Compare the latest coverage and viewpoints from selected sources.',
      suggestAnglesInstruction: 'Draw from selected sources and recent coverage to suggest useful next angles.'
    };
  }

  generateFullPrompt() {
    const selectedActionData = this.getResearchData().AI_ACTIONS.find(a => a.id === this.selectedAction);
    const { SOURCE_CATEGORIES } = this.getResearchData();
    const selectedSourceNames = Array.from(this.selectedSources)
      .map(id => SOURCE_CATEGORIES.find(s => s.id === id)?.name)
      .filter(Boolean);
    const explicitSources = (this.researchContext.sources || [])
      .filter(source => source.url || source.name)
      .map(source => `- ${source.name || this.getHostFromUrl(source.url)}${source.url ? ` - ${source.url}` : ''}`)
      .join('\n');
    const mediaContext = (this.researchContext.mediaTokens || [])
      .filter(token => token.sourceUrl || token.sourceName)
      .map(token => `- ${token.sourceName}${token.sourceUrl ? ` - ${token.sourceUrl}` : ''} (${token.watermarkText || 'media token'})`)
      .join('\n');
    const searchHint = String(this.researchContext.searchHint || '').trim();
    const locationPrecision = String(this.researchContext.locationPrecision || '').trim();
    const regionalLabel = String(this.researchContext.regionalLabel || '').trim();
    
    const lengthInstructions = {
      'very-short': 'VERY SHORT: Maximum 3-4 sentences total. Ultra-concise bullet points only.',
      'short': 'SHORT: Keep response brief and concise. Use bullet points. Maximum 2-3 sentences per section.',
      'medium': 'MEDIUM: Balanced response with clear structure. 3-4 sentences per section.',
      'detailed': 'DETAILED: Comprehensive response with full analysis. 4-6 sentences per section.',
      'in-depth': 'IN-DEPTH: Thorough, comprehensive analysis with extensive detail and context.'
    };
    
    const lengthNote = lengthInstructions[this.responseSize || 'short'];
    const temporalStrategy = this.getResearchTemporalStrategy(this.researchContext);
    const dateContext = temporalStrategy.dateContext;
    
    let prompt = '';
    
    switch (this.selectedAction) {
      case 'post-draft':
        prompt = `Create a professional social media post about the following topic:\n\n`;
        prompt += `Topic: ${this.researchContext.topic}\n`;
        prompt += `Location: ${this.researchContext.region}, ${this.researchContext.country}\n`;
        prompt += `${temporalStrategy.promptDateLine}\n`;
        prompt += `Category: ${this.researchContext.layer}\n\n`;
        prompt += `${dateContext}\n\n`;
        prompt += `Context: ${this.researchContext.summary}\n\n`;
        prompt += `Sources: ${selectedSourceNames.join(', ')}\n`;
        if (explicitSources) prompt += `Preferred source URLs:\n${explicitSources}\n\n`;
        if (mediaContext) prompt += `Existing media tokens:\n${mediaContext}\n\n`;
        prompt += `${temporalStrategy.researchApproach}\n\n`;
        prompt += `${lengthNote}\n\n`;
        prompt += `Format your response with:\n`;
        prompt += `## Summary\n[1-2 sentence overview]\n\n`;
        prompt += `## Key Points\n- [Point 1]\n- [Point 2]\n- [Point 3]\n\n`;
        prompt += `## Post Draft\n[Short social media post]\n\n`;
        prompt += `## Sources\n[List 3-4 sources in format: "Source Name - https://example.com"]\n\n`;
        prompt += `## Media Prompts\n[For each visual (max 3), write a detailed image generation prompt on its own line starting with "IMAGE:"]\nExample:\nIMAGE: A detailed data visualization chart showing climate temperature trends over the past decade, with red and blue gradient colors\nIMAGE: Photorealistic satellite view of the affected region highlighting the key areas`;
        break;
        
      case 'research-brief':
        prompt = `Generate a research brief on the following topic:\n\n`;
        prompt += `Topic: ${this.researchContext.topic}\n`;
        prompt += `Location: ${this.researchContext.region}, ${this.researchContext.country}\n`;
        prompt += `${temporalStrategy.promptDateLine}\n`;
        prompt += `Category: ${this.researchContext.layer}\n\n`;
        prompt += `${dateContext}\n\n`;
        prompt += `Context: ${this.researchContext.summary}\n\n`;
        if (explicitSources) prompt += `Preferred source URLs:\n${explicitSources}\n\n`;
        if (mediaContext) prompt += `Existing media tokens:\n${mediaContext}\n\n`;
        prompt += `${temporalStrategy.researchApproach}\n\n`;
        prompt += `${lengthNote}\n\n`;
        prompt += `Format your response with clear sections:\n`;
        prompt += `## Summary\n[2-3 sentences max]\n\n`;
        prompt += `## Key Facts\n- [Fact 1]\n- [Fact 2]\n- [Fact 3]\n\n`;
        prompt += `## Latest Developments\n[Brief update]\n\n`;
        prompt += `## Implications\n[Concise analysis]\n\n`;
        prompt += `## Sources\n[List 4-5 sources in format: "Source Name - https://example.com"]\n\n`;
        prompt += `## Media Prompts\n[For each visual (max 3), write a detailed image generation prompt on its own line starting with "IMAGE:"]\nExample:\nIMAGE: Infographic showing key statistics and data points in a clean, modern style\nIMAGE: Map visualization highlighting the geographic area of interest`;
        break;
        
      case 'compare-sources':
        prompt = `Compare perspectives from different sources on:\n\n`;
        prompt += `Topic: ${this.researchContext.topic}\n`;
        prompt += `Location: ${this.researchContext.region}, ${this.researchContext.country}\n`;
        prompt += `${temporalStrategy.promptDateLine}\n\n`;
        prompt += `${dateContext}\n\n`;
        prompt += `Context: ${this.researchContext.summary}\n\n`;
        if (explicitSources) prompt += `Preferred source URLs:\n${explicitSources}\n\n`;
        if (mediaContext) prompt += `Existing media tokens:\n${mediaContext}\n\n`;
        prompt += `${temporalStrategy.compareInstruction}\n\n`;
        prompt += `${lengthNote}\n\n`;
        prompt += `Structure your analysis:\n`;
        prompt += `## Overview\n[2 sentences max]\n\n`;
        prompt += `## Agreement Points\n- [Point 1]\n- [Point 2]\n\n`;
        prompt += `## Differences\n- [Difference 1]\n- [Difference 2]\n\n`;
        prompt += `## Sources\n[List sources compared in format: "Source Name - https://example.com"]`;
        break;
        
      case 'suggest-angles':
        prompt = `Suggest research angles and related topics for:\n\n`;
        prompt += `Topic: ${this.researchContext.topic}\n`;
        prompt += `Location: ${this.researchContext.region}, ${this.researchContext.country}\n`;
        prompt += `${temporalStrategy.promptDateLine}\n`;
        prompt += `Category: ${this.researchContext.layer}\n\n`;
        prompt += `${dateContext}\n\n`;
        prompt += `Context: ${this.researchContext.summary}\n\n`;
        if (explicitSources) prompt += `Preferred source URLs:\n${explicitSources}\n\n`;
        if (mediaContext) prompt += `Existing media tokens:\n${mediaContext}\n\n`;
        prompt += `${temporalStrategy.suggestAnglesInstruction}\n\n`;
        prompt += `${lengthNote}\n\n`;
        prompt += `## Current Angle\n[Brief summary]\n\n`;
        prompt += `## Alternative Angles\n- [Angle 1]\n- [Angle 2]\n- [Angle 3]\n\n`;
        prompt += `## Related Topics\n- [Topic 1]\n- [Topic 2]\n\n`;
        prompt += `## Sources\n[List sources in format: "Source Name - https://example.com"]`;
        break;
    }
    
    const localFocusLines = [];
    if (regionalLabel) localFocusLines.push(`Regional focus: ${regionalLabel}`);
    if (locationPrecision) localFocusLines.push(`Map precision: ${locationPrecision}`);
    if (searchHint) localFocusLines.push(`User focus: ${searchHint}`);
    if (localFocusLines.length > 0) {
      prompt += `\n\n## Local User Focus\n${localFocusLines.join('\n')}`;
    }

    const responseLanguage = this.getResearchResponseLanguage();
    prompt += `\n\n## Response Language\nWrite the full response in ${responseLanguage.name} (${responseLanguage.code}). Keep source names, publication names, and official organization titles in their original language when useful, but write summaries, headings, bullets, and post drafts in ${responseLanguage.name}. Use clean UTF-8 text with no mojibake, broken punctuation, or malformed links.`;

    return prompt;
  }

  toggleSource(sourceId) {
    if (this.selectedSources.has(sourceId)) {
      this.selectedSources.delete(sourceId);
    } else {
      this.selectedSources.add(sourceId);
    }
    this.renderResearch();
  }

  selectAction(actionId) {
    this.selectedAction = actionId;
    this.renderResearch();
  }

  setResponseSize(size) {
    this.responseSize = size;
    this.renderResearch();
  }

  editSource(btn) {
    if (!this.canManageCurrentTopicSources()) {
      this.blockUserMutation('edit topic sources');
      return;
    }

    const sourceItem = btn.closest('.source-item');
    if (!sourceItem) return;
    
    const sourceText = sourceItem.querySelector('.source-text')?.textContent;
    const sourceLink = sourceItem.querySelector('.source-link')?.href;
    
    const newName = prompt('Edit source name:', sourceText || '');
    if (newName === null) return;
    
    const newUrl = prompt('Edit source URL:', sourceLink || '');
    if (newUrl === null) return;
    
    // Update the source in current point if it exists
    if (this.currentPoint && this.currentPoint.researchSources) {
      const sourceIndex = Array.from(sourceItem.parentElement.children).indexOf(sourceItem);
      if (this.currentPoint.researchSources[sourceIndex]) {
        this.currentPoint.researchSources[sourceIndex].name = newName;
        this.currentPoint.researchSources[sourceIndex].url = newUrl;
        
        // Save to storage if custom point
        if (this.currentPoint.isCustom) {
          const customPoints = LocalStorage.getCustomPoints();
          const index = customPoints.findIndex(p => p.id === this.currentPoint.id);
          if (index !== -1) {
            customPoints[index] = this.currentPoint;
            LocalStorage.saveCustomPoints(customPoints);
          }
        }
        
        // Re-render
        this.renderDetail(this.currentPoint);
      }
    }
  }
  
  setFeverSpeed(btn) {
    const speed = parseFloat(btn.dataset.speed);
    if (this.currentGlobe) {
      this.currentGlobe.setFeverSpeed(speed);
    }
    
    // Update active button (only speed buttons)
    this.container.querySelectorAll('[data-action="set-fever-speed"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  
  setFeverScenario(btn) {
    const scenario = btn.dataset.scenario;
    if (this.currentGlobe) {
      this.currentGlobe.setFeverScenario(scenario);
      
      // Reset warning state
      this.lastWarningYear = null;
      
      // Update chart data
      if (this.combinedChart) {
        const chartSeries = this.getScenarioChartSeries(scenario);
        this.combinedChart.data.labels = chartSeries.labels;
        this.combinedChart.data.datasets[0].data = chartSeries.temp;
        this.combinedChart.data.datasets[1].data = chartSeries.ice;
        this.combinedChart.data.datasets[2].data = chartSeries.sea;
        this.combinedChart.update();
      }
      // Update active button
      this.container.querySelectorAll('[data-action="set-fever-scenario"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  }

  copyPrompt() {
    const promptTextarea = this.container.querySelector('#research-prompt');
    if (promptTextarea) {
      promptTextarea.select();
      document.execCommand('copy');
      
      // Show feedback
      const btn = this.container.querySelector('[data-action="copy-prompt"]');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Copied';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 1500);
      }
    }
  }
  
  copyOutput() {
    const outputContent = this.container.querySelector('.research-output-content');
    if (outputContent) {
      const text = outputContent.innerText;
      navigator.clipboard.writeText(text).then(() => {
        const btn = this.container.querySelector('[data-action="copy-output"]');
        if (btn) {
          const originalHTML = btn.innerHTML;
          btn.innerHTML = 'OK';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
          }, 1500);
        }
      });
    }
  }

  getResearchResponseLanguage() {
    const code = LanguageManager.normalizeLanguageCode(this.getCurrentLanguage());
    const info = LanguageManager.getLanguageInfo(code);
    return {
      code,
      name: info?.name || info?.nativeName || code.toUpperCase()
    };
  }

  getResearchSystemPrompt() {
    const responseLanguage = this.getResearchResponseLanguage();
    return `You are a professional research assistant. Provide well-structured, factual, and comprehensive responses based on the research topic and parameters provided. Write the full response in ${responseLanguage.name} (${responseLanguage.code}). Keep source names, publication names, and official organization titles in their original language when useful, but write headings, summaries, bullets, and post drafts in ${responseLanguage.name}. Use clean UTF-8 text only, with no mojibake, broken quote characters, or malformed URLs.`;
  }

  countMojibakeArtifacts(text = '') {
    const matches = String(text).match(/(?:\u00C3.|\u00C2.|\u00E2[\u0080-\u00BF]{2}|\u00EF\u00BB\u00BF|\uFFFD)/g);
    return matches ? matches.length : 0;
  }

  tryDecodeUtf8Mojibake(text = '') {
    const value = String(text || '');
    if (!value || typeof TextDecoder === 'undefined') return value;

    const codePoints = Array.from(value, (char) => char.codePointAt(0));
    if (codePoints.some((codePoint) => codePoint > 255)) {
      return value;
    }

    try {
      const bytes = new Uint8Array(codePoints);
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return value;
    }
  }

  repairMojibakeText(text = '') {
    let best = String(text || '');
    let bestScore = this.countMojibakeArtifacts(best);

    if (!bestScore) {
      return best;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const decoded = this.tryDecodeUtf8Mojibake(best);
      const decodedScore = this.countMojibakeArtifacts(decoded);
      if (!decoded || decoded === best || decodedScore >= bestScore) {
        break;
      }
      best = decoded;
      bestScore = decodedScore;
      if (!bestScore) {
        break;
      }
    }

    return best;
  }

  normalizeResearchResponseText(text = '') {
    return this.repairMojibakeText(text)
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }

  normalizeHeadingKey(text = '') {
    return this.normalizeResearchResponseText(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  sanitizeUrl(url = '') {
    if (!url) return '';

    try {
      const parsed = new URL(String(url).trim(), window.location.href);
      if (!/^https?:$/i.test(parsed.protocol)) {
        return '';
      }
      return parsed.href;
    } catch {
      return '';
    }
  }

  splitTrailingUrlPunctuation(rawUrl = '') {
    let url = String(rawUrl || '');
    let trailing = '';

    while (/[),.;:!?]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }

    return { url, trailing };
  }

  formatTextWithStrong(text = '') {
    return this.escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  formatPlainResearchText(text = '') {
    return this.formatTextWithStrong(this.normalizeResearchResponseText(text));
  }

  buildExternalLinkHtml(url = '', label = '') {
    const safeUrl = this.sanitizeUrl(url);
    const safeLabel = String(label || '').trim();
    if (!safeUrl) {
      return this.escapeHtml(safeLabel || url);
    }

    return `<a href="${this.escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" class="source-link" contenteditable="false">${this.escapeHtml(safeLabel || this.getHostFromUrl(safeUrl) || safeUrl)}</a>`;
  }

  formatInlineResearchText(text = '') {
    const normalized = this.normalizeResearchResponseText(text);
    const urlRegex = /https?:\/\/[^\s<>"']+/gi;
    let html = '';
    let lastIndex = 0;

    for (const match of normalized.matchAll(urlRegex)) {
      const matchIndex = match.index ?? 0;
      const rawUrl = match[0];
      const { url, trailing } = this.splitTrailingUrlPunctuation(rawUrl);

      html += this.formatTextWithStrong(normalized.slice(lastIndex, matchIndex));

      const safeUrl = this.sanitizeUrl(url);
      if (safeUrl) {
        html += this.buildExternalLinkHtml(safeUrl, this.getHostFromUrl(safeUrl) || safeUrl);
      } else {
        html += this.escapeHtml(rawUrl);
      }

      html += this.escapeHtml(trailing);
      lastIndex = matchIndex + rawUrl.length;
    }

    html += this.formatTextWithStrong(normalized.slice(lastIndex));
    return html;
  }

  formatSourceItem(content = '') {
    const normalized = this.normalizeResearchResponseText(content).trim();
    const urlMatch = normalized.match(/https?:\/\/[^\s<>"']+/i);

    if (urlMatch) {
      const { url } = this.splitTrailingUrlPunctuation(urlMatch[0]);
      const safeUrl = this.sanitizeUrl(url);
      const name = normalized
        .slice(0, urlMatch.index)
        .replace(/[-\u2013\u2014:]\s*$/, '')
        .trim();
      const label = name || this.getHostFromUrl(safeUrl) || 'Source';

      if (safeUrl) {
        return `<div class="source-item"><span class="source-icon">&#128279;</span><div class="source-content">${this.buildExternalLinkHtml(safeUrl, label)}</div></div>`;
      }
    }

    return `<div class="source-item"><span class="source-icon">&#128196;</span><div class="source-content"><div class="source-text">${this.formatInlineResearchText(normalized)}</div></div></div>`;
  }

  async generateResearch() {
    const btn = this.container.querySelector('[data-action="generate-research"]');
    const outputDiv = this.container.querySelector('#research-output');
    const promptTextarea = this.container.querySelector('#research-prompt');
    
    if (!btn || !outputDiv) return;
    
    // Show loading state
    const originalText = btn.innerHTML;
    btn.innerHTML = `
      <div class="spinner-small"></div>
      Generating...
    `;
    btn.disabled = true;
    
    outputDiv.innerHTML = `
      <div class="research-output-header">
        <div class="section-label">AI Suggestion</div>
      </div>
      <div class="research-output-content">
        <div class="spinner-small"></div>
        <span style="margin-left: 8px;">Preparing a reviewable suggestion...</span>
      </div>
    `;
    outputDiv.classList.remove('hidden');
    
    try {
      // Use edited prompt from textarea
      const prompt = promptTextarea ? promptTextarea.value : this.generateFullPrompt();
      
      const completion = await window.ourEarthAI.createChatCompletion({
        messages: [
          {
            role: "system",
            content: this.getResearchSystemPrompt()
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });
      
      const result = this.normalizeResearchResponseText(completion.content || '');
      
      // Extract image prompts
      const imagePrompts = this.extractImagePrompts(result);
      
      // Display initial result
      outputDiv.innerHTML = `
        <div class="research-output-header">
          <div class="section-label">AI Suggestion</div>
          <div class="output-actions">
            <button class="research-output-copy" data-action="copy-output">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="4" y="4" width="8" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M2 2H10V10" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="research-output-content" contenteditable="true" spellcheck="false">${this.formatResearchOutput(result)}</div>
      `;
      
      // Show image prompts as reviewable suggestions. AI should not create media until the user asks.
      if (imagePrompts.length > 0) {
        this.renderMediaPromptSuggestions(imagePrompts, outputDiv);
      }
      
      // Add explicit apply button; research should not mutate a topic silently.
      this.addPostToTopicButton(outputDiv);

      const shouldAutoApply = this.pendingResearchAutoApply && this.canApplyResearchToCurrentTopic();
      this.pendingResearchAutoApply = false;
      if (shouldAutoApply) {
        setTimeout(() => this.postToTopic(), 80);
      }
      
      btn.innerHTML = 'Generated';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
      
    } catch (error) {
      this.pendingResearchAutoApply = false;
      console.error('Error generating research:', error);
      outputDiv.innerHTML = `
        <div class="research-output-header">
          <div class="section-label">Error</div>
        </div>
        <div class="research-output-content error">
          ${this.escapeHtml(this.getActionErrorMessage(error, 'AI Assist'))}
        </div>
      `;
      
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
  
  extractImagePrompts(text) {
    const prompts = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.trim().startsWith('IMAGE:')) {
        const prompt = line.replace(/^IMAGE:\s*/i, '').trim();
        if (prompt) {
          prompts.push(prompt);
        }
      }
    }
    
    return prompts.slice(0, 3); // Max 3 images
  }

  renderMediaPromptSuggestions(imagePrompts, outputDiv) {
    const contentDiv = outputDiv.querySelector('.research-output-content');
    if (!contentDiv) return;

    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'generated-media-container media-suggestions-container';
    mediaContainer.innerHTML = `
      <h3 class="section-heading">Media Suggestions</h3>
      <div class="media-suggestion-note">AI suggested these visuals. Generate only the ones you want to keep.</div>
      <div class="media-grid" id="editable-media-grid">
        ${imagePrompts.map((prompt, i) => `
          <div class="media-item media-suggestion-item" id="media-${i}" data-media-prompt="${this.escapeHtml(prompt)}">
            <div class="media-caption">${this.escapeHtml(prompt)}</div>
            <button class="btn-secondary generate-research-media-btn" data-action="generate-research-media" data-media-index="${i}" type="button">
              Generate this image
            </button>
          </div>
        `).join('')}
      </div>
    `;

    contentDiv.appendChild(mediaContainer);
  }

  async generateResearchMedia(button) {
    const mediaItem = button.closest('.media-item');
    if (!mediaItem) return;

    const prompt = mediaItem.dataset.mediaPrompt || '';
    if (!prompt) return;

    const originalText = button.textContent;
    button.textContent = 'Generating...';
    button.disabled = true;

    try {
      const result = await window.ourEarthAI.generateImage({
        prompt,
        aspect_ratio: '16:9'
      });

      const mediaToken = this.createMediaToken({
        url: result.url,
        sourceName: result.provider || 'AI Generated Image',
        sourceUrl: result.url,
        query: prompt,
        generated: true,
        provider: result.provider || 'ai-generated'
      });

      mediaItem.innerHTML = `
        <button class="media-delete-btn" data-action="delete-media" title="Remove this image">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        ${this.renderMediaTokenImage(mediaToken, 'generated-image', 'Generated research media')}
        <div class="media-caption">${this.escapeHtml(prompt)}</div>
      `;
    } catch (error) {
      console.error('Error generating research media:', error);
      button.textContent = originalText;
      button.disabled = false;
      alert(this.getActionErrorMessage(error, 'Image generation'));
    }
  }
  
  async generateMediaForOutput(imagePrompts, outputDiv) {
    // Legacy entry point kept safe: media is suggested first, never auto-generated.
    this.renderMediaPromptSuggestions(imagePrompts, outputDiv);
  }
  
  addPostToTopicButton(outputDiv) {
    const canApply = this.canApplyResearchToCurrentTopic();
    if (!canApply) return;

    const isAdmin = AppAccess.isAdminMode();
    const buttonLabel = AppAccess.isRegionalProposalTopic(this.currentPoint)
      ? 'Apply to Local Proposal'
      : 'Apply to Topic Draft';
    
    const btnContainer = document.createElement('div');
    btnContainer.className = 'post-to-topic-actions';
    btnContainer.innerHTML = `
      <button class="btn-post-topic" data-action="post-to-topic" ${isAdmin ? 'data-admin-only="true"' : ''}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1V15M1 8H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        ${buttonLabel}
      </button>
    `;
    outputDiv.appendChild(btnContainer);
  }
  
  formatResearchOutput(text) {
    const normalizedText = this.normalizeResearchResponseText(text);
    const lines = normalizedText.split('\n');
    let html = '';
    let inList = false;
    let inSourceList = false;

    const closeOpenBlocks = () => {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (inSourceList) {
        html += '</div>';
        inSourceList = false;
      }
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (/^IMAGE:\s*/i.test(line)) {
        continue;
      }
      
      if (!line) {
        closeOpenBlocks();
        continue;
      }
      
      if (line.startsWith('## ')) {
        closeOpenBlocks();
        const heading = line.replace(/^##\s*/, '');
        const normalizedHeading = this.normalizeHeadingKey(heading);
        
        if (normalizedHeading.includes('media prompt') || normalizedHeading.includes('visual prompt') || normalizedHeading.includes('prompt image')) {
          continue;
        }
        
        if (normalizedHeading.includes('source') || normalizedHeading.includes('reference') || normalizedHeading.includes('resource') || normalizedHeading.includes('lien')) {
          html += `<h3 class="section-heading sources-heading">${this.formatPlainResearchText(heading)}</h3>`;
          html += '<div class="sources-list">';
          inSourceList = true;
        } else if (normalizedHeading.includes('media') || normalizedHeading.includes('visual')) {
          continue;
        } else {
          html += `<h3 class="section-heading">${this.formatPlainResearchText(heading)}</h3>`;
        }
        continue;
      }
      
      if (line.startsWith('### ')) {
        closeOpenBlocks();
        html += `<h4 class="subsection-heading">${this.formatPlainResearchText(line.replace(/^###\s*/, ''))}</h4>`;
        continue;
      }
      
      if (line.match(/^[-*\u2022]\s/)) {
        if (!inList && !inSourceList) {
          html += '<ul class="research-list">';
          inList = true;
        }
        
        const content = line.replace(/^[-*\u2022]\s*/, '');
        
        if (inSourceList) {
          html += this.formatSourceItem(content);
          continue;
        }
        
        html += `<li>${this.formatInlineResearchText(content)}</li>`;
        continue;
      }
      
      const numberedMatch = line.match(/^(\d+\.)\s+(.*)$/);
      if (numberedMatch) {
        closeOpenBlocks();
        html += `<p class="numbered-item"><strong>${this.escapeHtml(numberedMatch[1])}</strong> ${this.formatInlineResearchText(numberedMatch[2])}</p>`;
        continue;
      }
      
      if (inSourceList) {
        html += this.formatSourceItem(line);
        continue;
      }
      
      html += `<p>${this.formatInlineResearchText(line)}</p>`;
    }
    
    closeOpenBlocks();
    
    return html;
  }

  showCreateLayer() {
    if (!this.isAdminMode()) {
      this.blockUserMutation('create layers');
      return;
    }

    this.mode = 'create-layer';
    this.setCompactMode(false);
    this.renderCreateLayer();
    this.container.classList.remove('hidden');
    this.updateTopicNavigation();
  }

  renderCreateLayer() {
    const content = this.container.querySelector('#detail-content');
    content.innerHTML = `
      <div class="detail-header">
        <h2 class="detail-title">Create New Layer</h2>
      </div>
      
      <form class="modal-form" id="layer-form">
        <div class="form-group">
          <label>Layer Name</label>
          <input type="text" name="name" placeholder="e.g., Tech Innovations" required>
        </div>
        <div class="form-group">
          <label>Icon (emoji)</label>
          <input type="text" name="icon" placeholder="&#128640;" maxlength="2" required>
        </div>
        <div class="form-group">
          <label>Color</label>
          <input type="color" name="color" value="#00d4ff" required>
        </div>
        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" name="enabled" checked>
            <span>Enabled by default</span>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-primary" data-action="submit-layer" data-admin-only="true">Create Layer</button>
        </div>
      </form>
    `;
  }

  submitLayer() {
    if (!this.isAdminMode()) {
      this.blockUserMutation('create layers');
      this.handleAdminModeChanged(false);
      return;
    }

    const form = this.container.querySelector('#layer-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const layer = {
      id: 'custom_' + Date.now(),
      name: formData.get('name'),
      icon: formData.get('icon'),
      color: formData.get('color'),
      enabled: formData.get('enabled') === 'on',
      isCustom: true
    };

    if (this.callbacks.onLayerCreate) {
      this.callbacks.onLayerCreate(layer);
    }

    this.hide();
  }

  showNewsUpdate(existingPoints = [], options = {}) {
    if (!options.topic) {
      this.showSourceSearchTopic();
      return;
    }

    this.mode = 'news-update';
    this.setCompactMode(false);
    this.renderNewsUpdate(existingPoints, options);
    this.container.classList.remove('hidden');
    this.updateTopicNavigation();
  }

  checkTopicUpdate() {
    if (!this.currentPoint) return;

    this.showNewsUpdate([this.currentPoint], { topic: this.currentPoint, scoped: true });
  }

  renderTopicUpdateEditor(topic) {
    const content = this.container.querySelector('#detail-content');
    if (!content || !topic) return;

    const locationLabel = [topic.region, topic.country].filter(Boolean).join(', ') || 'Global';
    const canModifyTopic = AppAccess.canModifyTopic(topic);
    const sourceRecords = Array.isArray(topic.researchSources) ? topic.researchSources : [];
    const sourceCount = sourceRecords.filter(source => source?.name || source?.url).length;
    const applyLabel = canModifyTopic ? 'Update this topic' : 'Save as draft update';

    content.innerHTML = `
      <div class="detail-header">
        <h2 class="detail-title">Update Topic</h2>
        <div class="detail-meta">
          <span>${this.escapeHtml(topic.title || 'Untitled topic')}</span>
        </div>
      </div>

      <div class="topic-check-context">
        <div class="context-label">Current topic only</div>
        <div class="context-topic">${this.escapeHtml(topic.title || 'Untitled topic')}</div>
        <div class="context-items">
          <span class="context-chip">&#128197; ${this.escapeHtml(topic.date || 'No date')}</span>
          <span class="context-chip">&#128205; ${this.escapeHtml(locationLabel)}</span>
          <span class="context-chip">${sourceCount} source${sourceCount === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div class="web-search-notice">
        <div class="notice-icon">&#128221;</div>
        <div class="notice-content">
          <div class="notice-title">Manual scoped update</div>
          <div class="notice-text">
            This window updates only the opened topic. Add a source link, adjust the summary, or keep a short note without scanning other topics.
          </div>
        </div>
      </div>

      <div class="news-search-panel topic-update-editor">
        <div class="form-group">
          <label>Summary</label>
          <textarea id="topic-update-summary" rows="5" class="news-search-input" placeholder="Update the public summary">${this.escapeHtml(topic.summary || '')}</textarea>
          <div class="setting-hint">Edit only what should appear on the topic card/details.</div>
        </div>
        <div class="form-group">
          <label>Source URL</label>
          <input type="url" id="topic-update-source-url" placeholder="https://example.com/article-or-source" class="news-search-input">
          <div class="setting-hint">Optional. The link is stored as evidence for this topic.</div>
        </div>
        <div class="form-group">
          <label>Source name</label>
          <input type="text" id="topic-update-source-name" placeholder="Publisher, official source, document title..." class="news-search-input">
        </div>
        <div class="form-group">
          <label>Internal note / analysis</label>
          <textarea id="topic-update-note" rows="3" class="news-search-input" placeholder="Optional admin or draft note"></textarea>
        </div>
        <div class="topic-builder-actions">
          <button type="button" class="btn-secondary" data-action="cancel-topic-update">Cancel</button>
          <div class="primary-actions">
            <button type="button" class="btn-primary-alt" data-action="add-topic-window-source">Add source only</button>
            <button type="button" class="btn-primary" data-action="apply-topic-window-update">${applyLabel}</button>
          </div>
        </div>
      </div>
    `;
  }

  applyTopicWindowUpdate(options = {}) {
    const topic = this.newsUpdateTargetTopic || this.currentPoint;
    if (!topic) return;

    const content = this.container.querySelector('#detail-content');
    const summary = String(content?.querySelector('#topic-update-summary')?.value || '').trim();
    const sourceUrlRaw = String(content?.querySelector('#topic-update-source-url')?.value || '').trim();
    const sourceUrl = sourceUrlRaw ? this.sanitizeUrl(sourceUrlRaw) : '';
    const sourceName = String(content?.querySelector('#topic-update-source-name')?.value || '').trim();
    const note = String(content?.querySelector('#topic-update-note')?.value || '').trim();
    const sourceOnly = Boolean(options.sourceOnly);

    if (sourceUrlRaw && !sourceUrl) {
      alert('Please enter a valid http(s) source URL.');
      return;
    }

    if (sourceOnly && !sourceUrl && !sourceName) {
      alert('Add a source URL or name first.');
      return;
    }

    if (!sourceOnly && !summary && !sourceUrl && !sourceName && !note) {
      alert('Add a summary update, source, or note first.');
      return;
    }

    const existingSources = Array.isArray(topic.researchSources) ? [...topic.researchSources] : [];
    const hasSource = sourceUrl || sourceName;
    if (hasSource) {
      const sourceKey = sourceUrl || sourceName.toLowerCase();
      const sourceExists = existingSources.some(source => (
        sourceUrl
          ? String(source.url || '') === sourceUrl
          : String(source.name || '').toLowerCase() === sourceKey
      ));

      if (!sourceExists) {
        existingSources.push({
          name: sourceName || this.getHostFromUrl(sourceUrl) || 'Topic update source',
          url: sourceUrl,
          category: 'source',
          reliability: 'unknown',
          verified: Boolean(sourceUrl),
          addedAt: new Date().toISOString()
        });
      }
    }

    const nextInsight = note
      ? [topic.insight, note].map(value => String(value || '').trim()).filter(Boolean).join('\n\n')
      : topic.insight;
    const canModifyTopic = AppAccess.canModifyTopic(topic);
    const updatedTopic = {
      ...topic,
      summary: sourceOnly ? (topic.summary || '') : (summary || topic.summary || ''),
      insight: nextInsight,
      source: sourceName || topic.source || this.getHostFromUrl(sourceUrl) || '',
      sourceUrl: sourceUrl || topic.sourceUrl || '',
      researchSources: existingSources,
      updatedAt: new Date().toISOString(),
      ...this.buildTopicWorkflowMetadata(topic, {
        status: canModifyTopic ? (topic.topicStatus || 'saved-topic') : 'browser-draft',
        reviewStage: canModifyTopic ? (topic.review?.stage || 'local-edit') : 'browser-draft',
        storageOrigin: 'browser-localStorage'
      })
    };

    if (canModifyTopic) {
      if (this.callbacks.onTopicUpdate) {
        this.callbacks.onTopicUpdate(updatedTopic);
      }
      this.show(updatedTopic);
      return;
    }

    const draftTopic = {
      ...updatedTopic,
      id: `topic-update-${Date.now()}`,
      isCustom: true,
      originalTopicId: topic.originalTopicId || topic.id,
      originalTitle: topic.originalTitle || topic.title || ''
    };

    if (this.callbacks.onTopicCreate) {
      this.callbacks.onTopicCreate(draftTopic);
    }
    this.show(draftTopic);
  }

  async renderNewsUpdate(existingPoints = [], options = {}) {
    const content = this.container.querySelector('#detail-content');
    const targetTopic = options.topic || null;
    this.newsUpdateTargetTopic = targetTopic;
    if (targetTopic) {
      this.currentPoint = targetTopic;
      this.renderTopicUpdateEditor(targetTopic);
      return;
    }

    const headerTitle = targetTopic ? 'Find Recent Updates' : 'Find Recent Updates';
    const safeTopicTitle = targetTopic ? this.escapeHtml(targetTopic.title || '') : '';
    const topicContextHtml = targetTopic ? `
      <div class="topic-check-context">
        <div class="context-label">Topic to check</div>
        <div class="context-topic">${safeTopicTitle}</div>
        <div class="context-items">
          <span class="context-chip">&#128197; ${this.escapeHtml(targetTopic.date || 'No date')}</span>
          <span class="context-chip">&#128205; ${this.escapeHtml([targetTopic.region, targetTopic.country].filter(Boolean).join(', ') || 'Global')}</span>
        </div>
      </div>
    ` : '';
    
    content.innerHTML = `
      <div class="detail-header">
        <h2 class="detail-title">${headerTitle}</h2>
        <div class="detail-meta">
          <span>&#128197; ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      ${topicContextHtml}
      
      <div class="web-search-notice">
        <div class="notice-icon">&#9888;&#65039;</div>
        <div class="notice-content">
          <div class="notice-title">Find updates, then review before saving</div>
          <div class="notice-text">
            This looks for recent items and turns useful matches into local drafts:
            <ul>
              <li>Review update: open the draft and check it first</li>
              <li>Save without editing: keep it on this device</li>
              <li>Publishing still needs admin review later</li>
              <li>Model comes from linked API settings</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="news-search-panel">
        <div class="form-group">
          <label>Topic or question</label>
          <input type="text" id="news-search-query" placeholder="e.g., climate summit, EU policy, existing topic title..." class="news-search-input" value="${safeTopicTitle}">
          <div class="setting-hint">Searches recent updates and matches possible topic drafts.</div>
        </div>
        <div class="form-group">
          <label>Link, if you have one</label>
          <input type="url" id="news-url-source" placeholder="https://youtube.com/watch?v=... or article URL" class="news-search-input">
          <div class="setting-hint">The link is kept as evidence even when the browser cannot read page metadata.</div>
        </div>
        <button class="btn-primary" data-action="run-news-update" style="width: 100%; margin-top: 12px;">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L15 8L8 15M15 8H1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Find recent updates
        </button>
      </div>
      
      <div id="news-update-content" class="hidden"></div>
    `;
    
    // Add event listener for run button
    const runBtn = content.querySelector('[data-action="run-news-update"]');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.executeNewsUpdate(existingPoints));
    }
  }
  
  async executeNewsUpdate(existingPoints = []) {
    if (this.newsUpdateRunning) return;

    const newsContent = document.getElementById('news-update-content');
    const searchQuery = document.getElementById('news-search-query')?.value || '';
    const urlSource = document.getElementById('news-url-source')?.value || '';
    const targetTopic = this.newsUpdateTargetTopic || null;
    const runBtn = document.querySelector('[data-action="run-news-update"]');
    const originalButtonHTML = runBtn?.innerHTML;

    this.newsUpdateRunning = true;
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = `
        <div class="spinner-small"></div>
        Checking updates...
      `;
    }

    if (!newsContent) {
      this.newsUpdateRunning = false;
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = originalButtonHTML || 'Find recent updates';
      }
      return;
    }
    
    newsContent.classList.remove('hidden');
    const safeSearchQuery = this.escapeHtml(searchQuery);
    newsContent.innerHTML = `
      <div class="research-output-content">
        <div class="spinner-small"></div>
        <span style="margin-left: 8px;">Checking latest news${safeSearchQuery ? ` about "${safeSearchQuery}"` : ''}...</span>
      </div>
    `;

    try {
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      let urlContext = '';
      if (urlSource) {
        urlContext = `\n\nURL Context: The user provided this URL as a reference: ${urlSource}
Use it as the preferred sourceUrl for relevant candidates. If it is an image URL, it may be reused as source media. Direct page scraping is not yet implemented, so infer only safe metadata from the URL/domain.`;
      }
      
      let searchContext = '';
      if (searchQuery) {
        searchContext = `\n\nFocus Area: Prioritize news related to: ${searchQuery}`;
      }

      const targetTopicContext = targetTopic ? `\n\nTarget topic to check first:
- id:${targetTopic.id}
- title:"${targetTopic.title || ''}"
- date:${targetTopic.date || ''}
- place:${[targetTopic.region, targetTopic.country].filter(Boolean).join(', ') || 'Global'}
- current summary:${targetTopic.summary || ''}

If you find relevant news, mark candidates as updates to this target topic by setting isUpdate true, originalTopicId "${targetTopic.id}", and originalTitle "${targetTopic.title || ''}". Return 1-2 strong candidates maximum for this target topic.` : '';
      
      // Build list of existing topics to check for updates
      this.newsUpdateContext = { searchQuery, urlSource, existingPoints, targetTopic };

      const topicCandidates = [
        ...(targetTopic ? [targetTopic] : []),
        ...existingPoints.filter(p => {
          const daysSince = (Date.now() - new Date(p.date).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 7; // Check topics from last 7 days
        })
      ].filter((point, index, all) => (
        point && all.findIndex(candidate => String(candidate.id) === String(point.id)) === index
      ));

      const recentTopics = topicCandidates
        .map(p => `- id:${p.id} "${p.title}" (${p.date})`)
        .slice(0, 10) // Limit to 10 most recent
        .join('\n');
      
      const prompt = `Generate a brief daily news summary for ${today} across these categories:
${this.layers.map(l => `- ${l.name} (${l.icon})`).join('\n')}
${searchContext}
${targetTopicContext}
${urlContext}

For each category with relevant news:
1. Provide ${targetTopic ? '1-2 focused update candidates for the target topic' : '1-2 concise news items'}
2. Each item should be 1-2 sentences max
3. Focus on the most important/impactful stories
4. Include location and basic context
5. For each item, suggest a relevant web image search query
6. Include a sourceName and sourceUrl when possible
7. If an item updates an existing topic, set isUpdate true and include originalTopicId and originalTitle

Recent existing topics to merge against:
${recentTopics || '- None'}

Format your response as JSON with this structure:
{
  "layers": [
    {
      "id": "layer_id",
      "items": [
        {
          "title": "Brief headline",
          "summary": "1-2 sentence summary",
          "location": "City, Country",
          "source": "Source type",
          "sourceName": "Publisher or source name",
          "sourceUrl": "https://source.example/article",
          "imageQuery": "descriptive image search query",
          "isUpdate": false,
          "originalTopicId": "",
          "originalTitle": ""
        }
      ]
    }
  ]
}

Skip categories with no significant news. Return ONLY the JSON, no other text.`;

      const completion = await Promise.race([
        window.ourEarthAI.createChatCompletion({
          messages: [
            {
              role: "system",
              content: "You are a news aggregator. Generate concise, factual daily news summaries in JSON format."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          json: true
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI update check timed out.')), 30000);
        })
      ]);

      const newsData = JSON.parse(completion.content);
      this.renderNewsResults(newsData, existingPoints);

    } catch (error) {
      console.error('Error fetching news:', error);
      const newsContent = document.getElementById('news-update-content');
      if (newsContent) {
        newsContent.innerHTML = `
          <div class="research-output-content error">
            ${this.escapeHtml(this.getActionErrorMessage(error, 'Update check'))}
          </div>
        `;
      }
    } finally {
      this.newsUpdateRunning = false;
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = originalButtonHTML || 'Find recent updates';
      }
    }
  }

  async renderNewsResults(newsData, existingPoints = []) {
    const newsContent = document.getElementById('news-update-content');
    if (!newsContent) return;

    const layersWithNews = this.normalizeNewsData(newsData, existingPoints);
    if (layersWithNews.length === 0) {
      newsContent.innerHTML = `
        <div class="research-output-content">
          No update candidates found. Try a narrower topic, add a source link, or add evidence from the topic.
        </div>
      `;
      return;
    }
    
    newsContent.innerHTML = `
      <div class="news-update-results">
        ${layersWithNews.map(layerData => {
          const layer = this.layers.find(l => l.id === layerData.id);
          if (!layer) return '';
          
          return `
            <div class="news-layer-section expanded" data-layer-id="${layer.id}">
              <div class="news-layer-header" data-action="toggle-layer-news">
                <div class="news-layer-icon">${layer.icon}</div>
                <div class="news-layer-name">${layer.name}</div>
                <div class="news-layer-count">${layerData.items.length} items</div>
                <div class="news-layer-expand">&#9662;</div>
              </div>
              <div class="news-layer-items">
                ${layerData.items.map((item, index) => `
                  <div class="news-summary-item ${item.isUpdate ? 'has-update' : ''}" data-image-query="${this.escapeHtml(item.imageQuery || '')}">
                    ${item.isUpdate ? '<div class="update-badge">UPDATE</div>' : ''}
                    <div class="news-item-image-container" id="news-image-${layer.id}-${index}">
                      ${this.renderNewsMediaPreview(item, layer.id, index)}
                    </div>
                    ${this.renderSourceToken(item)}
                    <div class="news-summary-title">${this.escapeHtml(item.title)}</div>
                    ${item.isUpdate && item.originalTitle ? `<div class="update-reference">Update to: "${this.escapeHtml(item.originalTitle)}"</div>` : ''}
                    <div class="news-summary-text">${this.escapeHtml(item.summary)}</div>
                    <div class="news-summary-meta">
                      <div class="news-summary-source">Source: ${this.escapeHtml(item.location || 'Unknown')} - ${this.escapeHtml(item.sourceName || item.source || 'Unspecified')}</div>
                      <div class="news-topic-actions">
                        <button class="news-add-topic-btn ${item.isUpdate ? 'is-update' : ''}" data-action="add-from-news" data-layer-id="${layer.id}" data-item-index="${index}">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 1V11M1 6H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                          </svg>
                          ${item.isUpdate ? 'Review update' : 'Review topic'}
                        </button>
                        <button class="news-save-topic-btn" data-action="save-news-topic" data-layer-id="${layer.id}" data-item-index="${index}">
                          Save without editing
                        </button>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    // Store normalized news data for later use
    this.currentNewsData = { ...newsData, layers: layersWithNews };

    // Add event listeners
    newsContent.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;

      if (action === 'toggle-layer-news') {
        const section = target.closest('.news-layer-section');
        section.classList.toggle('expanded');
      } else if (action === 'add-from-news') {
        const layerId = target.dataset.layerId;
        const itemIndex = parseInt(target.dataset.itemIndex);
        this.addTopicFromNews(layerId, itemIndex);
      } else if (action === 'save-news-topic') {
        const layerId = target.dataset.layerId;
        const itemIndex = parseInt(target.dataset.itemIndex);
        this.saveTopicFromNews(layerId, itemIndex, target);
      }
    });
  }

  normalizeNewsData(newsData, existingPoints = []) {
    const layers = Array.isArray(newsData?.layers) ? newsData.layers : [];

    return layers
      .map(layerData => ({
        ...layerData,
        items: (Array.isArray(layerData.items) ? layerData.items : [])
          .map(item => this.normalizeNewsItem(item, existingPoints))
          .filter(item => item.title && item.summary)
      }))
      .filter(layerData => layerData.items.length > 0);
  }

  normalizeNewsItem(item = {}, existingPoints = []) {
    const originalTopic = item.originalTopicId
      ? existingPoints.find(point => String(point.id) === String(item.originalTopicId))
      : existingPoints.find(point => item.originalTitle && point.title === item.originalTitle)
        || this.newsUpdateTargetTopic
        || null;

    const sourceUrl = item.sourceUrl || this.newsUpdateContext?.urlSource || originalTopic?.sourceUrl || '';
    const sourceHost = this.getHostFromUrl(sourceUrl);
    const sourceName = item.sourceName || item.source || sourceHost || 'Topic source';

    return {
      ...item,
      title: item.title || 'Untitled update',
      summary: item.summary || '',
      location: item.location || originalTopic?.region || originalTopic?.country || 'Unknown',
      source: item.source || sourceName,
      sourceName,
      sourceUrl,
      sourceHost,
      imageQuery: item.imageQuery || [item.title, item.location, sourceHost].filter(Boolean).join(' '),
      isUpdate: Boolean(item.isUpdate || originalTopic),
      originalTopicId: item.originalTopicId || originalTopic?.id || '',
      originalTitle: item.originalTitle || originalTopic?.title || ''
    };
  }

  renderSourceToken(item = {}) {
    const sourceUrl = item.sourceUrl || '';
    const host = item.sourceHost || this.getHostFromUrl(sourceUrl);
    const label = item.sourceName || host || item.source || 'Source';
    const meta = host ? `${host} | topic.earth research` : 'topic.earth research';

    return `
      <div class="source-token">
        <span class="source-token-label">${this.escapeHtml(label)}</span>
        <span class="source-token-watermark">${this.escapeHtml(meta)}</span>
        ${sourceUrl ? `<a class="source-token-link" href="${this.escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source</a>` : ''}
      </div>
    `;
  }

  renderNewsMediaPreview(item = {}, layerId = '', index = 0) {
    const directImage = item.mediaToken?.url
      ? item.mediaToken
      : this.getDirectImageUrl(item.imageUrl || item.sourceUrl || '')
        ? this.createMediaToken({
          url: item.imageUrl || item.sourceUrl,
          sourceUrl: item.sourceUrl || item.imageUrl,
          sourceName: item.sourceName || item.source || this.getHostFromUrl(item.sourceUrl || item.imageUrl)
        })
        : null;

    if (directImage?.url) {
      item.mediaToken = directImage;
      return this.renderMediaTokenImage(directImage, 'news-item-image', item.title || 'News image');
    }

    return `
      <div class="news-image-placeholder media-suggestion-placeholder">
        <span class="media-suggestion-icon">Media</span>
        <span class="media-suggestion-text">${this.escapeHtml(item.imageQuery || 'No media prompt yet')}</span>
        ${item.imageQuery ? `
          <button class="news-generate-media-btn" type="button" data-action="generate-news-media" data-layer-id="${this.escapeHtml(layerId)}" data-item-index="${index}">
            Generate media
          </button>
        ` : ''}
      </div>
    `;
  }

  async generateNewsMedia(button) {
    const layerId = button.dataset.layerId;
    const itemIndex = parseInt(button.dataset.itemIndex);
    if (!this.currentNewsData || !layerId || isNaN(itemIndex)) return;

    const layerData = this.currentNewsData.layers.find(l => l.id === layerId);
    const item = layerData?.items?.[itemIndex];
    if (!item) return;

    const imageContainer = this.container.querySelector(`#news-image-${layerId}-${itemIndex}`);
    const originalText = button.textContent;
    button.textContent = 'Generating...';
    button.disabled = true;

    try {
      const mediaToken = await this.fetchWebImageToken(item.imageQuery, item, { allowGenerated: true });
      if (!mediaToken?.url) throw new Error('No media generated');

      item.mediaToken = mediaToken;
      if (imageContainer) {
        imageContainer.innerHTML = this.renderMediaTokenImage(mediaToken, 'news-item-image', item.title || 'News image');
      }
    } catch (error) {
      console.error('Could not generate news media:', error);
      button.textContent = originalText;
      button.disabled = false;
      alert(this.getActionErrorMessage(error, 'Update media generation'));
    }
  }

  async addTopicFromNews(layerId, itemIndex) {
    const draft = await this.buildNewsTopicDraft(layerId, itemIndex);
    if (!draft) return;

    this.applyTopicDraft(draft, { tab: 'describe' });
  }

  async saveTopicFromNews(layerId, itemIndex, button = null) {
    const originalText = button?.textContent;
    if (button) {
      button.textContent = 'Saving...';
      button.disabled = true;
    }

    try {
      const draft = await this.buildNewsTopicDraft(layerId, itemIndex);
      if (!draft) throw new Error('News item not found');

      const topic = this.topicFromDraft(draft);
      if (this.callbacks.onTopicCreate) {
        this.callbacks.onTopicCreate(topic);
      }

      if (button) {
        button.textContent = 'Saved';
        setTimeout(() => {
          button.textContent = originalText || 'Save without editing';
          button.disabled = false;
        }, 1800);
      }
    } catch (error) {
      console.error('Failed to save news topic:', error);
      alert('Could not save this update as a local draft. Try reviewing it first.');
      if (button) {
        button.textContent = originalText || 'Save without editing';
        button.disabled = false;
      }
    }
  }

  async buildNewsTopicDraft(layerId, itemIndex) {
    if (!this.currentNewsData) return null;

    const layerData = this.currentNewsData.layers.find(l => l.id === layerId);
    if (!layerData || !layerData.items[itemIndex]) return null;

    const item = layerData.items[itemIndex];
    const today = new Date().toISOString().split('T')[0];
    const locationParts = (item.location || '').split(',').map(s => s.trim()).filter(Boolean);
    const region = locationParts[0] || '';
    const country = locationParts.slice(1).join(', ') || locationParts[0] || '';
    const mediaToken = await this.ensureNewsItemMediaToken(item);
    const mediaTokens = mediaToken ? [mediaToken] : [];
    const source = this.sourceFromNewsItem(item, mediaToken);

    return {
      formState: {
        title: item.title,
        category: layerId,
        date: today,
        country,
        region,
        summary: item.summary,
        source: source.name,
        lat: '',
        lon: '',
        insight: item.isUpdate && item.originalTitle ? `Update to: ${item.originalTitle}` : ''
      },
      currentPoint: {
        media: mediaTokens.map(token => token.url),
        mediaTokens,
        sourceUrl: item.sourceUrl || '',
        originalTopicId: item.originalTopicId || '',
        originalTitle: item.originalTitle || ''
      },
      topicSources: source.url ? [source] : [],
      researchSettings: {
        sources: new Set(['official', 'scientific', 'media']),
        trustedOnly: true,
        researchMode: 'post-draft',
        geographicScope: 'regional',
        timeScope: 'today',
        outputIntent: 'social-post'
      }
    };
  }

  applyTopicDraft(draft, options = {}) {
    this.mode = 'create-topic';
    this.editingTopicId = null;
    this.topicBuilderTab = this.normalizeTopicBuilderTab(options.tab || 'describe');
    this.topicFormState = draft.formState;
    this.currentPoint = draft.currentPoint;
    this.topicResearchSettings = draft.researchSettings;
    this.topicSources = draft.topicSources;
    this.setTopicDraftStatus({
      state: 'unsaved',
      source: options.source || 'update-candidate',
      title: draft.formState?.title || 'Update draft',
      message: 'Review this candidate before recording it. Nothing is saved until you save it on this device.',
      originalTitle: draft.currentPoint?.originalTitle || ''
    });
    this.renderCreateTopic();
    this.container.classList.remove('hidden');
    this.updateTopicNavigation();
    this.emitTutorialEvent('topicComposerOpened', { source: options.source || 'update-candidate' }, 80);
  }

  buildTopicWorkflowMetadata(existingTopic = {}, options = {}) {
    const now = options.now || new Date().toISOString();
    const existingReview = existingTopic.review && typeof existingTopic.review === 'object'
      ? existingTopic.review
      : {};
    const existingStorage = existingTopic.storage && typeof existingTopic.storage === 'object'
      ? existingTopic.storage
      : {};

    return {
      topicStatus: options.status || existingTopic.topicStatus || 'browser-draft',
      review: {
        ...existingReview,
        needsHumanReview: options.needsHumanReview ?? (existingReview.needsHumanReview !== false),
        stage: options.reviewStage || existingReview.stage || 'browser-draft',
        requestedBy: options.requestedBy || existingReview.requestedBy || 'browser-user',
        adminNotes: options.adminNotes ?? (existingReview.adminNotes || ''),
        userMessage: options.userMessage ?? (existingReview.userMessage || ''),
        missing: Array.isArray(options.missing)
          ? options.missing
          : (Array.isArray(existingReview.missing) ? existingReview.missing : [])
      },
      storage: {
        ...existingStorage,
        origin: options.storageOrigin || existingStorage.origin || 'browser-localStorage',
        savedAt: now,
        downloadedAt: existingStorage.downloadedAt || '',
        submittedAt: existingStorage.submittedAt || '',
        publishedAt: existingStorage.publishedAt || ''
      }
    };
  }

  topicFromDraft(draft) {
    const formState = draft.formState;
    const mediaTokens = draft.currentPoint.mediaTokens || [];

    return {
      id: Date.now(),
      title: formState.title,
      category: formState.category,
      date: formState.date,
      country: formState.country || 'Unknown',
      region: formState.region || 'Unknown',
      lat: 48.8566,
      lon: 2.3522,
      summary: formState.summary,
      source: formState.source || 'News Update',
      sourceUrl: draft.currentPoint.sourceUrl || '',
      insight: formState.insight || '',
      media: mediaTokens.map(token => token.url),
      mediaTokens,
      regionalState: draft.currentPoint.regionalState || null,
      isCustom: true,
      originalTopicId: draft.currentPoint.originalTopicId || '',
      originalTitle: draft.currentPoint.originalTitle || '',
      ...this.buildTopicWorkflowMetadata(draft.currentPoint || {}, { status: 'browser-draft' }),
      researchSettings: {
        sources: Array.from(draft.researchSettings.sources || []),
        trustedOnly: draft.researchSettings.trustedOnly,
        researchMode: draft.researchSettings.researchMode,
        geographicScope: draft.researchSettings.geographicScope,
        timeScope: draft.researchSettings.timeScope,
        outputIntent: draft.researchSettings.outputIntent
      },
      researchSources: draft.topicSources || []
    };
  }

  sourceFromNewsItem(item = {}, mediaToken = null) {
    const sourceUrl = item.sourceUrl || mediaToken?.sourceUrl || '';
    const host = this.getHostFromUrl(sourceUrl);

    return {
      name: item.sourceName || item.source || host || 'News source',
      url: sourceUrl,
      category: 'media',
      reliability: 'medium',
      verified: Boolean(sourceUrl),
      mediaTokenId: mediaToken?.id || ''
    };
  }

  async ensureNewsItemMediaToken(item = {}) {
    if (item.mediaToken?.url) return item.mediaToken;
    if (!item.imageQuery && !item.sourceUrl) return null;

    item.mediaToken = await this.fetchWebImageToken(item.imageQuery || item.title, item);
    return item.mediaToken;
  }

  async fetchWebImage(query) {
    const token = await this.fetchWebImageToken(query);
    return token?.url || null;
  }

  async fetchWebImageToken(query, source = {}, options = {}) {
    const sourceUrl = source.sourceUrl || source.url || '';
    const sourceName = source.sourceName || source.name || source.source || this.getHostFromUrl(sourceUrl) || 'AI media source';
    const directImageUrl = this.getDirectImageUrl(sourceUrl);
    let imageUrl = source.imageUrl || directImageUrl;
    let generated = false;
    let provider = 'source-url';

    if (!imageUrl && sourceUrl && this.canFetchSourcePageMetadata(sourceUrl)) {
      imageUrl = await this.fetchSourcePageImage(sourceUrl);
      if (imageUrl) provider = 'source-page-meta';
    }

    if (!imageUrl && options.allowGenerated) {
      try {
        const host = this.getHostFromUrl(sourceUrl);
        const prompt = `${query || source.title || 'news topic'} - professional news image, realistic, editorial style, source context ${host || sourceName}`;
        const result = await window.ourEarthAI.generateImage({
          prompt,
          aspect_ratio: '16:9'
        });
        imageUrl = result.url;
        generated = true;
        provider = result.provider || 'ai-generated';
      } catch (error) {
        console.error('Image generation error:', error);
        return null;
      }
    }

    if (!imageUrl) return null;

    return this.createMediaToken({
      url: imageUrl,
      sourceUrl,
      sourceName,
      query,
      generated,
      provider
    });
  }

  async fetchSourcePageImage(sourceUrl = '') {
    try {
      const response = await fetch(sourceUrl, { mode: 'cors' });
      if (!response.ok) return '';

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const selector = [
        'meta[property="og:image"]',
        'meta[name="og:image"]',
        'meta[name="twitter:image"]',
        'meta[property="twitter:image"]',
        'link[rel="image_src"]',
        'img'
      ].join(',');
      const node = doc.querySelector(selector);
      const raw = node?.getAttribute('content') || node?.getAttribute('href') || node?.getAttribute('src') || '';
      if (!raw) return '';

      return new URL(raw, sourceUrl).href;
    } catch (error) {
      console.warn('[Media] Could not read image metadata from source page:', error);
      return '';
    }
  }

  showCreateTopic() {
    if (!this.isAdminMode()) {
      this.blockUserMutation('open the manual +Topic builder');
      return;
    }

    this.mode = 'create-topic';
    this.setCompactMode(false);
    this.editingTopicId = null;
    this.topicBuilderTab = 'describe'; // Track active tab
    this.topicFormState = {}; // Store form values
    this.currentPoint = { media: [], mediaTokens: [] };
    this.topicBuilderContext = null;
    this.topicSources = [];
    this.showSourceEditor = false;
    this.setTopicDraftStatus({
      state: 'unsaved',
      source: 'new-topic',
      title: 'New topic draft',
      message: 'Start with a simple description. Add evidence when useful, then save it on this device.'
    });
    this.topicResearchSettings = {
      sources: new Set(['official', 'scientific', 'media']),
      trustedOnly: true,
      researchMode: 'post-draft',
      geographicScope: 'regional',
      timeScope: 'recent',
      outputIntent: 'social-post'
    };
    this.renderCreateTopic();
    this.container.classList.remove('hidden');
    this.updateTopicNavigation();
    this.emitTutorialEvent('topicComposerOpened', { source: 'manual-topic' }, 80);
  }

  showRegionalProposal(options = {}) {
    const regionalContext = options.regionalContext || this.getRegionalProposalContext() || {};
    const defaultLayerId = this.getRegionalProposalDefaultLayerId(options.defaultLayerId);
    const lat = Number(regionalContext.lat);
    const lon = Number(regionalContext.lon);
    const locationPrecision = String(regionalContext.precision || regionalContext.scope || '');
    const regionalLabel = this.getRegionalProposalContextLabel(regionalContext);
    const today = new Date().toISOString().split('T')[0];

    this.mode = 'create-topic';
    this.editingTopicId = null;
    this.topicBuilderTab = 'describe';
    this.topicBuilderContext = {
      type: 'regional-proposal',
      regionalContext: {
        ...regionalContext,
        label: regionalLabel || regionalContext.label || ''
      },
      defaultLayerId
    };
    this.currentPoint = {
      media: [],
      mediaTokens: [],
      country: regionalContext.country || '',
      region: regionalContext.region || regionalContext.city || '',
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      locationPrecision,
      topicStatus: 'proposal-local',
      review: {
        stage: 'regional-proposal',
        requestedBy: 'regional-user',
        userMessage: ''
      },
      storage: {
        origin: 'browser-localStorage'
      },
      storageMeta: {
        workflow: 'regional-proposal',
        regionalLabel,
        mapPrecision: locationPrecision,
        mapZoom: regionalContext.zoom || ''
      }
    };
    this.topicFormState = {
      title: '',
      category: defaultLayerId,
      date: today,
      country: regionalContext.country || '',
      region: regionalContext.region || regionalContext.city || '',
      lat: Number.isFinite(lat) ? lat.toFixed(4) : '',
      lon: Number.isFinite(lon) ? lon.toFixed(4) : '',
      summary: '',
      source: 'Regional Proposal',
      insight: '',
      searchHint: '',
      locationPrecision,
      regionalLabel
    };
    this.topicSources = [];
    this.showSourceEditor = false;
    this.setTopicDraftStatus({
      state: 'unsaved',
      source: 'regional-proposal',
      title: regionalLabel ? `Regional proposal for ${regionalLabel}` : 'Regional proposal',
      message: regionalLabel
        ? `Describe a local action around ${regionalLabel}. Save it on this device, then prepare it for review when ready.`
        : 'Describe a nearby initiative, need, or question. Save it on this device before sharing it later.'
    });
    this.topicResearchSettings = {
      sources: new Set(['official', 'scientific', 'media']),
      trustedOnly: true,
      researchMode: 'post-draft',
      geographicScope: 'regional',
      timeScope: 'recent',
      outputIntent: 'social-post'
    };
    this.autoSetupForLayer(defaultLayerId);
    this.renderCreateTopic();
    this.container.classList.remove('hidden');
    this.updateTopicNavigation();
    this.emitTutorialEvent('topicComposerOpened', { source: 'regional-proposal' }, 80);

    if (Number.isFinite(lat) && Number.isFinite(lon) && this.callbacks.onShow) {
      this.callbacks.onShow({ lat, lon });
    }
  }

  showSourceSearchTopic() {
    this.mode = 'create-topic';
    this.editingTopicId = null;
    this.topicBuilderTab = 'evidence';
    this.topicFormState = {};
    this.currentPoint = { media: [], mediaTokens: [] };
    this.topicBuilderContext = null;
    this.topicSources = [];
    this.showSourceEditor = true;
    this.setTopicDraftStatus({
      state: 'unsaved',
      source: 'source-search',
      title: 'New source search',
      message: 'Add evidence first, then complete the description and save it on this device when it becomes a topic.'
    });
    this.topicResearchSettings = {
      sources: new Set(['official', 'scientific', 'media']),
      trustedOnly: true,
      researchMode: 'research-brief',
      geographicScope: 'regional',
      timeScope: 'recent',
      outputIntent: 'brief'
    };
    this.renderCreateTopic();
    this.container.classList.remove('hidden');
    this.updateTopicNavigation();
    this.emitTutorialEvent('topicComposerOpened', { source: 'source-search' }, 80);
  }

  manageSources() {
    if (!this.currentPoint) return;
    if (!this.canManageCurrentTopicSources()) {
      this.blockUserMutation('manage sources and media');
      return;
    }
    
    // Switch to research mode and open source editor
    this.editTopic();
    
    // After render, switch to research tab and open source editor
    setTimeout(() => {
      this.topicBuilderTab = 'evidence';
      this.showSourceEditor = true;
      this.renderCreateTopic();
      this.emitTutorialEvent('topicComposerTabChanged', { tab: 'evidence', source: 'manage-sources' }, 60);
    }, 100);
  }

  editTopic() {
    if (!this.currentPoint) return;
    if (!this.canModifyCurrentTopic()) {
      this.blockUserMutation('edit or update posts');
      return;
    }

    const canUpdateOriginal = Boolean(
      this.currentPoint.isCustom ||
      this.currentPoint.isFeverWarning ||
      this.currentPoint.isTippingPoint
    );
    const isRegionalProposal = this.isRegionalProposalTopic(this.currentPoint);
    const originalPoint = this.currentPoint;

    if (!canUpdateOriginal) {
      this.currentPoint = {
        ...originalPoint,
        id: `draft_${Date.now()}`,
        originalTopicId: originalPoint.id,
        originalTitle: originalPoint.title,
        isCustom: true,
        media: this.getMediaTokensForPoint(originalPoint).map(token => token.url),
        mediaTokens: this.getMediaTokensForPoint(originalPoint)
      };
      this.topicBuilderContext = null;
      this.setTopicDraftStatus({
        state: 'unsaved',
        source: 'draft-copy',
        title: originalPoint.title || 'Existing topic draft copy',
        message: 'This protects the original app topic. Saving on this device records your editable local copy.',
        originalTitle: originalPoint.title || ''
      });
    } else if (isRegionalProposal) {
      this.topicBuilderContext = {
        type: 'regional-proposal',
        regionalContext: this.getRegionalProposalContext(originalPoint) || {},
        defaultLayerId: originalPoint.category || this.getRegionalProposalDefaultLayerId()
      };
      this.setTopicDraftStatus({
        state: 'editing',
        source: 'regional-proposal',
        title: originalPoint.title || 'Regional proposal',
        message: 'Saved locally on this device. Refine the AI focus, sources, and location before sharing it for review later.'
      });
    } else {
      this.topicBuilderContext = null;
      this.setTopicDraftStatus({
        state: 'editing',
        source: 'saved-topic',
        title: originalPoint.title || 'Saved topic',
        message: 'Changes here update the existing saved topic when you click Update Saved Topic.'
      });
    }
    
    this.mode = 'create-topic';
    this.editingTopicId = canUpdateOriginal ? this.currentPoint.id : null;
    this.topicBuilderTab = isRegionalProposal ? 'describe' : 'evidence';
    
    // Load existing sources
    this.topicSources = this.currentPoint.researchSources || [];
    this.showSourceEditor = true;
    
    // Pre-populate form with existing topic data
    this.topicFormState = {
      title: this.currentPoint.title || '',
      category: this.currentPoint.category || '',
      date: this.currentPoint.date || '',
      country: this.currentPoint.country || '',
      region: this.currentPoint.region || '',
      lat: this.currentPoint.lat || '',
      lon: this.currentPoint.lon || '',
      summary: this.currentPoint.summary || '',
      source: this.currentPoint.source || '',
      insight: this.currentPoint.insight || '',
      topicStory: this.normalizeTopicStory(this.currentPoint.topicStory),
      searchHint: this.currentPoint.review?.userMessage || '',
      locationPrecision: this.currentPoint.locationPrecision || this.currentPoint.storageMeta?.mapPrecision || '',
      regionalLabel: this.currentPoint.storageMeta?.regionalLabel || this.getRegionalProposalContextLabel(this.topicBuilderContext?.regionalContext || {})
    };
    
    // Load research settings if available
    if (this.currentPoint.researchSettings) {
      this.topicResearchSettings = {
        sources: new Set(this.currentPoint.researchSettings.sources || ['official', 'scientific', 'media']),
        trustedOnly: this.currentPoint.researchSettings.trustedOnly !== undefined ? this.currentPoint.researchSettings.trustedOnly : true,
        researchMode: this.currentPoint.researchSettings.researchMode || 'post-draft',
        geographicScope: this.currentPoint.researchSettings.geographicScope || 'regional',
        timeScope: this.currentPoint.researchSettings.timeScope || 'recent',
        outputIntent: this.currentPoint.researchSettings.outputIntent || 'social-post'
      };
      
      // Store in form state as well
      this.topicFormState.geographicScope = this.topicResearchSettings.geographicScope;
      this.topicFormState.timeScope = this.topicResearchSettings.timeScope;
      this.topicFormState.outputIntent = this.topicResearchSettings.outputIntent;
      this.topicFormState.trustedOnly = this.topicResearchSettings.trustedOnly;
    } else {
      // Initialize with defaults if no research settings exist
      this.topicResearchSettings = {
        sources: new Set(['official', 'scientific', 'media']),
        trustedOnly: true,
        researchMode: 'post-draft',
        geographicScope: 'regional',
        timeScope: 'recent',
        outputIntent: 'social-post'
      };
    }
    
    this.renderCreateTopic();
    this.emitTutorialEvent('topicComposerOpened', { source: isRegionalProposal ? 'regional-proposal-edit' : 'topic-edit' }, 80);
  }

  saveFormState() {
    const form = this.container.querySelector('#topic-form');
    if (!form) return;

    const preserveWhenHidden = this.topicBuilderTab !== 'describe';
    const readDraftField = (selector, key) => {
      const field = form.querySelector(selector);
      if (!field) return this.topicFormState[key] || '';
      const value = field.value ?? '';
      if (preserveWhenHidden && !String(value).trim() && String(this.topicFormState[key] || '').trim()) {
        return this.topicFormState[key];
      }
      return value;
    };
    
    // Save all form values
    this.topicFormState = {
      title: readDraftField('#topic-title', 'title'),
      category: readDraftField('#topic-category', 'category'),
      date: readDraftField('#topic-date', 'date'),
      country: readDraftField('#topic-country', 'country'),
      region: readDraftField('#topic-region', 'region'),
      lat: readDraftField('#topic-lat', 'lat'),
      lon: readDraftField('#topic-lon', 'lon'),
      summary: readDraftField('#topic-summary', 'summary'),
      source: readDraftField('#topic-source', 'source'),
      insight: readDraftField('#topic-insight', 'insight'),
      topicStory: this.readTopicStoryForm(form),
      searchHint: readDraftField('#topic-search-hint', 'searchHint') || this.topicFormState.searchHint || '',
      locationPrecision: this.topicFormState.locationPrecision || this.currentPoint?.locationPrecision || this.topicBuilderContext?.regionalContext?.precision || this.topicBuilderContext?.regionalContext?.scope || '',
      regionalLabel: this.topicFormState.regionalLabel || this.getRegionalProposalContextLabel(this.topicBuilderContext?.regionalContext || {}) || this.currentPoint?.storageMeta?.regionalLabel || '',
      geographicScope: form.querySelector('#geographic-scope')?.value || this.topicResearchSettings.geographicScope,
      timeScope: form.querySelector('#time-scope')?.value || this.topicResearchSettings.timeScope,
      outputIntent: form.querySelector('#output-intent')?.value || this.topicResearchSettings.outputIntent,
      trustedOnly: form.querySelector('#trusted-only')?.checked ?? this.topicResearchSettings.trustedOnly
    };
    this.composerSmartInput = form.querySelector('#topic-smart-input')?.value || this.composerSmartInput || '';
    this.topicStoryDraft = this.topicFormState.topicStory;
  }

  normalizeTopicBuilderTab(tab = '') {
    const aliases = {
      basics: 'describe',
      research: 'evidence',
      manage: 'evidence',
      live: 'story',
      html: 'story'
    };
    const normalized = aliases[tab] || tab || 'describe';
    return ['describe', 'evidence', 'story', 'review'].includes(normalized) ? normalized : 'describe';
  }

  normalizeTopicStory(story = null) {
    const source = story && typeof story === 'object' ? story : {};
    const html = String(source.html || '').trim();
    return {
      enabled: Boolean(source.enabled || html),
      title: String(source.title || '').trim(),
      style: String(source.style || 'story-card').trim() || 'story-card',
      audience: String(source.audience || 'general').trim() || 'general',
      under16Only: Boolean(source.under16Only),
      html,
      sanitizedHtml: String(source.sanitizedHtml || '').trim(),
      structuredStory: source.structuredStory && typeof source.structuredStory === 'object' ? source.structuredStory : null,
      createdAt: source.createdAt || '',
      updatedAt: source.updatedAt || ''
    };
  }

  readTopicStoryForm(form) {
    const previous = this.normalizeTopicStory(this.topicFormState.topicStory || this.topicStoryDraft);
    const html = form.querySelector('#topic-story-html')?.value ?? previous.html;
    const story = {
      ...previous,
      enabled: form.querySelector('#topic-story-enabled')?.checked ?? previous.enabled,
      title: form.querySelector('#topic-story-title')?.value ?? previous.title,
      style: form.querySelector('#topic-story-style')?.value ?? previous.style,
      audience: form.querySelector('#topic-story-audience')?.value ?? previous.audience,
      under16Only: form.querySelector('#topic-story-under16')?.checked ?? previous.under16Only,
      html,
      structuredStory: previous.structuredStory || null
    };
    story.enabled = Boolean(story.enabled || String(story.html || '').trim());
    story.sanitizedHtml = this.sanitizeStoryHtml(story.html);
    story.updatedAt = story.enabled ? new Date().toISOString() : previous.updatedAt;
    if (story.enabled && !story.createdAt) story.createdAt = story.updatedAt;
    return story;
  }

  sanitizeStoryHtml(html = '') {
    const raw = String(html || '').trim();
    if (!raw) return '';

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<body>${raw}</body>`, 'text/html');
      doc.querySelectorAll('script, iframe, object, embed, form, input, button, link[rel="import"]').forEach(node => node.remove());
      doc.querySelectorAll('*').forEach((node) => {
        Array.from(node.attributes || []).forEach((attr) => {
          const name = attr.name.toLowerCase();
          const value = String(attr.value || '').trim();
          if (name.startsWith('on') || name === 'srcdoc') {
            node.removeAttribute(attr.name);
          } else if ((name === 'href' || name === 'src' || name === 'xlink:href') && /^javascript:/i.test(value)) {
            node.removeAttribute(attr.name);
          }
        });
      });
      return doc.body.innerHTML.trim();
    } catch (error) {
      console.warn('[Topic Story] Sanitizer fell back to text escaping:', error);
      return `<pre>${this.escapeHtml(raw)}</pre>`;
    }
  }

  wrapTopicStoryHtml(html = '', story = {}) {
    const body = this.sanitizeStoryHtml(html || story.html || '');
    const title = story.title || this.topicFormState.title || 'topic.earth story';
    const language = this.getTopicStoryLanguageContext();
    if (!body) return '';
    return `<!doctype html>
<html lang="${this.escapeHtml(language.code || 'en')}" dir="${this.escapeHtml(language.direction || 'ltr')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${this.escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; padding: 18px; background: #07111f; color: #eef8ff; }
    img, svg, video { max-width: 100%; height: auto; }
    a { color: #00d4ff; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
  }

  getTopicStoryAudienceProfiles() {
    return {
      general: {
        label: 'General',
        ageRange: 'mixed audience',
        vocabulary: 'plain public vocabulary',
        guidance: 'Clear, factual, calm, and suitable for a broad public audience.',
        under16: false
      },
      'kid-6-8': {
        label: '6-8',
        ageRange: '6 to 8 years old',
        vocabulary: 'very simple words, one idea per section',
        guidance: 'Friendly and reassuring. Avoid frightening climate framing, doom language, and complex systems language. Include one tiny check question.',
        under16: true
      },
      'kid-9-12': {
        label: '9-12',
        ageRange: '9 to 12 years old',
        vocabulary: 'simple cause and effect vocabulary',
        guidance: 'Explain cause and effect, keep risk honest but not scary, and include one local action or observation question.',
        under16: true
      },
      teen: {
        label: 'Teen',
        ageRange: '13 to 16 years old',
        vocabulary: 'teen-friendly systems vocabulary',
        guidance: 'Use systems thinking, tradeoffs, and evidence links. Keep tone respectful and not childish.',
        under16: true
      },
      'adult-simple': {
        label: 'Adult simple',
        ageRange: 'adult beginner',
        vocabulary: 'clear adult vulgarization',
        guidance: 'Explain plainly without childish tone. Use practical context and evidence.',
        under16: false
      },
      'adult-deep': {
        label: 'Adult deep',
        ageRange: 'adult technical reader',
        vocabulary: 'precise technical vocabulary with short explanations',
        guidance: 'Use source-linked explanation, uncertainty, and an optional technical sidebar.',
        under16: false
      }
    };
  }

  getTopicStoryAudienceProfile(audience = 'general', under16Only = false) {
    const profiles = this.getTopicStoryAudienceProfiles();
    const profile = profiles[audience] || profiles.general;
    if (!under16Only) return profile;

    return {
      ...profile,
      label: profile.under16 ? profile.label : `${profile.label} (<16 safe)`,
      under16: true,
      guidance: `${profile.guidance} Apply the under-16 safety filter: no frightening imagery, no manipulative calls to action, no adult technical overload, short exercise, adult-review friendly wording.`
    };
  }

  renderTopicStoryEditor() {
    const story = this.normalizeTopicStory(this.topicFormState.topicStory || this.topicStoryDraft);
    const previewHtml = this.wrapTopicStoryHtml(story.sanitizedHtml || story.html, story);
    const hasStory = Boolean(String(story.html || '').trim());
    const storyTypeOptions = [
      ['story-card', this.t('topic.story.storyCard')],
      ['educational-scene', this.t('topic.story.educationalScene')],
      ['interactive-croquis', this.t('topic.story.interactiveCroquis')],
      ['micro-game', this.t('topic.story.microGame')],
      ['external-widget', this.t('topic.story.externalWidget')]
    ];
    const audienceProfiles = this.getTopicStoryAudienceProfiles();
    const audienceOptions = Object.entries(audienceProfiles);
    const presetButtons = [
      { label: '6-8', preset: 'kid-6-8', title: 'Generate a reassuring first lesson' },
      { label: '9-12', preset: 'kid-9-12', title: 'Generate a short cause/effect lesson' },
      { label: 'Teen', preset: 'teen', title: 'Generate a systems-thinking card' },
      { label: 'Adult', preset: 'adult-simple', title: 'Generate a clear adult card' }
    ];
    const manifest = {
      bridge: true,
      bridgeVersion: 'topic-story-1',
      origin: 'topic.earth',
      style: story.style,
      audience: story.audience,
      under16Only: story.under16Only,
      title: story.title || this.topicFormState.title || '',
      limits: {
        allowScripts: false,
        sandbox: 'no-scripts'
      }
    };

    return `
      <div class="topic-story-editor" data-tutorial-id="topic-story-editor">
        <div class="topic-story-header">
          <div>
            <div class="section-label">${this.escapeHtml(this.t('topic.story.embeddedHtmlStory'))}</div>
            <div class="setting-hint">${this.escapeHtml(this.t('topic.story.pasteHelp'))}</div>
          </div>
          <label class="topic-story-toggle">
            <input type="checkbox" id="topic-story-enabled" ${story.enabled ? 'checked' : ''}>
            <span>${this.escapeHtml(this.t('topic.story.attach'))}</span>
          </label>
        </div>

        <div class="topic-story-grid">
          <label>
            <span>${this.escapeHtml(this.t('topic.story.storyTitle'))}</span>
            <input type="text" id="topic-story-title" value="${this.escapeHtml(story.title || '')}" placeholder="${this.escapeHtml(this.t('topic.story.titlePlaceholder'))}">
          </label>
          <label>
            <span>${this.escapeHtml(this.t('topic.story.type'))}</span>
            <select id="topic-story-style">
              ${storyTypeOptions.map(([value, label]) => `<option value="${value}" ${story.style === value ? 'selected' : ''}>${this.escapeHtml(label)}</option>`).join('')}
            </select>
          </label>
          <label>
            <span>Age profile</span>
            <select id="topic-story-audience">
              ${audienceOptions.map(([value, profile]) => `<option value="${this.escapeHtml(value)}" ${story.audience === value ? 'selected' : ''}>${this.escapeHtml(profile.label)}</option>`).join('')}
            </select>
          </label>
        </div>

        <div class="topic-story-audience-tools">
          <label class="topic-story-toggle topic-story-age-filter">
            <input type="checkbox" id="topic-story-under16" ${story.under16Only ? 'checked' : ''}>
            <span>Filter for &lt;16</span>
          </label>
          <div class="topic-story-preset-actions" aria-label="AI generation presets by age">
            ${presetButtons.map(preset => `
              <button type="button" class="btn-media-action topic-story-preset-btn ${story.audience === preset.preset ? 'active' : ''}" data-action="apply-topic-story-preset" data-preset="${this.escapeHtml(preset.preset)}" title="${this.escapeHtml(preset.title)}">
                ${this.escapeHtml(preset.label)}
              </button>
            `).join('')}
          </div>
        </div>

        <textarea id="topic-story-html" rows="10" spellcheck="false" placeholder="${this.escapeHtml(this.t('topic.story.placeholder'))}">${this.escapeHtml(story.html || '')}</textarea>

        <div class="topic-story-actions">
          <button type="button" class="btn-primary-alt" data-action="preview-topic-story">${this.escapeHtml(this.t('topic.story.preview'))}</button>
          <button type="button" class="btn-media-action" data-action="generate-topic-story">${this.escapeHtml(this.t('topic.story.aiCreate'))}</button>
          <button type="button" class="btn-media-action" data-action="insert-topic-story-starter">${this.escapeHtml(this.t('topic.story.starterHtml'))}</button>
          <button type="button" class="btn-media-action danger" data-action="clear-topic-story" ${hasStory ? '' : 'disabled'}>${this.escapeHtml(this.t('topic.story.clear'))}</button>
        </div>
        <div class="setting-hint topic-story-status" data-topic-story-status>
          ${this.escapeHtml(this.t('topic.story.aiCreateWrites'))}
        </div>

        <div class="topic-story-preview-card">
          <div class="topic-story-preview-header">
            <span>${this.escapeHtml(this.t('topic.story.sandboxPreview'))}</span>
            <span>${this.escapeHtml(hasStory ? this.t('topic.story.scriptsBlocked') : this.t('topic.story.waitingForHtml'))}</span>
          </div>
          ${previewHtml ? `
            <iframe
              class="topic-story-preview-frame"
              sandbox=""
              referrerpolicy="no-referrer"
              srcdoc="${this.escapeHtml(previewHtml)}"
              title="${this.escapeHtml(story.title || 'Topic story preview')}"
            ></iframe>
          ` : `
            <div class="topic-story-empty-preview">${this.escapeHtml(this.t('topic.story.pasteHelp'))}</div>
          `}
        </div>

        <details class="topic-story-manifest">
          <summary>${this.escapeHtml(this.t('topic.story.bridgeJson'))}</summary>
          <pre>${this.escapeHtml(JSON.stringify(manifest, null, 2))}</pre>
        </details>
      </div>
    `;
  }

  previewTopicStory() {
    this.saveFormState();
    this.topicBuilderTab = 'story';
    this.renderCreateTopic();
  }

  async applyTopicStoryPreset(button = null) {
    this.saveFormState();
    const preset = String(button?.dataset?.preset || 'general').trim() || 'general';
    const profiles = this.getTopicStoryAudienceProfiles();
    const profile = profiles[preset] || profiles.general;
    const previous = this.normalizeTopicStory(this.topicFormState.topicStory || this.topicStoryDraft);

    const presetStory = {
      ...previous,
      enabled: true,
      style: profile.under16 ? 'educational-scene' : previous.style || 'story-card',
      audience: preset,
      under16Only: Boolean(profile.under16 || previous.under16Only)
    };
    this.topicFormState.topicStory = presetStory;
    this.topicStoryDraft = this.topicFormState.topicStory;
    await this.generateTopicStoryFromAi(button, { storyOverride: presetStory });
  }

  parseAiJsonObject(content = '', label = 'AI JSON') {
    const text = String(content || '').trim();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch (_error) {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const candidate = fenced?.[1] || text.match(/\{[\s\S]*\}/)?.[0] || '';
      if (!candidate) return {};

      try {
        return JSON.parse(candidate);
      } catch (error) {
        console.warn(`[Topic Story] Could not parse ${label}:`, error);
        return {};
      }
    }
  }

  parseAiJsonArray(content = '', label = 'AI JSON array') {
    const text = String(content || '').trim();
    if (!text) return [];

    const candidates = [text];
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const bracketed = text.match(/\[[\s\S]*\]/);
    if (fenced?.[1]) candidates.push(fenced[1].trim());
    if (bracketed?.[0]) candidates.push(bracketed[0]);

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed?.sources)) return parsed.sources;
      } catch (_error) {
        // Try the next likely JSON candidate.
      }
    }

    console.warn(`[Topic Sources] Could not parse ${label}.`);
    return [];
  }

  extractFirstUrl(value = '') {
    const match = String(value || '').match(/https?:\/\/[^\s<>"'`)\]]+/i);
    return match ? match[0].replace(/[.,;:!?]+$/, '') : '';
  }

  normalizeSuggestedSource(source = {}) {
    const rawName = String(source.name || source.title || source.sourceName || '').trim();
    const rawUrl = [
      source.url,
      source.href,
      source.link,
      source.sourceUrl,
      source.website,
      this.extractFirstUrl(rawName),
      this.extractFirstUrl(source.text),
      this.extractFirstUrl(source.reason)
    ].find(Boolean) || '';
    const url = this.sanitizeUrl(rawUrl);
    if (!url) return null;

    const nameWithoutUrl = rawName
      .replace(/https?:\/\/\S+/i, '')
      .replace(/\s+[-:]\s*$/, '')
      .trim();
    const name = nameWithoutUrl || this.getHostFromUrl(url) || 'Web source';

    return {
      name,
      url,
      category: source.category || 'source',
      reliability: source.reliability || 'medium',
      adminNotes: source.reason || source.note || '',
      verified: false
    };
  }

  mergeSuggestedSources(nextSources = []) {
    const existing = Array.isArray(this.topicSources) ? this.topicSources : [];
    const seen = new Set(existing.map(source => String(source.url || '').trim()).filter(Boolean));
    const merged = [...existing];

    nextSources.forEach(source => {
      if (!source?.url || seen.has(source.url)) return;
      seen.add(source.url);
      merged.push(source);
    });

    this.topicSources = merged;
  }

  getTopicStoryLanguageContext() {
    const currentCode = LanguageManager.normalizeLanguageCode(this.getCurrentLanguage());
    const text = [
      this.topicFormState.title,
      this.topicFormState.summary,
      this.topicFormState.region,
      this.topicFormState.country,
      this.topicFormState.source,
      ...(this.topicSources || []).flatMap(source => [source.name, source.adminNotes])
    ].join(' ').toLowerCase();

    let code = currentCode;
    if (/[\u4e00-\u9fff]/.test(text)) {
      code = 'zh';
    } else if (/[\u0900-\u097f]/.test(text)) {
      code = 'hi';
    } else if (/[\u0370-\u03ff]/.test(text)) {
      code = 'el';
    } else if (/[\u0400-\u04ff]/.test(text)) {
      code = 'ru';
    } else if (/[àâçéèêëîïôùûüÿœæ]/i.test(text) || /\b(fete|fête|commune|animations|gratuites|dimanche|samedi|lundi|balade|tombola)\b/i.test(text)) {
      code = 'fr';
    } else if (/\b(und|oder|mit|stadt|gemeinde|nachrichten)\b/i.test(text)) {
      code = 'de';
    } else if (/\b(en|het|een|gemeente|nieuws)\b/i.test(text)) {
      code = 'nl';
    }

    const info = LanguageManager.getLanguageInfo(code) || LanguageManager.getLanguageInfo(currentCode) || { code: 'en', name: 'English', nativeName: 'English' };
    return {
      code: info.code || code,
      name: info.name || info.nativeName || code,
      nativeName: info.nativeName || info.name || code,
      direction: LanguageManager.getTextDirection(info.code || code)
    };
  }

  buildTopicStoryPrompt() {
    const settings = Settings.get();
    const story = this.normalizeTopicStory(this.topicFormState.topicStory || this.topicStoryDraft);
    const audienceProfile = this.getTopicStoryAudienceProfile(story.audience, story.under16Only);
    const language = this.getTopicStoryLanguageContext();
    const location = [
      this.topicFormState.region,
      this.topicFormState.country
    ].filter(Boolean).join(', ') || settings.regionalDefaultScale || 'current regional setting';
    const sources = (this.topicSources || [])
      .filter(source => source.name || source.url)
      .slice(0, 6)
      .map(source => ({
        name: source.name || this.getHostFromUrl(source.url) || 'source',
        url: source.url || '',
        category: source.category || ''
      }));

    return [
      {
        role: 'system',
        content: [
          'You create safe topic.earth story card data.',
          'Return strict JSON only. Do not return HTML.',
          'The app will render your JSON through a locked template with scripts disabled.',
          'Keep it factual, educational, and evidence-aware. Separate known facts from assumptions.',
          'Prefer a one-screen animated vignette: short title, very short sections, clear program or timeline when available.',
          'If sources include a poster, program image, or image URL, extract visible schedule text when possible and turn it into ordered sections.',
          'Respect the requested age profile exactly. For child or under-16 profiles, avoid frightening framing and any manipulative persuasion.'
        ].join(' ')
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: 'Create one embeddable topic story card.',
          requiredShape: {
            title: 'short title',
            style: 'story-card | educational-scene | interactive-croquis | micro-game',
            audience: 'general | kid-6-8 | kid-9-12 | teen | adult-simple | adult-deep',
            ageRange: 'age range label',
            learningObjective: 'one sentence objective',
            vocabularyLevel: 'short vocabulary note',
            adultReviewRequired: true,
            language: language.code,
            summary: 'one sentence',
            sections: [
              { label: 'Panel 1 label', body: 'plain language body, max 35 words' },
              { label: 'Panel 2 label', body: 'plain language body, max 35 words' },
              { label: 'Panel 3 label', body: 'plain language body, max 35 words' }
            ],
            visualPlan: {
              type: 'animated-vignette',
              caption: 'short caption',
              labels: ['3 to 5 visual labels for the SVG vignette']
            },
            exercise: {
              question: 'optional short check question',
              answer: 'optional answer'
            },
            assumptions: ['short assumption if any'],
            evidenceLinks: sources
          },
          topic: {
            title: this.topicFormState.title || '',
            category: this.topicFormState.category || '',
            date: this.topicFormState.date || '',
            location,
            summary: this.topicFormState.summary || '',
            analysis: this.topicFormState.insight || '',
            sourceNote: this.topicFormState.source || ''
          },
          language: {
            code: language.code,
            name: language.name,
            nativeName: language.nativeName,
            instruction: `Write all visible story text in ${language.nativeName}. Keep official names and place names unchanged when appropriate.`
          },
          layoutPreset: {
            name: 'one-page animated vignette',
            height: 'one viewport when possible',
            interaction: 'horizontal scroll-snap panels; each panel is short enough to read in one stop',
            animation: 'subtle CSS/SVG motion only; no scripts'
          },
          generationPreset: {
            audience: story.audience,
            under16Only: story.under16Only,
            ageRange: audienceProfile.ageRange,
            vocabulary: audienceProfile.vocabulary,
            guidance: audienceProfile.guidance,
            adultReviewRequired: Boolean(audienceProfile.under16 || story.under16Only)
          },
          sources
        }, null, 2)
      }
    ];
  }

  renderTrustedTopicStoryHtml(data = {}) {
    const title = String(data.title || this.topicFormState.title || 'Topic Story').trim();
    const style = String(data.style || this.topicFormState.topicStory?.style || 'story-card').trim();
    const story = this.normalizeTopicStory(this.topicFormState.topicStory || this.topicStoryDraft);
    const audience = String(data.audience || story.audience || 'general').trim();
    const audienceProfile = this.getTopicStoryAudienceProfile(audience, story.under16Only || data.adultReviewRequired);
    const summary = String(data.summary || this.topicFormState.summary || '').trim();
    const language = {
      ...this.getTopicStoryLanguageContext(),
      code: LanguageManager.normalizeLanguageCode(data.language || this.getTopicStoryLanguageContext().code)
    };
    const fixedLabels = {
      en: { live: 'topic.earth live vignette', age: 'Age', review: 'adult review', objective: 'Learning goal', check: 'Quick check', sources: 'Evidence', assumptions: 'Assumptions', next: 'Next' },
      fr: { live: 'vignette vivante topic.earth', age: 'Age', review: 'validation adulte', objective: 'Objectif', check: 'Petite question', sources: 'Sources', assumptions: 'Hypotheses', next: 'Suite' },
      nl: { live: 'topic.earth live vignette', age: 'Leeftijd', review: 'volwassen check', objective: 'Leerdoel', check: 'Korte vraag', sources: 'Bewijs', assumptions: 'Aannames', next: 'Volgende' },
      de: { live: 'topic.earth Live-Vignette', age: 'Alter', review: 'Erwachsenencheck', objective: 'Lernziel', check: 'Kurzfrage', sources: 'Quellen', assumptions: 'Annahmen', next: 'Weiter' },
      el: { live: 'topic.earth live vignette', age: 'Age', review: 'adult review', objective: 'Learning goal', check: 'Quick check', sources: 'Evidence', assumptions: 'Assumptions', next: 'Next' },
      ru: { live: 'topic.earth live vignette', age: 'Age', review: 'adult review', objective: 'Learning goal', check: 'Quick check', sources: 'Evidence', assumptions: 'Assumptions', next: 'Next' },
      uk: { live: 'topic.earth live vignette', age: 'Age', review: 'adult review', objective: 'Learning goal', check: 'Quick check', sources: 'Evidence', assumptions: 'Assumptions', next: 'Next' },
      zh: { live: 'topic.earth live vignette', age: 'Age', review: 'adult review', objective: 'Learning goal', check: 'Quick check', sources: 'Evidence', assumptions: 'Assumptions', next: 'Next' },
      hi: { live: 'topic.earth live vignette', age: 'Age', review: 'adult review', objective: 'Learning goal', check: 'Quick check', sources: 'Evidence', assumptions: 'Assumptions', next: 'Next' }
    };
    const ui = fixedLabels[language.code] || fixedLabels.en;
    const sections = Array.isArray(data.sections) && data.sections.length > 0
      ? data.sections.slice(0, 5)
      : [
        { label: 'Context', body: this.topicFormState.summary || 'Add the core explanation here.' },
        { label: 'Evidence', body: `${(this.topicSources || []).filter(source => source.name || source.url).length} source item(s) attached for review.` },
        { label: 'Next step', body: 'Review, improve, and connect this card to the topic package.' }
      ];
    const labels = Array.isArray(data.visualPlan?.labels) && data.visualPlan.labels.length > 0
      ? data.visualPlan.labels.slice(0, 5)
      : ['signal', 'place', 'evidence', 'action'];
    const color = style === 'educational-scene'
      ? '#9ad99d'
      : style === 'interactive-croquis'
        ? '#ffb020'
        : style === 'micro-game'
          ? '#b99cff'
          : '#00d4ff';
    const caption = data.visualPlan?.caption || 'Topic sketch';
    const evidenceLinks = Array.isArray(data.evidenceLinks) ? data.evidenceLinks.slice(0, 5) : [];
    const assumptions = Array.isArray(data.assumptions) ? data.assumptions.slice(0, 4) : [];
    const navDots = sections.map((section, index) => `
      <a href="#story-panel-${index + 1}" aria-label="${this.escapeHtml(`${ui.next}: ${section.label || index + 1}`)}">${index + 1}</a>
    `).join('');
    const labelRows = labels.map((label, index) => {
      const angle = (index / Math.max(labels.length, 1)) * Math.PI * 2;
      const x = 220 + Math.cos(angle) * 118;
      const y = 124 + Math.sin(angle) * 62;
      return `
        <g class="story-orbit-label" style="animation-delay:${(index * 0.4).toFixed(1)}s">
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${color}"/>
          <text x="${Math.min(Math.max(x - 44, 16), 340).toFixed(1)}" y="${(y + 24).toFixed(1)}" fill="#eaf8ff" font-size="12" font-weight="800">${this.escapeHtml(label)}</text>
        </g>
      `;
    }).join('');
    const sectionPanels = sections.map((section, index) => `
      <section id="story-panel-${index + 1}" class="story-vignette-panel">
        <p class="story-panel-step">${String(index + 1).padStart(2, '0')}</p>
        <h2>${this.escapeHtml(section.label || 'Note')}</h2>
        <p>${this.escapeHtml(section.body || '')}</p>
      </section>
    `).join('');

    return `<article lang="${this.escapeHtml(language.code)}" dir="${this.escapeHtml(language.direction || 'ltr')}" class="topic-story-card topic-story-card-${this.escapeHtml(style)} topic-story-vignette" data-audience="${this.escapeHtml(audience)}" data-under16="${story.under16Only || audienceProfile.under16 ? 'true' : 'false'}">
  <style>
    .topic-story-vignette {
      --story-color: ${color};
      position: relative;
      display: grid;
      grid-template-columns: minmax(260px, 0.9fr) minmax(300px, 1.1fr);
      gap: 0;
      width: min(980px, 100%);
      min-height: min(720px, 100dvh);
      max-height: 760px;
      margin: auto;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--story-color) 45%, transparent);
      border-radius: 14px;
      background: radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--story-color) 22%, transparent), transparent 34%), #07111f;
      color: #eef8ff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .topic-story-vignette * { box-sizing: border-box; }
    .story-vignette-hero {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 18px;
      padding: clamp(18px, 4vw, 34px);
      border-right: 1px solid rgba(255,255,255,.14);
    }
    .story-vignette-kicker {
      margin: 0 0 10px;
      color: var(--story-color);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .topic-story-vignette h1 {
      margin: 0;
      font-size: clamp(34px, 7vw, 72px);
      line-height: .94;
      letter-spacing: 0;
    }
    .story-vignette-summary {
      margin: 14px 0 0;
      color: #cfe9f6;
      font-size: clamp(15px, 2vw, 19px);
      line-height: 1.45;
    }
    .story-vignette-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    .story-vignette-badges span {
      display: inline-flex;
      padding: 6px 9px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 999px;
      color: #dbeafa;
      font-size: 12px;
      font-weight: 800;
    }
    .story-vignette-visual {
      display: block;
      width: 100%;
      height: auto;
      max-height: 270px;
      border: 1px solid color-mix(in srgb, var(--story-color) 24%, transparent);
      border-radius: 12px;
      background: #020814;
    }
    .story-vignette-main {
      display: grid;
      grid-template-rows: 1fr auto;
      min-width: 0;
      min-height: 0;
    }
    .story-vignette-rail {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 100%;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      min-height: 0;
    }
    .story-vignette-panel {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
      padding: clamp(22px, 5vw, 54px);
      scroll-snap-align: start;
    }
    .story-panel-step {
      width: fit-content;
      margin: 0 0 16px;
      padding: 7px 10px;
      border: 1px solid color-mix(in srgb, var(--story-color) 50%, transparent);
      border-radius: 999px;
      color: var(--story-color);
      font-weight: 900;
    }
    .story-vignette-panel h2 {
      margin: 0 0 12px;
      color: #ffffff;
      font-size: clamp(30px, 6vw, 64px);
      line-height: .98;
      letter-spacing: 0;
    }
    .story-vignette-panel p {
      max-width: 42rem;
      margin: 0;
      color: #d8e8f2;
      font-size: clamp(17px, 2vw, 23px);
      line-height: 1.45;
    }
    .story-vignette-footer {
      display: grid;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid rgba(255,255,255,.14);
      background: rgba(0,0,0,.16);
    }
    .story-vignette-nav {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .story-vignette-nav a {
      display: inline-grid;
      width: 34px;
      height: 34px;
      place-items: center;
      border: 1px solid color-mix(in srgb, var(--story-color) 38%, transparent);
      border-radius: 50%;
      color: #eef8ff;
      text-decoration: none;
      font-size: 12px;
      font-weight: 900;
    }
    .story-vignette-note {
      margin: 0;
      color: #a8b3c6;
      font-size: 12px;
      line-height: 1.4;
    }
    .story-vignette-note strong { color: var(--story-color); }
    .story-orbit-core { animation: storyPulse 3.4s ease-in-out infinite; transform-origin: 220px 124px; }
    .story-orbit-ring { animation: storyDash 9s linear infinite; }
    .story-orbit-label { animation: storyFloat 4s ease-in-out infinite; }
    @keyframes storyPulse { 0%, 100% { transform: scale(.96); opacity: .8; } 50% { transform: scale(1.04); opacity: 1; } }
    @keyframes storyDash { to { stroke-dashoffset: -92; } }
    @keyframes storyFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
    @media (max-width: 740px) {
      .topic-story-vignette {
        grid-template-columns: 1fr;
        min-height: 100dvh;
        max-height: none;
      }
      .story-vignette-hero {
        border-right: 0;
        border-bottom: 1px solid rgba(255,255,255,.14);
      }
      .story-vignette-visual { max-height: 210px; }
      .story-vignette-panel { min-height: 42vh; }
    }
  </style>
  <section class="story-vignette-hero">
    <div>
      <p class="story-vignette-kicker">${this.escapeHtml(ui.live)}</p>
      <h1>${this.escapeHtml(title)}</h1>
      <p class="story-vignette-summary">${this.escapeHtml(summary)}</p>
      <div class="story-vignette-badges">
        <span>${this.escapeHtml(ui.age)}: ${this.escapeHtml(audienceProfile.label)}</span>
        <span>${this.escapeHtml(data.vocabularyLevel || audienceProfile.vocabulary)}</span>
        ${story.under16Only || audienceProfile.under16 ? `<span>${this.escapeHtml(ui.review)}</span>` : ''}
      </div>
    </div>
    <svg class="story-vignette-visual" viewBox="0 0 440 270" role="img" aria-label="${this.escapeHtml(caption)}">
    <defs>
      <radialGradient id="storyVignetteGlow" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="${color}" stop-opacity=".42"/>
        <stop offset="65%" stop-color="${color}" stop-opacity=".08"/>
        <stop offset="100%" stop-color="#020814" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="440" height="270" fill="url(#storyVignetteGlow)"/>
    <circle class="story-orbit-ring" cx="220" cy="124" r="86" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="12 11" opacity=".8"/>
    <g class="story-orbit-core">
      <circle cx="220" cy="124" r="56" fill="#14344f" stroke="${color}" stroke-width="2"/>
      <path d="M184 130c30-54 82-44 78 3-20 13-48 18-78-3Z" fill="#7cd957" opacity=".92"/>
      <path d="M190 94c34 16 58 7 84 26" stroke="#2a9dde" stroke-width="15" stroke-linecap="round" opacity=".82"/>
      <path d="M204 145c30 2 54-9 76-2" stroke="#eef8ff" stroke-width="9" stroke-linecap="round"/>
    </g>
    ${labelRows}
    <text x="18" y="248" fill="${color}" font-size="12" font-weight="900">${this.escapeHtml(caption)}</text>
  </svg>
  </section>
  <section class="story-vignette-main">
    <div class="story-vignette-rail" aria-label="Story panels">
      ${sectionPanels}
      ${data.exercise?.question ? `
        <section id="story-panel-${sections.length + 1}" class="story-vignette-panel">
          <p class="story-panel-step">?</p>
          <h2>${this.escapeHtml(ui.check)}</h2>
          <p>${this.escapeHtml(data.exercise.question)} ${this.escapeHtml(data.exercise.answer || '')}</p>
        </section>
      ` : ''}
    </div>
    <footer class="story-vignette-footer">
      <nav class="story-vignette-nav" aria-label="Story panel navigation">${navDots}</nav>
      ${data.learningObjective ? `<p class="story-vignette-note"><strong>${this.escapeHtml(ui.objective)}:</strong> ${this.escapeHtml(data.learningObjective)}</p>` : ''}
      ${assumptions.length ? `<p class="story-vignette-note"><strong>${this.escapeHtml(ui.assumptions)}:</strong> ${assumptions.map(item => this.escapeHtml(item)).join('; ')}</p>` : ''}
      ${evidenceLinks.length ? `<p class="story-vignette-note"><strong>${this.escapeHtml(ui.sources)}:</strong> ${evidenceLinks.map(link => this.escapeHtml(link.name || this.getHostFromUrl(link.url) || 'source')).join(' / ')}</p>` : ''}
    </footer>
  </section>
</article>`;
  }

  async generateTopicStoryFromAi(button = null, options = {}) {
    this.saveFormState();
    if (options.storyOverride) {
      this.topicFormState.topicStory = {
        ...this.normalizeTopicStory(this.topicFormState.topicStory),
        ...this.normalizeTopicStory(options.storyOverride)
      };
      this.topicStoryDraft = this.topicFormState.topicStory;
    }

    if (!window.ourEarthAI?.createChatCompletion) {
      alert(this.t('topic.story.aiCreateNotReady'));
      return;
    }

    const title = String(this.topicFormState.title || '').trim();
    const summary = String(this.topicFormState.summary || '').trim();
    if (!title && !summary) {
      alert(this.t('topic.story.aiCreateNeedsDraft'));
      return;
    }

    const status = this.container.querySelector('[data-topic-story-status]');
    const originalText = button?.textContent || '';
    if (button) {
      button.textContent = 'Creating...';
      button.disabled = true;
    }
    if (status) status.textContent = this.t('topic.story.aiCreateStatus');

    try {
      const completion = await window.ourEarthAI.createChatCompletion({
        messages: this.buildTopicStoryPrompt(),
        temperature: 0.35,
        json: true
      });
      const structuredStory = this.parseAiJsonObject(completion.content || '', 'topic story JSON');
      const nextTitle = structuredStory.title || title || 'Topic Story';
      const nextStyle = structuredStory.style || this.topicFormState.topicStory?.style || 'story-card';
      const currentStory = this.normalizeTopicStory(this.topicFormState.topicStory);
      const html = this.renderTrustedTopicStoryHtml({
        ...structuredStory,
        title: nextTitle,
        style: nextStyle,
        audience: structuredStory.audience || currentStory.audience
      });
      const now = new Date().toISOString();

      this.topicFormState.topicStory = {
        ...currentStory,
        enabled: true,
        title: nextTitle,
        style: nextStyle,
        audience: structuredStory.audience || currentStory.audience,
        under16Only: Boolean(currentStory.under16Only || structuredStory.adultReviewRequired),
        html,
        sanitizedHtml: this.sanitizeStoryHtml(html),
        structuredStory,
        createdAt: this.topicFormState.topicStory?.createdAt || now,
        updatedAt: now
      };
      this.topicStoryDraft = this.topicFormState.topicStory;
      this.topicBuilderTab = 'story';
      this.renderCreateTopic();
    } catch (error) {
      console.error('[Topic Story] AI Create failed:', error);
      if (status) status.textContent = `${this.t('topic.story.aiCreateFailed')}: ${error.message || error}`;
      alert(this.getActionErrorMessage(error, 'Topic story AI create'));
    } finally {
      if (button) {
        button.textContent = originalText || this.t('topic.story.aiCreate');
        button.disabled = false;
      }
    }
  }

  insertTopicStoryStarter() {
    this.saveFormState();
    const title = this.topicFormState.topicStory?.title || this.topicFormState.title || 'Topic Story';
    const summary = this.topicFormState.summary || 'Add a short explanation, evidence, and a visual idea here.';
    const sourceCount = (this.topicSources || []).filter(source => source.name || source.url).length;
    const starterStory = {
      ...this.normalizeTopicStory(this.topicFormState.topicStory),
      enabled: true,
      title,
      style: this.topicFormState.topicStory?.style || 'story-card',
      audience: this.topicFormState.topicStory?.audience || 'general',
      under16Only: Boolean(this.topicFormState.topicStory?.under16Only),
      html: `<article class="topic-story-card" style="max-width:760px;margin:auto;padding:24px;border:1px solid #00d4ff55;border-radius:14px;background:#07111f;color:#eef8ff;font-family:system-ui,sans-serif;">
  <p style="margin:0 0 10px;color:#00d4ff;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">topic.earth story</p>
  <h1 style="margin:0 0 14px;font-size:clamp(28px,6vw,52px);line-height:1.02;">${this.escapeHtml(title)}</h1>
  <p style="font-size:18px;line-height:1.55;color:#cfe9f6;">${this.escapeHtml(summary)}</p>
  <div style="display:grid;gap:10px;margin-top:18px;">
    <strong style="color:#9ad99d;">Evidence attached: ${sourceCount}</strong>
    <span style="color:#a8b3c6;">Replace this starter with an SVG, croquis, lesson, or interactive card.</span>
  </div>
</article>`,
      structuredStory: {
        title,
        style: this.topicFormState.topicStory?.style || 'story-card',
        audience: this.topicFormState.topicStory?.audience || 'general',
        summary,
        sections: [
          { label: 'Context', body: summary },
          { label: 'Evidence', body: `${sourceCount} source item(s) attached for review.` }
        ],
        visualPlan: {
          type: 'starter-html',
          caption: 'Starter card'
        }
      }
    };
    this.topicFormState.topicStory = starterStory;
    this.topicStoryDraft = this.topicFormState.topicStory;
    const form = this.container.querySelector('#topic-form');
    if (form) {
      const enabled = form.querySelector('#topic-story-enabled');
      const titleInput = form.querySelector('#topic-story-title');
      const styleInput = form.querySelector('#topic-story-style');
      const htmlInput = form.querySelector('#topic-story-html');
      if (enabled) enabled.checked = true;
      if (titleInput) titleInput.value = starterStory.title;
      if (styleInput) styleInput.value = starterStory.style;
      if (htmlInput) htmlInput.value = starterStory.html;
      this.saveFormState();
    }
    this.topicBuilderTab = 'story';
    this.renderCreateTopic();
  }

  clearTopicStory() {
    if (!confirm(this.t('topic.story.clearConfirm'))) return;
    this.topicFormState.topicStory = {
      enabled: false,
      title: '',
      style: 'story-card',
      audience: 'general',
      under16Only: false,
      html: '',
      sanitizedHtml: '',
      structuredStory: null
    };
    this.topicStoryDraft = this.topicFormState.topicStory;
    this.topicBuilderTab = 'story';
    this.renderCreateTopic();
  }

  buildTopicStoryForSave() {
    const story = this.normalizeTopicStory(this.topicFormState.topicStory || this.topicStoryDraft);
    if (!story.enabled || !String(story.html || '').trim()) return null;
    const now = new Date().toISOString();
    return {
      enabled: true,
      type: story.style || 'story-card',
      style: story.style || 'story-card',
      audience: story.audience || 'general',
      under16Only: Boolean(story.under16Only),
      title: story.title || this.topicFormState.title || 'Topic story',
      html: story.html,
      sanitizedHtml: this.sanitizeStoryHtml(story.html),
      structuredStory: story.structuredStory || null,
      bridge: {
        bridge: true,
        bridgeVersion: 'topic-story-1',
        origin: 'topic.earth',
        style: story.style || 'story-card',
        audience: story.audience || 'general',
        under16Only: Boolean(story.under16Only),
        title: story.title || this.topicFormState.title || 'Topic story',
        limits: {
          allowScripts: false,
          sandbox: 'no-scripts'
        }
      },
      createdAt: story.createdAt || now,
      updatedAt: now
    };
  }

  setTopicDraftStatus(status = {}) {
    this.topicDraftStatus = {
      state: status.state || 'unsaved',
      source: status.source || 'manual',
      title: status.title || '',
      message: status.message || '',
      originalTitle: status.originalTitle || '',
      updatedAt: status.updatedAt || new Date().toISOString()
    };
  }

  renderTopicDraftStatusBanner(isEditing = false) {
    const status = this.topicDraftStatus || {
      state: isEditing ? 'editing' : 'unsaved',
      source: isEditing ? 'saved-topic' : 'new-topic',
      title: this.topicFormState.title || (isEditing ? 'Saved topic' : 'New topic draft'),
      message: isEditing
        ? 'Changes update the existing saved topic when you click Update Saved Topic.'
        : 'Nothing is saved yet. Review the draft, then save it on this device.'
    };

    const sourceLabels = {
      'new-topic': 'Manual topic builder',
      'source-search': 'Source search / new topic',
      'update-candidate': 'Daily update candidate',
      'draft-copy': 'Existing app topic copy',
      'saved-topic': 'Saved topic edit',
      'regional-proposal': 'Regional local proposal',
      manual: 'Manual draft'
    };
    const stateLabel = status.source === 'regional-proposal'
      ? (status.state === 'editing' ? 'Editing local proposal' : 'Local proposal draft')
      : (status.state === 'editing' ? 'Editing saved topic' : 'Local draft');
    const sourceLabel = sourceLabels[status.source] || sourceLabels.manual;
    const message = status.message || 'Review before saving on this device.';
    const originalLine = status.originalTitle
      ? `<div class="topic-draft-status-meta">Original topic: ${this.escapeHtml(status.originalTitle)}</div>`
      : '';

    return `
      <div class="topic-draft-status ${this.escapeHtml(status.state)}">
        <div>
          <div class="topic-draft-status-kicker">${this.escapeHtml(stateLabel)}</div>
          <div class="topic-draft-status-title">${this.escapeHtml(status.title || this.topicFormState.title || 'Untitled draft')}</div>
          <div class="topic-draft-status-text">${this.escapeHtml(message)}</div>
          <div class="topic-draft-status-meta">Source: ${this.escapeHtml(sourceLabel)}</div>
          ${originalLine}
        </div>
      </div>
    `;
  }

  autoSetupForLayer(layerId) {
    if (!layerId) return;
    
    const { LAYER_SOURCE_MAPPING } = this.getResearchData();
    const recommendedSources = LAYER_SOURCE_MAPPING[layerId] || ['official', 'media'];
    
    // Auto-setup based on layer
    this.topicResearchSettings.sources = new Set(recommendedSources);
    
    // Layer-specific defaults
    const layerDefaults = {
      'meteo': { geographicScope: 'regional', timeScope: 'today', outputIntent: 'brief', researchMode: 'research-brief' },
      'climate': { geographicScope: 'international', timeScope: 'recent', outputIntent: 'analysis', researchMode: 'research-brief' },
      'eu': { geographicScope: 'international', timeScope: 'recent', outputIntent: 'social-post', researchMode: 'post-draft' },
      'country-news': { geographicScope: 'national', timeScope: 'today', outputIntent: 'social-post', researchMode: 'post-draft' },
      'regional-news': { geographicScope: 'regional', timeScope: 'today', outputIntent: 'social-post', researchMode: 'post-draft' },
      'world': { geographicScope: 'international', timeScope: 'recent', outputIntent: 'social-post', researchMode: 'post-draft' },
      'extreme': { geographicScope: 'regional', timeScope: 'today', outputIntent: 'brief', researchMode: 'research-brief' }
    };
    
    const defaults = layerDefaults[layerId] || { 
      geographicScope: 'regional', 
      timeScope: 'recent', 
      outputIntent: 'social-post', 
      researchMode: 'post-draft' 
    };
    
    Object.assign(this.topicResearchSettings, defaults);
  }

  renderCreateTopic() {
    this.saveFormState(); // Save current form values before re-render
    
    const content = this.container.querySelector('#detail-content');
    const today = new Date().toISOString().split('T')[0];
    const isEditing = this.editingTopicId !== null;
    const isRegionalProposal = this.isRegionalProposalWorkspace();
    const regionalLayerOptions = isRegionalProposal ? this.getRegionalProposalLayerOptions() : this.layers;
    const regionalContext = this.getRegionalProposalContext() || {};
    const regionalLabel = this.topicFormState.regionalLabel || this.getRegionalProposalContextLabel(regionalContext);
    const regionalPrecision = this.topicFormState.locationPrecision || regionalContext.precision || regionalContext.scope || '';
    this.topicBuilderTab = this.normalizeTopicBuilderTab(this.topicBuilderTab);
    const mediaTokens = this.getMediaTokensForPoint(this.currentPoint || {});
    const sourceCount = (this.topicSources || []).filter(source => source.name || source.url).length;
    const mediaCount = mediaTokens.length;
    const topicStory = this.normalizeTopicStory(this.topicFormState.topicStory || this.topicStoryDraft);
    const hasTopicStory = Boolean(topicStory.enabled && topicStory.html);
    const descriptionReady = Boolean(
      String(this.topicFormState.title || '').trim()
      && String(this.topicFormState.category || '').trim()
      && String(this.topicFormState.date || today).trim()
      && String(this.topicFormState.summary || '').trim()
    );
    const locationLabel = [this.topicFormState.region, this.topicFormState.country].filter(Boolean).join(', ')
      || regionalLabel
      || 'Location not set';
    const reviewReadyLabel = descriptionReady && sourceCount > 0 ? 'Ready to save' : 'Needs a quick check';
    const workspaceTitle = isRegionalProposal
      ? (isEditing ? 'Update Local Action' : 'Propose Local Action')
      : (isEditing ? 'Edit Topic Draft' : 'Propose a Topic');
    const recordingNote = isRegionalProposal
      ? '<strong>Local proposal:</strong> type or paste once, edit the preview, add proof when useful, then save it on this device.'
      : '';
    const saveLabel = isRegionalProposal
      ? (isEditing ? 'Update Local Action' : 'Save Local Action')
      : (isEditing ? 'Update Saved Topic' : 'Save on this device');
    const selectedLayer = regionalLayerOptions.find(layer => layer.id === this.topicFormState.category)
      || regionalLayerOptions.find(layer => layer.id === this.topicBuilderContext?.defaultLayerId)
      || regionalLayerOptions[0]
      || { id: '', name: 'Topic', icon: '&#128204;', color: 'var(--accent)' };
    
    // Initialize sources if not set
    if (!this.topicSources) {
      this.topicSources = [];
    }
    
    this.showSourceEditor = this.showSourceEditor || false;
    
    content.innerHTML = `
      <div class="detail-header topic-composer-header">
        <h2 class="detail-title">${workspaceTitle}</h2>
        ${recordingNote ? `<div class="topic-recording-note">${recordingNote}</div>` : ''}
        ${isRegionalProposal ? `
          <div class="topic-recording-note regional-proposal-note">
            <strong>Regional focus:</strong> ${this.escapeHtml(regionalLabel || 'Current Regional map area')}
            ${regionalPrecision ? `<br><span>Map precision: ${this.escapeHtml(regionalPrecision)}</span>` : ''}
          </div>
        ` : ''}
        ${this.renderTopicDraftStatusBanner(isEditing)}
        ${this.renderTopicManagementSummary(isEditing)}
        <div class="topic-builder-tabs" data-tutorial-id="topic-composer-tabs">
          <button class="tab-btn ${this.topicBuilderTab === 'describe' ? 'active' : ''}" data-action="switch-tab" data-tab="describe">
            Compose
          </button>
          <button class="tab-btn ${this.topicBuilderTab === 'evidence' ? 'active' : ''}" data-action="switch-tab" data-tab="evidence">
            Evidence
          </button>
          <button class="tab-btn ${this.topicBuilderTab === 'story' ? 'active' : ''}" data-action="switch-tab" data-tab="story">
            Story
          </button>
          <button class="tab-btn ${this.topicBuilderTab === 'review' ? 'active' : ''}" data-action="switch-tab" data-tab="review">
            Review
          </button>
        </div>
      </div>
      
      <form class="modal-form" id="topic-form">
        <div class="tab-content ${this.topicBuilderTab === 'describe' ? 'active' : ''}">
          <div class="topic-composer-shell">
            <div class="topic-smart-input-card" data-tutorial-id="topic-composer-input">
              <label for="topic-smart-input" class="topic-smart-input-label">${isRegionalProposal ? 'Local action input' : 'Topic input'}</label>
              <textarea
                id="topic-smart-input"
                rows="3"
                placeholder="Type or paste a topic, URL, media link, or source note"
              >${this.escapeHtml(this.composerSmartInput || '')}</textarea>
              <div class="topic-smart-input-actions">
                <button type="button" class="btn-primary-alt" data-action="apply-composer-input">Use in draft</button>
                <button type="button" class="simple-ai-btn topic-dictation-btn" data-action="toggle-topic-dictation" title="Dictate into the focused topic field">Mic</button>
                <button type="button" class="simple-ai-btn" data-action="import-file">Add media</button>
              </div>
              <div class="setting-hint topic-dictation-status" data-topic-dictation-status>Mic uses the focused topic field, or this input if no field is active.</div>
              <div class="topic-smart-chips" aria-label="Accepted input types">
                <span>Search</span>
                <span>Source</span>
                <span>Media</span>
                <span>Location</span>
              </div>
            </div>

            <div class="topic-composer-preview" data-tutorial-id="topic-composer-preview" aria-label="Editable topic preview">
              <div class="topic-preview-category" style="--preview-layer-color: ${this.escapeHtml(selectedLayer.color || 'var(--accent)')}">
                <span class="topic-preview-layer-icon">${selectedLayer.icon || '+'}</span>
                <select name="category" id="topic-category" required>
                  <option value="">Select a layer...</option>
                  ${regionalLayerOptions.map(layer => `
                    <option value="${this.escapeHtml(layer.id)}" ${this.topicFormState.category === layer.id ? 'selected' : ''}>${layer.icon} ${this.escapeHtml(layer.name)}</option>
                  `).join('')}
                </select>
              </div>

              <textarea
                name="title"
                id="topic-title"
                class="topic-preview-title-input"
                placeholder="${isRegionalProposal ? 'Local action title' : 'Topic title'}"
                required
                rows="2"
              >${this.escapeHtml(this.topicFormState.title || '')}</textarea>

              <div class="topic-preview-meta-grid">
                <label>
                  <span>Date</span>
                  <input type="date" name="date" id="topic-date" value="${this.escapeHtml(this.topicFormState.date || today)}" required>
                </label>
                <label>
                  <span>Country</span>
                  <input type="text" name="country" id="topic-country" placeholder="Country" value="${this.escapeHtml(this.topicFormState.country || '')}">
                </label>
                <label>
                  <span>Region / City</span>
                  <input type="text" name="region" id="topic-region" placeholder="Region or city" value="${this.escapeHtml(this.topicFormState.region || '')}">
                </label>
              </div>

              <div class="topic-preview-block">
                <div class="section-label">Summary</div>
                <textarea
                  name="summary"
                  id="topic-summary"
                  rows="5"
                  placeholder="${isRegionalProposal ? 'What is happening locally, and why should people know about it?' : 'Briefly describe the event, update, or topic'}"
                  required
                >${this.escapeHtml(this.topicFormState.summary || '')}</textarea>
                <div class="topic-summary-actions">
                  <button type="button" class="btn-secondary topic-www-check-btn" data-action="check-draft-www" data-return-tab="describe">
                    Check WWW
                  </button>
                  <span class="setting-hint" data-draft-www-status>Searches around the draft date, 1 week before and after.</span>
                </div>
              </div>

              ${isRegionalProposal ? `
                <div class="topic-preview-block">
                  <div class="section-label">Local focus</div>
                  <textarea name="searchHint" id="topic-search-hint" rows="2" placeholder="Grants, volunteers, nearby actors, bike lanes, charging points, local news...">${this.escapeHtml(this.topicFormState.searchHint || '')}</textarea>
                </div>
              ` : ''}

              <details class="advanced-section">
                <summary class="advanced-toggle">Location and analysis</summary>
                <div class="advanced-content">
                  <div class="form-row">
                    <div class="form-group">
                      <label>Latitude</label>
                      <input type="number" name="lat" id="topic-lat" step="0.0001" min="-90" max="90" placeholder="48.8566" value="${this.escapeHtml(this.topicFormState.lat || '')}">
                    </div>
                    <div class="form-group">
                      <label>Longitude</label>
                      <input type="number" name="lon" id="topic-lon" step="0.0001" min="-180" max="180" placeholder="2.3522" value="${this.escapeHtml(this.topicFormState.lon || '')}">
                    </div>
                  </div>
                  <button type="button" class="generate-field-btn" data-action="generate-coordinates">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      <circle cx="6" cy="6" r="1" fill="currentColor"/>
                    </svg>
                    Find place
                  </button>
                  <div class="form-group">
                    <label>Source note</label>
                    <input type="text" name="source" id="topic-source" placeholder="Official release, community note, local observation" value="${this.escapeHtml(this.topicFormState.source || '')}">
                  </div>
                  <div class="form-group">
                    <label>Analysis</label>
                    <textarea name="insight" id="topic-insight" rows="2" placeholder="Optional extra context or analysis">${this.escapeHtml(this.topicFormState.insight || '')}</textarea>
                  </div>
                </div>
              </details>
            </div>

            <div class="topic-composer-evidence-lane" data-tutorial-id="topic-composer-evidence-lane" aria-label="Evidence and media">
              <div class="topic-composer-lane-header">
                <div>
                  <div class="section-label">Evidence</div>
                  <div class="setting-hint">Sources and media stay attached to this same draft.</div>
                </div>
                <div class="topic-composer-counts">
                  <span>${sourceCount} source${sourceCount === 1 ? '' : 's'}</span>
                  <span>${mediaCount}/3 media</span>
                </div>
              </div>

              <div class="topic-composer-lane-actions">
                <button type="button" class="btn-primary-alt" data-action="toggle-source-editor">
                  ${this.showSourceEditor || sourceCount > 0 ? 'Edit evidence' : 'Add evidence'}
                </button>
              </div>

              ${this.showSourceEditor || sourceCount > 0 ? this.renderSourceEditor() : `
                <div class="topic-composer-empty-lane">
                  Paste a URL above, or add evidence here when you have proof.
                </div>
              `}

              <div class="topic-composer-media-row">
                <button type="button" class="btn-media-action" data-action="import-file">Add file</button>
                <button type="button" class="btn-media-action" data-action="show-media-url-input">Add URL</button>
              </div>
              ${this.showMediaUrlInput ? this.renderMediaUrlInput('topic-composer-media-url-input') : ''}
              ${mediaTokens.length > 0 ? `
                <div class="topic-builder-media-preview">
                  ${mediaTokens.map((token, index) => `
                    <div class="topic-builder-media-token">
                      ${this.renderMediaTokenImage(token, 'topic-builder-media-image', `Topic media ${index + 1}`)}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="tab-content ${this.topicBuilderTab === 'evidence' ? 'active' : ''}">
          <div class="proposal-step-intro" data-tutorial-id="topic-evidence-tab">
            <div class="proposal-step-kicker">Step 2</div>
            <div class="proposal-step-title">Add proof</div>
            <div class="proposal-step-text">One link, source note, image, or video is enough. Admin can verify details later.</div>
          </div>

          <div class="evidence-summary-grid">
            <div class="evidence-summary-card ${sourceCount > 0 ? 'ready' : 'pending'}">
              <span>Evidence</span>
              <strong>${sourceCount > 0 ? `${sourceCount} added` : 'None yet'}</strong>
            </div>
            <div class="evidence-summary-card ${mediaCount > 0 ? 'ready' : 'optional'}">
              <span>Photos / videos</span>
              <strong>${mediaCount}/3</strong>
            </div>
          </div>

          <div class="research-settings-section" data-tutorial-id="topic-evidence-editor">
            <div class="section-label">Evidence Links</div>
            <button type="button" class="btn-primary-alt" data-action="toggle-source-editor" style="margin-top: 12px; width: 100%;">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="display: inline-block; margin-right: 6px;">
                <path d="M1 10L1 13L4 13L11.5 5.5L8.5 2.5L1 10Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M8.5 2.5L11.5 5.5" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              ${this.showSourceEditor ? 'Hide evidence list' : 'Add / edit evidence'}
            </button>
            ${this.showSourceEditor ? this.renderSourceEditor() : ''}
            <div class="preset-hint" id="preset-hint"></div>
          </div>

          <div class="research-settings-section" data-tutorial-id="topic-media-section">
            <div class="section-label">Photos / Videos</div>
            <div class="media-actions-grid" data-tutorial-id="topic-media-actions">
              <button type="button" class="btn-media-action" data-action="import-file">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 11V3M7 3L4 6M7 3L10 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M2 11H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Add file
              </button>
              <button type="button" class="btn-media-action" data-action="show-media-url-input">Add URL</button>
            </div>
            ${this.showMediaUrlInput ? this.renderMediaUrlInput('topic-media-url-input') : ''}
            ${mediaTokens.length > 0 ? `
              <div class="topic-builder-media-preview">
                ${mediaTokens.map((token, index) => `
                  <div class="topic-builder-media-token">
                    ${this.renderMediaTokenImage(token, 'topic-builder-media-image', `Topic media ${index + 1}`)}
                  </div>
                `).join('')}
              </div>
              <div class="current-media-count">${mediaCount}/3 media items</div>
            ` : '<div class="setting-hint">Optional. A topic can be saved with evidence links only.</div>'}
          </div>

        </div>

        <div class="tab-content ${this.topicBuilderTab === 'story' ? 'active' : ''}">
          <div class="proposal-step-intro" data-tutorial-id="topic-story-tab">
            <div class="proposal-step-kicker">Step 3</div>
            <div class="proposal-step-title">${this.escapeHtml(this.t('topic.story.embedLiveCard'))}</div>
            <div class="proposal-step-text">${this.escapeHtml(this.t('topic.story.liveCardHelp'))}</div>
          </div>
          ${this.renderTopicStoryEditor()}
        </div>

        <div class="tab-content ${this.topicBuilderTab === 'review' ? 'active' : ''}">
          <div class="proposal-step-intro" data-tutorial-id="topic-review-tab">
            <div class="proposal-step-kicker">Step 4</div>
            <div class="proposal-step-title">Review before saving</div>
            <div class="proposal-step-text">This is still a local draft. Saving keeps it on this device; publishing remains an admin review step.</div>
          </div>

          <div class="topic-review-card">
            <div class="topic-review-row">
              <span>Title</span>
              <strong>${this.escapeHtml(this.topicFormState.title || 'Untitled draft')}</strong>
            </div>
            <div class="topic-review-row">
              <span>Place</span>
              <strong>${this.escapeHtml(locationLabel)}</strong>
            </div>
            <div class="topic-review-row">
              <span>Description</span>
              <strong>${descriptionReady ? 'Complete enough to save' : 'Needs title, category, date, and description'}</strong>
            </div>
            <div class="topic-review-row">
              <span>Evidence</span>
              <strong>${sourceCount > 0 ? `${sourceCount} item${sourceCount === 1 ? '' : 's'} added` : 'No evidence yet'}</strong>
            </div>
            <div class="topic-review-row">
              <span>Photos / videos</span>
              <strong>${mediaCount > 0 ? `${mediaCount} item${mediaCount === 1 ? '' : 's'} added` : 'Optional'}</strong>
            </div>
            <div class="topic-review-row">
              <span>${this.escapeHtml(this.t('topic.story.storyCard'))}</span>
              <strong>${hasTopicStory ? `${this.escapeHtml(topicStory.style)} attached` : 'Optional'}</strong>
            </div>
            <div class="topic-review-row">
              <span>Status</span>
              <strong>${this.escapeHtml(reviewReadyLabel)}</strong>
            </div>
          </div>
        </div>

        <div class="topic-builder-actions">
          <button type="button" class="btn-secondary" data-action="cancel-topic">Cancel</button>
          <div class="primary-actions">
            <button type="button" class="btn-primary" data-action="save-topic" data-tutorial-id="topic-save-button">${saveLabel}</button>
          </div>
        </div>
      </form>
    `;

    // Handle monitoring tab switches
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('monitoring-tab')) {
        const tab = e.target.dataset.tab;
        if (tab) {
          this.activeMonitoringTab = tab;
          
          // Update tab UI
          this.container.querySelectorAll('.monitoring-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
          });
          
          // Update content
          this.updateMonitoringTabContent();
          
          console.log(`[Monitoring] Active tab changed to: ${tab}`);
        }
      }
    });
    
    // Attach change listeners for layer-aware presets and prompt preview
    setTimeout(() => {
      const categorySelect = content.querySelector('#topic-category');
      if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
          this.autoSetupForLayer(e.target.value);
          this.updatePromptPreview();
        });
      }

      // Add listeners for research settings changes with explicit key mapping
      const settingsMap = {
        '#geographic-scope': 'geographicScope',
        '#time-scope': 'timeScope',
        '#output-intent': 'outputIntent',
        '#trusted-only': 'trustedOnly'
      };
      
      Object.entries(settingsMap).forEach(([selector, key]) => {
        const el = content.querySelector(selector);
        if (el) {
          el.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
              this.topicResearchSettings[key] = e.target.checked;
            } else {
              this.topicResearchSettings[key] = e.target.value;
            }
            this.updatePromptPreview();
          });
        }
      });
    }, 0);
  }

  switchTab(tab) {
    this.saveFormState(); // Save before switching
    this.topicBuilderTab = this.normalizeTopicBuilderTab(tab);
    this.renderCreateTopic();
    this.emitTutorialEvent('topicComposerTabChanged', { tab: this.topicBuilderTab }, 80);
  }

  updateLayerPresets() {
    // No longer needed - handled by autoSetupForLayer
  }

  toggleResearchSource(sourceId) {
    this.saveFormState(); // Save before updating
    if (this.topicResearchSettings.sources.has(sourceId)) {
      this.topicResearchSettings.sources.delete(sourceId);
    } else {
      this.topicResearchSettings.sources.add(sourceId);
    }
    this.renderCreateTopic();
  }

  selectResearchMode(modeId) {
    this.saveFormState(); // Save before updating
    this.topicResearchSettings.researchMode = modeId;
    this.updatePromptPreview();
    this.renderCreateTopic();
  }

  extractComposerUrls(text = '') {
    const matches = String(text || '').match(/https?:\/\/[^\s<>"')]+/gi) || [];
    return Array.from(new Set(matches.map(url => url.replace(/[.,;:!?]+$/g, ''))));
  }

  getComposerTextWithoutUrls(text = '', urls = []) {
    let cleanText = String(text || '');
    urls.forEach(url => {
      cleanText = cleanText.replace(url, ' ');
    });
    return cleanText
      .replace(/\s+/g, ' ')
      .trim();
  }

  addComposerUrl(url = '') {
    if (!url) return false;

    const directImageUrl = this.getDirectImageUrl(url);
    const host = this.getHostFromUrl(url);
    const isVideoOrSiteMedia = /(?:youtube\.com|youtu\.be|vimeo\.com|cloudinary\.com)/i.test(url);
    const existingSource = this.topicSources.some(source => String(source.url || '') === url);
    let added = false;

    if (directImageUrl) {
      const mediaToken = this.createMediaToken({
        url,
        sourceUrl: url,
        sourceName: host || 'Imported media',
        provider: 'composer-url'
      });
      added = this.addMediaTokenToCurrentPoint(mediaToken) || added;

      if (!existingSource) {
        this.topicSources.push({
          name: host || 'Imported media',
          url,
          category: 'media',
          reliability: 'unknown',
          verified: true,
          mediaTokenId: mediaToken.id
        });
      }
      return true;
    }

    if (!existingSource) {
      this.topicSources.push({
        name: host || (isVideoOrSiteMedia ? 'Linked media' : 'Source link'),
        url,
        category: isVideoOrSiteMedia ? 'media' : 'source',
        reliability: 'unknown',
        verified: true,
        linkOnly: true
      });
      added = true;
    }

    return added;
  }

  applyComposerInput() {
    const form = this.container.querySelector('#topic-form');
    if (!form) return;

    const input = form.querySelector('#topic-smart-input');
    const rawText = String(input?.value || '').trim();
    if (!rawText) return;

    this.saveFormState();

    const urls = this.extractComposerUrls(rawText);
    const cleanText = this.getComposerTextWithoutUrls(rawText, urls);
    const firstLine = cleanText.split(/[.!?]\s|\n/).map(part => part.trim()).find(Boolean) || '';
    const conciseTitle = firstLine.length > 92 ? `${firstLine.slice(0, 89).trim()}...` : firstLine;

    if (conciseTitle && !String(this.topicFormState.title || '').trim()) {
      this.topicFormState.title = conciseTitle;
    }

    if (cleanText && !String(this.topicFormState.summary || '').trim()) {
      this.topicFormState.summary = cleanText;
    } else if (cleanText && !String(this.topicFormState.insight || '').trim()) {
      this.topicFormState.insight = cleanText;
    } else if (cleanText && this.isRegionalProposalWorkspace() && !String(this.topicFormState.searchHint || '').trim()) {
      this.topicFormState.searchHint = cleanText;
    }

    if (!this.topicFormState.category) {
      this.topicFormState.category = this.topicBuilderContext?.defaultLayerId
        || this.getRegionalProposalDefaultLayerId()
        || this.layers.find(layer => !layer.isGroup)?.id
        || '';
      if (this.topicFormState.category) this.autoSetupForLayer(this.topicFormState.category);
    }

    urls.forEach(url => this.addComposerUrl(url));
    if (urls.length > 0) this.showSourceEditor = true;

    this.composerSmartInput = '';
    if (input) input.value = '';
    const syncedFields = {
      '#topic-title': this.topicFormState.title,
      '#topic-category': this.topicFormState.category,
      '#topic-summary': this.topicFormState.summary,
      '#topic-insight': this.topicFormState.insight,
      '#topic-search-hint': this.topicFormState.searchHint
    };
    Object.entries(syncedFields).forEach(([selector, value]) => {
      const field = form.querySelector(selector);
      if (field) field.value = value || '';
    });
    this.setTopicDraftStatus({
      ...(this.topicDraftStatus || {}),
      state: this.topicDraftStatus?.state || 'unsaved',
      title: this.topicFormState.title || this.topicDraftStatus?.title || 'Topic draft',
      message: urls.length > 0
        ? 'Input added to the draft and evidence lane. Review, then save it on this device.'
        : 'Input added to the editable preview. Review, then save it on this device.'
    });
    this.renderCreateTopic();
    this.emitTutorialEvent('topicComposerApplied', { urlCount: urls.length }, 80);
  }

  renderSourceEditor() {
    return `
      <div class="source-editor-panel" data-tutorial-id="topic-source-editor">
        <div class="source-editor-header">
          <div class="section-label" style="margin: 0;">Evidence</div>
        </div>
        <div class="sources-list-editor">
          ${this.topicSources.length === 0 ? `
            <div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 12px;">
              No evidence added yet. Add a link or note.
            </div>
          ` : ''}
          ${this.topicSources.map((source, index) => `
            <div class="source-editor-item" data-index="${index}">
              <div class="source-editor-status ${source.verified ? 'verified' : ''}">
                ${source.verified ? '&#10003;' : '&#9675;'}
              </div>
              <div class="source-editor-content">
                <input 
                  type="text" 
                  class="source-name-input" 
                  placeholder="Evidence title or source name"
                  value="${this.escapeHtml(source.name || '')}"
                  data-index="${index}"
                  data-field="name"
                >
                <input 
                  type="url" 
                  class="source-url-input" 
                  placeholder="https://example.com"
                  value="${this.escapeHtml(source.url || '')}"
                  data-index="${index}"
                  data-field="url"
                >
              </div>
              <div class="source-editor-actions">
                <button type="button" class="source-action-btn" data-action="verify-source" data-index="${index}" title="Verify source">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L5 10L12 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <button type="button" class="source-action-btn remove" data-action="remove-source" data-index="${index}" title="Remove source">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="source-editor-add-actions">
          <button type="button" class="btn-secondary source-web-search-btn" data-action="check-draft-www" data-return-tab="evidence">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="6.2" cy="6.2" r="4.2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M9.3 9.3L12.2 12.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Web Search
          </button>
          <button type="button" class="btn-secondary source-add-row-btn" data-action="add-source">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1V13M1 7H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Add Evidence
          </button>
        </div>
      </div>
    `;
  }

  toggleSourceEditor() {
    this.showSourceEditor = !this.showSourceEditor;
    this.renderCreateTopic();
    if (this.showSourceEditor) {
      this.emitTutorialEvent('topicEvidenceEditorOpened', { source: 'toggle-source-editor' }, 80);
    }
  }

  async aiSuggestSources() {
    const form = this.container.querySelector('#topic-form');
    const titleInput = form?.querySelector('#topic-title');
    const categorySelect = form?.querySelector('#topic-category');
    const regionInput = form?.querySelector('#topic-region');
    const countryInput = form?.querySelector('#topic-country');
    const summaryInput = form?.querySelector('#topic-summary');
    const btn = this.container.querySelector('[data-action="ai-suggest-sources"]');
    
    if (!titleInput?.value) {
      alert('Please enter a topic title first');
      return;
    }
    
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-small"></div> Suggesting...';
    btn.disabled = true;
    
    try {
      const layer = this.layers.find(l => l.id === categorySelect?.value);
      const layerName = layer?.name || 'general topic';
      const location = [
        regionInput?.value,
        countryInput?.value
      ].filter(Boolean).join(', ') || 'not specified';
      
      const prompt = `For the following topic, suggest 5-7 high-quality, trustworthy sources for research:

Topic: ${titleInput.value}
Category: ${layerName}
Location: ${location}
Context: ${summaryInput?.value || 'not specified'}

Return ONLY a JSON array with this exact format, no other text:
[
  {
    "name": "Official source name",
    "url": "https://real-source.example/path",
    "category": "official|scientific|media",
    "reliability": "high|medium"
  }
]

Rules:
- Every source must include a real absolute http(s) URL in the "url" field.
- Do not return placeholder URLs such as example.com.
- If you cannot provide a usable URL, omit that source.
- Return [] if no URL-backed sources are available.

Prioritize official local sources, scientific journals, and reputable news outlets.`;
      
      const completion = await window.ourEarthAI.createChatCompletion({
        messages: [
          {
            role: "system",
            content: "You are a research assistant. Suggest high-quality, verifiable sources in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        json: true
      });
      
      const parsedSources = this.parseAiJsonArray(completion.content, 'source suggestions');
      const sources = parsedSources
        .map(source => this.normalizeSuggestedSource(source))
        .filter(Boolean);
      
      if (sources.length > 0) {
        this.mergeSuggestedSources(sources);
        this.showSourceEditor = true;
        this.renderCreateTopic();
        
        btn.innerHTML = 'Sources Added';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }, 2000);
      } else {
        throw new Error('AI did not return any usable source URLs. Try Check web or add official links manually.');
      }
      
    } catch (error) {
      console.error('Error suggesting sources:', error);
      alert(this.getActionErrorMessage(error, 'Source suggestion'));
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }

  addSource() {
    this.topicSources.push({
      name: '',
      url: '',
      verified: false
    });
    this.renderCreateTopic();
  }

  removeSource(btn) {
    const index = parseInt(btn.dataset.index);
    if (!isNaN(index) && confirm('Remove this source?')) {
      this.topicSources.splice(index, 1);
      this.renderCreateTopic();
    }
  }

  async inferDraftFromEvidenceSource(source = {}) {
    const url = this.sanitizeUrl(source.url || '');
    const fallbackSuggestion = this.buildEvidenceUrlFallbackSuggestion(source);
    if (!url || !window.ourEarthAI?.createChatCompletion) {
      return fallbackSuggestion;
    }

    const prompt = `Use this evidence URL to help fill a topic.earth draft. Prefer facts visible in the URL, source title, and likely page metadata. If you cannot know a field, leave it empty instead of inventing.

Evidence name: ${source.name || ''}
Evidence URL: ${url}
Current title: ${this.topicFormState.title || ''}
Current summary: ${this.topicFormState.summary || ''}
Current location: ${[this.topicFormState.region, this.topicFormState.country].filter(Boolean).join(', ') || ''}

Return ONLY JSON:
{
  "title": "concise topic title",
  "summary": "1-2 sentence summary",
  "country": "country if clear",
  "region": "city, commune, region, or locality if clear",
  "lat": "",
  "lon": "",
  "sourceName": "better source name",
  "imageUrl": "direct image URL if available",
  "imageCaption": "short caption"
}`;

    try {
      const completion = await window.ourEarthAI.createChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You turn source URLs into cautious topic draft metadata. Return strict JSON only. Do not fabricate coordinates or image URLs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        json: true,
        temperature: 0.1
      });

      return {
        ...fallbackSuggestion,
        ...Object.fromEntries(
          Object.entries(this.parseAiJsonObject(completion.content || '', 'evidence source draft JSON'))
            .filter(([, value]) => String(value ?? '').trim())
        )
      };
    } catch (error) {
      console.warn('[Evidence] AI source inference failed; using URL fallback:', error);
      return fallbackSuggestion;
    }
  }

  buildEvidenceUrlFallbackSuggestion(source = {}) {
    const safeUrl = this.sanitizeUrl(source.url || '');
    if (!safeUrl) return {};

    try {
      const url = new URL(safeUrl);
      const host = url.hostname.replace(/^www\./, '');
      const slugText = url.pathname
        .split('/')
        .filter(Boolean)
        .pop()
        ?.replace(/\.[a-z0-9]+$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim() || '';
      const slugTitle = slugText
        ? slugText.replace(/\b\w/g, char => char.toUpperCase())
        : '';
      const lowerHaystack = `${host} ${url.pathname}`.toLowerCase();
      const sourceName = String(source.name || '').trim();
      const title = sourceName || slugTitle;
      const suggestion = {
        title,
        sourceName: sourceName || host,
        sourceUrl: safeUrl
      };

      if (host.endsWith('.be')) {
        suggestion.country = 'Belgium';
      }
      if (lowerHaystack.includes('anthisnes') || lowerHaystack.includes('limont')) {
        suggestion.region = 'Limont (Anthisnes)';
        suggestion.country = suggestion.country || 'Belgium';
        suggestion.category = 'regional-news';
        suggestion.summary = `${title || 'This source'} points to a local event or update in Limont, Anthisnes. Keep this as a draft until the source text is reviewed.`;
      } else if (host.endsWith('.be') || lowerHaystack.includes('commune') || lowerHaystack.includes('event') || lowerHaystack.includes('fete')) {
        suggestion.category = 'regional-news';
        suggestion.summary = `${title || 'This source'} appears to be a local or regional source. Review the page, then refine the summary before saving.`;
      }

      return suggestion;
    } catch (error) {
      return {};
    }
  }

  applyEvidenceDraftSuggestion(source = {}, suggestion = {}) {
    const safeUrl = this.sanitizeUrl(source.url || '');
    const text = value => String(value || '').trim();
    const numericText = value => {
      const number = Number(value);
      return Number.isFinite(number) ? String(number) : '';
    };

    if (text(suggestion.sourceName) && !text(source.name)) {
      source.name = text(suggestion.sourceName);
    }
    const inferredTitle = text(suggestion.title) || text(source.name) || text(suggestion.sourceName);
    if (inferredTitle && !text(this.topicFormState.title)) {
      this.topicFormState.title = inferredTitle.slice(0, 140);
    }
    if (text(suggestion.summary) && !text(this.topicFormState.summary)) {
      this.topicFormState.summary = text(suggestion.summary);
    }
    if (text(suggestion.country) && !text(this.topicFormState.country)) {
      this.topicFormState.country = text(suggestion.country);
    }
    if (text(suggestion.region) && !text(this.topicFormState.region)) {
      this.topicFormState.region = text(suggestion.region);
    }

    const lat = numericText(suggestion.lat);
    const lon = numericText(suggestion.lon);
    const isEmptyCoordinatePlaceholder = Number(lat) === 0 && Number(lon) === 0;
    if (lat && lon && !isEmptyCoordinatePlaceholder && !text(this.topicFormState.lat) && !text(this.topicFormState.lon)) {
      this.topicFormState.lat = lat;
      this.topicFormState.lon = lon;
    }

    if (!text(this.topicFormState.source)) {
      this.topicFormState.source = source.name || this.getHostFromUrl(safeUrl) || safeUrl;
    }

    const inferredCategory = text(suggestion.category)
      || (this.isRegionalProposalWorkspace() ? this.getRegionalProposalDefaultLayerId() : '')
      || (text(this.topicFormState.region) || text(this.topicFormState.country) ? 'regional-news' : '');
    if (inferredCategory && !text(this.topicFormState.category)) {
      const layerExists = this.layers.some(layer => layer.id === inferredCategory);
      this.topicFormState.category = layerExists
        ? inferredCategory
        : this.layers.find(layer => !layer.isGroup)?.id || '';
      if (this.topicFormState.category) {
        this.autoSetupForLayer(this.topicFormState.category);
      }
    }

    if (!text(this.composerSmartInput)) {
      this.composerSmartInput = [
        this.topicFormState.title,
        this.topicFormState.summary,
        safeUrl
      ].filter(Boolean).join('\n');
    }
  }

  async addEvidenceImageCandidate(source = {}, suggestion = {}) {
    const candidates = [
      suggestion.imageUrl,
      source.imageUrl,
      source.url
    ].map(value => String(value || '').trim()).filter(Boolean);

    for (const candidate of candidates) {
      const token = await this.resolveImageUrlToken(candidate);
      if (!token?.url) continue;
      token.sourceUrl = token.sourceUrl || source.url || candidate;
      token.sourceName = source.name || token.sourceName || this.getHostFromUrl(token.sourceUrl) || 'Evidence image';
      token.caption = suggestion.imageCaption || token.caption || '';
      if (this.addMediaTokenToCurrentPoint(token)) {
        source.mediaTokenId = token.id;
        return true;
      }
    }

    return false;
  }

  async verifySource(btn) {
    const index = parseInt(btn.dataset.index);
    if (isNaN(index)) return;
    
    const source = this.topicSources[index];
    if (!source.url) {
      alert('Please enter a URL first');
      return;
    }
    
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-small"></div>';
    btn.disabled = true;
    
    try {
      // Simple verification - just check if URL is well-formed and domain exists
      const url = new URL(source.url);
      source.verified = true;
      source.url = this.sanitizeUrl(url.href) || url.href;
      this.saveFormState();
      source.verified = true;
      source.url = this.sanitizeUrl(url.href) || url.href;
      let mediaAdded = false;
      try {
        const suggestion = await this.inferDraftFromEvidenceSource(source);
        this.applyEvidenceDraftSuggestion(source, suggestion);
        await this.ensureDraftCoordinatesFromPlace({ silent: true });
        mediaAdded = await this.addEvidenceImageCandidate(source, suggestion);
      } catch (hydrateError) {
        console.warn('[Evidence] Could not hydrate draft from source URL:', hydrateError);
        this.applyEvidenceDraftSuggestion(source, this.buildEvidenceUrlFallbackSuggestion(source));
        await this.ensureDraftCoordinatesFromPlace({ silent: true });
        mediaAdded = await this.addEvidenceImageCandidate(source, {});
      }
      
      this.setTopicDraftStatus({
        ...(this.topicDraftStatus || {}),
        state: this.topicDraftStatus?.state || 'unsaved',
        title: this.topicFormState.title || this.topicDraftStatus?.title || 'Topic draft',
        message: mediaAdded
          ? 'Evidence verified, draft fields updated, and a media candidate was attached.'
          : 'Evidence verified and draft fields updated where the source URL was clear.'
      });
      
      this.renderCreateTopic();
      
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }, 1000);
      
    } catch (error) {
      alert('Invalid URL format');
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }

  async aiGenerateImage() {
    const form = this.container.querySelector('#topic-form');
    const titleInput = form?.querySelector('#topic-title');
    const btn = this.container.querySelector('[data-action="ai-generate-image"]');
    
    if (!titleInput?.value) {
      alert('Please enter a topic title first');
      return;
    }
    
    if (!this.currentPoint) {
      this.currentPoint = { media: [] };
    }
    if (!this.currentPoint.media) {
      this.currentPoint.media = [];
    }
    
    if (this.currentPoint.media.length >= 3) {
      alert('Maximum 3 media items allowed');
      return;
    }
    
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-small"></div> Generating...';
    btn.disabled = true;
    
    try {
      const imagePrompt = `${titleInput.value} - professional news photo style, high quality`;
      
      const result = await window.ourEarthAI.generateImage({
        prompt: imagePrompt,
        aspect_ratio: '16:9'
      });
      
      const mediaToken = this.createMediaToken({
        url: result.url,
        sourceName: result.provider || 'AI Generated Image',
        sourceUrl: result.url,
        query: imagePrompt,
        generated: true,
        provider: result.provider || 'ai-generated'
      });

      this.addMediaTokenToCurrentPoint(mediaToken);
      
      if (!this.topicSources.find(s => s.name === 'AI Generated Image')) {
        this.topicSources.push({
          name: 'AI Generated Image',
          url: result.url,
          category: 'media',
          verified: true,
          mediaTokenId: mediaToken.id
        });
      }
      
      this.renderCreateTopic();
      
      btn.innerHTML = 'Added';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Error generating image:', error);
      alert(this.getActionErrorMessage(error, 'Image generation'));
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }

  renderMediaUrlInput(tutorialId = 'topic-media-url-input') {
    const inputId = `${tutorialId}-field`;
    return `
      <div class="media-url-inline" data-tutorial-id="${this.escapeHtml(tutorialId)}">
        <input
          type="url"
          id="${this.escapeHtml(inputId)}"
          class="media-url-input"
          placeholder="https://example.com/photo.jpg"
          autocomplete="off"
          value="${this.escapeHtml(this.mediaUrlDraftUrl || '')}"
        >
        <button type="button" class="btn-media-action" data-action="preview-media-url">Search img URL</button>
        <button type="button" class="btn-media-action" data-action="add-media-url">Add URL</button>
      </div>
      ${this.renderMediaUrlPreview()}
    `;
  }

  renderMediaUrlPreview() {
    const token = normalizeTopicMediaToken(this.mediaUrlPreviewToken);
    if (!token?.url) return '';

    const sourceLabel = token.sourceName || this.getHostFromUrl(token.sourceUrl || token.url) || 'Image URL';

    return `
      <div class="media-url-preview" data-preview-source-url="${this.escapeHtml(token.sourceUrl || token.url)}">
        <div class="media-url-preview-topic">
          ${this.renderMediaTokenImage(token, 'media-url-preview-image', 'Image URL preview')}
        </div>
        <div class="media-url-preview-side">
          <div class="media-url-preview-vignette">
            ${this.renderMediaTokenImage(token, 'media-url-preview-vignette-image', 'Vignette preview')}
          </div>
          <div class="media-url-preview-copy">
            <span>Preview</span>
            <strong>${this.escapeHtml(sourceLabel)}</strong>
          </div>
        </div>
      </div>
    `;
  }

  getMediaUrlInputForAction(target = null) {
    return target?.closest('.media-url-inline')?.querySelector('.media-url-input')
      || this.container.querySelector('.tab-content.active .media-url-input')
      || this.container.querySelector('.media-url-input');
  }

  async addMediaUrlFromInput(target = null) {
    const input = this.getMediaUrlInputForAction(target);
    const url = String(input?.value || '').trim();
    if (!url) {
      input?.focus();
      return;
    }
    this.mediaUrlDraftUrl = url;
    await this.importURL(url, { previewToken: this.mediaUrlPreviewToken, button: target });
  }

  async previewMediaUrlFromInput(target = null) {
    const input = this.getMediaUrlInputForAction(target);
    const url = String(input?.value || '').trim();
    if (!url) {
      input?.focus();
      return;
    }

    this.saveFormState();
    this.mediaUrlDraftUrl = url;
    const btn = target || this.container.querySelector('.tab-content.active [data-action="preview-media-url"]');
    const originalHTML = btn?.innerHTML;
    if (btn) {
      btn.innerHTML = '<div class="spinner-small"></div> Searching...';
      btn.disabled = true;
    }

    try {
      const token = await this.resolveImageUrlToken(url);
      if (!token?.url) {
        this.mediaUrlPreviewToken = null;
        this.renderCreateTopic();
        alert('No displayable image found for this URL yet. Try a direct image URL, or keep it as evidence only.');
        return;
      }

      this.mediaUrlPreviewToken = token;
      this.showMediaUrlInput = true;
      this.renderCreateTopic();
    } catch (error) {
      console.error('Error previewing URL media:', error);
      alert(this.getActionErrorMessage(error, 'Image URL preview'));
      if (btn) {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }
    }
  }

  async importMedia() {
    await this.importFile();
  }

  ensureCurrentPointMedia() {
    if (!this.currentPoint) {
      this.currentPoint = { media: [], mediaTokens: [] };
    }

    if (!this.currentPoint.media) {
      this.currentPoint.media = [];
    }
    if (!this.currentPoint.mediaTokens) {
      this.currentPoint.mediaTokens = [];
    }

    if (this.currentPoint.media.length >= 3) {
      alert('Maximum 3 media items allowed');
      return false;
    }

    return true;
  }

  async findMediaFromSources() {
    const form = this.container.querySelector('#topic-form');
    const title = form?.querySelector('#topic-title')?.value || this.topicFormState.title || 'topic';
    const btn = this.container.querySelector('[data-action="source-media-search"]');
    const source = this.topicSources.find(s => s.url) || {
      name: this.topicFormState.source || 'Manual source',
      url: prompt('Enter a source page or image URL to use for media:') || ''
    };

    if (!source.url) return;

    if (!this.currentPoint) this.currentPoint = { media: [], mediaTokens: [] };
    if ((this.currentPoint.media || []).length >= 3) {
      alert('Maximum 3 media items allowed');
      return;
    }

    const originalHTML = btn?.innerHTML;
    if (btn) {
      btn.innerHTML = '<div class="spinner-small"></div> Searching...';
      btn.disabled = true;
    }

    try {
      const token = await this.fetchWebImageToken(`${title} ${source.name || ''}`, {
        name: source.name,
        url: source.url,
        sourceName: source.name,
        sourceUrl: source.url
      });

      if (!this.addMediaTokenToCurrentPoint(token)) {
        throw new Error('No direct image found for this source page.');
      }

      source.mediaTokenId = token.id;
      source.verified = true;
      this.renderCreateTopic();

      if (btn) {
        btn.innerHTML = 'Added';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }, 1800);
      }
    } catch (error) {
      console.error('Failed to use source media:', error);
      alert(this.getActionErrorMessage(error, 'Source media'));
      if (btn) {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }
    }
  }

  async importFile() {
    this.saveFormState();
    if (!this.ensureCurrentPointMedia()) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const btn = this.container.querySelector('[data-action="import-file"]') || this.container.querySelector('[data-action="import-media"]');
      const originalHTML = btn?.innerHTML;
      if (btn) {
        btn.innerHTML = '<div class="spinner-small"></div> Adding...';
        btn.disabled = true;
      }
      
      try {
        const url = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error || new Error('Could not read this file.'));
          reader.readAsDataURL(file);
        });

        const mediaToken = this.createMediaToken({
          url,
          sourceName: file.name || 'Uploaded file',
          sourceUrl: '',
          provider: 'browser-file',
          browserOnly: true
        });

        this.addMediaTokenToCurrentPoint(mediaToken);

        this.topicSources.push({
          name: file.name || 'Uploaded file',
          url: '',
          category: 'media',
          verified: true,
          mediaTokenId: mediaToken.id
        });

        this.renderCreateTopic();

        if (btn) {
          btn.innerHTML = 'Added';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
          }, 1200);
        }
        
      } catch (error) {
        console.error('Error adding file:', error);
        alert(this.getActionErrorMessage(error, 'File import'));
        if (btn) {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }
      }
    };
    
    input.click();
  }

  probeImageUrl(url = '') {
    const imageUrl = String(url || '').trim();
    if (!imageUrl) return Promise.resolve(false);

    return new Promise((resolve) => {
      const image = new Image();
      const timer = window.setTimeout(() => {
        image.onload = null;
        image.onerror = null;
        resolve(false);
      }, 5000);

      image.onload = () => {
        window.clearTimeout(timer);
        resolve(true);
      };
      image.onerror = () => {
        window.clearTimeout(timer);
        resolve(false);
      };
      image.referrerPolicy = 'no-referrer';
      image.src = imageUrl;
    });
  }

  async resolveImageUrlToken(url = '') {
    const rawUrl = String(url || '').trim();
    if (!rawUrl) return null;

    const safeUrl = rawUrl.startsWith('data:image/')
      ? rawUrl
      : this.sanitizeUrl(rawUrl);
    if (!safeUrl) return null;

    let imageUrl = safeUrl.startsWith('data:image/') ? safeUrl : this.getDirectImageUrl(safeUrl);
    let provider = safeUrl.startsWith('data:image/') ? 'inline-url' : 'hosted-url';
    let sourceUrl = safeUrl.startsWith('data:image/') ? '' : safeUrl;
    const sourceName = this.getHostFromUrl(safeUrl) || 'Hosted image';

    if (imageUrl && !safeUrl.startsWith('data:image/') && !await this.probeImageUrl(imageUrl)) {
      imageUrl = '';
    }

    if (!imageUrl && await this.probeImageUrl(safeUrl)) {
      imageUrl = safeUrl;
      provider = 'hosted-image-probe';
    }

    if (!imageUrl && this.canFetchSourcePageMetadata(safeUrl)) {
      imageUrl = await this.fetchSourcePageImage(safeUrl);
      provider = imageUrl ? 'source-page-meta' : provider;
    }

    if (!imageUrl) return null;

    return this.createMediaToken({
      url: imageUrl,
      sourceName,
      sourceUrl,
      provider
    });
  }

  async importURL(url = '', options = {}) {
    this.saveFormState();
    if (!this.ensureCurrentPointMedia()) return;

    const rawUrl = String(url || '').trim();
    if (!rawUrl) {
      this.showMediaUrlInput = true;
      this.renderCreateTopic();
      this.emitTutorialEvent('topicMediaUrlOpened', { source: 'empty-url' }, 60);
      return;
    }

    const safeUrl = rawUrl.startsWith('data:image/')
      ? rawUrl
      : this.sanitizeUrl(rawUrl);
    if (!safeUrl) {
      alert('Invalid URL format');
      return;
    }

    const previewToken = normalizeTopicMediaToken(options.previewToken);
    const mediaToken = previewToken?.sourceUrl === safeUrl || previewToken?.url === safeUrl
      ? previewToken
      : await this.resolveImageUrlToken(safeUrl);

    if (!mediaToken?.url) {
      this.topicSources.push({
        name: this.getHostFromUrl(safeUrl) || 'Linked media',
        url: safeUrl,
        category: 'media',
        reliability: 'unknown',
        verified: true,
        linkOnly: true
      });
      this.showSourceEditor = true;
      this.showMediaUrlInput = false;
      this.renderCreateTopic();
      alert('Linked media URL added to Source Manager. Add a direct image URL or upload a file when you need a cover image.');
      return;
    }
    
    const btn = options.button
      || this.container.querySelector('.tab-content.active [data-action="add-media-url"]')
      || this.container.querySelector('[data-action="import-media"]');
    const originalHTML = btn?.innerHTML;
    if (btn) {
      btn.innerHTML = '<div class="spinner-small"></div> Adding...';
      btn.disabled = true;
    }
    
    try {
      this.addMediaTokenToCurrentPoint(mediaToken);
      this.topicSources.push({
        name: mediaToken.sourceName || 'Hosted Image URL',
        url: safeUrl.startsWith('data:image/') ? '' : (mediaToken.sourceUrl || safeUrl),
        category: 'media',
        verified: true,
        mediaTokenId: mediaToken.id
      });

      this.showMediaUrlInput = false;
      this.mediaUrlDraftUrl = '';
      this.mediaUrlPreviewToken = null;
      this.renderCreateTopic();
      if (btn) {
        btn.innerHTML = 'Added';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }, 1200);
      }
    } catch (error) {
      console.error('Error adding URL media:', error);
      alert(this.getActionErrorMessage(error, 'URL import'));
      if (btn) {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }
    }
  }

  async aiGenAndUpdate() {
    if (this.editingTopicId && !this.canModifyCurrentTopic()) {
      this.blockUserMutation('update saved or published topics');
      return;
    }

    const form = this.container.querySelector('#topic-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    this.submitTopic('save');
  }

  updatePromptPreview() {
    const previewArea = this.container.querySelector('#prompt-preview');
    if (previewArea) {
      previewArea.value = this.generateTopicPromptPreview();
    }
  }

  generateTopicPromptPreview() {
    const form = this.container.querySelector('#topic-form');
    if (!form) return 'Enter topic details to preview research prompt...';

    const title = form.querySelector('#topic-title')?.value || '[Topic Title]';
    const category = form.querySelector('#topic-category')?.value;
    const date = form.querySelector('#topic-date')?.value || this.topicFormState.date || '';
    const region = form.querySelector('#topic-region')?.value || '[Region]';
    const country = form.querySelector('#topic-country')?.value || '[Country]';
    const summary = form.querySelector('#topic-summary')?.value || '[Summary]';
    const searchHint = form.querySelector('#topic-search-hint')?.value || this.topicFormState.searchHint || '';
    const locationPrecision = this.topicFormState.locationPrecision || '';
    const regionalLabel = this.topicFormState.regionalLabel || '';
    
    const layer = this.layers.find(l => l.id === category);
    const layerName = layer ? layer.name : '[Category]';
    const temporalStrategy = this.getResearchTemporalStrategy({
      layerId: category,
      date,
      timeScope: this.topicResearchSettings.timeScope,
      geographicScope: this.topicResearchSettings.geographicScope,
      regionalLabel,
      isRegionalProposal: this.isRegionalProposalWorkspace(),
      isRegionalLayer: Boolean(layer?.sortByRegionalContext)
    });
    
    const { SOURCE_CATEGORIES } = this.getResearchData();
    const selectedSourceNames = Array.from(this.topicResearchSettings.sources)
      .map(id => SOURCE_CATEGORIES.find(s => s.id === id)?.name)
      .filter(Boolean);
    
    const modeLabels = {
      'post-draft': 'Create a social media post',
      'research-brief': 'Generate a comprehensive research brief',
      'compare-sources': 'Compare perspectives from different sources',
      'suggest-angles': 'Suggest research angles and related topics'
    };
    
    const modeAction = modeLabels[this.topicResearchSettings.researchMode] || 'Research';
    
    let prompt = `${modeAction} about:\n\n`;
    prompt += `Topic: ${title}\n`;
    prompt += `Category: ${layerName}\n`;
    prompt += `Location: ${region}, ${country}\n`;
    prompt += `${temporalStrategy.promptDateLine}\n`;
    prompt += `Geographic Scope: ${this.topicResearchSettings.geographicScope}\n`;
    prompt += `Time Scope: ${this.topicResearchSettings.timeScope}\n`;
    if (locationPrecision) {
      prompt += `Map Precision: ${locationPrecision}\n`;
    }
    prompt += `\n`;
    
    if (summary && summary.trim()) {
      prompt += `Context: ${summary}\n\n`;
    }
    if (searchHint && searchHint.trim()) {
      prompt += `User Focus: ${searchHint.trim()}\n\n`;
    }
    
    prompt += `Source Strategy: ${selectedSourceNames.join(', ') || 'All sources'}\n`;
    if (this.topicResearchSettings.trustedOnly) {
      prompt += `Filter: Trusted/verified sources only\n`;
    }
    prompt += `Output Intent: ${this.topicResearchSettings.outputIntent}\n`;
    prompt += `Timing Strategy: ${temporalStrategy.detailLabel}\n`;
    
    const localFocusLines = [];
    if (regionalLabel) localFocusLines.push(`Regional focus: ${regionalLabel}`);
    if (locationPrecision) localFocusLines.push(`Map precision: ${locationPrecision}`);
    if (searchHint) localFocusLines.push(`User focus: ${searchHint}`);
    if (localFocusLines.length > 0) {
      prompt += `\n\n## Local User Focus\n${localFocusLines.join('\n')}`;
    }

    const responseLanguage = this.getResearchResponseLanguage();
    prompt += `\n\n## Response Language\nWrite the full response in ${responseLanguage.name} (${responseLanguage.code}). Keep source names, publication names, and official organization titles in their original language when useful, but write summaries, headings, bullets, and post drafts in ${responseLanguage.name}. Use clean UTF-8 text with no mojibake, broken punctuation, or malformed links.`;

    return prompt;
  }

  async generateSummary() {
    const form = this.container.querySelector('#topic-form');
    const titleInput = form.querySelector('#topic-title');
    const categorySelect = form.querySelector('#topic-category');
    const countryInput = form.querySelector('#topic-country');
    const regionInput = form.querySelector('#topic-region');
    const summaryTextarea = form.querySelector('#topic-summary');
    const btn = this.container.querySelector('[data-action="generate-summary"]');
    
    if (!titleInput?.value) {
      alert('Please enter a title first');
      return;
    }
    
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-small"></div> Generating...';
    btn.disabled = true;
    
    try {
      const layer = this.layers.find(l => l.id === categorySelect?.value);
      const layerName = layer?.name || 'general topic';
      
      const prompt = `Generate a concise summary (2-3 sentences) for the following topic:

Title: ${titleInput.value}
Category: ${layerName}
${countryInput?.value ? `Location: ${regionInput?.value || ''}, ${countryInput.value}` : ''}

The summary should be factual, informative, focus on the latest/most recent developments, and be suitable for a data intelligence dashboard.`;
      
      const completion = await window.ourEarthAI.createChatCompletion({
        messages: [
          {
            role: "system",
            content: "You are a professional research assistant. Generate concise, factual summaries."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });
      
      summaryTextarea.value = completion.content.trim();
      this.topicFormState.summary = completion.content.trim();
      
      btn.innerHTML = 'Generated';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Error generating summary:', error);
      alert(this.getActionErrorMessage(error, 'Summary suggestion'));
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }

  getDraftWebSearchWindow(dateValue = '') {
    const anchor = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
    const safeAnchor = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
    const start = new Date(safeAnchor);
    const end = new Date(safeAnchor);
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  parseDraftWebEvidenceResponse(content = '') {
    const text = String(content || '').trim();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch (_error) {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return {};
      try {
        return JSON.parse(match[0]);
      } catch (error) {
        console.warn('[Draft WWW] Could not parse web evidence JSON:', error);
        return {};
      }
    }
  }

  async checkDraftWebEvidence(button = null) {
    const form = this.container.querySelector('#topic-form');
    if (!form) return;

    this.saveFormState();

    const title = String(this.topicFormState.title || '').trim();
    const summary = String(this.topicFormState.summary || '').trim();
    const sourceHint = (this.topicSources || [])
      .filter(source => source.name || source.url)
      .slice(0, 3)
      .map(source => [source.name, source.url].filter(Boolean).join(' - '))
      .join('\n');
    if (!title && !summary) {
      alert('Add a title, summary, or verified evidence first, then run Web Search.');
      return;
    }

    const returnTab = button?.dataset?.returnTab || this.topicBuilderTab || 'describe';
    const status = this.container.querySelector('[data-draft-www-status]');
    const originalHTML = button?.innerHTML || '';
    if (button) {
      button.innerHTML = '<div class="spinner-small"></div> Checking...';
      button.disabled = true;
    }
    if (status) status.textContent = 'Checking web evidence around the draft date...';

    const layer = this.layers.find(l => l.id === this.topicFormState.category);
    const dateWindow = this.getDraftWebSearchWindow(this.topicFormState.date);
    const location = [this.topicFormState.region, this.topicFormState.country].filter(Boolean).join(', ');
    const apiSummary = this.getAiApiSummary();

    const prompt = `Check the public web for evidence related to this topic draft. Use the configured web/search-capable provider when available. Prefer reliable official, scientific, local authority, NGO, or reputable media sources.

Topic: ${title || '[untitled]'}
Summary: ${summary || '[no summary]'}
Current evidence:
${sourceHint || '[none yet]'}
Layer/category: ${layer?.name || this.topicFormState.category || 'general'}
Location: ${location || 'not specified'}
Draft date: ${this.topicFormState.date || 'not specified'}
Search window: ${dateWindow.start} to ${dateWindow.end} (one week before and one week after the draft date)

Return ONLY a JSON object, no markdown, with this shape:
{
  "sources": [
    { "name": "Source title", "url": "https://...", "category": "official|scientific|media|ngo|local", "reliability": "high|medium", "reason": "short reason" }
  ],
  "images": [
    { "url": "https://...", "sourceUrl": "https://...", "sourceName": "Source title", "caption": "short caption" }
  ],
  "suggestedSettings": {
    "geographicScope": "local|regional|national|international",
    "timeScope": "today|recent|historical|future",
    "outputIntent": "brief|analysis|social-post",
    "trustedOnly": true
  }
}

Rules:
- Include 3-5 source URLs maximum.
- Include up to 3 image URLs only when they look directly usable as images. If unsure, omit images and keep the page as a source.
- Do not invent URLs. If live web search is unavailable, return likely search targets with empty url fields rather than fake links.`;

    try {
      const completion = await window.ourEarthAI.createChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are a careful web evidence assistant for a topic draft. Return strict JSON only. Never fabricate URLs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        json: true,
        temperature: 0.1
      });

      const parsed = this.parseDraftWebEvidenceResponse(completion.content || '');
      const applied = this.applyDraftWebEvidenceResult(parsed);
      this.showSourceEditor = true;
      this.topicBuilderTab = this.normalizeTopicBuilderTab(returnTab);
      this.setTopicDraftStatus({
        ...(this.topicDraftStatus || {}),
        state: this.topicDraftStatus?.state || 'unsaved',
        title: this.topicFormState.title || this.topicDraftStatus?.title || 'Topic draft',
        message: `${applied.sources} source${applied.sources === 1 ? '' : 's'} and ${applied.media} media candidate${applied.media === 1 ? '' : 's'} added from ${apiSummary.textProviderName || apiSummary.textProvider || 'linked AI'}.`
      });
      this.renderCreateTopic();
    } catch (error) {
      console.error('[Draft WWW] Web evidence check failed:', error);
      if (status) status.textContent = this.getActionErrorMessage(error, 'Draft web check');
      alert(this.getActionErrorMessage(error, 'Draft web check'));
      if (button) {
        button.innerHTML = originalHTML;
        button.disabled = false;
      }
    }
  }

  applyDraftWebEvidenceResult(result = {}) {
    const sources = Array.isArray(result.sources) ? result.sources : [];
    const images = Array.isArray(result.images) ? result.images : [];
    let addedSources = 0;
    let addedMedia = 0;

    sources.forEach(source => {
      const url = this.sanitizeUrl(source.url || '');
      if (!url) return;
      const name = String(source.name || this.getHostFromUrl(url) || '').trim();
      const duplicate = this.topicSources.some(existing => (
        url && String(existing.url || '') === url
      ));
      if (duplicate) return;
      this.topicSources.push({
        name: name || 'Web evidence',
        url,
        category: source.category || 'source',
        reliability: source.reliability || 'medium',
        adminNotes: source.reason || '',
        verified: Boolean(url),
        webChecked: true
      });
      addedSources += 1;
    });

    images.forEach(image => {
      if (addedMedia >= 3) return;
      const imageUrl = this.sanitizeUrl(image.url || '');
      if (!imageUrl || !this.getDirectImageUrl(imageUrl)) return;
      const sourceUrl = this.sanitizeUrl(image.sourceUrl || imageUrl) || imageUrl;
      const token = this.createMediaToken({
        url: imageUrl,
        sourceUrl,
        sourceName: image.sourceName || this.getHostFromUrl(sourceUrl) || 'Web image',
        caption: image.caption || '',
        provider: 'draft-www-check'
      });
      if (this.addMediaTokenToCurrentPoint(token)) {
        addedMedia += 1;
      }
    });

    const settings = result.suggestedSettings || {};
    if (settings && typeof settings === 'object') {
      const allowedGeo = ['local', 'regional', 'national', 'international'];
      const allowedTime = ['today', 'recent', 'historical', 'future'];
      const allowedIntent = ['brief', 'analysis', 'social-post'];
      if (allowedGeo.includes(settings.geographicScope)) this.topicResearchSettings.geographicScope = settings.geographicScope;
      if (allowedTime.includes(settings.timeScope)) this.topicResearchSettings.timeScope = settings.timeScope;
      if (allowedIntent.includes(settings.outputIntent)) this.topicResearchSettings.outputIntent = settings.outputIntent;
      if (typeof settings.trustedOnly === 'boolean') this.topicResearchSettings.trustedOnly = settings.trustedOnly;
      this.topicFormState.geographicScope = this.topicResearchSettings.geographicScope;
      this.topicFormState.timeScope = this.topicResearchSettings.timeScope;
      this.topicFormState.outputIntent = this.topicResearchSettings.outputIntent;
      this.topicFormState.trustedOnly = this.topicResearchSettings.trustedOnly;
    }

    return { sources: addedSources, media: addedMedia };
  }
  
  async generateInsight() {
    const form = this.container.querySelector('#topic-form');
    const titleInput = form.querySelector('#topic-title');
    const summaryTextarea = form.querySelector('#topic-summary');
    const categorySelect = form.querySelector('#topic-category');
    const insightTextarea = form.querySelector('#topic-insight');
    const btn = this.container.querySelector('[data-action="generate-insight"]');
    
    if (!titleInput?.value || !summaryTextarea?.value) {
      alert('Please enter a title and summary first');
      return;
    }
    
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-small"></div> Generating...';
    btn.disabled = true;
    
    try {
      const layer = this.layers.find(l => l.id === categorySelect?.value);
      const layerName = layer?.name || 'general topic';
      
      const prompt = `Based on the following information, generate an analytical insight (2-3 sentences) that provides context, implications, or deeper understanding:

Title: ${titleInput.value}
Category: ${layerName}
Summary: ${summaryTextarea.value}

Provide expert analysis focusing on the latest developments, potential implications, or broader context.`;
      
      const completion = await window.ourEarthAI.createChatCompletion({
        messages: [
          {
            role: "system",
            content: "You are an expert analyst. Generate insightful analysis that provides valuable context and implications."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });
      
      insightTextarea.value = completion.content.trim();
      this.topicFormState.insight = completion.content.trim();
      
      btn.innerHTML = 'Generated';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Error generating insight:', error);
      alert(this.getActionErrorMessage(error, 'Insight suggestion'));
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }

  buildDraftLocationString(form = null) {
    const country = form?.querySelector('#topic-country')?.value || this.topicFormState.country || '';
    const region = form?.querySelector('#topic-region')?.value || this.topicFormState.region || '';
    const title = form?.querySelector('#topic-title')?.value || this.topicFormState.title || '';
    const location = [region, country].filter(Boolean).join(', ');
    return location || title;
  }

  normalizeCoordinateResult(coords = {}) {
    const lat = Number(coords.lat ?? coords.latitude);
    const lon = Number(coords.lon ?? coords.lng ?? coords.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return { lat, lon };
  }

  async geocodeDraftPlaceWithNominatim(locationString = '') {
    const query = String(locationString || '').trim();
    if (!query) return null;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('q', query);

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return null;

    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;
    return this.normalizeCoordinateResult(first || {});
  }

  getKnownPlaceCoordinates(locationString = '') {
    const normalizedLocation = String(locationString || '').toLowerCase();
    if (normalizedLocation.includes('limont') && normalizedLocation.includes('anthisnes')) {
      return { lat: 50.5077401, lon: 5.4922980 };
    }
    return null;
  }

  async geocodeDraftPlaceWithAi(locationString = '') {
    if (!window.ourEarthAI?.createChatCompletion) return null;

    const prompt = `Provide the precise geographic coordinates (latitude and longitude) for: ${locationString}

Return ONLY a JSON object with this exact format, no other text:
{
  "lat": <latitude as number>,
  "lon": <longitude as number>
}`;

    const completion = await window.ourEarthAI.createChatCompletion({
      messages: [
        {
          role: "system",
          content: "You are a geocoding assistant. Return precise coordinates in JSON format only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      json: true
    });

    return this.normalizeCoordinateResult(this.parseAiJsonObject(completion.content || '', 'coordinate JSON'));
  }

  applyDraftCoordinates(coords = {}, form = null) {
    const normalized = this.normalizeCoordinateResult(coords);
    if (!normalized) return false;

    const latValue = normalized.lat.toFixed(4);
    const lonValue = normalized.lon.toFixed(4);
    this.topicFormState.lat = latValue;
    this.topicFormState.lon = lonValue;

    const latInput = form?.querySelector('#topic-lat') || this.container.querySelector('#topic-lat');
    const lonInput = form?.querySelector('#topic-lon') || this.container.querySelector('#topic-lon');
    if (latInput) latInput.value = latValue;
    if (lonInput) lonInput.value = lonValue;

    if (this.callbacks.onShow) {
      this.callbacks.onShow({ lat: normalized.lat, lon: normalized.lon });
    }

    return true;
  }

  async ensureDraftCoordinatesFromPlace(options = {}) {
    const form = this.container.querySelector('#topic-form');
    const existingLatText = String(this.topicFormState.lat || form?.querySelector('#topic-lat')?.value || '').trim();
    const existingLonText = String(this.topicFormState.lon || form?.querySelector('#topic-lon')?.value || '').trim();
    const existingLat = Number(existingLatText);
    const existingLon = Number(existingLonText);
    if (existingLatText && existingLonText && Number.isFinite(existingLat) && Number.isFinite(existingLon)) return true;

    const locationString = this.buildDraftLocationString(form);
    if (!locationString) return false;

    try {
      const coords = await this.geocodeDraftPlaceWithNominatim(locationString)
        || this.getKnownPlaceCoordinates(locationString)
        || await this.geocodeDraftPlaceWithAi(locationString);
      if (!coords) throw new Error(`No coordinates found for ${locationString}`);
      return this.applyDraftCoordinates(coords, form);
    } catch (error) {
      if (!options.silent) {
        throw error;
      }
      console.warn('[Coordinates] Could not auto-fill draft coordinates:', error);
      return false;
    }
  }

  async generateCoordinates() {
    const form = this.container.querySelector('#topic-form');
    const btn = this.container.querySelector('[data-action="generate-coordinates"]');
    const locationString = this.buildDraftLocationString(form);

    if (!locationString) {
      alert('Please enter a country, region, or title first');
      return;
    }

    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-small"></div> Finding...';
    btn.disabled = true;

    try {
      const found = await this.ensureDraftCoordinatesFromPlace();
      if (!found) throw new Error('Invalid coordinates received');

      btn.innerHTML = 'Found';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('Error generating coordinates:', error);
      alert(this.getActionErrorMessage(error, 'Coordinate suggestion'));
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }

  submitTopic(mode = 'save') {
    const form = this.container.querySelector('#topic-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (this.editingTopicId && !this.canModifyCurrentTopic()) {
      this.blockUserMutation('update saved or published topics');
      return;
    }

    this.saveFormState(); // Save final state
    
    const isRegionalProposal = this.isRegionalProposalWorkspace() || AppAccess.isRegionalProposalTopic(this.currentPoint);
    const regionalContext = this.getRegionalProposalContext() || {};
    const searchHint = String(this.topicFormState.searchHint || this.currentPoint?.review?.userMessage || '').trim();
    const locationPrecision = this.topicFormState.locationPrecision || regionalContext.precision || regionalContext.scope || this.currentPoint?.locationPrecision || '';
    const regionalLabel = this.topicFormState.regionalLabel || this.getRegionalProposalContextLabel(regionalContext) || this.currentPoint?.storageMeta?.regionalLabel || '';
    
    // Get coordinates or use defaults
    let lat = parseFloat(this.topicFormState.lat);
    let lon = parseFloat(this.topicFormState.lon);
    const regionalLat = Number(regionalContext.lat);
    const regionalLon = Number(regionalContext.lon);
    
    // If no coordinates provided, use regional context first, then fallback default
    if (isNaN(lat) || isNaN(lon)) {
      if (Number.isFinite(regionalLat) && Number.isFinite(regionalLon)) {
        lat = regionalLat;
        lon = regionalLon;
      } else {
        lat = 48.8566; // Paris default
        lon = 2.3522;
      }
    }

    const mediaTokens = this.getMediaTokensForPoint(this.currentPoint || {});
    const workflowStatus = this.editingTopicId && this.currentPoint?.topicStatus
      ? this.currentPoint.topicStatus
      : (isRegionalProposal ? 'proposal-local' : 'browser-draft');
    const workflowMetadata = this.buildTopicWorkflowMetadata(this.currentPoint || {}, {
      status: workflowStatus,
      reviewStage: isRegionalProposal ? 'regional-proposal' : undefined,
      requestedBy: isRegionalProposal ? 'regional-user' : undefined,
      userMessage: searchHint,
      storageOrigin: 'browser-localStorage'
    });
    const regionalState = this.getCurrentRegionalTopicState({
      ...(this.currentPoint || {}),
      title: this.topicFormState.title,
      category: this.topicFormState.category,
      lat,
      lon,
      locationPrecision
    });

    // Preserve fever warning properties if editing a fever topic
    const topic = {
      id: this.editingTopicId || Date.now(),
      title: this.topicFormState.title,
      category: this.topicFormState.category,
      date: this.topicFormState.date,
      country: this.topicFormState.country || regionalContext.country || 'Unknown',
      region: this.topicFormState.region || regionalContext.region || regionalContext.city || 'Unknown',
      lat: lat,
      lon: lon,
      summary: this.topicFormState.summary,
      source: this.topicFormState.source || (isRegionalProposal ? 'Regional Proposal' : 'User Created'),
      insight: this.topicFormState.insight || '',
      sourceUrl: this.currentPoint?.sourceUrl || '',
      media: mediaTokens.map(token => token.url),
      mediaTokens,
      topicStory: this.buildTopicStoryForSave(),
      isCustom: true,
      originalTopicId: this.currentPoint?.originalTopicId || '',
      originalTitle: this.currentPoint?.originalTitle || '',
      locationPrecision,
      city: this.currentPoint?.city || regionalContext.city || '',
      initiativeType: this.currentPoint?.initiativeType || '',
      engagementTypes: Array.isArray(this.currentPoint?.engagementTypes) ? [...this.currentPoint.engagementTypes] : [],
      communityStatus: this.currentPoint?.communityStatus || '',
      regionalScope: this.currentPoint?.regionalScope || '',
      regionalState,
      ...workflowMetadata,
      storageMeta: {
        ...(this.currentPoint?.storageMeta || {}),
        workflow: isRegionalProposal ? 'regional-proposal' : (this.currentPoint?.storageMeta?.workflow || ''),
        regionalLabel,
        mapPrecision: locationPrecision,
        mapZoom: regionalContext.zoom || this.currentPoint?.storageMeta?.mapZoom || ''
      },
      researchSettings: {
        sources: Array.from(this.topicResearchSettings.sources),
        trustedOnly: this.topicResearchSettings.trustedOnly,
        researchMode: this.topicResearchSettings.researchMode,
        geographicScope: this.topicResearchSettings.geographicScope,
        timeScope: this.topicResearchSettings.timeScope,
        outputIntent: this.topicResearchSettings.outputIntent
      },
      researchSources: this.topicSources || [],
      // Preserve fever warning properties
      ...(this.currentPoint?.isFeverWarning && {
        isFeverWarning: true,
        year: this.currentPoint.year,
        level: this.currentPoint.level,
        scenario: this.currentPoint.scenario,
        ttsText: this.topicFormState.summary
      })
    };

    if (this.editingTopicId) {
      // Update existing topic
      if (this.callbacks.onTopicUpdate) {
        this.callbacks.onTopicUpdate(topic);
      }
      this.editingTopicId = null;
      this.show(topic); // Show updated detail view
    } else {
      // Create new topic
      if (this.callbacks.onTopicCreate) {
        this.callbacks.onTopicCreate(topic);
      }

      this.hide();
    }
  }

  deleteMedia(btn) {
    const mediaItem = btn.closest('.media-item');
    if (mediaItem && confirm('Remove this image?')) {
      mediaItem.remove();
    }
  }

  extractSourcesFromResearchOutput(outputContent) {
    const sources = [];
    outputContent.querySelectorAll('.source-item').forEach(item => {
      const link = item.querySelector('a.source-link, a[href]');
      const text = item.querySelector('.source-text')?.textContent?.trim();
      const url = link?.href || '';
      const name = link?.textContent?.trim() || text || this.getHostFromUrl(url) || '';

      if (name || url) {
        sources.push({
          name: name || 'Research source',
          url,
          category: 'research',
          verified: Boolean(url)
        });
      }
    });

    return sources;
  }
  
  postToTopic() {
    if (!this.canApplyResearchToCurrentTopic()) {
      this.blockUserMutation('apply AI output to a topic');
      return;
    }

    const outputContent = this.container.querySelector('.research-output-content');
    if (!outputContent || !this.currentPoint) return;
    
    // Extract edited text content (without media container)
    const clone = outputContent.cloneNode(true);
    const mediaContainer = clone.querySelector('.generated-media-container');
    if (mediaContainer) {
      mediaContainer.remove();
    }
    const textContent = clone.innerHTML.trim();
    
    // Extract remaining media tokens
    const mediaTokens = [];
    const mediaImages = outputContent.querySelectorAll('.generated-image[data-media-url]');
    mediaImages.forEach(img => {
      const token = this.createMediaToken({
        url: img.getAttribute('data-media-url') || '',
        sourceName: img.getAttribute('data-media-source-name') || 'Generated media',
        sourceUrl: img.getAttribute('data-media-source-url') || '',
        watermarkText: img.getAttribute('data-media-watermark') || '',
        generated: true,
        provider: 'research-output'
      });
      if (token.url) mediaTokens.push(token);
    });
    const finalMediaTokens = [
      ...this.getMediaTokensForPoint(this.currentPoint),
      ...mediaTokens
    ].filter((token, index, all) => (
      token.url && all.findIndex(candidate => candidate.url === token.url) === index
    )).slice(0, 3);

    const outputSources = this.extractSourcesFromResearchOutput(outputContent);
    const mergedSources = [
      ...(this.currentPoint.researchSources || []),
      ...outputSources
    ].filter((source, index, all) => {
      const key = source.url || source.name;
      return key && all.findIndex(candidate => (candidate.url || candidate.name) === key) === index;
    });
    
    const canUpdateExisting = Boolean(
      this.currentPoint.isCustom ||
      this.currentPoint.isFeverWarning ||
      this.currentPoint.isTippingPoint
    );

    const originalPoint = this.currentPoint;
    const updatedPoint = {
      ...originalPoint,
      insight: textContent,
      media: finalMediaTokens.map(token => token.url),
      mediaTokens: finalMediaTokens,
      researchSources: mergedSources,
      isCustom: true
    };

    if (this.callbacks.onTopicUpdate && canUpdateExisting) {
      this.currentPoint = updatedPoint;
      this.callbacks.onTopicUpdate(this.currentPoint);
    } else if (this.callbacks.onTopicCreate) {
      this.currentPoint = {
        ...updatedPoint,
        id: `research_${Date.now()}`,
        originalTopicId: originalPoint.id,
        originalTitle: originalPoint.title,
        isCustom: true
      };
      this.callbacks.onTopicCreate(this.currentPoint);
    }
    
    // Show feedback
    const btn = this.container.querySelector('[data-action="post-to-topic"]');
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = 'Applied to Topic Draft';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        // Refresh the detail view to show updated content
        this.renderDetail(this.currentPoint);
      }, 2000);
    }
  }
  
  updateLayers(layers) {
    this.layers = layers;
  }

  escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  getHostFromUrl(url = '') {
    return getTopicHostFromUrl(url);
  }

  getDirectImageUrl(url = '') {
    return getTopicDirectImageUrl(url);
  }

  canFetchSourcePageMetadata(url = '') {
    if (!url) return false;
    try {
      const parsed = new URL(url, window.location.href);
      return parsed.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  getActionErrorMessage(error, actionName = 'Action') {
    const message = String(error?.message || error || '').toLowerCase();
    if (message.includes('quota') || message.includes('billing') || message.includes('hard limit') || message.includes('429')) {
      return `${actionName} is blocked by the current AI quota or billing limit. The draft is still editable; switch provider or update API settings, then try again.`;
    }
    if (message.includes('timed out') || message.includes('timeout')) {
      return `${actionName} took too long. Keep the draft, narrow the request, or try again.`;
    }
    if (message.includes('failed to fetch') || message.includes('cors')) {
      return `${actionName} could not read that source from the browser. Keep the URL as a source, add media manually, or use an admin proxy later.`;
    }
    if (message.includes('no direct image') || message.includes('no media url')) {
      return `${actionName} needs a direct image URL. Keep the page as a source, add a YouTube/site link, upload a file, or generate an image from the draft.`;
    }
    if (message.includes('disabled') || message.includes('no linked')) {
      return `${actionName} needs a linked AI provider. Open API settings, choose a provider, then try again.`;
    }
    return `${actionName} did not finish. The draft is still editable; check API settings or try again with a smaller request.`;
  }

  createMediaToken(input = {}) {
    return createTopicMediaToken(input);
  }

  renderTopicManagementSummary(isEditing = false) {
    const requiredFields = [
      this.topicFormState.title,
      this.topicFormState.category,
      this.topicFormState.date,
      this.topicFormState.summary
    ];
    const completedRequired = requiredFields.filter(value => String(value || '').trim()).length;
    const sourceCount = (this.topicSources || []).filter(source => source.name || source.url).length;
    const mediaCount = this.getMediaTokensForPoint(this.currentPoint || {}).length;
    const reviewReady = completedRequired === requiredFields.length && sourceCount > 0;
    const items = [
      {
        label: 'Compose',
        value: `${completedRequired}/${requiredFields.length}`,
        state: completedRequired === requiredFields.length ? 'ready' : 'pending'
      },
      {
        label: 'Evidence',
        value: sourceCount > 0 ? `${sourceCount}` : 'Add proof',
        state: sourceCount > 0 ? 'ready' : 'pending'
      },
      {
        label: 'Photos',
        value: `${mediaCount}/3`,
        state: mediaCount > 0 ? 'ready' : 'optional'
      },
      {
        label: 'AI',
        value: 'Optional',
        state: 'optional'
      },
      {
        label: 'Review',
        value: isEditing ? 'Update' : (reviewReady ? 'Ready' : 'Check'),
        state: reviewReady || isEditing ? 'ready' : 'pending'
      }
    ];

    return `
      <div class="topic-management-summary" aria-label="Topic management status">
        ${items.map(item => `
          <div class="topic-management-item ${item.state}">
            <span class="topic-management-label">${this.escapeHtml(item.label)}</span>
            <span class="topic-management-value">${this.escapeHtml(item.value)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  normalizeMediaToken(input) {
    return normalizeTopicMediaToken(input);
  }

  getMediaTokensForPoint(point = {}) {
    return getTopicMediaTokensForPoint(point);
  }

  isEmbeddableMediaUrl(url = '') {
    const value = String(url || '').trim();
    if (!value) return false;
    return /\.html(?:[?#].*)?$/i.test(value)
      || /^\/?examples\//i.test(value)
      || /^\.\/examples\//i.test(value);
  }

  renderMediaTokenImage(token, imageClass = 'generated-image', alt = 'Media image') {
    const normalized = this.normalizeMediaToken(token);
    if (!normalized?.url && !normalized?.browserAssetKey) return '';

    if (!normalized.url && normalized.browserAssetKey) {
      this.scheduleBrowserMediaHydration();
    }

    if (this.isEmbeddableMediaUrl(normalized.url)) {
      return `
        <div class="media-token-frame media-token-frame-embed">
          <iframe
            src="${this.escapeHtml(normalized.url)}"
            title="${this.escapeHtml(alt)}"
            class="${this.escapeHtml(imageClass)} topic-media-embed-preview"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
          ></iframe>
          <div class="media-token-watermark">${this.escapeHtml(normalized.watermarkText || 'Embedded preview')}</div>
        </div>
      `;
    }

    const browserAssetAttrs = normalized.browserAssetKey
      ? `data-browser-asset-key="${this.escapeHtml(normalized.browserAssetKey)}"`
      : '';
    const browserAssetClass = normalized.browserAssetKey && !normalized.url ? ' browser-asset-pending' : '';

    return `
      <div class="media-token-frame">
        <img
          src="${this.escapeHtml(normalized.url)}"
          alt="${this.escapeHtml(alt)}"
          class="${this.escapeHtml(imageClass + browserAssetClass)}"
          data-media-url="${this.escapeHtml(normalized.url)}"
          data-media-source-name="${this.escapeHtml(normalized.sourceName)}"
          data-media-source-url="${this.escapeHtml(normalized.sourceUrl)}"
          data-media-watermark="${this.escapeHtml(normalized.watermarkText)}"
          ${browserAssetAttrs}
        >
        <div class="media-token-watermark">${this.escapeHtml(normalized.watermarkText)}</div>
      </div>
    `;
  }

  scheduleBrowserMediaHydration() {
    clearTimeout(this.browserMediaHydrationTimer);
    this.browserMediaHydrationTimer = setTimeout(() => this.hydrateBrowserMediaAssets(), 0);
  }

  async hydrateBrowserMediaAssets() {
    const images = Array.from(this.container.querySelectorAll('img[data-browser-asset-key]'));
    for (const image of images) {
      if (image.getAttribute('src')) continue;

      try {
        const record = await LocalStorage.getBrowserAsset(image.dataset.browserAssetKey);
        if (record?.dataUrl) {
          image.src = record.dataUrl;
          image.classList.remove('browser-asset-pending');
        } else {
          image.alt = `${image.alt || 'Media'} (browser cache missing)`;
        }
      } catch (error) {
        console.warn('[Media] Could not hydrate browser cached image:', error);
      }
    }
  }

  addMediaTokenToCurrentPoint(token) {
    const normalized = this.normalizeMediaToken(token);
    if (!normalized?.url) return false;

    if (!this.currentPoint) {
      this.currentPoint = { media: [], mediaTokens: [] };
    }

    this.currentPoint.media = this.currentPoint.media || [];
    this.currentPoint.mediaTokens = this.currentPoint.mediaTokens || [];

    if (this.currentPoint.media.length >= 3) return false;

    this.currentPoint.media.push(normalized.url);
    this.currentPoint.mediaTokens.push(normalized);
    return true;
  }

  getAiApiSummary() {
    if (window.ourEarthAI?.getSummary) {
      return window.ourEarthAI.getSummary();
    }

    const settings = Settings.get();
    const hasLinkedProviderSummary = Boolean(
      settings.aiApiTextProvider ||
      settings.aiApiTextModel ||
      settings.aiApiImageProvider ||
      settings.aiApiImageModel ||
      settings.aiApiSttProvider ||
      settings.aiApiSttModel ||
      settings.aiVoiceProvider ||
      settings.aiVoiceModel ||
      settings.aiVoiceVoice
    );
    return {
      linked: settings.aiApiLinked || hasLinkedProviderSummary,
      providerConfigured: hasLinkedProviderSummary,
      textProviderName: settings.aiApiTextProvider,
      textModel: settings.aiApiTextModel,
      textMaxModel: settings.aiApiTextMaxModel,
      textMaxDetectedAt: settings.aiApiTextMaxDetectedAt,
      imageProviderName: settings.aiApiImageProvider,
      imageModel: settings.aiApiImageModel,
      sttActiveMode: settings.aiApiSttProvider && settings.aiApiSttProvider !== 'browser' ? 'external' : 'browser',
      sttProvider: settings.aiApiSttProvider || 'browser',
      sttProviderName: settings.aiApiSttProvider && settings.aiApiSttProvider !== 'browser' ? settings.aiApiSttProvider : 'Browser STT',
      sttModel: settings.aiApiSttModel || '',
      sttHasKey: false,
      ttsActiveMode: settings.aiVoiceEnabled ? 'external' : 'browser',
      ttsProvider: settings.aiVoiceProvider,
      ttsProviderName: settings.aiVoiceProvider === 'openai-tts' ? 'OpenAI TTS' : settings.aiVoiceProvider,
      ttsModel: settings.aiVoiceModel,
      ttsVoice: settings.aiVoiceVoice,
      ttsHasKey: false,
      lastSyncedAt: settings.aiApiLastSyncedAt,
      webSearchCapable: false
    };
  }

  formatAiApiTimestamp(value) {
    if (!value) return 'Not synced yet';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return 'Not synced yet';
    }
  }

  renderAiApiModelBadges(summary = this.getAiApiSummary()) {
    return '';
  }

  updateAiApiStatus(summary = this.getAiApiSummary()) {
    const statusPill = this.container.querySelector('#ai-api-link-status');
    const meta = this.container.querySelector('#ai-api-link-meta');
    const badges = this.container.querySelector('#ai-api-model-badges');
    const syncTime = this.container.querySelector('#ai-api-sync-time');

    if (!statusPill || !meta || !summary) return;

    statusPill.className = `ai-api-status-pill ${summary.linked ? 'linked' : 'unlinked'}`;
    statusPill.textContent = summary.linked ? 'Linked' : 'Not linked';

    const textProvider = summary.textProviderName || summary.textProvider || 'No text provider selected';
    const textModel = summary.textModel || 'No model selected';
    const imageProvider = summary.imageProviderName || summary.imageProvider || 'No image provider selected';
    const ttsProvider = summary.ttsProviderName || summary.ttsProvider || 'Browser TTS';
    const ttsVoice = summary.ttsActiveMode === 'external'
      ? `${summary.ttsVoice || 'auto'}${summary.ttsHasKey ? '' : ' (no key on this origin)'}`
      : 'browser';
    const sttProvider = summary.sttProviderName || summary.sttProvider || 'Browser STT';
    const sttModel = summary.sttActiveMode === 'external' ? summary.sttModel || 'default' : 'browser';
    const webSearchMode = summary.webSearchCapable ? 'Live web-search capable' : 'Manual search/update';

    meta.innerHTML = `
      <span><strong>Text:</strong> ${this.escapeHtml(textProvider)}${textModel ? ` / ${this.escapeHtml(textModel)}` : ''}</span>
      <span><strong>Image:</strong> ${this.escapeHtml(imageProvider)}</span>
      <span><strong>TTS:</strong> ${this.escapeHtml(ttsProvider)} / ${this.escapeHtml(ttsVoice)}</span>
      <span><strong>STT:</strong> ${this.escapeHtml(sttProvider)} / ${this.escapeHtml(sttModel)}</span>
      <span><strong>Mode:</strong> ${this.escapeHtml(webSearchMode)}</span>
    `;

    if (badges) {
      badges.outerHTML = this.renderAiApiModelBadges(summary);
    }

    if (syncTime) {
      syncTime.textContent = this.formatAiApiTimestamp(summary.lastSyncedAt);
    }
  }

  async refreshAiApiSettingsStatus(button = null) {
    const summary = window.ourEarthAI?.syncFromStorage
      ? window.ourEarthAI.syncFromStorage('settings-refresh')
      : this.getAiApiSummary();

    this.updateAiApiStatus(summary);

    let detectedMaxModel = false;
    if (window.ourEarthAI?.detectOpenAiTextModelCeiling) {
      try {
        const status = await window.ourEarthAI.detectOpenAiTextModelCeiling();
        detectedMaxModel = Boolean(status?.openaiTextMaxModel);
        Settings.set({
          aiApiTextMaxModel: status?.openaiTextMaxModel || '',
          aiApiTextMaxDetectedAt: status?.openaiTextMaxDetectedAt || null
        });
        this.updateAiApiStatus(this.getAiApiSummary());
      } catch (error) {
        console.warn('[Settings] Could not detect OpenAI max model:', error);
      }
    }

    if (button) {
      const originalText = button.textContent;
      button.textContent = detectedMaxModel
        ? 'Models refreshed'
        : summary.linked ? 'Link refreshed' : 'No saved API settings';
      setTimeout(() => {
        button.textContent = originalText;
      }, 1600);
    }
  }

  getApiSettingsWidgetUrl() {
    const settingsUrl = Settings.get().aiApiSettingsFrameUrl;
    if (settingsUrl) return settingsUrl;

    return AppAccess.isAdminMode()
      ? Settings.API_SETTINGS_WIDGET_URLS.ADMIN
      : Settings.API_SETTINGS_WIDGET_URLS.USER;
  }

  getApiSettingsFrameSrc() {
    const configuredSrc = this.getApiSettingsWidgetUrl();

    try {
      const url = new URL(configuredSrc, window.location.href);
      url.searchParams.set('embed', 'true');
      url.searchParams.set('source', 'topic-earth');
      return url.href;
    } catch {
      return configuredSrc;
    }
  }

  openApiSettingsWindow() {
    const existingOverlay = document.getElementById('api-settings-overlay');
    if (existingOverlay) {
      existingOverlay.classList.remove('api-settings-overlay-hidden');
      existingOverlay.setAttribute('aria-hidden', 'false');
      return;
    }

    const frameSrc = this.getApiSettingsFrameSrc();

    const overlay = document.createElement('div');
    overlay.id = 'api-settings-overlay';
    overlay.className = 'api-settings-overlay';
    overlay.innerHTML = `
      <div class="api-settings-overlay-frame" role="dialog" aria-label="API settings">
        <button class="api-settings-overlay-close" type="button" aria-label="Close API settings">Close</button>
        <iframe
          id="api-settings-overlay-iframe"
          class="api-settings-overlay-iframe"
          src="${this.escapeHtml(frameSrc)}"
          title="API settings"
          width="430"
          height="600"
        ></iframe>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.api-settings-overlay-close')?.addEventListener('click', () => {
      this.closeApiSettingsOverlay();
    });

    overlay.querySelector('#api-settings-overlay-iframe')?.addEventListener('load', () => {
      this.refreshAiApiSettingsStatus();
    });
  }

  closeApiSettingsOverlay() {
    const overlay = document.getElementById('api-settings-overlay');
    if (overlay) {
      overlay.classList.add('api-settings-overlay-hidden');
      overlay.setAttribute('aria-hidden', 'true');
      this.refreshAiApiSettingsStatus();
    }
  }

  async exportAdminTopicZip(button = null) {
    if (!AppAccess.isAdminMode()) {
      alert('Admin mode is required to export topics.');
      return;
    }

    const originalText = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = 'Preparing package...';
    }

    try {
      const result = await downloadAdminTopicPackage();
      if (button) {
        button.textContent = `Downloaded ${result.topicCount} draft${result.topicCount === 1 ? '' : 's'}`;
      }

      const status = this.container.querySelector('#admin-topic-export-status');
      if (status) {
        status.textContent = `${result.filename} downloaded for admin review with ${result.packagedMediaCount}/${result.mediaCount} media assets packaged.`;
      }

      if (result.warnings?.length) {
        console.warn('[Topic Package] Package warnings:', result.warnings);
      }
    } catch (error) {
      console.error('[Topic Package] Failed:', error);
      alert(`Could not download the admin package: ${error.message || error}`);
      if (button) {
        button.textContent = originalText || 'Download Admin Package';
      }
    } finally {
      if (button) {
        setTimeout(() => {
          button.disabled = false;
          button.textContent = originalText || 'Download Admin Package';
        }, 1800);
      }
    }
  }

  async submitCurrentTopicPackage(button = null) {
    if (!this.isAdminMode()) {
      this.blockUserMutation('download admin submit packages');
      return;
    }

    if (!this.currentPoint) {
      alert('Open a topic first, then submit its ZIP package.');
      return;
    }

    const originalText = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = 'Preparing ZIP...';
    }

    try {
      const topicForSubmission = { ...this.currentPoint };
      const regionalState = this.getCurrentRegionalTopicState(topicForSubmission);
      if (regionalState) {
        topicForSubmission.regionalState = regionalState;
      }

      const result = await downloadTopicAdminSubmission(topicForSubmission);
      const status = this.container.querySelector('#topic-submit-status');

      if (status) {
        status.innerHTML = `
          <strong>${this.escapeHtml(result.filename)}</strong> downloaded.
          Attach this ZIP to your chosen admin review message when ready.
        `;
      }

      if (button) {
        button.textContent = 'ZIP Downloaded';
      }

      if (result.warnings?.length) {
        console.warn('[Topic Package] Submission package warnings:', result.warnings);
      }
    } catch (error) {
      console.error('[Topic Package] Submit package failed:', error);
      alert(`Could not download this topic ZIP: ${error.message || error}`);
      if (button) {
        button.textContent = originalText || 'Submit ZIP';
      }
    } finally {
      if (button) {
        setTimeout(() => {
          button.disabled = false;
          button.textContent = originalText || 'Submit ZIP';
        }, 1800);
      }
    }
  }

  deleteCurrentTopic() {
    if (!this.canDeleteCurrentTopic()) {
      this.blockUserMutation('remove topics');
      return;
    }

    if (!this.currentPoint) {
      alert('Open a topic first, then remove it.');
      return;
    }

    if (this.callbacks.onTopicDelete) {
      this.callbacks.onTopicDelete(this.currentPoint);
    }
  }

  showTopicMediaZoom(url, caption = 'Topic media') {
    if (!url) return;

    const content = this.container.querySelector('#detail-content');
    const mediaSection = content?.querySelector('.topic-media-grid')?.closest('.detail-section');
    if (!content || !mediaSection) return;

    let zoomPanel = content.querySelector('#topic-media-zoom-panel');
    if (!zoomPanel) {
      zoomPanel = document.createElement('div');
      zoomPanel.id = 'topic-media-zoom-panel';
      zoomPanel.className = 'topic-media-zoom-panel';
      mediaSection.appendChild(zoomPanel);
    }

    const isEmbed = this.isEmbeddableMediaUrl(url);
    zoomPanel.innerHTML = `
      <div class="topic-media-zoom-header">
        <span>${this.escapeHtml(caption || 'Topic media')}</span>
        <button class="topic-media-zoom-close" data-action="close-topic-media-zoom" title="Close media zoom">Close</button>
      </div>
      ${isEmbed
        ? `<iframe src="${this.escapeHtml(url)}" title="${this.escapeHtml(caption || 'Topic media')}" class="topic-media-zoom-embed" sandbox="allow-scripts allow-same-origin"></iframe>`
        : `<img src="${this.escapeHtml(url)}" alt="${this.escapeHtml(caption || 'Topic media')}" class="topic-media-zoom-image">`}
    `;
    zoomPanel.classList.remove('hidden');
    zoomPanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  closeTopicMediaZoom() {
    const zoomPanel = this.container.querySelector('#topic-media-zoom-panel');
    if (zoomPanel) {
      zoomPanel.classList.add('hidden');
      zoomPanel.innerHTML = '';
    }
  }

  showSettings(ttsManager) {
    this.mode = 'settings';
    const compactSettingsPanel = window.matchMedia?.('(max-width: 768px), (max-height: 650px)').matches;
    this.setPanelSize(compactSettingsPanel ? 'compact' : 'middle');
    this.ttsManager = ttsManager;
    this.renderSettings();
    this.container.classList.remove('hidden');
    this.updateTopicNavigation();
    window.dispatchEvent(new CustomEvent('settingsOpened'));
  }

  getSettingsLanguageState(settings) {
    const detectedLang = settings.detectedBrowserLanguage || LanguageManager.detectBrowserLanguage();
    const currentLang = settings.autoDetectLanguage
      ? detectedLang
      : (settings.uiLanguage || detectedLang);

    return { detectedLang, currentLang };
  }

  renderLanguageOptions(languages, currentLang) {
    return languages.map(lang => `
      <option
        value="${this.escapeHtml(lang.code)}"
        ${currentLang === lang.code ? 'selected' : ''}
      >
        ${this.escapeHtml(lang.nativeName)} (${this.escapeHtml(lang.name)})
      </option>
    `).join('');
  }

  renderLanguageChoiceButtons(languages, currentLang, action = 'set-ui-language') {
    return languages.map(lang => {
      const active = currentLang === lang.code;
      return `
        <button
          type="button"
          class="language-choice${active ? ' active' : ''}"
          data-action="${this.escapeHtml(action)}"
          data-language="${this.escapeHtml(lang.code)}"
          aria-pressed="${active ? 'true' : 'false'}"
        >
          <span class="language-choice-native">${this.escapeHtml(lang.nativeName)}</span>
          <span class="language-choice-name">${this.escapeHtml(lang.name)}</span>
        </button>
      `;
    }).join('');
  }

  getVoiceChoicesForLanguage(langCode) {
    this.ttsManager?.refreshVoices?.();
    const allVoices = this.ttsManager?.getAllVoices?.() || [];
    const matchingVoices = this.ttsManager?.getVoicesForLanguage?.(langCode) || [];

    return {
      allVoices,
      voices: matchingVoices,
      matchingCount: matchingVoices.length
    };
  }

  getLanguageSafePreferredVoice(langCode, preferredVoice = '') {
    if (!preferredVoice) return '';
    this.ttsManager?.refreshVoices?.();
    const voice = (this.ttsManager?.getAllVoices?.() || [])
      .find(candidate => candidate.name === preferredVoice);
    return voice && this.ttsManager?.voiceMatchesLanguage?.(voice, LanguageManager.getSpeechCode(langCode))
      ? preferredVoice
      : '';
  }

  renderBrowserVoiceOptions(voices, preferredVoice, langCode) {
    const autoLabel = LanguageManager.getLabel('settings.voiceAuto', langCode);

    return `
      <option value="">${this.escapeHtml(autoLabel)}</option>
      ${voices.map(voice => `
        <option
          value="${this.escapeHtml(voice.name)}"
          ${preferredVoice === voice.name ? 'selected' : ''}
        >
          ${this.escapeHtml(voice.name)}${voice.lang ? ` (${this.escapeHtml(voice.lang)})` : ''}
        </option>
      `).join('')}
    `;
  }

  getVoiceFilterHint(langCode, matchingCount, totalCount) {
    const language = LanguageManager.getLanguageInfo(langCode)?.nativeName || langCode;

    if (matchingCount > 0) {
      return LanguageManager.formatLabel('settings.voiceFiltered', langCode, {
        count: matchingCount,
        language
      });
    }

    return LanguageManager.formatLabel('settings.voiceFallback', langCode, {
      count: totalCount,
      language
    });
  }

  updateBrowserVoicePicker(content, langCode, preferredVoice = '') {
    const voiceSelect = content.querySelector('#browser-voice');
    if (!voiceSelect) return;

    const { allVoices, voices, matchingCount } = this.getVoiceChoicesForLanguage(langCode);
    const safePreferredVoice = this.getLanguageSafePreferredVoice(langCode, preferredVoice);
    voiceSelect.innerHTML = this.renderBrowserVoiceOptions(voices, safePreferredVoice, langCode);
    voiceSelect.value = safePreferredVoice;

    const voiceHint = content.querySelector('#browser-voice-hint');
    if (voiceHint) {
      voiceHint.textContent = this.getVoiceFilterHint(langCode, matchingCount, allVoices.length);
    }
  }

  scheduleBrowserVoiceRefresh(content, langCode) {
    window.clearTimeout(this.browserVoiceRefreshTimer);
    this.browserVoiceRefreshTimer = window.setTimeout(() => {
      if (this.mode !== 'settings' || !content?.isConnected) return;
      this.ttsManager?.refreshVoices?.();
      this.updateBrowserVoicePicker(content, langCode, Settings.get().preferredBrowserVoice || '');
    }, 450);
  }

  syncLanguageChoiceUi(content, langCode) {
    const select = content.querySelector('#ui-language');
    if (select) {
      select.value = langCode;
    }

    content.querySelectorAll('[data-action="set-ui-language"]').forEach(button => {
      const active = button.dataset.language === langCode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const selectedLanguageName = LanguageManager.getLanguageInfo(langCode)?.nativeName || langCode;
    const currentStatus = content.querySelector('#language-current-status');
    if (currentStatus) {
      currentStatus.textContent = `${LanguageManager.getLabel('settings.using', langCode)}: ${selectedLanguageName}`;
    }
  }

  syncTranslationLanguageChoiceUi(content, langCode) {
    content.querySelectorAll('[data-action="set-translation-language"]').forEach(button => {
      const active = button.dataset.language === langCode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const languageName = LanguageManager.getLanguageInfo(langCode)?.nativeName || langCode;
    const status = content.querySelector('#translation-language-current-status');
    if (status) {
      status.textContent = `Translate + Read: ${languageName}`;
    }
  }

  applyTranslationLanguageChoice(content, langCode) {
    const selectedLang = LanguageManager.getLanguageInfo(langCode)?.code || langCode;
    this.syncTranslationLanguageChoiceUi(content, selectedLang);
    const updatedSettings = Settings.set({ translationLanguage: selectedLang });
    window.dispatchEvent(new CustomEvent('settingsChanged', {
      detail: { settings: updatedSettings || Settings.get(), feverResolutionChanged: false }
    }));
    return updatedSettings;
  }

  applySettingsLanguageChoice(content, langCode, options = {}) {
    const { autoDetect = false } = options;
    const selectedLang = LanguageManager.getLanguageInfo(langCode)?.code || langCode;
    const autoDetectControl = content.querySelector('#auto-detect-lang');
    if (autoDetectControl) {
      autoDetectControl.checked = Boolean(autoDetect);
    }

    this.syncLanguageChoiceUi(content, selectedLang);
    const preferredBrowserVoice = this.getLanguageSafePreferredVoice(
      selectedLang,
      content.querySelector('#browser-voice')?.value || Settings.get().preferredBrowserVoice || ''
    ) || null;
    const updatedSettings = Settings.set({
      autoDetectLanguage: Boolean(autoDetect),
      uiLanguage: autoDetect ? null : selectedLang,
      detectedBrowserLanguage: LanguageManager.detectBrowserLanguage(),
      preferredBrowserVoice
    });

    this.ttsManager?.updateSettings?.(updatedSettings || Settings.get());
    this.updateBrowserVoicePicker(content, selectedLang, preferredBrowserVoice || '');
    this.scheduleBrowserVoiceRefresh(content, selectedLang);
    window.dispatchEvent(new CustomEvent('settingsChanged', {
      detail: { settings: updatedSettings || Settings.get(), feverResolutionChanged: false }
    }));
    return updatedSettings;
  }

  persistSelectedLanguage(langCode) {
    const preferredBrowserVoice = this.getLanguageSafePreferredVoice(
      langCode,
      Settings.get().preferredBrowserVoice || ''
    ) || null;
    const updatedSettings = Settings.set({
      autoDetectLanguage: false,
      uiLanguage: langCode,
      detectedBrowserLanguage: LanguageManager.detectBrowserLanguage(),
      preferredBrowserVoice
    });

    if (updatedSettings && this.ttsManager?.updateSettings) {
      this.ttsManager.updateSettings(updatedSettings);
    }

    window.dispatchEvent(new CustomEvent('settingsChanged', {
      detail: { settings: updatedSettings || Settings.get(), feverResolutionChanged: false }
    }));
  }

  setSettingsAccessMode(mode = 'user', content = this.container.querySelector('#detail-content')) {
    const nextMode = mode === 'admin' ? 'admin' : 'user';
    if (!AppAccess.can('admin:ui-toggle')) return;

    const state = AppAccess.setMode(nextMode);
    window.dispatchEvent(new CustomEvent('adminModeChanged', { detail: state }));

    content?.querySelectorAll('[data-action="set-settings-access-mode"]').forEach(button => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', active ? 'true' : 'false');
    });

    const source = content?.querySelector('[data-api-settings-source]');
    if (source) {
      const langCode = content.lang || this.getCurrentLanguage();
      source.textContent = `${LanguageManager.getLabel('topic.source', langCode)}: ${this.getApiSettingsWidgetUrl()}`;
    }

    const status = content?.querySelector('#settings-access-status');
    if (status) {
      const activeLabel = state.isAdminMode ? 'Admin mode active' : 'User mode active';
      status.textContent = `${activeLabel}. ${state.isAdminMode ? 'Layer and topic editing are unlocked.' : 'Published content stays protected; local drafts remain available.'}`;
    }
  }
  
  renderSettings() {
    const content = this.container.querySelector('#detail-content');
    const settings = Settings.get();
    const languages = LanguageManager.getAllLanguages();
    const { detectedLang, currentLang } = this.getSettingsLanguageState(settings);
    const { allVoices, voices, matchingCount } = this.getVoiceChoicesForLanguage(currentLang);
    const detectedLanguageName = LanguageManager.getLanguageInfo(detectedLang)?.nativeName || detectedLang;
    const currentLanguageName = LanguageManager.getLanguageInfo(currentLang)?.nativeName || currentLang;
    const translationLang = LanguageManager.getLanguageInfo(settings.translationLanguage)?.code || currentLang;
    const translationLanguageName = LanguageManager.getLanguageInfo(translationLang)?.nativeName || translationLang;
    const t = (key, values = null) => values
      ? LanguageManager.formatLabel(key, currentLang, values)
      : LanguageManager.getLabel(key, currentLang);
    content.lang = currentLang;
    content.dir = LanguageManager.getTextDirection(currentLang);
    const aiSummary = this.getAiApiSummary();
    const aiTextProvider = aiSummary.textProviderName || aiSummary.textProvider || t('settings.noTextProvider');
    const aiTextModel = aiSummary.textModel || t('settings.noModelSelected');
    const aiModelBadges = this.renderAiApiModelBadges(aiSummary);
    const aiImageProvider = aiSummary.imageProviderName || aiSummary.imageProvider || t('settings.noImageProvider');
    const aiTtsProvider = aiSummary.ttsProviderName || aiSummary.ttsProvider || 'Browser TTS';
    const aiTtsVoice = aiSummary.ttsActiveMode === 'external'
      ? `${aiSummary.ttsVoice || 'auto'}${aiSummary.ttsHasKey ? '' : ' (no key on this origin)'}`
      : 'browser';
    const aiSttProvider = aiSummary.sttProviderName || aiSummary.sttProvider || 'Browser STT';
    const aiSttModel = aiSummary.sttActiveMode === 'external' ? aiSummary.sttModel || 'default' : 'browser';
    const aiSearchMode = aiSummary.webSearchCapable ? t('settings.liveWebSearchCapable') : t('settings.aiAssistedSearchUpdate');
    const isAdmin = AppAccess.isAdminMode();
    const accessState = AppAccess.getState();
    const canToggleAdmin = AppAccess.can('admin:ui-toggle');
    const topicExportSummary = getAdminTopicExportSummary();
    const aiVoiceEnabled = Boolean(settings.aiVoiceEnabled);
    const apiSettingsWidgetUrl = this.getApiSettingsWidgetUrl();
    const safePreferredBrowserVoice = this.getLanguageSafePreferredVoice(
      currentLang,
      settings.preferredBrowserVoice || ''
    );
    const frenchUi = LanguageManager.normalizeLanguageCode(currentLang).startsWith('fr');
    const accessCopy = frenchUi
      ? {
          label: 'Mode d acces',
          hint: 'Le mode utilisateur protege reste actif au chargement. Admin local passe par le raccourci volontaire.',
          userHint: 'Explorer et enregistrer des brouillons locaux sans modifier les donnees publiees.',
          adminHint: 'Creer des couches, creer des sujets, modifier les brouillons et exporter les packages admin.'
        }
      : {
          label: 'Access mode',
          hint: 'Protected user mode stays active on load. Local admin is available only through the deliberate shortcut.',
          userHint: 'Explore and save local drafts without changing published data.',
          adminHint: 'Create layers, create topics, edit saved drafts, and export admin packages.'
        };

    content.innerHTML = `
      <div class="detail-header">
        <h2 class="detail-title">${this.escapeHtml(t('common.settings'))}</h2>
      </div>

      ${canToggleAdmin ? `
        <div class="detail-section settings-access-section" data-tutorial-id="settings-access">
          <div class="section-label">${this.escapeHtml(accessCopy.label)}</div>
          <div class="settings-mode-switch" role="radiogroup" aria-label="${this.escapeHtml(accessCopy.label)}">
            <button
              type="button"
              class="settings-mode-option ${!isAdmin ? 'active' : ''}"
              data-action="set-settings-access-mode"
              data-mode="user"
              role="radio"
              aria-checked="${!isAdmin ? 'true' : 'false'}"
            >
              <span class="settings-mode-icon">&#128065;</span>
              <span>
                <strong>${this.escapeHtml(t('common.user'))}</strong>
                <small>${this.escapeHtml(accessCopy.userHint)}</small>
              </span>
            </button>
            <button
              type="button"
              class="settings-mode-option ${isAdmin ? 'active' : ''}"
              data-action="set-settings-access-mode"
              data-mode="admin"
              role="radio"
              aria-checked="${isAdmin ? 'true' : 'false'}"
            >
              <span class="settings-mode-icon">&#9733;</span>
              <span>
                <strong>${this.escapeHtml(t('common.admin'))}</strong>
                <small>${this.escapeHtml(accessCopy.adminHint)}</small>
              </span>
            </button>
          </div>
          <div id="settings-access-status" class="setting-hint">
            ${this.escapeHtml(accessCopy.hint)}
            <span class="settings-access-profile">${this.escapeHtml(accessState.profile)}</span>
          </div>
        </div>
      ` : ''}
      
      <div class="detail-section" data-tutorial-id="settings-language">
        <div class="section-label">${this.escapeHtml(t('settings.language'))}</div>
        <div class="form-group language-picker">
          <div class="settings-language-row-label">${this.escapeHtml(t('settings.uiLanguage'))}</div>
          <div class="language-choice-grid language-choice-strip" role="listbox" aria-label="${this.escapeHtml(t('settings.uiLanguage'))}">
            ${this.renderLanguageChoiceButtons(languages, currentLang)}
          </div>
          <select id="ui-language" class="language-scroll-select language-hidden-select" aria-label="${this.escapeHtml(t('settings.uiLanguage'))}" tabindex="-1">
            ${this.renderLanguageOptions(languages, currentLang)}
          </select>
          <div id="language-current-status" class="language-current-status">
            ${this.escapeHtml(`${t('settings.using')}: ${currentLanguageName}`)}
          </div>
          <div class="setting-hint settings-tutorialized-hint">${this.escapeHtml(t('settings.languagePickerHint'))}</div>
        </div>
        <div class="form-group language-picker translation-language-picker">
          <div class="settings-language-row-label">Translate + Read language</div>
          <div class="language-choice-grid language-choice-strip" role="listbox" aria-label="Translate + Read language">
            ${this.renderLanguageChoiceButtons(languages, translationLang, 'set-translation-language')}
          </div>
          <div id="translation-language-current-status" class="language-current-status">
            ${this.escapeHtml(`Translate + Read: ${translationLanguageName}`)}
          </div>
          <div class="setting-hint settings-tutorialized-hint">This controls the selected text Translate + Read target without changing the interface language.</div>
        </div>
        <div class="form-group" style="margin-top: 12px;" data-tutorial-id="tutorial-toggle">
          <label>
            <input 
              type="checkbox" 
              id="tutorial-mode-enabled" 
              ${settings.tutorialModeEnabled !== false ? 'checked' : ''}
            >
            <span style="margin-left: 8px;">${this.escapeHtml(t('settings.tutorialTips'))}</span>
          </label>
          <div class="setting-hint settings-tutorialized-hint">${this.escapeHtml(t('settings.tutorialTipsHint'))}</div>
        </div>
        <div class="form-group" style="margin-top: 12px;" data-tutorial-id="settings-tutorial-level">
          <label for="tutorial-level">${this.escapeHtml(t('settings.tutorialLevel'))}</label>
          <select id="tutorial-level">
            <option value="essential" ${settings.tutorialLevel === 'essential' ? 'selected' : ''}>${this.escapeHtml(t('settings.tutorialLevelEssential'))}</option>
            <option value="guided" ${settings.tutorialLevel === 'guided' || !settings.tutorialLevel ? 'selected' : ''}>${this.escapeHtml(t('settings.tutorialLevelGuided'))}</option>
            <option value="expert" ${settings.tutorialLevel === 'expert' ? 'selected' : ''}>${this.escapeHtml(t('settings.tutorialLevelExpert'))}</option>
          </select>
          <div class="setting-hint settings-tutorialized-hint">${this.escapeHtml(t('settings.tutorialLevelHint'))}</div>
        </div>
      </div>

      <div class="detail-section" data-tutorial-id="settings-tts">
        <div class="section-label">${this.escapeHtml(t('settings.textToSpeech'))}</div>
        <div class="form-group">
          <label>
            <input 
              type="checkbox" 
              id="tts-enabled" 
              ${settings.ttsEnabled ? 'checked' : ''}
            >
            <span style="margin-left: 8px;">${this.escapeHtml(t('settings.enableTts'))}</span>
          </label>
        </div>

        ${settings.ttsEnabled ? `
          <div class="tts-mode-switch" role="radiogroup" aria-label="Read voice mode">
            <button
              type="button"
              class="tts-mode-option ${!aiVoiceEnabled ? 'active' : ''}"
              data-action="set-tts-voice-mode"
              data-mode="browser"
              role="radio"
              aria-checked="${!aiVoiceEnabled ? 'true' : 'false'}"
            >
              Browser
            </button>
            <button
              type="button"
              class="tts-mode-option ${aiVoiceEnabled ? 'active' : ''}"
              data-action="set-tts-voice-mode"
              data-mode="ai"
              role="radio"
              aria-checked="${aiVoiceEnabled ? 'true' : 'false'}"
            >
              Linked AI
            </button>
          </div>
          <input type="checkbox" id="ai-voice-enabled" class="tts-mode-state" ${aiVoiceEnabled ? 'checked' : ''} hidden>

          <div id="browser-tts-settings" class="tts-mode-panel ${aiVoiceEnabled ? 'hidden' : ''}">
            <div class="form-group">
              <label for="browser-voice">${this.escapeHtml(t('settings.browserVoice'))}</label>
              <select id="browser-voice">
                ${this.renderBrowserVoiceOptions(voices, safePreferredBrowserVoice, currentLang)}
              </select>
              <div id="browser-voice-hint" class="setting-hint">${this.escapeHtml(this.getVoiceFilterHint(currentLang, matchingCount, allVoices.length))}</div>
            </div>

            <div class="form-group" style="margin-top: 12px;">
              <label>${this.escapeHtml(t('settings.speechRate'))}</label>
              <div class="slider-group">
                <input
                  type="range"
                  id="speech-rate"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value="${settings.speechRate}"
                >
                <span class="slider-value">${settings.speechRate}x</span>
              </div>
            </div>

            <div class="form-group" style="margin-top: 12px;">
              <label>${this.escapeHtml(t('settings.speechPitch'))}</label>
              <div class="slider-group">
                <input
                  type="range"
                  id="speech-pitch"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value="${settings.speechPitch}"
                >
                <span class="slider-value">${settings.speechPitch}x</span>
              </div>
            </div>
          </div>

          <div id="linked-tts-settings" class="tts-mode-panel ${aiVoiceEnabled ? '' : 'hidden'}">
            <div class="ai-api-status-card compact">
              <div class="ai-api-link-meta">
                <span><strong>TTS:</strong> ${this.escapeHtml(aiTtsProvider)} / ${this.escapeHtml(aiTtsVoice)}</span>
                <span><strong>STT:</strong> ${this.escapeHtml(aiSttProvider)} / ${this.escapeHtml(aiSttModel)}</span>
              </div>
              <div class="setting-hint settings-tutorialized-hint">${this.escapeHtml(t('settings.ttsBridgeHint'))}</div>
            </div>
          </div>

          <div class="form-group tts-transcript-toggle">
            <label>
              <input 
                type="checkbox" 
                id="auto-show-transcript" 
                ${settings.autoShowTranscript ? 'checked' : ''}
              >
              <span style="margin-left: 8px;">${this.escapeHtml(t('settings.showTranscriptReading'))}</span>
            </label>
          </div>
        ` : ''}
      </div>

      <div class="detail-section">
        <div class="section-label">${this.escapeHtml(t('settings.globeSettings'))}</div>
        <div class="form-group" data-tutorial-id="settings-country-hover">
          <label>
            <input 
              type="checkbox" 
              id="show-country-hover" 
              ${settings.showCountryHover ? 'checked' : ''}
            >
            <span style="margin-left: 8px;">${this.escapeHtml(t('settings.showCountryLabels'))}</span>
          </label>
          <div class="setting-hint">${this.escapeHtml(t('settings.showCountryLabelsHint'))}</div>
        </div>
        <div class="form-group" style="margin-top: 12px;" data-tutorial-id="settings-main-texture">
          <label>${this.escapeHtml(t('settings.mainTextureResolution'))}</label>
          <select id="base-texture-quality">
            <option value="auto" ${settings.baseTextureQuality === 'auto' ? 'selected' : ''}>${this.escapeHtml(t('settings.qualityAuto'))}</option>
            <option value="1k" ${settings.baseTextureQuality === '1k' ? 'selected' : ''}>${this.escapeHtml(t('settings.quality1k'))}</option>
            <option value="4k" ${settings.baseTextureQuality === '4k' ? 'selected' : ''}>${this.escapeHtml(t('settings.quality4k'))}</option>
            <option value="8k" ${settings.baseTextureQuality === '8k' ? 'selected' : ''}>${this.escapeHtml(t('settings.quality8k'))}</option>
          </select>
          <div class="setting-hint settings-tutorialized-hint">${this.escapeHtml(t('settings.mainTextureHint'))}</div>
        </div>
      </div>

      <div class="detail-section">
        <div class="form-group" data-tutorial-id="settings-fever-loop">
          <label>${this.escapeHtml(t('settings.feverLoopResolution'))}</label>
          <select id="fever-loop-resolution">
            <option value="auto" ${settings.feverLoopResolution === 'auto' ? 'selected' : ''}>${this.escapeHtml(t('settings.qualityAuto'))}</option>
            <option value="1k" ${settings.feverLoopResolution === '1k' ? 'selected' : ''}>${this.escapeHtml(t('settings.quality1k'))}</option>
            <option value="4k" ${settings.feverLoopResolution === '4k' ? 'selected' : ''}>${this.escapeHtml(t('settings.quality4k'))}</option>
          </select>
          <div class="setting-hint settings-tutorialized-hint">${this.escapeHtml(t('settings.feverLoopHint'))}</div>
        </div>
      </div>

      <div class="detail-section settings-build-section" data-tutorial-id="settings-build">
        <div class="section-label">${this.escapeHtml(t('settings.aboutBuild'))}</div>
        <div class="ai-api-status-card">
          <div class="ai-api-link-meta">
            <span><strong>${this.escapeHtml(t('settings.developmentAssistant'))}:</strong> Codex</span>
          </div>
        </div>
      </div>

      <div class="detail-section ai-api-settings-section" data-tutorial-id="settings-ai-api">
        <div class="section-label">${this.escapeHtml(t('settings.aiApiSettings'))}</div>
        <div class="ai-api-status-card">
          <div class="ai-api-status-topline">
            <span id="ai-api-link-status" class="ai-api-status-pill ${aiSummary.linked ? 'linked' : 'unlinked'}">
              ${this.escapeHtml(aiSummary.linked ? t('common.linked') : t('common.notLinked'))}
            </span>
            <span class="ai-api-sync-label">${this.escapeHtml(t('common.lastSync'))}: <span id="ai-api-sync-time">${this.escapeHtml(this.formatAiApiTimestamp(aiSummary.lastSyncedAt))}</span></span>
          </div>
          <div id="ai-api-link-meta" class="ai-api-link-meta">
            <span><strong>${this.escapeHtml(t('settings.aiText'))}:</strong> ${this.escapeHtml(aiTextProvider)}${aiTextModel ? ` / ${this.escapeHtml(aiTextModel)}` : ''}</span>
            <span><strong>${this.escapeHtml(t('settings.aiImage'))}:</strong> ${this.escapeHtml(aiImageProvider)}</span>
            <span><strong>TTS:</strong> ${this.escapeHtml(aiTtsProvider)} / ${this.escapeHtml(aiTtsVoice)}</span>
            <span><strong>STT:</strong> ${this.escapeHtml(aiSttProvider)} / ${this.escapeHtml(aiSttModel)}</span>
            <span><strong>${this.escapeHtml(t('settings.aiMode'))}:</strong> ${this.escapeHtml(aiSearchMode)}</span>
          </div>
          ${aiModelBadges}
          <div class="setting-hint settings-tutorialized-hint">
            ${this.escapeHtml(t('settings.aiApiHint'))}
          </div>
        </div>

        <div class="form-group ai-api-toggle-grid">
          <label>
            <input 
              type="checkbox" 
              id="ai-updates-use-linked-api" 
              ${settings.aiUpdatesUseLinkedApi ? 'checked' : ''}
            >
            <span style="margin-left: 8px;">${this.escapeHtml(t('settings.useLinkedAiUpdates'))}</span>
          </label>
          <label>
            <input 
              type="checkbox" 
              id="ai-web-search-enabled" 
              ${settings.aiWebSearchEnabled ? 'checked' : ''}
            >
            <span style="margin-left: 8px;">${this.escapeHtml(t('settings.allowFallbackAiSearch'))}</span>
          </label>
        </div>

        <div class="api-settings-launch-card">
          <div class="api-settings-launch-copy">
            <div class="setting-hint settings-tutorialized-hint">${this.escapeHtml(t('settings.apiSettingsWidgetHint'))}</div>
            <div class="setting-hint settings-tutorialized-hint" data-api-settings-source>${this.escapeHtml(t('topic.source'))}: ${this.escapeHtml(apiSettingsWidgetUrl)}</div>
          </div>
          <div class="api-settings-launch-actions">
            <button class="btn-secondary" data-action="refresh-ai-api-settings">${this.escapeHtml(t('settings.refreshLinkedModels'))}</button>
            <button class="btn-primary api-settings-open-btn" data-action="open-api-settings-window">
              <img src="https://res.cloudinary.com/dsbfcgtdv/image/upload/v1779289516/robot-tr_64x64_lv1huc.svg" alt="" aria-hidden="true">
              <span>${this.escapeHtml(t('settings.apiSettingsButton'))}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="detail-section regional-settings-section" data-tutorial-id="settings-regional">
        <div class="section-label">${this.escapeHtml(t('settings.regional'))}</div>
        <div class="form-group">
          <label>
            <input 
              type="checkbox" 
              id="regional-auto-locate" 
              ${settings.regionalAutoLocate !== false ? 'checked' : ''}
            >
            <span style="margin-left: 8px;">${this.escapeHtml(t('settings.regionalAutoLocate'))}</span>
          </label>
          <div class="setting-hint settings-tutorialized-hint">${this.escapeHtml(t('settings.regionalAutoLocateHint'))}</div>
        </div>
        <div class="form-group" style="margin-top: 12px;">
          <label for="regional-location-precision">${this.escapeHtml(t('settings.regionalLocationPrecision'))}</label>
          <select id="regional-location-precision">
            <option value="continent" ${settings.regionalLocationPrecision === 'continent' ? 'selected' : ''}>${this.escapeHtml(t('settings.regionalPrecisionContinent'))}</option>
            <option value="country" ${settings.regionalLocationPrecision === 'country' ? 'selected' : ''}>${this.escapeHtml(t('settings.regionalPrecisionCountry'))}</option>
            <option value="region" ${settings.regionalLocationPrecision === 'region' ? 'selected' : ''}>${this.escapeHtml(t('settings.regionalPrecisionRegion'))}</option>
            <option value="city" ${settings.regionalLocationPrecision === 'city' ? 'selected' : ''}>${this.escapeHtml(t('settings.regionalPrecisionCity'))}</option>
            <option value="address" ${settings.regionalLocationPrecision === 'address' ? 'selected' : ''}>${this.escapeHtml(t('settings.regionalPrecisionAddress'))}</option>
          </select>
          <div class="setting-hint settings-tutorialized-hint">${this.escapeHtml(t('settings.regionalLocationPrecisionHint'))}</div>
        </div>
      </div>

      ${isAdmin ? `
        <div class="detail-section admin-topic-export-section" data-admin-only="true">
          <div class="section-label">${this.escapeHtml(t('settings.adminReviewPackage'))}</div>
          <div class="admin-topic-export-card">
            <div>
              <div class="admin-topic-export-title">${this.escapeHtml(t('settings.browserDraftPackage'))}</div>
              <div class="setting-hint">
                ${this.escapeHtml(t('settings.browserDraftPackageHint', { topics: topicExportSummary.topicCount, media: topicExportSummary.mediaCount }))}
              </div>
              <div id="admin-topic-export-status" class="admin-topic-export-status"></div>
            </div>
            <button class="btn-primary" data-action="export-admin-topic-zip" data-admin-only="true">${this.escapeHtml(t('settings.downloadAdminPackage'))}</button>
          </div>
        </div>
      ` : ''}

      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn-secondary" data-action="reset-settings">${this.escapeHtml(t('common.resetToDefaults'))}</button>
        <button class="btn-primary" data-action="save-settings">${this.escapeHtml(t('common.saveSettings'))}</button>
      </div>
    `;
    
    // Attach event listeners
    content.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      
      const action = target.dataset.action;
      const adminOnlyAction = this.getAdminOnlyActionMessage(action);
      if (adminOnlyAction && !this.isAdminMode()) {
        e.preventDefault();
        e.stopPropagation();
        this.blockUserMutation(adminOnlyAction);
        this.handleAdminModeChanged(false);
        return;
      }

      if (action === 'set-ui-language') {
        this.applySettingsLanguageChoice(content, target.dataset.language, { autoDetect: false });
      } else if (action === 'set-translation-language') {
        this.applyTranslationLanguageChoice(content, target.dataset.language);
      } else if (action === 'set-tts-voice-mode') {
        const useLinkedAiVoice = target.dataset.mode === 'ai';
        const aiVoiceControl = content.querySelector('#ai-voice-enabled');
        if (aiVoiceControl) {
          aiVoiceControl.checked = useLinkedAiVoice;
        }
        content.querySelectorAll('[data-action="set-tts-voice-mode"]').forEach(button => {
          const active = button.dataset.mode === target.dataset.mode;
          button.classList.toggle('active', active);
          button.setAttribute('aria-checked', active ? 'true' : 'false');
        });
        content.querySelector('#browser-tts-settings')?.classList.toggle('hidden', useLinkedAiVoice);
        content.querySelector('#linked-tts-settings')?.classList.toggle('hidden', !useLinkedAiVoice);
      } else if (action === 'set-settings-access-mode') {
        this.setSettingsAccessMode(target.dataset.mode, content);
      } else if (action === 'save-settings') {
        this.saveSettings();
      } else if (action === 'reset-settings') {
        this.resetSettings();
      } else if (action === 'refresh-ai-api-settings') {
        this.refreshAiApiSettingsStatus(target);
      } else if (action === 'open-api-settings-window') {
        this.openApiSettingsWindow();
      } else if (action === 'export-admin-topic-zip') {
        this.exportAdminTopicZip(target);
      }
    });
    
    // Real-time slider updates
    content.addEventListener('input', (e) => {
      if (e.target.id === 'speech-rate') {
        const valueDisplay = e.target.parentElement.querySelector('.slider-value');
        if (valueDisplay) {
          valueDisplay.textContent = `${e.target.value}x`;
        }
      } else if (e.target.id === 'speech-pitch') {
        const valueDisplay = e.target.parentElement.querySelector('.slider-value');
        if (valueDisplay) {
          valueDisplay.textContent = `${e.target.value}x`;
        }
      }
    });
    
    // Auto-detect toggle
    content.addEventListener('change', (e) => {
      if (e.target.id === 'auto-detect-lang') {
        const languageSelect = content.querySelector('#ui-language');
        const nextLang = e.target.checked
          ? LanguageManager.detectBrowserLanguage()
          : (languageSelect?.value || currentLang);
        this.applySettingsLanguageChoice(content, nextLang, { autoDetect: Boolean(e.target.checked) });
      } else if (e.target.id === 'ui-language') {
        this.applySettingsLanguageChoice(content, e.target.value, { autoDetect: false });
      } else if (e.target.id === 'tts-enabled') {
        content.querySelectorAll('#browser-voice, #speech-rate, #speech-pitch, #auto-show-transcript, [data-action="set-tts-voice-mode"]').forEach(control => {
          control.disabled = !e.target.checked;
        });
      } else if (e.target.id === 'browser-voice') {
        const updatedSettings = Settings.set({ preferredBrowserVoice: e.target.value || null });
        this.ttsManager?.updateSettings?.(updatedSettings || Settings.get());
      }
    });

  }
  
  saveSettings() {
    const content = this.container.querySelector('#detail-content');
    const selectedLang = content.querySelector('#ui-language')?.value || null;
    const currentSettings = Settings.get();
    const autoDetectLanguage = content.querySelector('#auto-detect-lang')?.checked ?? false;
    const activeLang = autoDetectLanguage ? LanguageManager.detectBrowserLanguage() : selectedLang;
    const preferredBrowserVoice = this.getLanguageSafePreferredVoice(
      activeLang,
      content.querySelector('#browser-voice')?.value || currentSettings.preferredBrowserVoice || ''
    ) || null;
    const newSettings = {
      autoDetectLanguage,
      uiLanguage: autoDetectLanguage ? null : selectedLang,
      translationLanguage: content.querySelector('[data-action="set-translation-language"].active')?.dataset.language || currentSettings.translationLanguage || selectedLang,
      tutorialModeEnabled: content.querySelector('#tutorial-mode-enabled')?.checked ?? true,
      tutorialLevel: content.querySelector('#tutorial-level')?.value || 'guided',
      ttsEnabled: content.querySelector('#tts-enabled')?.checked ?? true,
      preferredBrowserVoice,
      speechRate: parseFloat(content.querySelector('#speech-rate')?.value || currentSettings.speechRate || 1),
      speechPitch: parseFloat(content.querySelector('#speech-pitch')?.value || currentSettings.speechPitch || 1),
      autoShowTranscript: content.querySelector('#auto-show-transcript')?.checked ?? currentSettings.autoShowTranscript ?? false,
      showCountryHover: content.querySelector('#show-country-hover')?.checked ?? false,
      baseTextureQuality: content.querySelector('#base-texture-quality')?.value || 'auto',
      feverLoopResolution: content.querySelector('#fever-loop-resolution')?.value || 'auto',
      aiWebSearchEnabled: content.querySelector('#ai-web-search-enabled')?.checked ?? true,
      aiUpdatesUseLinkedApi: content.querySelector('#ai-updates-use-linked-api')?.checked ?? true,
      aiVoiceEnabled: content.querySelector('#ai-voice-enabled')?.checked ?? currentSettings.aiVoiceEnabled ?? false,
      aiVoiceFallbackToBrowser: true,
      regionalAutoLocate: content.querySelector('#regional-auto-locate')?.checked ?? true,
      regionalLocationPrecision: content.querySelector('#regional-location-precision')?.value || 'region'
    };
    if (newSettings.feverLoopResolution === '8k') {
      console.log('[Settings] Fever loop 8k setting downgraded to 4k before save');
      newSettings.feverLoopResolution = '4k';
    }

    newSettings.detectedBrowserLanguage = LanguageManager.detectBrowserLanguage();

    // Check if Fever loop resolution changed
    const oldSettings = Settings.get();
    const feverResolutionChanged = oldSettings.feverLoopResolution !== newSettings.feverLoopResolution;
    
    const updatedSettings = Settings.set(newSettings) || newSettings;
    this.ttsManager.updateSettings(updatedSettings);
    
    // Notify app of settings change
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { settings: updatedSettings, feverResolutionChanged } }));
    
    this.hide();
  }
  
  resetSettings() {
    const settingsBeforeReset = Settings.get();
    const { currentLang } = this.getSettingsLanguageState(settingsBeforeReset);

    if (confirm(LanguageManager.getLabel('settings.resetConfirm', currentLang))) {
      const settings = Settings.reset();
      settings.detectedBrowserLanguage = LanguageManager.detectBrowserLanguage();
      Settings.set(settings);
      this.ttsManager.updateSettings(settings);
      this.renderSettings();
    }
  }
  
  hide() {
    if (this.currentGlobe && this.currentGlobe.inFeverMode && this.mode === 'detail') {
      const isFeverRelated = this.currentPoint?.isTippingPoint || 
                            this.currentPoint?.isFeverWarning || 
                            this.currentPoint?.isAMOC ||
                            this.currentPoint?.category === 'earths-fever' ||
                            this.currentPoint?.category === 'fever-scenarios' ||
                            this.currentPoint?.category === 'tipping-points' ||
                            this.currentPoint?.category === 'amoc-watch';
      
      if (isFeverRelated) {
        console.log('[Fever Close] Returning to Monitoring panel - preserving year, scenario, pause, reverse, selected boundary, overlays');
        
        const selectedBoundary = this.currentGlobe.getSelectedBoundary();
        const currentYear = this.currentGlobe.getFeverCurrentYear();
        const isPaused = this.currentGlobe.isFeverPaused();
        const isReversed = this.currentGlobe.isFeverReversed();
        
        this.currentPoint = null;
        this.mode = 'fever-simulation';
        
        this.showFeverSimulation(this.currentGlobe);
        this.updateTopicNavigation();
        
        if (selectedBoundary) {
          this.currentGlobe.selectBoundary(selectedBoundary);
        }
        
        console.log(`[Fever Close] State preserved: year=${currentYear}, paused=${isPaused}, reversed=${isReversed}, boundary=${selectedBoundary || 'none'}`);
        return;
      }
    }
    
    this.container.classList.add('hidden');
    this.currentPoint = null;
    this.mode = 'detail';
    this.researchContext = null;
    this.topicDraftStatus = null;
    this.pendingResearchAutoApply = false;
    this.updateTopicNavigation();
    
    if (this.currentGlobe && this.currentGlobe.inFeverMode) {
      this.currentGlobe.showFeverYearOverlay();
      console.log('[Fever Year] Monitoring panel closed -> year overlay shown');
      if (this.currentGlobe.getFeverSoundEnabled()) {
        this.startFeverHeartbeatAudioLoop();
      }
    } else {
      this.stopFeverHeartbeatAudioLoop({ closeContext: true });
    }
    
    // Clean up fever simulation
    if (this.heartbeatAnimationFrame) {
      cancelAnimationFrame(this.heartbeatAnimationFrame);
      this.heartbeatAnimationFrame = null;
    }
    if (this.feverYearListener) {
      window.removeEventListener('feverYearChanged', this.feverYearListener);
      this.feverYearListener = null;
    }
    if (this.tippingWarningListener) {
      window.removeEventListener('tippingThresholdCrossed', this.tippingWarningListener);
      this.tippingWarningListener = null;
    }
    if (this.boundaryMonitorListener) {
      window.removeEventListener('boundaryMonitorUpdate', this.boundaryMonitorListener);
      this.boundaryMonitorListener = null;
    }
    if (this.callbacks.onHide) {
      this.callbacks.onHide();
    }
  }

  isVisible() {
    return !this.container.classList.contains('hidden');
  }
}
