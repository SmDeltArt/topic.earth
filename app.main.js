import { GlobeRenderer } from './lib/globe.js?v=topic-earth-cloud-over-20260423';
import { AppAccess } from './lib/capabilities.js?v=topic-earth-access-20260423';
import { LAYERS } from './data/layers.js?v=topic-earth-regional-proposal-20260423';
import { METEO_CLOUD_LAYER_ID, METEO_REALTIME_LAYER_ID, fetchRealtimeMeteoSnapshot } from './lib/meteo-realtime.js?v=topic-earth-cloud-over-20260423';
import { MOCK_POINTS, TIPPING_BOUNDARIES } from './data/points.js?v=topic-earth-regional-hub-20260423';
import { FEVER_TOPICS } from './data/fever-topics.js';
import { TIPPING_POINT_TOPICS } from './data/points.js?v=topic-earth-regional-hub-20260423';
import { COUNTRY_METADATA, getCountryFromCoordinates } from './data/countries.js';
import { TopBar } from './components/TopBar.js?v=topic-earth-warning-panel-collapse-20260430';
import { RegionalMap } from './components/RegionalMap.js?v=topic-earth-warning-panel-collapse-20260430';
import { LayerPanel } from './components/LayerPanel.js?v=topic-earth-warning-panel-collapse-20260430';
import { DetailPanel } from './components/DetailPanel.js?v=topic-earth-warning-panel-collapse-20260430';
import { LocalStorage } from './lib/storage.js?v=topic-earth-regional-initiative-20260424';
import { Settings } from './lib/settings.js?v=topic-earth-regional-proposal-20260423';
import { LanguageManager } from './lib/language.js?v=topic-earth-warning-panel-collapse-20260430';
import { ReadTranslationService } from './lib/read-translation.js?v=topic-earth-warning-panel-collapse-20260430';
import { TTSManager } from './lib/tts.js?v=topic-earth-language-voice-menu-20260430';
import { FeverDebugAdapter, TippingTopicDraftState } from './lib/fever-debug.js';
import { FeverDebugBar } from './components/FeverDebugBar.js?v=topic-earth-warning-panel-collapse-20260430';
import { installAiApiBridge } from './lib/ai-api-bridge.js';

/**
 * Main application orchestrator
 * Coordinates globe rendering and UI components
 */
class TopicEarthApp {
  constructor() {
    this.globe = null;
    this.topBar = null;
    this.layerPanel = null;
    this.detailPanel = null;
    this.regionalMap = null;
    this.ttsManager = null;
    this.ttsVignette = null;
    this.ttsVignetteState = null;
    this.ttsVignetteSequence = 0;
    this.ttsHighlightTimer = null;
    this.ttsHighlightUsesBoundary = false;
    this.currentLayerFilter = 'main';
    this.interactionMode = 'rotate'; // default: rotate only + topic presets
    this.feverDebugAdapter = null;
    this.feverDebugBar = null;
    this.tippingDraftState = null;
    this.realtimeMeteoPoints = [];
    this.meteoRealtimeStatus = null;
    this.meteoRefreshPromise = null;
    this.meteoLastFetchTime = 0;
    this.regionalContext = null;
    this.regionalAutoLocateRequested = false;
    this.regionalAutoLocatePending = null;
    this.aiApiBridge = installAiApiBridge({ appName: 'topic-earth' });
    
    // Make app globally accessible for boundary updates
    window.app = this;
    window.TIPPING_BOUNDARIES = TIPPING_BOUNDARIES;
    
    // Combine default, fever, tipping, and custom data
    this.customLayers = LocalStorage.getCustomLayers();
    this.customPoints = LocalStorage.getCustomPoints();
    this.allLayers = [...LAYERS, ...this.customLayers];

    this.rebuildAllPoints();
    console.log(`[Tipping Points] Loaded ${TIPPING_POINT_TOPICS.length} tipping topics into layer system`);
    
    this.init();
  }

  rebuildAllPoints() {
    const mergedCustomPoints = [...this.customPoints];

    TIPPING_POINT_TOPICS.forEach(tippingTopic => {
      const existingIndex = mergedCustomPoints.findIndex(p => p.id === tippingTopic.id);
      if (existingIndex === -1) {
        mergedCustomPoints.push(tippingTopic);
      } else {
        mergedCustomPoints[existingIndex] = { ...mergedCustomPoints[existingIndex], ...tippingTopic };
      }
    });

    this.allPoints = [...MOCK_POINTS, ...FEVER_TOPICS, ...mergedCustomPoints, ...this.realtimeMeteoPoints];
    return this.allPoints;
  }

  async init() {
      await LanguageManager.loadTranslationCatalog('./shared/topic-earth-ui.csv?v=topic-earth-warning-panel-collapse-20260430');

    // Initialize settings early
    await this.initSettings();
    this.applyDocumentLanguage();
    AppAccess.enforceProfile();
    this.applyAdminMode();
    
    // Initialize UI components
    this.initTopBar();
    this.initLayerPanel();
    window.addEventListener('amocToggled', (e) => {
      if (!this.layerPanel) return;
      
      const visible = e.detail.visible;
      const source = e.detail.source || 'unknown';
      console.log(`[AMOC Sync] Toggle from ${source}: ${visible ? 'enabled' : 'disabled'}`);
      
      if (visible) {
        this.layerPanel.activeLayers.add('amoc-watch');
        const icon = document.querySelector(`.layer-icon[data-layer-id="amoc-watch"]`);
        if (icon) icon.classList.add('active');
      } else {
        this.layerPanel.activeLayers.delete('amoc-watch');
        const icon = document.querySelector(`.layer-icon[data-layer-id="amoc-watch"]`);
        if (icon) icon.classList.remove('active');
      }
      
      const monitoringBtn = document.querySelector('[data-action="toggle-amoc-overlay"]');
      if (monitoringBtn) {
        if (visible) {
          monitoringBtn.classList.add('active');
        } else {
          monitoringBtn.classList.remove('active');
        }
      }
      
      console.log(`[AMOC Sync] Layer panel state is now ${visible ? 'active' : 'inactive'}`);
    });
    this.initDetailPanel();
    this.initSettingsPanel();
    
    // Initialize globe
    this.initGlobe();
    await this.globe?.loadFeverScenarioConfig?.();
    
    // Add markers
    this.updateMarkers();
    this.syncRealtimeMeteoLayers();
    this.refreshRealtimeMeteo();

    // Setup news update button
    this.setupNewsUpdate();
    
    // Setup text selection TTS
    this.setupTextSelection();
    
    // Setup view toggle
    this.setupViewToggle();
    
    // Setup settings change listener
    this.setupSettingsListener();

    // Translate hardcoded DOM text from the editable CSV catalog as panels render.
    this.setupUiTranslationSync();
    
    // Setup fever warning history access
    this.setupFeverWarningAccess();
    
    // Initialize debug tools if admin
    this.initDebugTools();

    // Check for daily update
    this.checkDailyUpdate();

    // Hide loading screen
    this.hideLoadingScreen();
  }

  getCurrentUiLanguage(settings = Settings.get()) {
    const detectedLang = settings.detectedBrowserLanguage || LanguageManager.detectBrowserLanguage();
    return LanguageManager.normalizeLanguageCode(
      settings.autoDetectLanguage ? detectedLang : (settings.uiLanguage || detectedLang)
    );
  }

  setupUiTranslationSync() {
    this.applyDocumentLanguage();
    LanguageManager.installDomTranslator({
      root: document.body,
      getLanguage: () => this.getCurrentUiLanguage()
    });
  }

  applyDocumentLanguage(settings = Settings.get()) {
    const langCode = this.getCurrentUiLanguage(settings);
    document.documentElement.lang = langCode;
    document.documentElement.dir = LanguageManager.getTextDirection(langCode);
  }
  
  setInteractionMode(mode) {
    this.interactionMode = mode;
    if (this.globe) {
      this.globe.setInteractionMode(mode);
    }
    
    if (mode === 'rotate') {
      console.log('[Interaction Mode] Rotate mode -> country interaction disabled, topic presets still enabled');
    } else {
      console.log('[Interaction Mode] Interaction mode -> full globe interaction enabled');
    }
  }

  isAdminMode() {
    return AppAccess.isAdminMode();
  }

  isRegionalLayerId(layerId) {
    return Boolean(this.getLayerById(layerId)?.sortByRegionalContext);
  }

  switchLayerFilter(filter, options = {}) {
    this.topBar?.setLayerFilter?.(filter, {
      emit: options.emit !== false,
      force: options.force === true
    });
  }

  openRegionalProposal(request = {}) {
    const regionalContext = request.regionalContext || this.regionalContext || null;
    this.switchLayerFilter('regional');
    this.detailPanel?.showRegionalProposal?.({
      regionalContext,
      defaultLayerId: request.defaultLayerId
    });

    if (!regionalContext) {
      this.maybeAutoLocateRegionalMode();
    }
  }

  revealRegionalTopic(topic) {
    if (!topic) return;

    if (this.currentLayerFilter !== 'regional') {
      this.switchLayerFilter('regional');
    }

    this.refreshRegionalMap(true);
    if (Number.isFinite(Number(topic.lat)) && Number.isFinite(Number(topic.lon))) {
      this.focusRegionalTopic(topic, { openDetail: false });
    }
  }

  humanizeInitiativeToken(value = '') {
    return String(value || '')
      .trim()
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  normalizeRegionalInitiativeContext(context = null, sourcePoint = null) {
    const sourceLat = Number(sourcePoint?.lat);
    const sourceLon = Number(sourcePoint?.lon);
    const lat = Number(context?.lat);
    const lon = Number(context?.lon);
    const city = String(context?.city || '').trim();
    const region = String(context?.region || sourcePoint?.region || '').trim();
    const country = String(context?.country || sourcePoint?.country || '').trim();
    const details = {
      city,
      region,
      country,
      continent: String(context?.continent || '').trim(),
      road: String(context?.road || '').trim(),
      houseNumber: String(context?.houseNumber || '').trim()
    };
    const requestedPrecision = String(context?.precision || context?.scope || sourcePoint?.regionalScope || '').trim() || 'region';
    const availablePrecision = this.getRegionalAvailablePrecision(details, sourcePoint?.regionalScope || 'region');
    const precision = this.resolveRegionalPrecision(requestedPrecision, availablePrecision);
    const zoom = Number(context?.zoom);

    return {
      ...(context || {}),
      ...details,
      lat: Number.isFinite(lat) ? lat : (Number.isFinite(sourceLat) ? sourceLat : null),
      lon: Number.isFinite(lon) ? lon : (Number.isFinite(sourceLon) ? sourceLon : null),
      precision,
      label: String(context?.label || '').trim() || this.getRegionalContextLabel(details, precision) || [city, region, country].filter(Boolean).join(', ') || 'Your area',
      zoom: Number.isFinite(zoom) ? zoom : this.getRegionalZoomFromPrecision(precision)
    };
  }

  async resolveRegionalInitiativeContext(sourcePoint) {
    let context = this.regionalContext ? { ...this.regionalContext } : null;
    if (!context) {
      await this.maybeAutoLocateRegionalMode(true);
      context = this.regionalContext ? { ...this.regionalContext } : null;
    }
    return this.normalizeRegionalInitiativeContext(context, sourcePoint);
  }

  findRegionalInitiativeProposal(sourcePoint, actionKey = '') {
    return this.customPoints.find(point => (
      String(point?.storageMeta?.workflow || '') === 'regional-proposal'
      && String(point?.storageMeta?.initiativeSourceTopicId || '') === String(sourcePoint?.id || '')
      && String(point?.storageMeta?.initiativeActionKey || '') === String(actionKey || '')
    )) || null;
  }

  buildRegionalInitiativeSearchHint(sourcePoint, actionRequest = {}, regionalContext = null) {
    const context = this.normalizeRegionalInitiativeContext(regionalContext, sourcePoint);
    const actionLabel = this.humanizeInitiativeToken(actionRequest.actionLabel || actionRequest.actionKey || 'Join');
    const actionType = String(actionRequest.actionType || '').trim();
    const initiativeLabel = this.humanizeInitiativeToken(sourcePoint?.initiativeType || 'Sustainability');
    const placeLabel = context.label || [context.region, context.country].filter(Boolean).join(', ') || 'the current regional area';
    const scopeLine = context.city
      ? 'Match city first, then region, then country.'
      : (context.region ? 'Match region first, then country.' : 'Match country first, then nearby national initiatives.');
    const relatedActions = Array.isArray(sourcePoint?.engagementTypes) && sourcePoint.engagementTypes.length
      ? ` Related actions already linked to the seed topic: ${sourcePoint.engagementTypes.map(value => this.humanizeInitiativeToken(value)).join(', ')}.`
      : '';

    if (actionType === 'initiative') {
      return `Find nearby ${actionLabel.toLowerCase()} initiatives around ${placeLabel}. Prefer options the user can join, volunteer for, or support directly. ${scopeLine}${relatedActions} Seed topic: "${sourcePoint?.title || 'Regional initiative'}".`;
    }
    if (actionType === 'status' && actionLabel.toLowerCase() === 'open') {
      return `Find open local initiatives around ${placeLabel} that the user can join now. ${scopeLine}${relatedActions} Seed topic: "${sourcePoint?.title || 'Regional initiative'}".`;
    }
    return `Find nearby ${initiativeLabel.toLowerCase()} initiatives around ${placeLabel} where the user can ${actionLabel.toLowerCase()}. ${scopeLine}${relatedActions} Seed topic: "${sourcePoint?.title || 'Regional initiative'}".`;
  }

  buildRegionalInitiativeProposal(sourcePoint, actionRequest = {}, regionalContext = null, existingTopic = null) {
    const context = this.normalizeRegionalInitiativeContext(regionalContext, sourcePoint);
    const actionKey = String(actionRequest.actionKey || '').trim() || 'regional-match';
    const actionLabel = this.humanizeInitiativeToken(actionRequest.actionLabel || actionKey || sourcePoint?.initiativeType || 'Regional Match');
    const initiativeLabel = this.humanizeInitiativeToken(sourcePoint?.initiativeType || actionLabel || 'Regional Initiative');
    const shortPlace = context.city || context.region || context.country || context.label || sourcePoint?.region || sourcePoint?.country || 'My Area';
    const searchHint = this.buildRegionalInitiativeSearchHint(sourcePoint, actionRequest, context);
    const now = new Date().toISOString();
    const sourceRecords = Array.isArray(existingTopic?.researchSources) ? [...existingTopic.researchSources] : [];
    const sourceKey = sourcePoint?.sourceUrl || sourcePoint?.source || sourcePoint?.title;
    if (sourceKey && !sourceRecords.some(item => String(item?.url || item?.name || '') === String(sourceKey))) {
      sourceRecords.unshift({
        name: sourcePoint?.source || sourcePoint?.title || 'Seed topic source',
        url: sourcePoint?.sourceUrl || '',
        category: 'seed-topic',
        verified: Boolean(sourcePoint?.sourceUrl)
      });
    }

    return {
      ...(existingTopic || {}),
      id: existingTopic?.id || Date.now(),
      title: `${actionLabel} Near ${shortPlace}`,
      category: this.isRegionalLayerId(sourcePoint?.category) ? sourcePoint.category : 'community-projects',
      date: new Date().toISOString().slice(0, 10),
      country: context.country || sourcePoint?.country || 'Unknown',
      region: context.region || context.city || context.label || sourcePoint?.region || 'Unknown',
      city: context.city || existingTopic?.city || '',
      lat: Number.isFinite(Number(context.lat)) ? Number(context.lat) : Number(sourcePoint?.lat),
      lon: Number.isFinite(Number(context.lon)) ? Number(context.lon) : Number(sourcePoint?.lon),
      summary: `Local proposal seeded from "${sourcePoint?.title || 'Regional initiative'}" for ${context.label || shortPlace}. It stays on this device, can later host comments or posts, and is ready for admin review when needed.`,
      source: 'Regional initiative match',
      sourceUrl: sourcePoint?.sourceUrl || existingTopic?.sourceUrl || '',
      insight: existingTopic?.insight || sourcePoint?.insight || '',
      media: existingTopic?.media || [],
      mediaTokens: existingTopic?.mediaTokens || [],
      isCustom: true,
      originalTopicId: sourcePoint?.originalTopicId || sourcePoint?.id || '',
      originalTitle: sourcePoint?.originalTitle || sourcePoint?.title || '',
      locationPrecision: context.precision || sourcePoint?.regionalScope || 'region',
      regionalScope: sourcePoint?.regionalScope || context.precision || '',
      initiativeType: sourcePoint?.initiativeType || initiativeLabel,
      engagementTypes: Array.from(new Set([
        ...(Array.isArray(sourcePoint?.engagementTypes) ? sourcePoint.engagementTypes : []),
        String(actionRequest.actionType || '') === 'engagement' ? actionKey : ''
      ].filter(Boolean))),
      communityStatus: sourcePoint?.communityStatus || (String(actionRequest.actionType || '') === 'status' ? actionKey : ''),
      topicStatus: 'proposal-local',
      review: {
        needsHumanReview: true,
        stage: 'regional-proposal',
        requestedBy: 'regional-user',
        adminNotes: existingTopic?.review?.adminNotes || '',
        userMessage: searchHint,
        missing: Array.isArray(existingTopic?.review?.missing) ? existingTopic.review.missing : []
      },
      storage: {
        origin: 'browser-localStorage',
        savedAt: now,
        downloadedAt: existingTopic?.storage?.downloadedAt || '',
        submittedAt: existingTopic?.storage?.submittedAt || '',
        publishedAt: existingTopic?.storage?.publishedAt || ''
      },
      storageMeta: {
        ...(existingTopic?.storageMeta || {}),
        workflow: 'regional-proposal',
        regionalLabel: context.label || '',
        mapPrecision: context.precision || '',
        mapZoom: context.zoom || '',
        initiativeActionKey: actionKey,
        initiativeActionLabel: actionLabel,
        initiativeActionType: actionRequest.actionType || '',
        initiativeSourceTopicId: sourcePoint?.id || '',
        initiativeSourceTitle: sourcePoint?.title || '',
        matchLevels: ['local', 'regional', 'country'],
        communityFeatures: ['comment', 'post'],
        autoResearch: true
      },
      researchSettings: {
        sources: existingTopic?.researchSettings?.sources || ['official', 'scientific', 'media'],
        trustedOnly: existingTopic?.researchSettings?.trustedOnly !== false,
        researchMode: existingTopic?.researchSettings?.researchMode || 'research-brief',
        geographicScope: 'regional',
        timeScope: existingTopic?.researchSettings?.timeScope || 'recent',
        outputIntent: existingTopic?.researchSettings?.outputIntent || 'brief'
      },
      researchSources: sourceRecords
    };
  }

  async handleRegionalInitiativeAction(sourcePoint, actionRequest = {}) {
    if (!sourcePoint) return;

    this.switchLayerFilter('regional');
    const regionalContext = await this.resolveRegionalInitiativeContext(sourcePoint);
    if (regionalContext) {
      this.handleRegionalContextChange(regionalContext);
    }

    const actionKey = String(actionRequest.actionKey || '').trim() || 'regional-match';
    const existingTopic = this.findRegionalInitiativeProposal(sourcePoint, actionKey);
    const proposal = this.buildRegionalInitiativeProposal(sourcePoint, actionRequest, regionalContext, existingTopic);

    if (existingTopic) {
      this.handleUpdateTopic(proposal);
    } else {
      this.handleNewTopic(proposal);
    }

    this.revealRegionalTopic(proposal);
    this.detailPanel.pendingResearchAutoApply = true;
    this.detailPanel.showResearch(proposal);
    setTimeout(() => {
      if (this.detailPanel?.mode === 'research' && String(this.detailPanel.currentPoint?.id) === String(proposal.id)) {
        this.detailPanel.generateResearch();
      }
    }, 180);
  }

  applyAdminMode(isAdmin = this.isAdminMode()) {
    document.body.classList.toggle('admin-mode', isAdmin);
    document.body.classList.toggle('user-mode', !isAdmin);
  }

  async initSettings() {
    let settings = Settings.get();
    
    // Detect browser language on first load
    if (settings.detectedBrowserLanguage === null) {
      settings.detectedBrowserLanguage = LanguageManager.detectBrowserLanguage();
      Settings.set(settings);
    }

    this.applyTutorialMode(settings);
    
    // Initialize TTS manager
    this.ttsManager = new TTSManager(settings);
    
    // Make globally available for fever warnings
    window.ttsManager = this.ttsManager;
    
    // Setup transcript callback
    this.ttsManager.setTranscriptCallback((text) => {
      this.showTranscript(text);
    });
  }
  
  setupSettingsListener() {
    window.addEventListener('settingsChanged', async (e) => {
      const { settings, feverResolutionChanged } = e.detail;
      this.applyTutorialMode(settings);
      this.applyDocumentLanguage(settings);
      this.ttsManager?.updateSettings?.(settings);
      LanguageManager.translateDom(document.body, this.getCurrentUiLanguage(settings));
      
      // If Fever loop resolution changed and we're in Fever mode, reload textures
      if (feverResolutionChanged && this.globe && this.globe.inFeverMode) {
        console.log('[Settings] Fever resolution changed, reloading textures...');
        await this.globe.reloadFeverTextures();
      }

      if (this.currentLayerFilter === 'regional' && this.regionalMap?.visible) {
        this.refreshRegionalMap();
        this.maybeAutoLocateRegionalMode(true);
      }
    });
  }

  setupNewsUpdate() {
    // Use custom event from TopBar instead of direct button listener
    window.addEventListener('newsUpdateClicked', async () => {
      const updateBtn = document.getElementById('news-update-btn');
      if (!updateBtn || updateBtn.disabled) return;
      
      updateBtn.disabled = true;
      const originalHTML = updateBtn.innerHTML;
      updateBtn.innerHTML = '<div class="spinner-small"></div>';
      
      try {
        this.detailPanel.showSourceSearchTopic();
        
        setTimeout(() => {
          updateBtn.innerHTML = originalHTML;
          updateBtn.disabled = false;
        }, 1000);
      } catch (error) {
        console.error('Source search failed:', error);
        updateBtn.innerHTML = originalHTML;
        updateBtn.disabled = false;
      }
    });
  }
  
  initDebugTools() {
    const isAdmin = AppAccess.isAdminMode();
    if (!isAdmin) return;

    // Create debug adapter
    this.feverDebugAdapter = new FeverDebugAdapter(this.globe);
    this.tippingDraftState = new TippingTopicDraftState();

    // Create debug bar
    const debugContainer = document.getElementById('fever-debug-bar');
    if (debugContainer) {
      this.feverDebugBar = new FeverDebugBar(
        debugContainer,
        this.feverDebugAdapter,
        this.tippingDraftState
      );

      // Listen for fever year changes to update debug view
      window.addEventListener('feverYearChanged', () => {
        if (this.feverDebugAdapter) {
          this.feverDebugAdapter.notify();
        }
      });

      // Show debug bar when in fever mode
      window.addEventListener('viewModeChanged', (e) => {
        if (e.detail.mode === 'earths-fever') {
          debugContainer.classList.add('active');
          if (this.feverDebugAdapter) {
            this.feverDebugAdapter.notify();
          }
        } else {
          debugContainer.classList.remove('active');
        }
      });
    }
  }

  reinitDebugTools() {
    // Dynamically initialize debug tools when admin mode is enabled
    if (!this.feverDebugAdapter && this.globe) {
      this.initDebugTools();
    }
  }

  setupFeverWarningAccess() {
    // Admin shortcuts for fever warning history
    window.addEventListener('keydown', (e) => {
      const isAdmin = AppAccess.isAdminMode();
      if (!isAdmin) return;
      
      // Ctrl+H for history
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        this.detailPanel.showFeverWarningHistory();
      }
      
      // Ctrl+Shift+F for fever mode + history
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        if (this.globe && !this.globe.inFeverMode) {
          this.globe.toggleFeverMode();
        }
        setTimeout(() => {
          this.detailPanel.showFeverWarningHistory();
        }, 500);
      }
    });
  }

  initSettingsPanel() {
    // Settings now use the detail panel
    window.addEventListener('openSettings', () => {
      this.detailPanel.showSettings(this.ttsManager);
    });
  }
  
  setupSettingsListener() {
    window.addEventListener('settingsChanged', async (e) => {
      const { settings, feverResolutionChanged } = e.detail;
      this.applyTutorialMode(settings);
      this.applyDocumentLanguage(settings);
      this.ttsManager?.updateSettings?.(settings);
      LanguageManager.translateDom(document.body, this.getCurrentUiLanguage(settings));
      
      // If Fever loop resolution changed and we're in Fever mode, reload textures
      if (feverResolutionChanged && this.globe && this.globe.inFeverMode) {
        console.log('[Settings] Fever resolution changed, reloading textures...');
        await this.globe.reloadFeverTextures();
      }

      if (this.currentLayerFilter === 'regional' && this.regionalMap?.visible) {
        this.refreshRegionalMap();
        this.maybeAutoLocateRegionalMode(true);
      }
    });
  }

  applyTutorialMode(settings = Settings.get()) {
    document.body.classList.toggle('tutorial-mode-off', settings.tutorialModeEnabled === false);
  }

  setupViewToggle() {
    window.addEventListener('layerFilterChanged', (e) => {
      const filter = e.detail.filter;
      const previous = e.detail.previous;
      
      // Store current filter
      this.currentLayerFilter = filter;
      
      // Save/restore layer states when switching modes
      if (filter === 'fever' || filter === 'space') {
        // Entering special mode - save current layer states and disable non-matching layers
        if (previous === 'main' || previous === 'regional') {
          this.savedLayerStates = new Set(this.layerPanel.getActiveLayers());
        }
        this.layerPanel.disableNonFilteredLayers(filter);
      } else if ((filter === 'main' || filter === 'regional') && (previous === 'fever' || previous === 'space')) {
        // Exiting special mode - restore saved layer states
        if (this.savedLayerStates) {
          this.layerPanel.restoreLayerStates(this.savedLayerStates);
          this.savedLayerStates = null;
        }
      }
      
      // Clean exit from previous mode
      if (filter !== 'space' && this.globe.inSolarSystemView) {
        this.globe.transitionBackToGlobe();
      }
      if (filter !== 'fever' && this.globe.inFeverMode) {
        this.globe.exitFeverMode();
        if (this.feverSimulationActive) {
          this.hideFeverSimulation();
        }
      }
      if (filter !== 'regional') {
        this.hideRegionalMode();
      }
      
      // Handle scene mode changes based on filter
      if (filter === 'space' && !this.globe.inSolarSystemView) {
        this.enterSpaceMode();
      } else if (filter === 'fever' && !this.globe.inFeverMode) {
        this.enterFeverMode();
      } else if (filter === 'regional') {
        this.enterRegionalMode();
      } else if (filter === 'main') {
        this.exitSpecialModes();
      }
      
      // Update marker visibility based on filter
      this.updateMarkersByFilter(filter);
    });
    
    window.addEventListener('viewModeChanged', (e) => {
      if (this.topBar) {
        this.topBar.updateViewMode(e.detail.mode);
      }
      
      // Show/hide fever simulation panel
      if (e.detail.mode === 'earths-fever') {
        this.showFeverSimulation();
      } else if (this.feverSimulationActive) {
        this.hideFeverSimulation();
      }
    });
    
    // Listen for fever messages to update left panel
    window.addEventListener('feverMessage', (e) => {
      this.updateFeverLeftPanel(e.detail);
    });
    
    // Listen for fever warnings to update layer panel
    this.feverWarnings = [];
    window.addEventListener('feverWarningCreated', (e) => {
      const warning = e.detail.warning;
      // Replace warning for same year
      this.feverWarnings = this.feverWarnings.filter(w => w.year !== warning.year);
      this.feverWarnings.push(warning);
      this.updateFeverLayerPanel();
    });
    
    // Listen for boundary selection (single click)
    window.addEventListener('boundarySelected', (e) => {
      this.handleBoundarySelection(e.detail.boundary, false);
    });
    
    // Listen for boundary double click (open detail)
    window.addEventListener('boundaryDoubleClick', (e) => {
      this.handleBoundarySelection(e.detail.boundary, true);
    });
  }
  
  handleBoundarySelection(boundaryKey, shouldOpenDetail = false) {
    // Get boundary data from shared canonical model
    const boundaryData = TIPPING_BOUNDARIES[boundaryKey];
    if (!boundaryData) {
      console.warn(`[Tipping] No boundary data for ${boundaryKey}`);
      return;
    }
    
    // Find matching tipping topic from canonical topic list
    const tippingTopic = this.allPoints.find(p => 
      p.isTippingPoint && p.boundary === boundaryKey
    );
    
    if (!tippingTopic) {
      console.warn(`[Tipping] No topic found for boundary ${boundaryKey}`);
      return;
    }
    
    if (shouldOpenDetail) {
      // Double click - open detail/editor synced to milestone
      console.log(`[Tipping] Opening detail for boundary: ${boundaryData.title} (from 3D label)`);
      this.showPointDetail(tippingTopic);
    } else {
      // Single click - select and highlight, update monitoring panel
      console.log(`[Tipping] Selected boundary: ${boundaryData.title} (from 3D label, single click)`);
      this.globe.selectBoundary(boundaryKey);
      
      // If in Fever mode, update the monitoring panel to show this boundary's context
      if (this.globe.inFeverMode && this.detailPanel.mode === 'fever-simulation') {
        // Dispatch event to update monitoring panel with boundary context
        window.dispatchEvent(new CustomEvent('boundaryMonitorUpdate', {
          detail: { 
            boundary: boundaryKey, 
            data: boundaryData, 
            topic: tippingTopic,
            year: this.globe.getFeverCurrentYear(),
            scenario: this.globe.getFeverScenario()
          }
        }));
      }
    }
  }
  
  enterSpaceMode() {
    if (!this.globe.solarSystemLoaded) {
      this.globe.loadSolarSystem().then(() => {
        this.globe.transitionToSolarSystem();
      });
    } else {
      this.globe.transitionToSolarSystem();
    }
    
    // Mobile: keep the layer rail available; CSS compresses it when detail is open.
    if (window.innerWidth <= 768) {
      // Close detail panel if not showing space-related content
      if (this.detailPanel.mode !== 'detail' || !this.detailPanel.currentPoint?.isPlanet) {
        this.detailPanel.hide();
      }
    }
  }
  
  async enterFeverMode() {
    const wasAlreadyInFever = this.globe.inFeverMode;
    if (!wasAlreadyInFever && this.globe.getFeverSoundEnabled?.()) {
      this.detailPanel.primeFeverAudioFromGesture?.();
    }
    await this.globe.toggleFeverMode();
    
    // Mobile: keep both panels available; CSS prevents overlap.
    if (window.innerWidth <= 768) {
      document.getElementById('layer-panel')?.classList.remove('mobile-hidden');
    }
    
    // Always show fever simulation panel, even when restarting
    this.showFeverSimulation();
  }
  
  exitSpecialModes() {
    if (this.globe.inSolarSystemView) {
      this.globe.transitionBackToGlobe();
    }
    if (this.globe.inFeverMode) {
      this.globe.exitFeverMode();
    }
    
    // Mobile: show layer panel
    if (window.innerWidth <= 768) {
      document.getElementById('layer-panel')?.classList.remove('mobile-hidden');
    }
  }

  enterRegionalMode() {
    this.exitSpecialModes();

    if (this.globe && typeof this.regionalPreviousAutoRotate !== 'boolean') {
      this.regionalPreviousAutoRotate = this.globe.options.autoRotate;
      this.globe.options.autoRotate = false;
    }

    this.refreshRegionalMap(true);
    this.maybeAutoLocateRegionalMode();
    document.body.classList.add('regional-mode');
    window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { mode: 'regional-map' } }));
  }

  refreshRegionalMap(force = false) {
    if (!this.regionalMap) return;
    if (!force && (this.currentLayerFilter !== 'regional' || !this.regionalMap.visible)) return;

    const activeLayers = this.layerPanel?.getActiveLayers?.()
      || new Set(this.allLayers.filter(layer => layer.enabled).map(layer => layer.id));
    this.regionalMap.show(this.allPoints, this.allLayers, activeLayers, {
      preserveView: !force && this.regionalMap.visible
    });
  }

  hideRegionalMode() {
    if (!this.regionalMap?.visible) return;

    this.regionalMap.hide();
    document.body.classList.remove('regional-mode');

    if (this.globe && typeof this.regionalPreviousAutoRotate === 'boolean') {
      this.globe.options.autoRotate = this.regionalPreviousAutoRotate;
      this.regionalPreviousAutoRotate = null;
    }
  }

  handleRegionalContextChange(context = null) {
    if (!context) return;

    this.regionalContext = {
      ...context,
      lat: Number(context.lat),
      lon: Number(context.lon)
    };

    window.dispatchEvent(new CustomEvent('regionalContextChanged', {
      detail: { context: this.regionalContext }
    }));
  }

  handleRegionalMapPointDraft(context = null) {
    if (!context) return;

    const normalizedContext = this.normalizeRegionalInitiativeContext({
      ...context,
      precision: context.precision || 'address',
      source: context.source || 'map-point'
    });
    this.handleRegionalContextChange(normalizedContext);
    this.openRegionalProposal({
      regionalContext: normalizedContext,
      defaultLayerId: 'community-projects'
    });
  }

  maybeAutoLocateRegionalMode(force = false) {
    const settings = Settings.get();
    if (!settings.regionalAutoLocate) return Promise.resolve(false);
    if (!force && this.regionalContext) return Promise.resolve(false);
    if (!force && this.regionalAutoLocateRequested) return Promise.resolve(false);
    if (this.regionalAutoLocatePending) return this.regionalAutoLocatePending;

    this.regionalAutoLocateRequested = true;
    const desiredPrecision = settings.regionalLocationPrecision || 'region';

    this.regionalAutoLocatePending = (async () => {
      const ipContext = await this.fetchRegionalIpLocation(desiredPrecision);
      if (await this.applyRegionalAutoLocation(ipContext)) {
        return true;
      }

      const browserContext = await this.fetchBrowserRegionalLocation(desiredPrecision);
      return this.applyRegionalAutoLocation(browserContext);
    })().finally(() => {
      this.regionalAutoLocatePending = null;
    });

    return this.regionalAutoLocatePending;
  }

  async fetchRegionalIpLocation(desiredPrecision = 'region') {
    const sources = [
      {
        url: 'https://ipwho.is/',
        parse: (result) => ({
          lat: result?.latitude,
          lon: result?.longitude,
          city: result?.city,
          region: result?.region,
          country: result?.country,
          continent: result?.continent
        })
      },
      {
        url: 'https://ipapi.co/json/',
        parse: (result) => ({
          lat: result?.latitude,
          lon: result?.longitude,
          city: result?.city,
          region: result?.region,
          country: result?.country_name || result?.country,
          continent: this.getRegionalContinentLabel(result?.continent_code)
        })
      }
    ];

    for (const source of sources) {
      try {
        const response = await this.fetchJsonWithTimeout(source.url, 3500);
        const details = source.parse(response);
        const lat = Number(details.lat);
        const lon = Number(details.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

        const availablePrecision = this.getRegionalAvailablePrecision(details, 'country');
        const precision = this.resolveRegionalPrecision(desiredPrecision, availablePrecision);

        return {
          ...details,
          lat,
          lon,
          label: this.getRegionalContextLabel(details, precision) || 'Your area',
          precision,
          source: 'ip-geolocation'
        };
      } catch (error) {
        console.debug('[Regional] IP auto-location failed:', source.url, error);
      }
    }

    return null;
  }

  async fetchBrowserRegionalLocation(desiredPrecision = 'region') {
    if (!navigator.geolocation?.getCurrentPosition) return null;

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 15 * 60 * 1000
        });
      });

      const lat = Number(position.coords?.latitude);
      const lon = Number(position.coords?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      const details = await this.reverseGeocodeRegionalLocation(lat, lon);
      const availablePrecision = this.getRegionalAvailablePrecision(details, 'region');
      const precision = this.resolveRegionalPrecision(desiredPrecision, availablePrecision);

      return {
        ...details,
        lat,
        lon,
        label: this.getRegionalContextLabel(details, precision) || 'Your area',
        precision,
        source: 'browser-geolocation'
      };
    } catch (error) {
      console.debug('[Regional] Browser auto-location failed:', error);
      return null;
    }
  }

  async applyRegionalAutoLocation(context = null) {
    if (!context || !this.regionalMap) return false;

    const lat = Number(context.lat);
    const lon = Number(context.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

    const precision = context.precision || 'region';
    const zoom = this.getRegionalZoomFromPrecision(precision);
    const label = context.label || 'Your area';
    const normalizedContext = {
      ...context,
      lat,
      lon,
      label,
      precision,
      zoom,
      source: context.source || 'auto-location'
    };
    this.handleRegionalContextChange(normalizedContext);
    const applyLocation = () => {
      this.regionalMap?.focusCoordinate(lat, lon, label, {
        zoom,
        source: normalizedContext.source,
        precision,
        city: context.city || '',
        region: context.region || '',
        country: context.country || '',
        continent: context.continent || '',
        road: context.road || '',
        houseNumber: context.houseNumber || ''
      });
    };

    if (this.regionalMap?.map) {
      applyLocation();
    } else {
      setTimeout(applyLocation, 700);
    }

    return true;
  }

  async reverseGeocodeRegionalLocation(lat, lon) {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('addressdetails', '1');

    try {
      const result = await this.fetchJsonWithTimeout(url.toString(), 3500);
      const address = result?.address || {};

      return {
        lat,
        lon,
        city: address.city || address.town || address.village || address.municipality || address.hamlet,
        region: address.state || address.region || address.county || address.state_district,
        country: address.country,
        continent: address.continent,
        road: address.road || address.pedestrian || address.cycleway,
        houseNumber: address.house_number,
        label: result?.display_name || ''
      };
    } catch (error) {
      console.debug('[Regional] Reverse geocoding failed:', error);
      return { lat, lon };
    }
  }

  async fetchJsonWithTimeout(url, timeoutMs = 3500) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = setTimeout(() => controller?.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller?.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  getRegionalAvailablePrecision(details = {}, fallback = 'region') {
    if (details?.houseNumber || details?.road) return 'address';
    if (details?.city) return 'city';
    if (details?.region) return 'region';
    if (details?.country) return 'country';
    if (details?.continent) return 'continent';
    return fallback;
  }

  resolveRegionalPrecision(desiredPrecision = 'region', availablePrecision = 'region') {
    const precisionOrder = ['continent', 'country', 'region', 'city', 'address'];
    const desiredIndex = precisionOrder.indexOf(desiredPrecision);
    const availableIndex = precisionOrder.indexOf(availablePrecision);

    if (desiredIndex === -1) return availablePrecision;
    if (availableIndex === -1) return desiredPrecision;

    return precisionOrder[Math.min(desiredIndex, availableIndex)];
  }

  getRegionalContinentLabel(code = '') {
    const labels = {
      AF: 'Africa',
      AN: 'Antarctica',
      AS: 'Asia',
      EU: 'Europe',
      NA: 'North America',
      OC: 'Oceania',
      SA: 'South America'
    };

    return labels[String(code).toUpperCase()] || code || '';
  }

  getRegionalContextLabel(details = {}, precision = 'region') {
    if (!details) return 'Your area';

    const city = details.city;
    const region = details.region;
    const country = details.country;
    const continent = details.continent;
    const roadParts = [details.houseNumber, details.road].filter(Boolean).join(' ');

    switch (precision) {
      case 'continent':
        return continent || country || region || city || 'Your continent';
      case 'country':
        return country || region || city || 'Your country';
      case 'city':
        return city || region || country || 'Your city';
      case 'address':
        return roadParts || city || region || country || details.label || 'Your address';
      case 'region':
      default:
        return region || city || country || continent || 'Your area';
    }
  }

  getRegionalZoomFromPrecision(precision = 'region') {
    switch (precision) {
      case 'continent':
        return 3;
      case 'country':
        return 5;
      case 'city':
        return 10;
      case 'address':
        return 13;
      case 'region':
      default:
        return 7;
    }
  }
  
  updateFeverLayerPanel() {
    // Trigger layer panel update with fever warnings
    if (this.layerPanel) {
      this.layerPanel.updateFeverWarnings(this.feverWarnings);
    }
  }
  
  updateFeverLeftPanel(data) {
    const messagePanel = document.getElementById('fever-message-panel');
    if (!messagePanel) return;
    
    messagePanel.className = `fever-message-panel fever-level-${data.level}`;
    messagePanel.innerHTML = `
      <div class="fever-message-year">${data.year}</div>
      <div class="fever-message-text">${data.warning}</div>
    `;
  }
  
  showFeverSimulation() {
    this.feverSimulationActive = true;
    this.detailPanel.showFeverSimulation(this.globe);
  }
  
  hideFeverSimulation() {
    this.feverSimulationActive = false;
    this.detailPanel.hide();
  }

  setupTextSelection() {
    let selectionTimeout;
    let ttsButton = null;
    const escapeHtml = (value = '') => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const showTTSButton = (x, y, text) => {
      this.removeTTSButton();
      
      const settings = Settings.get();
      const currentLang = this.getCurrentUiLanguage(settings);
      const speechLang = LanguageManager.getSpeechCode(currentLang);
      const readLabel = LanguageManager.getLabel('common.readAloud', currentLang);
      const translateReadLabel = LanguageManager.getLabel('auto.appMain.translateRead', currentLang);
      const targetLanguage = LanguageManager.getLanguageInfo(currentLang)?.nativeName || currentLang;
      const translateReadTitle = LanguageManager.formatLabel('auto.appMain.translateSelectedTextToValueThenRead', currentLang, {
        value: targetLanguage
      });
      
      ttsButton = document.createElement('div');
      ttsButton.className = 'tts-selection-button';
      ttsButton.setAttribute('role', 'toolbar');
      ttsButton.setAttribute('aria-label', 'Selected text actions');
      ttsButton.innerHTML = `
        <button type="button" class="tts-selection-action" data-tts-action="read">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 5L2 9L5 9L9 12L9 2L5 5L2 5Z" fill="currentColor"/>
            <path d="M11 4C12 5 12 9 11 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>${escapeHtml(readLabel)}</span>
        </button>
        <button type="button" class="tts-selection-action translate" data-tts-action="translate-read" title="${escapeHtml(translateReadTitle)}">
          <span>${escapeHtml(translateReadLabel)}</span>
          <span class="tts-selection-lang">${escapeHtml(targetLanguage)}</span>
        </button>
      `;
      ttsButton.style.left = `${x}px`;
      ttsButton.style.top = `${y}px`;
      
      ttsButton.addEventListener('click', async (e) => {
        const actionButton = e.target.closest('[data-tts-action]');
        if (!actionButton) return;

        e.stopPropagation();
        const action = actionButton.dataset.ttsAction;
        ttsButton.querySelectorAll('button').forEach(button => {
          button.disabled = true;
        });
        ttsButton.classList.add('loading');

        if (action === 'translate-read') {
          actionButton.querySelector('span').textContent = 'Translating...';
          this.showTTSVignette({
            mode: 'Translate + Read',
            originalText: text,
            translatedText: '',
            languageLabel: targetLanguage,
            status: 'Translating...',
            speechLang
          });
          const vignetteId = this.ttsVignetteState?.id;

          try {
            const translated = await ReadTranslationService.translateText(text, currentLang);
            if (!this.isActiveTTSVignette(vignetteId)) return;
            const translatedSpeechLang = translated.speechLang || LanguageManager.getSpeechCode(translated.language || currentLang);
            const status = translated.provider === 'original' && currentLang !== 'en'
              ? `No translation available yet. Reading original text.`
              : `Reading in ${targetLanguage}`;
            this.updateTTSVignette({
              translatedText: translated.text,
              status,
              provider: translated.provider,
              speechLang: translatedSpeechLang
            });
            this.speakFromVignette(translated.text, translatedSpeechLang);
          } catch (error) {
            if (!this.isActiveTTSVignette(vignetteId)) return;
            console.warn('[Translate Read] Could not prepare translation vignette:', error);
            const fallbackSpeechLang = speechLang;
            this.updateTTSVignette({
              translatedText: text,
              status: 'Translation failed. Reading original text.',
              provider: 'original',
              speechLang: fallbackSpeechLang
            });
            this.speakFromVignette(text, fallbackSpeechLang);
          }
        } else {
          actionButton.querySelector('span').textContent = 'Reading...';
          this.removeTTSVignette({ stopAudio: true });
          this.ttsManager?.speak(text, speechLang, {
            forceBrowser: true
          });
        }

        this.removeTTSButton();
      });
      
      document.body.appendChild(ttsButton);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.removeTTSButton();
      }, 5000);
    };

    document.addEventListener('mouseup', (e) => {
      clearTimeout(selectionTimeout);
      
      selectionTimeout = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > 5) { // Only show for meaningful selections
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Position button near selection
          const x = rect.left + (rect.width / 2);
          const y = rect.bottom + 8;
          
          showTTSButton(x, y, text);
        } else {
          this.removeTTSButton();
        }
      }, 100);
    });
    
    // Remove button when clicking elsewhere
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.tts-selection-button')) {
        this.removeTTSButton();
      }
    });
  }

  removeTTSButton() {
    const existing = document.querySelector('.tts-selection-button');
    if (existing) {
      existing.remove();
    }
  }

  showTTSVignette({
    mode = 'Read',
    originalText = '',
    translatedText = '',
    languageLabel = '',
    status = 'Ready',
    provider = '',
    speechLang = 'en'
  } = {}) {
    this.removeTTSVignette({ stopAudio: true });

    const vignette = document.createElement('div');
    vignette.className = 'tts-vignette';
    vignette.setAttribute('role', 'dialog');
    vignette.setAttribute('aria-live', 'polite');
    vignette.setAttribute('aria-label', 'Text reading controls');
    vignette.innerHTML = `
      <div class="tts-vignette-header">
        <div>
          <div class="tts-vignette-kicker"></div>
          <div class="tts-vignette-status"></div>
        </div>
        <button type="button" class="tts-vignette-close" data-tts-vignette-action="close" aria-label="Close reading panel">&times;</button>
      </div>
      <div class="tts-vignette-body">
        <div class="tts-vignette-label">Original</div>
        <div class="tts-vignette-text" data-tts-vignette-original></div>
        <div class="tts-vignette-label" data-tts-vignette-translation-label>Read</div>
        <div class="tts-vignette-text translated" data-tts-vignette-translated></div>
      </div>
      <div class="tts-vignette-actions">
        <button type="button" class="tts-vignette-btn" data-tts-vignette-action="replay">Replay</button>
        <button type="button" class="tts-vignette-btn stop" data-tts-vignette-action="stop">Stop</button>
      </div>
    `;

    vignette.addEventListener('click', (event) => {
      const action = event.target.closest('[data-tts-vignette-action]')?.dataset.ttsVignetteAction;
      if (!action) return;

      if (action === 'close') {
        this.removeTTSVignette({ stopAudio: true });
      } else if (action === 'stop') {
        this.ttsManager?.stop();
        this.stopTTSHighlight();
        this.updateTTSVignette({ status: 'Stopped', cancelled: true });
      } else if (action === 'replay') {
        const state = this.ttsVignetteState;
        if (state?.translatedText) {
          this.updateTTSVignette({ status: 'Reading again...', cancelled: false });
          this.speakFromVignette(state.translatedText, state.speechLang || speechLang);
        }
      }
    });

    document.body.appendChild(vignette);
    this.ttsVignette = vignette;
    const id = this.ttsVignetteSequence + 1;
    this.ttsVignetteSequence = id;
    this.updateTTSVignette({
      id,
      mode,
      originalText,
      translatedText,
      languageLabel,
      status,
      provider,
      speechLang
    });
  }

  isActiveTTSVignette(id) {
    return Boolean(this.ttsVignette && this.ttsVignetteState?.id === id && !this.ttsVignetteState.cancelled);
  }

  updateTTSVignette(update = {}) {
    if (!this.ttsVignette) return;

    const shouldRenderOriginal = Object.prototype.hasOwnProperty.call(update, 'originalText');
    const shouldRenderTranslated = Object.prototype.hasOwnProperty.call(update, 'translatedText');

    this.ttsVignetteState = {
      ...(this.ttsVignetteState || {}),
      ...update
    };

    const state = this.ttsVignetteState;
    const providerLabels = {
      ai: 'AI translation',
      browser: 'Browser translation',
      cache: 'Cached translation',
      original: 'Original text'
    };

    this.ttsVignette.querySelector('.tts-vignette-kicker').textContent =
      state.languageLabel ? `${state.mode || 'Read'} - ${state.languageLabel}` : (state.mode || 'Read');
    this.ttsVignette.querySelector('.tts-vignette-status').textContent = state.status || 'Ready';
    this.ttsVignette.querySelector('[data-tts-vignette-translation-label]').textContent =
      providerLabels[state.provider] || 'Text to read';

    if (shouldRenderOriginal) {
      this.ttsVignetteState.originalTokens = this.renderTTSVignetteText(
        '[data-tts-vignette-original]',
        state.originalText || ''
      );
    }

    if (shouldRenderTranslated) {
      this.ttsVignetteState.translatedTokens = this.renderTTSVignetteText(
        '[data-tts-vignette-translated]',
        state.translatedText || 'Preparing text...'
      );
    }
  }

  renderTTSVignetteText(selector, text) {
    const container = this.ttsVignette?.querySelector(selector);
    if (!container) return [];

    const source = String(text || '');
    const tokens = this.getTTSWordTokens(source);
    container.replaceChildren();

    if (!tokens.length) {
      container.textContent = source;
      return [];
    }

    let cursor = 0;
    tokens.forEach((token, index) => {
      if (token.start > cursor) {
        container.appendChild(document.createTextNode(source.slice(cursor, token.start)));
      }

      const word = document.createElement('span');
      word.className = 'tts-vignette-word';
      word.dataset.ttsWordIndex = String(index);
      word.textContent = token.text;
      container.appendChild(word);
      cursor = token.end;
    });

    if (cursor < source.length) {
      container.appendChild(document.createTextNode(source.slice(cursor)));
    }

    return tokens;
  }

  getTTSWordTokens(text) {
    const source = String(text || '');
    const tokens = [];
    const tokenPattern = /\S+/g;
    let match;

    while ((match = tokenPattern.exec(source))) {
      tokens.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return tokens;
  }

  speakFromVignette(text, speechLang) {
    this.updateTTSVignette({
      translatedText: text,
      speechLang,
      status: this.ttsVignetteState?.status || 'Reading...',
      cancelled: false
    });

    this.ttsManager?.speak(text, speechLang, {
      onStart: () => {
        this.startTTSHighlight();
      },
      onBoundary: (event) => {
        this.handleTTSBoundary(event.charIndex || 0);
      },
      onEnd: () => {
        this.stopTTSHighlight();
        this.updateTTSVignette({ status: 'Finished' });
      }
    });
  }

  startTTSHighlight() {
    this.stopTTSHighlight();
    this.ttsHighlightUsesBoundary = false;

    const translatedTokens = this.ttsVignetteState?.translatedTokens || [];
    if (!translatedTokens.length) return;

    let index = 0;
    const interval = Math.max(260, Math.min(650, 9000 / translatedTokens.length));
    this.highlightTTSWords(index);

    this.ttsHighlightTimer = window.setInterval(() => {
      if (this.ttsHighlightUsesBoundary) return;
      index += 1;
      if (index >= translatedTokens.length) {
        this.stopTTSHighlight({ clear: false });
        return;
      }
      this.highlightTTSWords(index);
    }, interval);
  }

  handleTTSBoundary(charIndex) {
    const translatedTokens = this.ttsVignetteState?.translatedTokens || [];
    if (!translatedTokens.length) return;

    if (!this.ttsHighlightUsesBoundary) {
      this.stopTTSHighlightTimer();
      this.ttsHighlightUsesBoundary = true;
    }

    const index = translatedTokens.findIndex(token => charIndex >= token.start && charIndex < token.end);
    this.highlightTTSWords(index >= 0 ? index : translatedTokens.length - 1);
  }

  highlightTTSWords(translatedIndex) {
    if (!this.ttsVignette || translatedIndex < 0) return;

    this.ttsVignette.querySelectorAll('.tts-vignette-word').forEach(word => {
      word.classList.remove('active', 'matched');
    });

    const translatedTokens = this.ttsVignetteState?.translatedTokens || [];
    const originalTokens = this.ttsVignetteState?.originalTokens || [];
    const translatedWord = this.ttsVignette.querySelector(
      `[data-tts-vignette-translated] .tts-vignette-word[data-tts-word-index="${translatedIndex}"]`
    );

    translatedWord?.classList.add('active');
    translatedWord?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    if (!originalTokens.length || !translatedTokens.length) return;

    const originalIndex = Math.round(
      (translatedIndex / Math.max(1, translatedTokens.length - 1)) * Math.max(0, originalTokens.length - 1)
    );
    const originalWord = this.ttsVignette.querySelector(
      `[data-tts-vignette-original] .tts-vignette-word[data-tts-word-index="${originalIndex}"]`
    );

    originalWord?.classList.add('matched');
    originalWord?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  stopTTSHighlight({ clear = true } = {}) {
    this.stopTTSHighlightTimer();
    this.ttsHighlightUsesBoundary = false;

    if (clear && this.ttsVignette) {
      this.ttsVignette.querySelectorAll('.tts-vignette-word').forEach(word => {
        word.classList.remove('active', 'matched');
      });
    }
  }

  stopTTSHighlightTimer() {
    if (this.ttsHighlightTimer) {
      window.clearInterval(this.ttsHighlightTimer);
      this.ttsHighlightTimer = null;
    }
  }

  removeTTSVignette({ stopAudio = false } = {}) {
    if (stopAudio) {
      this.ttsManager?.stop();
    }

    this.stopTTSHighlight();

    if (this.ttsVignette) {
      this.ttsVignette.remove();
      this.ttsVignette = null;
      this.ttsVignetteState = null;
    }
  }

  showTranscript(text) {
    if (this.ttsVignette) {
      this.updateTTSVignette({ translatedText: text });
      return;
    }

    // Remove existing transcript
    let transcript = document.querySelector('.tts-transcript');
    if (transcript) {
      transcript.remove();
    }
    
    // Create new transcript
    transcript = document.createElement('div');
    transcript.className = 'tts-transcript';
    transcript.textContent = text;
    document.body.appendChild(transcript);
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
      if (transcript && transcript.parentNode) {
        transcript.classList.add('fade-out');
        setTimeout(() => transcript.remove(), 500);
      }
    }, 8000);
  }

  initTopBar() {
    const container = document.getElementById('top-bar');
    this.topBar = new TopBar(container);
    
    // Listen for interaction mode changes
    window.addEventListener('interactionModeChanged', (e) => {
      this.setInteractionMode(e.detail.mode);
    });
    
    // Listen for admin mode changes to update layer panel and initialize debug tools
    window.addEventListener('adminModeChanged', (e) => {
      const accessState = AppAccess.enforceProfile();
      const isAdmin = accessState.isAdminMode;
      this.applyAdminMode(isAdmin);
      this.layerPanel?.updateData(this.allLayers, this.allPoints);
      this.detailPanel?.handleAdminModeChanged?.(isAdmin);
      if (isAdmin) {
        this.reinitDebugTools();
      } else {
        // Hide debug bar when admin mode is disabled
        const debugContainer = document.getElementById('fever-debug-bar');
        if (debugContainer) {
          debugContainer.classList.remove('active');
        }
      }
    });
  }

  initLayerPanel() {
    const container = document.getElementById('layer-panel');
    this.layerPanel = new LayerPanel(container, this.allLayers, this.allPoints, {
      onLayerToggle: (layerId, visible) => {
        if (this.handleRealtimeMeteoLayerToggle(layerId, visible)) {
          return;
        }

        if (layerId === 'amoc-watch') {
          console.log(`[AMOC Layer] ${visible ? 'Showing' : 'Hiding'} AMOC overlay from layer panel`);
          
          if (visible && !this.globe.inFeverMode) {
            this.globe.toggleFeverMode().then(() => {
              this.globe.setAMOCOverlayVisible(true);
            }).catch(err => {
              console.error('[AMOC] Failed to enter Fever mode:', err);
            });
          } else {
            this.globe.setAMOCOverlayVisible(visible);
          }
        } else {
          this.globe.updateMarkerVisibility(layerId, visible);
          this.refreshRegionalMap();
        }
      },
      onPointSelect: (point) => {
        this.selectPointFromPanel(point);
      },
      onResearchOpen: (point) => {
        this.showPointResearch(point);
      },
      onNewLayer: () => {
        if (!this.isAdminMode()) {
          this.detailPanel.blockUserMutation('create layers');
          this.layerPanel.updateData(this.allLayers, this.allPoints);
          return;
        }
        this.detailPanel.showCreateLayer();
      },
      onNewTopic: (request = null) => {
        if (request?.mode === 'regional-proposal') {
          this.openRegionalProposal(request);
          return;
        }
        if (!this.isAdminMode()) {
          this.detailPanel.blockUserMutation('open the manual +Topic builder');
          this.layerPanel.updateData(this.allLayers, this.allPoints);
          return;
        }
        this.detailPanel.showCreateTopic();
      },
      onDeleteTopic: (topic) => {
        this.handleDeleteTopic(topic);
      },
      onDeleteLayer: (layer) => {
        this.handleDeleteLayer(layer);
      }
    });
  }

  selectPointFromPanel(point) {
    if (this.currentLayerFilter === 'regional' && this.regionalMap?.visible) {
      this.focusRegionalTopic(point, { openDetail: true });
      return;
    }

    this.showPointDetail(point);
  }

  focusRegionalTopic(point, options = {}) {
    const shouldOpenDetail = options.openDetail !== false;
    let focused = this.currentLayerFilter === 'regional'
      && this.regionalMap?.visible
      && this.regionalMap.focusTopic(point);

    const lat = Number(point?.lat);
    const lon = Number(point?.lon);
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);

    if (!focused && hasCoordinates) {
      if (this.currentLayerFilter === 'regional' && this.regionalMap?.visible) {
        focused = this.regionalMap.focusCoordinate(lat, lon, point.title || 'Topic coordinate');
      }

      if (!focused) {
        this.globe.focusOnPoint(lat, lon);
      }
    }

    if (shouldOpenDetail) {
      this.showPointDetail(point);
    }

    return focused;
  }

  initDetailPanel() {
    const container = document.getElementById('detail-panel');
    this.detailPanel = new DetailPanel(container, this.allLayers, {
      onShow: (point) => {
        if (this.currentLayerFilter === 'regional' && this.regionalMap?.visible) {
          const lat = Number(point?.lat);
          const lon = Number(point?.lon);
          const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);
          const focused = this.regionalMap.focusTopic(point)
            || (hasCoordinates && this.regionalMap.focusCoordinate(lat, lon, point.title || 'Topic coordinate'));
          if (!focused && hasCoordinates) {
            this.globe.focusOnPoint(lat, lon);
          }
        } else {
          this.globe.focusOnPoint(point.lat, point.lon);
        }
        // Mobile: hide layer panel when detail opens
        document.getElementById('layer-panel')?.classList.remove('mobile-hidden');
      },
      onHide: () => {
        this.globe.resetView();
        // Remove location marker when panel closes
        if (this.currentLocationMarker) {
          this.globe.removeLocationMarker();
          this.currentLocationMarker = null;
        }
        document.getElementById('layer-panel')?.classList.remove('mobile-hidden');
      },
      onLayerCreate: (layer) => {
        this.handleNewLayer(layer);
      },
      onTopicCreate: (topic) => {
        this.handleNewTopic(topic);
      },
      onTopicUpdate: (topic) => {
        this.handleUpdateTopic(topic);
      },
      onTopicDelete: (topic) => {
        this.handleDeleteTopic(topic);
      },
      onCheckTopicUpdate: (topic) => {
        this.detailPanel.showNewsUpdate(this.allPoints, { topic });
      },
      onRegionalInitiativeAction: (point, actionRequest) => {
        this.handleRegionalInitiativeAction(point, actionRequest);
      }
    });
  }

  initGlobe() {
    const globeContainer = document.getElementById('globe-container');
    
    this.globe = new GlobeRenderer(globeContainer, {
      earthTexture: './earth_texture.png',
      minDistance: 1.3,
      maxDistance: 6,
      autoRotate: true
    });
    
    // Make globe globally accessible for fever mode
    window.currentGlobe = this.globe;
    
    this.globe.markerClickCallback = (point) => {
      if (point.isCluster) {
        this.showClusterDetail(point);
      } else {
        this.showPointDetail(point);
      }
    };
    
    this.globe.countryClickCallback = (latLon) => {
      const country = getCountryFromCoordinates(latLon.lat, latLon.lon);
      if (country) {
        this.showCountryDetail(country);
      } else {
        this.showLocationInfo(latLon);
      }
    };
    
    this.globe.countryHoverCallback = (latLon, x, y) => {
      this.showCountryHover(latLon, x, y);
    };
    
    this.globe.planetClickCallback = (planetInfo) => {
      this.showPlanetDetail(planetInfo);
    };
    
    this.currentCountryTooltip = null;
    this.initRegionalMap(globeContainer);
  }

  initRegionalMap(globeContainer) {
    this.regionalMap = new RegionalMap(globeContainer, {
      onTopicSelect: (point) => this.focusRegionalTopic(point, { openDetail: true }),
      onLocationFocus: (context) => this.handleRegionalContextChange(context),
      onMapPointDraft: (context) => this.handleRegionalMapPointDraft(context)
    });
  }

  updateMarkers() {
    this.globe.removeAllMarkers();
    
    // Cluster dense regions
    const clustered = this.clusterPoints(this.allPoints);
    
    clustered.forEach(item => {
      const layer = this.allLayers.find(l => l.id === item.category);
      if (layer) {
        this.globe.addMarker(item, layer.color, item.isCluster);
      }
    });
    
    // Apply filter if one is active
    if (this.currentLayerFilter) {
      this.updateMarkersByFilter(this.currentLayerFilter);
    }

    if (this.currentLayerFilter === 'regional' && this.regionalMap?.visible) {
      this.refreshRegionalMap();
    }
  }
  
  updateMarkersByFilter(filter) {
    // Show/hide markers based on active filter
    // Requirements:
    // - Fever mode shows all fever-related markers including 'earths-fever', 'tipping-points', 'amoc-watch',
    //   and markers flagged with isFeverWarning / isTippingPoint / isAMOC
    // - Space mode remains restricted to space markers only
    // - Main mode hides fever-only markers/overlays but otherwise respects layer toggles

    const activeLayers = this.layerPanel ? this.layerPanel.getActiveLayers() : new Set();

    this.globe.markers.forEach(marker => {
      const category = marker.userData.category;

      if (filter === 'fever') {
        // Show fever-related markers:
        // - explicit fever categories
        // - markers that are labeled as fever warnings, tipping points, or AMOC items
        const isFeverCategory = category === 'earths-fever' || category === 'tipping-points' || category === 'amoc-watch';
        const isFeverMarkerFlag = !!marker.userData.isFeverWarning || !!marker.userData.isTippingPoint || !!marker.userData.isAMOC;
        marker.visible = isFeverCategory || isFeverMarkerFlag;
      } else if (filter === 'space') {
        // Space mode: only show space markers
        marker.visible = category === 'space';
      } else if (filter === 'regional') {
        // Regional mode uses the 2D topic map, so hide globe markers behind it.
        marker.visible = false;
      } else {
        // Main mode: hide fever-only markers and overlays, otherwise respect layer toggles
        const isFeverOnly = category === 'earths-fever' || category === 'tipping-points' || category === 'amoc-watch'
                            || !!marker.userData.isFeverWarning || !!marker.userData.isTippingPoint || !!marker.userData.isAMOC;
        if (isFeverOnly) {
          marker.visible = false;
        } else {
          // Respect layer panel toggle state for standard categories
          const isActive = activeLayers.has(category);
          marker.visible = isActive;
        }
      }
    });

    this.syncRealtimeMeteoLayers(filter, activeLayers);
  }
  

  getLayerById(layerId) {
    return this.allLayers.find(layer => layer.id === layerId);
  }

  handleRealtimeMeteoLayerToggle(layerId, visible) {
    if (layerId !== METEO_CLOUD_LAYER_ID && layerId !== METEO_REALTIME_LAYER_ID) {
      return false;
    }

    this.syncRealtimeMeteoLayers(this.currentLayerFilter);

    if (visible) {
      this.refreshRealtimeMeteo({ force: !this.realtimeMeteoPoints.length });
    }

    if (layerId === METEO_REALTIME_LAYER_ID) {
      this.globe.updateMarkerVisibility(METEO_REALTIME_LAYER_ID, visible && this.currentLayerFilter === 'main');
    }

    if (this.currentLayerFilter === 'regional') {
      this.refreshRegionalMap();
    }

    return true;
  }

  syncRealtimeMeteoLayers(filter = this.currentLayerFilter, activeLayers = null) {
    if (!this.globe) return;

    const active = activeLayers || this.layerPanel?.getActiveLayers?.() || new Set();
    const inMainMode = filter === 'main';
    const cloudLayer = this.getLayerById(METEO_CLOUD_LAYER_ID);
    const showClouds = inMainMode && active.has(METEO_CLOUD_LAYER_ID);
    const showLiveMeteo = inMainMode && active.has(METEO_REALTIME_LAYER_ID);

    this.globe.setCloudLayerVisible(showClouds, cloudLayer?.renderer || {});
    this.globe.updateMarkerVisibility(METEO_REALTIME_LAYER_ID, showLiveMeteo);
  }

  async refreshRealtimeMeteo(options = {}) {
    const active = this.layerPanel?.getActiveLayers?.() || new Set();
    const wantsMeteo = active.has(METEO_CLOUD_LAYER_ID) || active.has(METEO_REALTIME_LAYER_ID);
    if (!wantsMeteo) return null;

    const now = Date.now();
    const maxAge = 15 * 60 * 1000;
    if (!options.force && this.meteoRealtimeStatus && now - this.meteoLastFetchTime < maxAge) {
      this.syncRealtimeMeteoLayers();
      return this.meteoRealtimeStatus;
    }

    if (this.meteoRefreshPromise) {
      return this.meteoRefreshPromise;
    }

    this.meteoRefreshPromise = fetchRealtimeMeteoSnapshot()
      .then(snapshot => {
        this.meteoRealtimeStatus = snapshot;
        this.meteoLastFetchTime = Date.now();
        this.realtimeMeteoPoints = snapshot.points || [];
        window.topicEarthMeteoSnapshot = snapshot;

        const cloudLayer = this.getLayerById(METEO_CLOUD_LAYER_ID);
        this.globe?.updateCloudLayer(snapshot.cloudSamples || [], cloudLayer?.renderer || {});
        this.rebuildAllPoints();
        this.layerPanel?.updateData(this.allLayers, this.allPoints);
        this.detailPanel?.updateLayers?.(this.allLayers);
        this.updateMarkers();
        this.syncRealtimeMeteoLayers();

        console.log(`[Meteo] Loaded ${this.realtimeMeteoPoints.length} ${snapshot.live ? 'realtime' : 'fallback'} meteo samples`);
        return snapshot;
      })
      .catch(error => {
        console.error('[Meteo] Could not refresh realtime meteo layer:', error);
        return null;
      })
      .finally(() => {
        this.meteoRefreshPromise = null;
      });

    return this.meteoRefreshPromise;
  }
  clusterPoints(points) {
    // Globe is for world/country intelligence, not dense local events
    // Cluster only when events truly overlap at world/country scale
    const CLUSTER_THRESHOLD = 2.0; // degrees of separation (larger area, less aggressive clustering)
    const MIN_CLUSTER_SIZE = 5; // minimum points to form a cluster (require more events)
    
    const clusters = [];
    const processed = new Set();
    
    points.forEach((point, i) => {
      if (processed.has(i)) return;
      
      // Find nearby points
      const nearby = [point];
      const nearbyIndices = [i];
      
      points.forEach((other, j) => {
        if (i === j || processed.has(j)) return;
        if (point.category !== other.category) return;
        
        const dist = Math.sqrt(
          Math.pow(point.lat - other.lat, 2) + 
          Math.pow(point.lon - other.lon, 2)
        );
        
        if (dist < CLUSTER_THRESHOLD) {
          nearby.push(other);
          nearbyIndices.push(j);
        }
      });
      
      if (nearby.length >= MIN_CLUSTER_SIZE) {
        // Create cluster
        const avgLat = nearby.reduce((sum, p) => sum + p.lat, 0) / nearby.length;
        const avgLon = nearby.reduce((sum, p) => sum + p.lon, 0) / nearby.length;
        
        clusters.push({
          id: `cluster_${i}`,
          lat: avgLat,
          lon: avgLon,
          category: point.category,
          country: point.country,
          region: point.region,
          title: `${nearby.length} events`,
          isCluster: true,
          count: nearby.length,
          points: nearby
        });
        
        nearbyIndices.forEach(idx => processed.add(idx));
      } else {
        // Single point
        clusters.push(point);
        processed.add(i);
      }
    });
    
    return clusters;
  }

  handleNewLayer(layer) {
    if (!AppAccess.can('layer:create')) {
      console.warn('[Layer Create] Blocked create outside admin mode:', layer?.id || layer?.name || 'unknown layer');
      return;
    }

    this.customLayers.push(layer);
    LocalStorage.saveCustomLayers(this.customLayers);
    this.rebuildAllLayers();
    
    // Update UI
    this.layerPanel.updateData(this.allLayers, this.allPoints);
    this.detailPanel.updateLayers(this.allLayers);
  }

  rebuildAllLayers() {
    this.allLayers = [...LAYERS, ...this.customLayers];
    return this.allLayers;
  }

  persistCustomPoints(context = 'topics') {
    const saved = LocalStorage.saveCustomPoints(this.customPoints);
    if (!saved) {
      alert(`Browser storage could not save ${context}. Download an admin package now, then reduce embedded media before adding more topics.`);
    }
    return saved;
  }

  handleNewTopic(topic) {
    if (!AppAccess.canSaveTopic(topic)) {
      console.warn('[Topic Create] Blocked create outside admin mode:', topic?.id || topic?.title || 'unknown topic');
      return;
    }

    this.customPoints.push(topic);
    this.persistCustomPoints('the new topic');
    this.rebuildAllPoints();
    
    // Ensure the topic's layer is active (UI)
    this.layerPanel.activatLayer(topic.category);
    
    // Update UI
    this.layerPanel.updateData(this.allLayers, this.allPoints);
    
    // If this is AMOC topic, do overlay logic instead of adding markers
    if (topic.isAMOC || topic.category === 'amoc-watch') {
      // Do not add markers for AMOC canonical topic; enable AMOC overlay
      console.log('[AMOC] Enabling overlay for saved AMOC topic');
      this.globe.setAMOCOverlayVisible(true);
    } else {
      // Add markers and update visibility for regular topics
      this.updateMarkers();
      
      // Sync marker visibility with active layers for non-overlay layers
      const activeLayers = this.layerPanel.getActiveLayers();
      this.allLayers.forEach(layer => {
        if (layer.id === 'amoc-watch') return; // overlay handled separately
        const isActive = activeLayers.has(layer.id);
        this.globe.updateMarkerVisibility(layer.id, isActive);
      });
    }
    
    const shouldRevealRegional = this.isRegionalLayerId(topic.category) || AppAccess.isRegionalProposalTopic(topic);
    if (shouldRevealRegional) {
      this.revealRegionalTopic(topic);
    } else if (this.currentLayerFilter === 'regional' && this.regionalMap?.visible) {
      this.refreshRegionalMap(true);
      this.focusRegionalTopic(topic, { openDetail: false });
    } else if (topic.lat && topic.lon && !isNaN(topic.lat) && !isNaN(topic.lon)) {
      this.globe.focusOnPoint(topic.lat, topic.lon);
    }
    this.showPointDetail(topic);
  }

  handleDeleteTopic(topic) {
    if (!AppAccess.canDeleteTopic(topic)) {
      console.warn('[Topic Delete] Blocked delete outside admin mode:', topic?.id || topic?.title || 'unknown topic');
      return;
    }

    const index = this.customPoints.findIndex(point => String(point.id) === String(topic?.id));
    if (index === -1) {
      alert('Only browser/custom topics can be removed in this phase. Built-in app topics are protected.');
      return;
    }

    const title = topic.title || 'this topic';
    if (!confirm(`Remove "${title}" from this browser workspace?`)) return;

    this.customPoints.splice(index, 1);
    this.persistCustomPoints('the topic removal');
    this.refreshAdminDataViews();

    if (String(this.detailPanel.currentPoint?.id) === String(topic.id)) {
      this.detailPanel.hide();
    }
  }

  handleDeleteLayer(layer) {
    if (!AppAccess.can('layer:delete')) {
      console.warn('[Layer Delete] Blocked delete outside admin mode:', layer?.id || layer?.name || 'unknown layer');
      return;
    }

    const layerIndex = this.customLayers.findIndex(item => item.id === layer?.id);
    if (layerIndex === -1) {
      alert('Only custom browser layers can be removed in this phase. Built-in app layers are protected.');
      return;
    }

    const topicCount = this.customPoints.filter(point => point.category === layer.id).length;
    const topicText = topicCount === 1 ? '1 browser topic' : `${topicCount} browser topics`;
    const message = topicCount > 0
      ? `Remove custom layer "${layer.name}" and ${topicText} inside it?`
      : `Remove custom layer "${layer.name}"?`;
    if (!confirm(message)) return;

    this.customLayers.splice(layerIndex, 1);
    this.customPoints = this.customPoints.filter(point => point.category !== layer.id);
    LocalStorage.saveCustomLayers(this.customLayers);
    this.persistCustomPoints('the layer removal');
    this.layerPanel.activeLayers.delete(layer.id);
    this.layerPanel.expandedLayers.delete(layer.id);
    this.refreshAdminDataViews();

    if (this.detailPanel.currentPoint?.category === layer.id) {
      this.detailPanel.hide();
    }
  }

  refreshAdminDataViews() {
    this.rebuildAllLayers();
    this.rebuildAllPoints();
    this.layerPanel.updateData(this.allLayers, this.allPoints);
    this.detailPanel.updateLayers(this.allLayers);
    this.updateMarkers();
    this.refreshRegionalMap(true);
  }

  handleUpdateTopic(topic) {
    if (!AppAccess.canModifyTopic(topic)) {
      console.warn('[Topic Update] Blocked update outside admin mode:', topic?.id || topic?.title || 'unknown topic');
      return;
    }

    // Check if it's a tipping point topic
    if (topic.isTippingPoint && topic.boundary) {
      console.log(`[Tipping] Updating tipping topic: ${topic.id} (boundary: ${topic.boundary})`);
      
      // Update canonical boundary data if milestone data changed
      if (topic.scenarios) {
        const boundary = TIPPING_BOUNDARIES[topic.boundary];
        if (boundary) {
          // Merge topic scenario data into canonical boundary
          Object.keys(topic.scenarios).forEach(scenario => {
            if (!boundary.scenarios[scenario]) {
              boundary.scenarios[scenario] = {};
            }
            Object.assign(boundary.scenarios[scenario], topic.scenarios[scenario]);
          });
          console.log(`[Tipping] Updated canonical boundary data for ${topic.boundary}`);
        }
      }
      
      // Update in TIPPING_POINT_TOPICS
      const tippingIndex = TIPPING_POINT_TOPICS.findIndex(p => p.id === topic.id);
      if (tippingIndex !== -1) {
        TIPPING_POINT_TOPICS[tippingIndex] = topic;
      }
      
      // Store in custom points for persistence
      const customIndex = this.customPoints.findIndex(p => p.id === topic.id);
      if (customIndex !== -1) {
        this.customPoints[customIndex] = topic;
      } else {
        this.customPoints.push(topic);
      }
      this.persistCustomPoints('the tipping topic update');
      this.rebuildAllPoints();
      
      // Force tipping overlay update to reflect changes
      if (this.globe.inFeverMode) {
        const currentYear = this.globe.getFeverCurrentYear();
        const progress = this.globe.getFeverProgress();
        this.globe.updateTippingOverlay(currentYear, this.globe.feverYears[this.globe.feverCurrentIndex], progress);
        console.log(`[Tipping] Forced overlay update after boundary edit`);
      }
    }
    // Check if it's a fever warning topic
    else if (topic.isFeverWarning) {
      // Update in FEVER_TOPICS if it's an original fever topic
      const feverIndex = FEVER_TOPICS.findIndex(p => p.id === topic.id);
      if (feverIndex !== -1) {
        FEVER_TOPICS[feverIndex] = topic;
      }
      // Also store in custom points for persistence
      const customIndex = this.customPoints.findIndex(p => p.id === topic.id);
      if (customIndex !== -1) {
        this.customPoints[customIndex] = topic;
      } else {
        this.customPoints.push(topic);
      }
      this.persistCustomPoints('the fever topic update');
      this.rebuildAllPoints();
      
      // Update in fever warnings storage for layer panel access
      try {
        const feverWarnings = JSON.parse(localStorage.getItem('euroearth_fever_warnings') || '{}');
        const key = `${topic.year}_${topic.scenario}`;
        feverWarnings[key] = topic;
        localStorage.setItem('euroearth_fever_warnings', JSON.stringify(feverWarnings));
        
        // Notify layer panel to refresh fever warnings
        const warnings = Object.values(feverWarnings);
        if (this.layerPanel) {
          this.layerPanel.updateFeverWarnings(warnings);
        }
      } catch (error) {
        console.error('Error updating fever warnings:', error);
      }
    } else {
      // Find and update the topic in customPoints
      const index = this.customPoints.findIndex(p => p.id === topic.id);
      if (index !== -1) {
        const oldTopic = this.customPoints[index];
        const coordsChanged = oldTopic.lat !== topic.lat || oldTopic.lon !== topic.lon;
        
        this.customPoints[index] = topic;
        this.persistCustomPoints('the topic update');
        this.rebuildAllPoints();
      }
    }
    
    // Common update logic
    const allIndex = this.allPoints.findIndex(p => p.id === topic.id);
    if (allIndex !== -1) {
      const oldTopic = this.allPoints[allIndex];
      const coordsChanged = oldTopic.lat !== topic.lat || oldTopic.lon !== topic.lon;
      
      // Update UI and globe
      this.layerPanel.updateData(this.allLayers, this.allPoints);
      
      // If coordinates changed, force marker re-render
      if (coordsChanged) {
        this.updateMarkers();
      }
      
      // Sync visibility: special-case AMOC overlay (overlay layer), don't treat it as markers
      const activeLayers = this.layerPanel.getActiveLayers();
      this.allLayers.forEach(layer => {
        const isActive = activeLayers.has(layer.id);
        if (layer.id === 'amoc-watch') {
          // Use overlay API for AMOC
          this.globe.setAMOCOverlayVisible(isActive);
          window.dispatchEvent(new CustomEvent('amocToggled', { detail: { visible: isActive } }));
        } else {
          this.globe.updateMarkerVisibility(layer.id, isActive);
        }
      });
      
      // Focus on updated point
      const shouldRevealRegional = this.isRegionalLayerId(topic.category) || AppAccess.isRegionalProposalTopic(topic);
      if (shouldRevealRegional) {
        this.revealRegionalTopic(topic);
      } else if (topic.lat && topic.lon && !isNaN(topic.lat) && !isNaN(topic.lon)) {
        this.globe.focusOnPoint(topic.lat, topic.lon);
      }
    }
  }

  showPointDetail(point) {
    // AMOC topic: ensure Fever mode, show monitoring and enable AMOC overlay
    if (point.isAMOC) {
      const openAMOC = () => {
        // Force AMOC overlay visible
        console.log('[AMOC] Opening AMOC topic and enabling overlay');
        try {
          this.globe.setAMOCOverlayVisible(true);
        } catch (err) {
          console.warn('Failed to set AMOC overlay visible:', err);
        }
        // Show fever simulation panel and AMOC monitoring content (preserve Fever workflow)
        this.showFeverSimulation();
        this.detailPanel.showFeverSimulation(this.globe);
        this.detailPanel.updateAMOCMonitoring();
        // Show the detail view for the AMOC topic
        this.detailPanel.show(point);
      };
      
      if (!this.globe.inFeverMode) {
        this.globe.toggleFeverMode().then(openAMOC).catch(err => {
          console.error('Failed to enter Fever mode for AMOC topic:', err);
          // Attempt to open AMOC UI anyway if possible
          openAMOC();
        });
      } else {
        openAMOC();
      }
      return;
    }
    
    // If clicking a tipping point topic, enter fever mode, select boundary, sync to milestone year
    if (point.isTippingPoint && point.boundary) {
      const boundaryData = TIPPING_BOUNDARIES[point.boundary];
      if (!boundaryData) {
        console.warn(`[Tipping] No boundary data for ${point.boundary}`);
        this.detailPanel.show(point);
        return;
      }
      
      // Resolve to nearest Fever milestone year (25-year system)
      const feverMilestones = [1950, 1975, 2000, 2025, 2050, 2075, 2100, 2125];
      const currentScenario = this.globe.getFeverScenario();
      
      // Find first threshold crossing year for this boundary in current scenario
      let targetYear = 2025; // default
      const scenarioData = boundaryData.scenarios?.[currentScenario];
      if (scenarioData) {
        for (const year of feverMilestones) {
          const milestone = scenarioData[year];
          if (milestone && milestone.threshold) {
            targetYear = year;
            break;
          }
        }
      }
      
      console.log(`[Tipping] Opening topic for boundary: ${point.boundary}, syncing to milestone year ${targetYear}`);
      
      const syncToMilestone = () => {
        // Seek to the milestone year to sync Fever texture and tipping overlay
        this.globe.seekToYear(targetYear);
        // Select the boundary for highlighting
        this.globe.selectBoundary(point.boundary);
        // Pause to allow inspection
        this.globe.pauseFeverLoop();
        // Show the detail panel
        this.detailPanel.show(point);
      };
      
      if (!this.globe.inFeverMode) {
        // Enter Fever mode first
        this.globe.toggleFeverMode().then(syncToMilestone);
      } else {
        // Already in fever mode - just sync
        syncToMilestone();
      }
      return;
    }
    
    // If clicking a fever topic, enter fever mode and sync to that year
    if (point.isFeverWarning) {
      if (!this.globe.inFeverMode) {
        this.globe.toggleFeverMode().then(() => {
          this.globe.seekToYear(point.year);
          this.detailPanel.show(point);
        });
      } else {
        // Seek to the year and show detail
        this.globe.seekToYear(point.year);
        this.detailPanel.show(point);
      }
      return;
    }
    
    // Default: show detail
    this.detailPanel.show(point);
  }
  
  showClusterDetail(cluster) {
    // Show cluster summary - globe handles regional/country-level groupings
    // For deeper local detail, will transition to Google Maps mode
    const clusterInfo = {
      id: cluster.id,
      lat: cluster.lat,
      lon: cluster.lon,
      title: `${cluster.count} Events in ${cluster.region}`,
      category: cluster.category,
      country: cluster.country,
      region: cluster.region,
      date: new Date().toISOString().split('T')[0],
      source: 'Event Cluster',
      summary: `This cluster contains ${cluster.count} related events in ${cluster.region}, ${cluster.country}. Click individual markers or zoom in for detailed information.`,
      insight: cluster.points.map(p => `- ${p.title} (${p.category})`).join('<br>'),
      isCluster: true,
      points: cluster.points
    };
    
    this.detailPanel.show(clusterInfo);
  }
  
  showCountryDetail(country) {
    // Show country-level intelligence
    const countryInfo = {
      id: `country_${country.code}`,
      lat: country.capital.lat,
      lon: country.capital.lon,
      title: country.name,
      category: 'world',
      country: country.name,
      region: country.continent,
      date: new Date().toISOString().split('T')[0],
      source: 'Country Intelligence',
      summary: country.summary,
      insight: `<p><strong>Population:</strong> ${country.population}</p><p><strong>Area:</strong> ${country.area}</p><p><strong>Capital Coordinates:</strong> ${country.capital.lat.toFixed(4)}, ${country.capital.lon.toFixed(4)}</p>`, 
      isCountry: true
    };
    
    this.detailPanel.show(countryInfo);
  }
  
  showCountryHover(latLon, x, y) {
    // Check if country hover is enabled
    const settings = Settings.get();
    if (!settings.showCountryHover) return;
    
    const country = getCountryFromCoordinates(latLon.lat, latLon.lon);
    
    if (country) {
      // Remove existing tooltip
      if (this.currentCountryTooltip) {
        this.currentCountryTooltip.remove();
        this.currentCountryTooltip = null;
      }
      
      // Create lightweight country tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'globe-tooltip country-hover-tooltip';
      tooltip.innerHTML = `
        <div class="tooltip-header" style="border-left: 3px solid #64b5f6">
          <div class="tooltip-title">${country.name}</div>
          <div class="tooltip-meta">${country.continent} - ${country.code}</div>
        </div>
      `;
      tooltip.style.left = x + 15 + 'px';
      tooltip.style.top = y + 15 + 'px';
      document.body.appendChild(tooltip);
      this.currentCountryTooltip = tooltip;
      
      // Auto-hide after short delay
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.remove();
        }
        if (this.currentCountryTooltip === tooltip) {
          this.currentCountryTooltip = null;
        }
      }, 2000);
    }
  }
  
  showPlanetDetail(planetInfo) {
    // Show planet information in detail panel with full scientific data
    const planetData = {
      id: `planet_${planetInfo.name}`,
      title: `${planetInfo.emoji} ${planetInfo.name}`,
      category: 'space',
      date: new Date().toISOString().split('T')[0],
      country: 'Solar System',
      region: planetInfo.type,
      source: 'Solar System Explorer',
      summary: planetInfo.description,
      insight: `You are currently viewing ${planetInfo.name} in the solar system. ${planetInfo.name === 'Earth' ? 'Click Earth to return to the globe view.' : 'Explore the solar system by clicking on other planets. The view rotates around the selected object.'}`,
      isPlanet: true,
      planetData: planetInfo // Pass all the detailed data
    };
    
    this.detailPanel.show(planetData);
  }

  showPointResearch(point) {
    this.detailPanel.showResearch(point);
  }

  async showLocationInfo(latLon) {
    // Remove previous location marker if exists
    if (this.currentLocationMarker) {
      this.globe.removeLocationMarker();
      this.currentLocationMarker = null;
    }
    
    const locationData = {
      id: 'location_info',
      lat: latLon.lat,
      lon: latLon.lon,
      title: `Location: ${latLon.lat.toFixed(4)}, ${latLon.lon.toFixed(4)}`,
      category: 'world',
      date: new Date().toISOString().split('T')[0],
      country: 'Loading...',
      region: 'Loading...',
      source: 'Globe Click',
      summary: 'Fetching location information...',
      insight: ''
    };
    
    // Add location marker
    this.currentLocationMarker = this.globe.addLocationMarker(latLon.lat, latLon.lon);
    
    this.detailPanel.showLocationInfo(locationData);
    
    // Fetch location name using AI
    try {
      const prompt = `What is the geographic location at coordinates ${latLon.lat.toFixed(4)}, ${latLon.lon.toFixed(4)}?
      
Return ONLY a JSON object with this exact format, no other text:
{
  "country": "Country name",
  "region": "Region/state/province name or city name",
  "summary": "Brief 1-2 sentence description of this location"
}`;
      
      const completion = await window.ourEarthAI.createChatCompletion({
        messages: [
          {
            role: "system",
            content: "You are a geography assistant. Return location data in JSON format only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        json: true
      });
      
      const result = JSON.parse(completion.content);
      
      locationData.country = result.country || 'Unknown';
      locationData.region = result.region || 'Unknown';
      locationData.summary = result.summary || 'No description available.';
      
      this.detailPanel.showLocationInfo(locationData);
      
    } catch (error) {
      console.error('Error fetching location info:', error);
      locationData.country = 'Unknown';
      locationData.region = 'Unknown';
      locationData.summary = 'Unable to fetch location information.';
      this.detailPanel.showLocationInfo(locationData);
    }
  }

  checkDailyUpdate() {
    const lastUpdate = LocalStorage.getLastUpdate();
    const today = new Date().toISOString().split('T')[0];
    
    if (!lastUpdate) {
      // First time - save today
      LocalStorage.saveLastUpdate(new Date().toISOString());
      return;
    }
    
    const lastUpdateDate = new Date(lastUpdate).toISOString().split('T')[0];
    
    if (lastUpdateDate !== today) {
      // New day - trigger update notification
      console.log('New day detected - updates available');
      
      // Update the button to show there are updates
      const updateBtn = document.getElementById('news-update-btn');
      if (updateBtn) {
        updateBtn.style.animation = 'pulse 2s ease-in-out infinite';
        updateBtn.title = 'New updates available!';
      }
    }
  }

  hideLoadingScreen() {
    setTimeout(() => {
      const loading = document.getElementById('loading');
      if (loading) {
        loading.classList.add('fade-out');
        setTimeout(() => loading.remove(), 500);
      }
    }, 1500);
  }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TopicEarthApp();
  });
} else {
  new TopicEarthApp();
}

