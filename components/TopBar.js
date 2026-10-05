/**
 * Top navigation bar component
 * Displays app branding and live status indicator
 */
import { Settings } from '../lib/settings.js';
import { LanguageManager } from '../lib/language.js?v=topic-earth-tab-layers-20260507';

const TOPIC_EARTH_MARK_FALLBACK_URL = './assets/icons/topic.earth_64x64.svg?v=topic-earth-icons-20260505';
const TOPIC_EARTH_CLOCK_LOGO_URL = './assets/logo/generated/earth-rotate/topic-earth-logo-earth-rotate-128.webp?v=topic-earth-live-clock-logo-20260605';

export class TopBar {
  constructor(container) {
    this.container = container;
    this.interactionMode = 'rotate'; // default mode
    this.layerFilter = 'main';
    this.viewMode = 'globe';
    this.handleClick = this.handleClick.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleSettingsChanged = this.handleSettingsChanged.bind(this);
    this.updateLogoClock = this.updateLogoClock.bind(this);
    this.logoClockFrame = null;
    this.container.addEventListener('click', this.handleClick);
    document.addEventListener('click', this.handleDocumentClick);
    window.addEventListener('settingsChanged', this.handleSettingsChanged);
    this.touchLayout = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    this.touchLayout.addEventListener('change', () => this.render());
    this.render();
    this.layoutObserver = new ResizeObserver(() => {
      const height = Math.ceil(this.container.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--top-bar-height', `${height}px`);
      window.dispatchEvent(new CustomEvent('topBarLayoutChanged'));
    });
    this.layoutObserver.observe(this.container);
  }

  handleClick(e) {
    const target = e.target.closest('[data-action], [data-filter], #settings-btn');
    if (!target) return;

    if (target.dataset.action === 'toggle-mode') {
      if (this.layerFilter === 'regional') {
        window.dispatchEvent(new CustomEvent('regionalMoveTopicRequested'));
        return;
      }
      const newMode = this.interactionMode === 'rotate' ? 'interaction' : 'rotate';
      this.setInteractionMode(newMode);
    } else if (target.dataset.action?.startsWith('regional-')) {
      window.dispatchEvent(new CustomEvent('regionalMapControlRequested', { detail: { action: target.dataset.action, button: target } }));
    } else if (target.dataset.filter) {
      this.setLayerFilter(target.dataset.filter);
    } else if (target.id === 'settings-btn') {
      // Open settings in detail panel instead of modal
      window.dispatchEvent(new CustomEvent('openSettings'));
    } else if (target.dataset.action === 'toggle-fullscreen') {
      window.dispatchEvent(new CustomEvent('topicFullscreenToggleRequested'));
    } else if (target.dataset.action === 'update-news') {
      window.dispatchEvent(new CustomEvent('newsUpdateClicked'));
    } else if (target.dataset.action === 'open-fever-monitor') {
      window.dispatchEvent(new CustomEvent('openFeverMonitorRequested'));
    }
  }

  handleDocumentClick(e) {
    // No longer needed for dropdown menu
  }

  handleSettingsChanged() {
    this.render();
  }

  startLogoClock() {
    if (this.logoClockFrame) {
      cancelAnimationFrame(this.logoClockFrame);
      this.logoClockFrame = null;
    }
    this.updateLogoClock();
  }

  updateLogoClock() {
    const clock = this.container.querySelector('[data-logo-clock]');
    if (!clock) return;

    const now = new Date();
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    clock.style.setProperty('--clock-hour-angle', `${hours * 30}deg`);
    clock.style.setProperty('--clock-minute-angle', `${minutes * 6}deg`);
    clock.style.setProperty('--clock-second-angle', `${seconds * 6}deg`);

    const label = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    clock.setAttribute('aria-label', `topic.earth local time ${label}`);
    clock.title = label;

    this.logoClockFrame = requestAnimationFrame(this.updateLogoClock);
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

  escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  mapViewModeToModeTab(mode = '') {
    switch (String(mode || '').trim()) {
      case 'regional-map':
        return 'regional';
      case 'solar-system':
        return 'space';
      case 'earths-fever':
        return 'fever';
      case 'globe':
        return 'main';
      default:
        return '';
    }
  }

  getModeTabs() {
    return [
      {
        id: 'regional',
        icon: '&#128506;&#65039;',
        label: this.t('nav.regional'),
        title: this.t('nav.regionalTitle')
      },
      {
        id: 'main',
        icon: '&#127757;',
        label: this.t('nav.main'),
        title: this.t('nav.mainTitle')
      },
      {
        id: 'space',
        icon: '&#128752;&#65039;',
        label: this.t('nav.space'),
        title: this.t('nav.spaceTitle')
      },
      {
        id: 'fever',
        icon: '&#127777;&#65039;',
        label: this.t('nav.fever'),
        title: this.t('nav.feverTitle')
      }
    ];
  }

  setLayerFilter(filter, options = {}) {
    const nextFilter = filter || 'main';
    const previousFilter = this.layerFilter || 'main';
    if (!options.force && previousFilter === nextFilter) {
      return;
    }

    this.layerFilter = nextFilter;
    this.render();

    if (options.emit !== false) {
      window.dispatchEvent(new CustomEvent('layerFilterChanged', { detail: { filter: nextFilter, previous: previousFilter } }));
    }
  }

  setInteractionMode(mode) {
    this.interactionMode = mode;
    this.render();
    window.dispatchEvent(new CustomEvent('interactionModeChanged', {
      detail: { mode }
    }));
    console.log(`[Interaction Mode] Changed to: ${mode}`);
  }

  renderModeTab(tab, activeModeTab) {
    const isActive = activeModeTab === tab.id;
    return `
        <button
          class="filter-btn ${isActive ? 'active' : ''}"
          data-filter="${this.escapeHtml(tab.id)}"
          role="tab"
          aria-selected="${isActive ? 'true' : 'false'}"
          tabindex="${isActive ? '0' : '-1'}"
          title="${this.escapeHtml(tab.title)}"
        >
          <span class="filter-icon" aria-hidden="true">${tab.icon}</span>
          <span class="header-label">${this.escapeHtml(tab.label)}</span>
        </button>`;
  }

  render() {
    const activeModeTab = this.layerFilter || this.mapViewModeToModeTab(this.viewMode) || 'main';
    const isRegionalMode = activeModeTab === 'regional';
    const interactionLabel = isRegionalMode
      ? this.t('nav.moveTopic')
      : (this.interactionMode === 'rotate'
      ? this.t('nav.rotate')
      : this.t('nav.drag'));
    const modeTabs = this.getModeTabs().map(tab => this.renderModeTab(tab, activeModeTab)).join('');

    this.container.innerHTML = `
      <div class="logo logo-image-brand" aria-label="${this.escapeHtml(this.t('app.brand'))}" data-tutorial-id="brand">
        <div class="logo-live-clock" data-logo-clock role="img">
          <span class="logo-clock-face" aria-hidden="true">
            <img class="logo-clock-earth" src="${TOPIC_EARTH_CLOCK_LOGO_URL}" data-fallback-src="${TOPIC_EARTH_MARK_FALLBACK_URL}" onerror="this.onerror=null;this.src=this.dataset.fallbackSrc;" alt="">
            <svg class="logo-clock-hands" viewBox="0 0 100 100" focusable="false" aria-hidden="true">
              <line class="logo-clock-hand logo-clock-hour" x1="50" y1="52" x2="50" y2="29"></line>
              <line class="logo-clock-hand logo-clock-minute" x1="50" y1="54" x2="50" y2="20"></line>
              <line class="logo-clock-hand logo-clock-second" x1="50" y1="57" x2="50" y2="14"></line>
              <circle class="logo-clock-pin" cx="50" cy="50" r="5"></circle>
            </svg>
          </span>
          <span class="logo-clock-word" aria-hidden="true">
            <span>topic</span><span>earth</span>
          </span>
        </div>
      </div>
      <div class="layer-filter-group" role="tablist" aria-label="Primary modes" data-tutorial-id="mode-tabs">
        ${modeTabs}
      </div>
      <div class="top-actions">
        <button id="settings-btn" class="settings-btn" data-tutorial-id="settings-button" title="${this.escapeHtml(this.t('common.settings'))}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M8 1L8 3M8 13L8 15M15 8L13 8M3 8L1 8M13.5 2.5L12 4M4 12L2.5 13.5M13.5 13.5L12 12M4 4L2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <button id="news-update-btn" class="news-update-btn" title="${this.escapeHtml(this.t('nav.sourceSearchTitle'))}" data-action="update-news" data-tutorial-id="source-search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8C14 4.686 11.314 2 8 2C4.686 2 2 4.686 2 8C2 11.314 4.686 14 8 14C11.314 14 14 11.314 14 8Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M8 5V8L10.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="btn-label">${this.escapeHtml(this.t('topic.search'))}</span>
        </button>
        <button id="fullscreen-btn" class="settings-btn fullscreen-btn" data-action="toggle-fullscreen" title="Full screen" aria-label="Full screen">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 6V2H6M10 2H14V6M14 10V14H10M6 14H2V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        ${activeModeTab === 'fever' ? '<button type="button" class="settings-btn fever-monitor-header-btn" data-action="open-fever-monitor" aria-label="Open Fever monitor" title="Open Fever monitor">💓</button>' : ''}
      </div>
    `;

    if (!this.sceneControls) {
      this.sceneControls = document.createElement('div');
      this.sceneControls.id = 'scene-interaction-controls';
      this.sceneControls.addEventListener('click', this.handleClick);
      document.getElementById('globe-container').appendChild(this.sceneControls);
    }
    const touchSpecialMode = this.touchLayout.matches && ['space', 'fever'].includes(activeModeTab);
    this.sceneControls.hidden = !['main', 'regional'].includes(activeModeTab) && !touchSpecialMode;
    this.sceneControls.innerHTML = `
      <button class="mode-toggle-btn ${this.interactionMode === 'interaction' ? 'active' : ''}" id="mode-toggle-btn" data-action="toggle-mode" data-tutorial-id="interaction-mode" title="${this.escapeHtml(interactionLabel)} · ${this.interactionMode === 'interaction' ? 'Left drag: pan; right drag: rotate' : 'Left drag: rotate; right drag: pan'}" aria-label="${this.escapeHtml(interactionLabel)}">
        ${this.interactionMode === 'rotate' && !isRegionalMode ? `
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M7 3L7 7L10 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="header-label">${this.escapeHtml(interactionLabel)}</span>
        ` : `
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M7 1V3M7 11V13M1 7H3M11 7H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="header-label">${this.escapeHtml(interactionLabel)}</span>
        `}
      </button>
      ${isRegionalMode ? `
        <button type="button" class="scene-map-btn" data-action="regional-zoom-in" aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" class="scene-map-btn" data-action="regional-zoom-out" aria-label="Zoom out" title="Zoom out">&minus;</button>
        <button type="button" class="scene-map-btn" data-action="regional-search" aria-label="Open map search" title="Open map search" aria-controls="regional-map-search-panel" aria-expanded="false">${this.escapeHtml(this.t('topic.search'))}</button>
      ` : ''}
    `;

    // Keep touch gesture controls outside the header at the top right of the scene.
    if (touchSpecialMode) {
      const modeButton = this.sceneControls.querySelector('#mode-toggle-btn');
      modeButton.classList.add('mobile-special-mode-toggle');
      modeButton.title = `${interactionLabel} · One finger: ${this.interactionMode === 'interaction' ? 'drag' : 'rotate'}; two fingers: zoom`;

    }

    // Dispatch custom event after render so listeners can rebind
    this.startLogoClock();
    window.dispatchEvent(new CustomEvent('topBarRendered'));
  }

  updateViewMode(mode, options = {}) {
    this.viewMode = mode;
    const mappedFilter = options.layerFilter || this.mapViewModeToModeTab(mode);
    if (mappedFilter) {
      this.layerFilter = mappedFilter;
    }
    this.render();
  }
}
