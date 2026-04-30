/**
 * Top navigation bar component
 * Displays app branding and live status indicator
 */
import { Settings } from '../lib/settings.js';
import { AppAccess } from '../lib/capabilities.js?v=topic-earth-access-20260423';
import { LanguageManager } from '../lib/language.js?v=topic-earth-warning-panel-collapse-20260430';

export class TopBar {
  constructor(container) {
    this.container = container;
    this.interactionMode = 'rotate'; // default mode
    this.layerFilter = 'main';
    this.viewMode = 'globe';
    this.handleClick = this.handleClick.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleSettingsChanged = this.handleSettingsChanged.bind(this);
    this.container.addEventListener('click', this.handleClick);
    document.addEventListener('click', this.handleDocumentClick);
    window.addEventListener('settingsChanged', this.handleSettingsChanged);
    this.render();
  }

  handleClick(e) {
    const target = e.target.closest('[data-action], [data-filter], #settings-btn, #admin-toggle-btn');
    if (!target) return;

    if (target.dataset.action === 'toggle-mode') {
      const newMode = this.interactionMode === 'rotate' ? 'interaction' : 'rotate';
      this.setInteractionMode(newMode);
    } else if (target.dataset.filter) {
      this.setLayerFilter(target.dataset.filter);
    } else if (target.id === 'settings-btn') {
      // Open settings in detail panel instead of modal
      window.dispatchEvent(new CustomEvent('openSettings'));
    } else if (target.id === 'admin-toggle-btn') {
      if (!AppAccess.can('admin:toggle')) return;
      const state = AppAccess.setAdminMode(!AppAccess.isAdminMode());
      this.render();
      window.dispatchEvent(new CustomEvent('adminModeChanged', { detail: state }));
    } else if (target.dataset.action === 'update-news') {
      window.dispatchEvent(new CustomEvent('newsUpdateClicked'));
    }
  }

  handleDocumentClick(e) {
    // No longer needed for dropdown menu
  }

  handleSettingsChanged() {
    this.render();
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
    const isAdmin = AppAccess.isAdminMode();
    const canToggleAdmin = AppAccess.can('admin:toggle');
    const activeModeTab = this.layerFilter || this.mapViewModeToModeTab(this.viewMode) || 'main';
    const isRegionalMode = activeModeTab === 'regional';
    const interactionLabel = isRegionalMode
      ? this.t('nav.drag')
      : (this.interactionMode === 'rotate'
      ? this.t('nav.rotate')
      : this.t('nav.interaction'));
    const modeTabs = this.getModeTabs().map(tab => this.renderModeTab(tab, activeModeTab)).join('');

    this.container.innerHTML = `
      <div class="logo" aria-label="${this.escapeHtml(this.t('app.brand'))}">
        <span class="logo-label">${this.escapeHtml(this.t('app.brand'))}</span>
      </div>
      <button class="mode-toggle-btn ${this.interactionMode === 'interaction' ? 'active' : ''}" id="mode-toggle-btn" data-action="toggle-mode" title="${this.escapeHtml(interactionLabel)}" aria-label="${this.escapeHtml(interactionLabel)}">
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
      <div class="layer-filter-group" role="tablist" aria-label="Primary modes">
        ${modeTabs}
      </div>
      <div class="top-actions">
        <button id="settings-btn" class="settings-btn" title="${this.escapeHtml(this.t('common.settings'))}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M8 1L8 3M8 13L8 15M15 8L13 8M3 8L1 8M13.5 2.5L12 4M4 12L2.5 13.5M13.5 13.5L12 12M4 4L2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        ${canToggleAdmin ? `
        <button id="admin-toggle-btn" class="admin-toggle-btn ${isAdmin ? 'active' : ''}" title="${this.escapeHtml(this.t('nav.toggleAdminMode'))}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L10 5L14 6L11 9L12 13L8 11L4 13L5 9L2 6L6 5L8 1Z" stroke="currentColor" stroke-width="1.5" fill="${isAdmin ? 'currentColor' : 'none'}"/>
          </svg>
          <span class="btn-label">${this.escapeHtml(isAdmin ? this.t('common.admin') : this.t('common.user'))}</span>
        </button>
        ` : ''}
        <button id="news-update-btn" class="news-update-btn" title="${this.escapeHtml(this.t('nav.sourceSearchTitle'))}" data-action="update-news">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8C14 4.686 11.314 2 8 2C4.686 2 2 4.686 2 8C2 11.314 4.686 14 8 14C11.314 14 14 11.314 14 8Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M8 5V8L10.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="btn-label">${this.escapeHtml(this.t('topic.search'))}</span>
        </button>
      </div>
    `;

    // Dispatch custom event after render so listeners can rebind
    window.dispatchEvent(new CustomEvent('topBarRendered'));
  }

  updateViewMode(mode) {
    this.viewMode = mode;
    const mappedFilter = this.mapViewModeToModeTab(mode);
    if (mappedFilter) {
      this.layerFilter = mappedFilter;
    }
    this.render();
  }
}
