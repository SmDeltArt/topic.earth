/**
 * Earth's Fever Debug Bar Component
 * Compact top monitoring bar and expandable authoring drawer
 */
import { Settings } from '../lib/settings.js';
import { LanguageManager } from '../lib/language.js?v=topic-earth-warning-panel-collapse-20260430';

export class FeverDebugBar {
  constructor(container, debugAdapter, draftState) {
    this.container = container;
    this.debugAdapter = debugAdapter;
    this.draftState = draftState;
    this.isExpanded = false;
    this.activeTab = 'runtime';
    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSettingsChanged = this.handleSettingsChanged.bind(this);

    this.render();
    this.attachListeners();
    window.addEventListener('settingsChanged', this.handleSettingsChanged);

    // Subscribe to updates
    this.debugAdapter.subscribe((snapshot) => {
      this.updateSnapshot(snapshot);
    });
  }

  handleSettingsChanged() {
    this.render();
    this.attachListeners();
    this.updateSnapshot(this.debugAdapter.getLatestSnapshot?.());
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

  render() {
    this.container.innerHTML = `
      <div class="fever-debug-bar ${this.isExpanded ? 'expanded' : ''}">
        <div class="fever-debug-collapsed">
          <div class="debug-section">
            <span class="debug-label">${this.t('fever.year').toUpperCase()}</span>
            <span class="debug-value" id="debug-year">-</span>
          </div>
          <div class="debug-section">
            <span class="debug-label">${this.t('fever.milestone').toUpperCase()}</span>
            <span class="debug-value" id="debug-milestone">-</span>
          </div>
          <div class="debug-section">
            <span class="debug-label">${this.t('fever.scenario').toUpperCase()}</span>
            <span class="debug-value" id="debug-scenario">-</span>
          </div>
          <div class="debug-section">
            <span class="debug-label">${this.t('fever.mode').toUpperCase()}</span>
            <span class="debug-value" id="debug-mode">-</span>
          </div>
          <div class="debug-section">
            <span class="debug-label">${this.t('fever.warnings').toUpperCase()}</span>
            <span class="debug-value" id="debug-warnings">0</span>
          </div>
          <div class="debug-section">
            <span class="debug-label">${this.t('fever.sync').toUpperCase()}</span>
            <span class="debug-badge sync" id="debug-sync">&#10003;</span>
          </div>
          <button class="debug-expand-btn" id="debug-expand-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 4L7 10M4 7L10 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="fever-debug-drawer ${this.isExpanded ? 'visible' : ''}">
          <div class="debug-drawer-zones">
            <div class="debug-zone zone-a">
              <div class="zone-header">${this.t('fever.runtimeControls')}</div>
              <div class="runtime-controls">
                <div class="year-scrubber">
                  <input type="range" id="year-scrubber" min="0" max="7" step="1" value="0">
                  <div class="milestone-markers">
                    ${[1950, 1975, 2000, 2025, 2050, 2075, 2100, 2125].map((year, i) => `
                      <button class="milestone-jump-btn" data-index="${i}" data-year="${year}">${year}</button>
                    `).join('')}
                  </div>
                </div>
                <div class="control-row">
                  <select id="debug-scenario-select">
                    <option value="best">${this.t('fever.best')}</option>
                    <option value="objective">${this.t('fever.objective')}</option>
                    <option value="high">${this.t('fever.high')}</option>
                  </select>
                  <button class="control-btn" id="debug-reverse-btn">&#9198; ${this.t('fever.reverse')}</button>
                  <button class="control-btn" id="debug-pause-btn">&#9208; ${this.t('fever.pause')}</button>
                </div>
              </div>
            </div>

            <div class="debug-zone zone-b">
              <div class="zone-header">${this.t('fever.dualPreview')}</div>
              <div class="preview-cards">
                <div class="preview-card fever-preview">
                  <div class="preview-title">${this.t('fever.texture')}</div>
                  <div class="preview-content">
                    <div class="preview-item">
                      <span>${this.t('fever.milestone')}:</span>
                      <span id="fever-milestone-preview">-</span>
                    </div>
                    <div class="preview-item">
                      <span>${this.t('fever.interpolation')}:</span>
                      <span id="fever-interp-preview">-</span>
                    </div>
                    <div class="preview-item">
                      <span>${this.t('fever.scenario')}:</span>
                      <span id="fever-scenario-preview">-</span>
                    </div>
                  </div>
                </div>
                <div class="preview-card tipping-preview">
                  <div class="preview-title">${this.t('fever.tippingOverlay')}</div>
                  <div class="preview-content">
                    <div class="preview-item">
                      <span>${this.t('fever.visible')}:</span>
                      <span id="tipping-visible-preview">-</span>
                    </div>
                    <div class="preview-item">
                      <span>${this.t('fever.activeTopics')}:</span>
                      <span id="tipping-topics-preview">-</span>
                    </div>
                    <div class="preview-item">
                      <span>${this.t('fever.sync')}:</span>
                      <span id="tipping-sync-preview">-</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="debug-zone zone-c">
              <div class="zone-header">${this.t('fever.inspector')}</div>
              <div class="inspector-tabs">
                <button class="inspector-tab ${this.activeTab === 'runtime' ? 'active' : ''}" data-tab="runtime">${this.t('fever.runtime')}</button>
                <button class="inspector-tab ${this.activeTab === 'topics' ? 'active' : ''}" data-tab="topics">${this.t('fever.topics')}</button>
                <button class="inspector-tab ${this.activeTab === 'warnings' ? 'active' : ''}" data-tab="warnings">${this.t('fever.warnings')}</button>
                <button class="inspector-tab ${this.activeTab === 'logs' ? 'active' : ''}" data-tab="logs">${this.t('fever.logs')}</button>
              </div>
              <div class="inspector-content" id="inspector-content">
                ${this.renderInspectorTab()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderInspectorTab() {
    switch (this.activeTab) {
      case 'runtime':
        return `
          <div class="inspector-section">
            <div class="inspector-label">${this.t('fever.currentState')}</div>
            <div class="inspector-grid">
              <div><strong>${this.t('fever.year')}:</strong> <span id="inspector-year">-</span></div>
              <div><strong>${this.t('fever.index')}:</strong> <span id="inspector-index">-</span></div>
              <div><strong>${this.t('fever.progress')}:</strong> <span id="inspector-progress">-</span></div>
              <div><strong>${this.t('fever.paused')}:</strong> <span id="inspector-paused">-</span></div>
              <div><strong>${this.t('fever.reversed')}:</strong> <span id="inspector-reversed">-</span></div>
            </div>
          </div>
        `;
      case 'topics':
        return this.renderTopicsEditor();
      case 'warnings':
        return `
          <div class="inspector-section">
            <div class="inspector-label">${this.t('fever.activeWarnings')}</div>
            <div id="warnings-list">${this.t('fever.loading')}</div>
          </div>
        `;
      case 'logs':
        return `
          <div class="inspector-section">
            <div class="inspector-label">${this.t('fever.debugLogs')}</div>
            <div id="debug-logs" class="debug-log-list"></div>
          </div>
        `;
      default:
        return '';
    }
  }

  renderTopicsEditor() {
    const snapshot = this.debugAdapter.getLatestSnapshot();
    if (!snapshot || !snapshot.tippingDiagnostics) {
      return `<div class="inspector-section">${this.t('fever.loadingTippingDiagnostics')}</div>`;
    }

    const boundaries = Object.keys(snapshot.tippingDiagnostics.thresholds);
    
    return `
      <div class="inspector-section">
        <div class="inspector-label">${this.t('fever.tippingBoundariesRealtime')}</div>
        <div style="max-height: 180px; overflow-y: auto; font-size: 10px;">
          ${boundaries.map(boundary => {
            const data = snapshot.tippingDiagnostics.thresholds[boundary];
            return `
              <div style="padding: 6px; margin-bottom: 4px; background: rgba(255,255,255,0.03); border-radius: 3px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong style="color: ${data.atThreshold ? '#ef5350' : '#81c784'};">${boundary.replace(/_/g, ' ')}</strong>
                  <span style="color: var(--text-secondary);">${(data.progress * 100).toFixed(0)}%</span>
                </div>
                <div style="display: flex; gap: 8px; font-size: 9px; color: var(--text-secondary);">
                  <span>${this.t('fever.segmentsShort')}: ${data.segmentsActive}/${data.segmentsTotal}</span>
                  <span>${this.t('fever.color')}: ${data.labelColor || 'N/A'}</span>
                  <span>${data.triggered ? `&#9888; ${this.t('fever.triggered')}` : `&#10003; ${this.t('fever.ok')}`}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  attachListeners() {
    this.container.removeEventListener('click', this.handleClick);
    this.container.removeEventListener('change', this.handleChange);
    this.container.addEventListener('click', this.handleClick);
    this.container.addEventListener('change', this.handleChange);
  }

  handleClick(e) {
    if (e.target.closest('#debug-expand-btn')) {
      this.toggleExpanded();
    } else if (e.target.closest('.milestone-jump-btn')) {
      const year = parseInt(e.target.dataset.year);
      this.jumpToYear(year);
    } else if (e.target.closest('#debug-reverse-btn')) {
      this.toggleReverse();
    } else if (e.target.closest('#debug-pause-btn')) {
      this.togglePause();
    } else if (e.target.closest('.inspector-tab')) {
      const tab = e.target.dataset.tab;
      this.switchTab(tab);
    }
  }

  handleChange(e) {
    if (e.target.id === 'debug-scenario-select') {
      this.changeScenario(e.target.value);
    } else if (e.target.id === 'year-scrubber') {
      const index = parseInt(e.target.value);
      const year = [1950, 1975, 2000, 2025, 2050, 2075, 2100, 2125][index];
      this.jumpToYear(year);
    }
  }

  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    this.container.querySelector('.fever-debug-bar').classList.toggle('expanded', this.isExpanded);
    this.container.querySelector('.fever-debug-drawer').classList.toggle('visible', this.isExpanded);
    
    const btn = this.container.querySelector('#debug-expand-btn');
    btn.innerHTML = this.isExpanded ? 
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 7L10 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' :
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 4L7 10M4 7L10 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  }

  jumpToYear(year) {
    if (window.currentGlobe) {
      window.currentGlobe.seekToYear(year);
      this.log(this.t('fever.jumpLog', { year }));
    }
  }

  toggleReverse() {
    if (window.currentGlobe) {
      window.currentGlobe.toggleFeverReverse();
      this.log(this.t('fever.reverseLog'));
    }
  }

  togglePause() {
    if (window.currentGlobe) {
      window.currentGlobe.toggleFeverPause();
      this.log(this.t('fever.pauseLog'));
    }
  }

  changeScenario(scenario) {
    if (window.currentGlobe) {
      window.currentGlobe.setFeverScenario(scenario);
      this.log(this.t('fever.scenarioLog', { scenario }));
    }
  }

  switchTab(tab) {
    this.activeTab = tab;
    const content = this.container.querySelector('#inspector-content');
    content.innerHTML = this.renderInspectorTab();
    
    this.container.querySelectorAll('.inspector-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    this.updateInspectorContent();
  }

  updateSnapshot(snapshot) {
    if (!snapshot) return;

    // Update collapsed bar
    const yearEl = document.getElementById('debug-year');
    const milestoneEl = document.getElementById('debug-milestone');
    const scenarioEl = document.getElementById('debug-scenario');
    const modeEl = document.getElementById('debug-mode');
    const warningsEl = document.getElementById('debug-warnings');

    if (yearEl) yearEl.textContent = snapshot.currentYear;
    if (milestoneEl) {
      milestoneEl.textContent = `${snapshot.lowerMilestone} \u2192 ${snapshot.upperMilestone}`;
    }
    if (scenarioEl) scenarioEl.textContent = this.t(`fever.${snapshot.scenario}`).toUpperCase();
    if (modeEl) {
      modeEl.textContent = snapshot.isPaused
        ? this.t('fever.pausedMode').toUpperCase()
        : (snapshot.isReversed ? this.t('fever.reverseMode').toUpperCase() : this.t('fever.forwardMode').toUpperCase());
    }
    if (warningsEl) warningsEl.textContent = snapshot.activeWarnings.length;

    // Update preview cards
    if (this.isExpanded) {
      const feverMilestonePreview = document.getElementById('fever-milestone-preview');
      const feverInterpPreview = document.getElementById('fever-interp-preview');
      const feverScenarioPreview = document.getElementById('fever-scenario-preview');
      const tippingVisiblePreview = document.getElementById('tipping-visible-preview');
      const tippingSyncPreview = document.getElementById('tipping-sync-preview');

      if (feverMilestonePreview) {
        feverMilestonePreview.textContent = `${snapshot.lowerMilestone} \u2192 ${snapshot.upperMilestone}`;
      }
      if (feverInterpPreview) {
        feverInterpPreview.textContent = `${(snapshot.interpolationFactor * 100).toFixed(1)}%`;
      }
      if (feverScenarioPreview) feverScenarioPreview.textContent = this.t(`fever.${snapshot.scenario}`);
      if (tippingVisiblePreview) {
        tippingVisiblePreview.textContent = snapshot.tippingOverlayVisible ? this.t('fever.yes') : this.t('fever.no');
      }
      if (tippingSyncPreview) tippingSyncPreview.textContent = `\u2713 ${this.t('fever.synced')}`;

      // Update inspector
      this.updateInspectorContent(snapshot);
    }
  }

  updateInspectorContent(snapshot = this.debugAdapter.getLatestSnapshot?.()) {
    if (!snapshot) return;

    if (this.activeTab === 'runtime') {
      const yearEl = document.getElementById('inspector-year');
      const indexEl = document.getElementById('inspector-index');
      const progressEl = document.getElementById('inspector-progress');
      const pausedEl = document.getElementById('inspector-paused');
      const reversedEl = document.getElementById('inspector-reversed');
      
      if (yearEl) yearEl.textContent = snapshot.currentYear;
      if (indexEl) indexEl.textContent = snapshot.currentIndex;
      if (progressEl) progressEl.textContent = `${(snapshot.progress * 100).toFixed(1)}%`;
      if (pausedEl) pausedEl.textContent = snapshot.isPaused ? this.t('fever.yes') : this.t('fever.no');
      if (reversedEl) reversedEl.textContent = snapshot.isReversed ? this.t('fever.yes') : this.t('fever.no');
    } else if (this.activeTab === 'topics') {
      // Re-render topics editor with latest data
      const content = this.container.querySelector('#inspector-content');
      if (content) {
        content.innerHTML = this.renderTopicsEditor();
      }
    } else if (this.activeTab === 'warnings') {
      const warningsList = this.container.querySelector('#warnings-list');
      if (warningsList) {
        warningsList.innerHTML = snapshot.activeWarnings.length > 0 ?
          snapshot.activeWarnings.map(w => `
            <div class="warning-item">
              <strong>${w.year}</strong> - ${w.summary}
            </div>
          `).join('') : this.t('fever.noActiveWarnings');
      }
    }
  }

  log(message) {
    const logsList = this.container.querySelector('#debug-logs');
    if (logsList) {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      logEntry.textContent = `[${timestamp}] ${message}`;
      logsList.insertBefore(logEntry, logsList.firstChild);
      
      // Keep only last 50 logs
      while (logsList.children.length > 50) {
        logsList.removeChild(logsList.lastChild);
      }
    }
  }
}
