import { Settings } from './settings.js?v=topic-earth-api-settings-widget-20260516';
import { AppAccess } from './capabilities.js?v=topic-earth-access-shortcuts-20260517';
import { LanguageManager } from './language.js?v=topic-earth-tab-layers-20260507';

const STORAGE_KEY = 'euroearth_tutorial_state';
const LEVEL_ORDER = {
  essential: 1,
  guided: 2,
  expert: 3
};
const SETTINGS_HINT_IDS = new Set([
  'settings-access',
  'settings-language',
  'tutorial-toggle',
  'settings-tutorial-level',
  'settings-tts',
  'settings-country-hover',
  'settings-main-texture',
  'settings-fever-loop',
  'settings-build',
  'settings-ai-api',
  'settings-regional'
]);

export class TutorialGuide {
  constructor(options = {}) {
    this.getLanguage = options.getLanguage || (() => 'en');
    this.storageKey = options.storageKey || STORAGE_KEY;
    this.state = this.loadState();
    this.steps = this.createSteps();
    this.activeStep = null;
    this.activeAnchor = null;
    this.element = null;
    this.ghostCursor = null;
    this.pendingTimer = null;
    this.isReading = false;
    this.readingUtterance = null;
    this.boundPosition = () => this.positionActiveBubble();
    this.boundSettings = (event) => this.handleSettingsChanged(event.detail?.settings);
    this.boundTrigger = (event) => this.notify(event.type, event.detail || {});
    this.boundSettingsHint = (event) => this.handleSettingsHintEvent(event);
    this.settingsHintTimer = null;
    this.lastSettingsHintId = '';
  }

  createSteps() {
    return [
      {
        id: 'globe-intro',
        trigger: 'tutorial:app-ready',
        level: 'essential',
        anchor: '[data-tutorial-id="globe-container"]',
        titleKey: 'tutorial.globe.title',
        bodyKey: 'tutorial.globe.body',
        placement: 'top',
        motion: 'pulse',
        once: true,
        delay: 900
      },
      {
        id: 'mode-tabs',
        trigger: 'topBarRendered',
        level: 'essential',
        anchor: '[data-tutorial-id="mode-tabs"]',
        titleKey: 'tutorial.modes.title',
        bodyKey: 'tutorial.modes.body',
        placement: 'bottom',
        once: true,
        delay: 250
      },
      {
        id: 'topic-detail',
        trigger: 'topicDetailOpened',
        level: 'essential',
        anchor: '[data-tutorial-id="topic-detail"]',
        titleKey: 'tutorial.topic.title',
        bodyKey: 'tutorial.topic.body',
        placement: 'left',
        once: true,
        interrupt: true,
        delay: 350
      },
      {
        id: 'topic-evidence',
        trigger: 'topicDetailOpened',
        level: 'guided',
        anchor: '[data-tutorial-id="topic-evidence"]',
        titleKey: 'tutorial.evidence.title',
        bodyKey: 'tutorial.evidence.body',
        placement: 'left',
        once: true,
        interrupt: true,
        delay: 450
      },
      {
        id: 'topic-composer-input',
        trigger: 'topicComposerOpened',
        level: 'guided',
        anchor: '[data-tutorial-id="topic-composer-input"]',
        titleKey: 'tutorial.composer.title',
        bodyKey: 'tutorial.composer.body',
        placement: 'right',
        motion: 'cursor',
        once: true,
        interrupt: true,
        delay: 260,
        when: (detail) => detail?.tab === 'describe'
      },
      {
        id: 'topic-composer-evidence-lane',
        trigger: 'topicComposerApplied',
        level: 'guided',
        anchor: '[data-tutorial-id="topic-composer-evidence-lane"]',
        titleKey: 'tutorial.composerEvidence.title',
        bodyKey: 'tutorial.composerEvidence.body',
        placement: 'left',
        once: true,
        interrupt: true,
        delay: 220
      },
      {
        id: 'topic-evidence-editor',
        trigger: ['topicComposerOpened', 'topicComposerTabChanged', 'topicEvidenceEditorOpened'],
        level: 'guided',
        anchor: '[data-tutorial-id="topic-evidence-editor"]',
        titleKey: 'tutorial.evidenceEditor.title',
        bodyKey: 'tutorial.evidenceEditor.body',
        placement: 'left',
        once: true,
        interrupt: true,
        delay: 220
      },
      {
        id: 'topic-media-actions',
        trigger: ['topicComposerTabChanged', 'topicEvidenceEditorOpened'],
        level: 'guided',
        anchor: '[data-tutorial-id="topic-media-actions"]',
        titleKey: 'tutorial.mediaActions.title',
        bodyKey: 'tutorial.mediaActions.body',
        placement: 'left',
        once: true,
        delay: 260
      },
      {
        id: 'topic-media-url',
        trigger: 'topicMediaUrlOpened',
        level: 'guided',
        anchor: '[data-tutorial-id="topic-media-url-input"]',
        titleKey: 'tutorial.mediaUrl.title',
        bodyKey: 'tutorial.mediaUrl.body',
        placement: 'top',
        once: true,
        interrupt: true,
        delay: 120
      },
      {
        id: 'topic-review-save',
        trigger: 'topicComposerTabChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="topic-save-button"]',
        titleKey: 'tutorial.reviewSave.title',
        bodyKey: 'tutorial.reviewSave.body',
        placement: 'left',
        once: true,
        interrupt: true,
        delay: 220,
        when: (detail) => detail?.tab === 'review'
      },
      {
        id: 'regional-search-toggle',
        trigger: 'viewModeChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="regional-search-toggle"]',
        titleKey: 'tutorial.regional.title',
        bodyKey: 'tutorial.regional.body',
        placement: 'right',
        motion: 'cursor',
        once: true,
        delay: 1000,
        when: (detail) => detail?.mode === 'regional-map'
      },
      {
        id: 'regional-search-panel',
        trigger: 'regionalSearchOpened',
        level: 'guided',
        anchor: '[data-tutorial-id="regional-search-panel"]',
        titleKey: 'tutorial.regionalSearch.title',
        bodyKey: 'tutorial.regionalSearch.body',
        placement: 'bottom',
        once: true,
        interrupt: true,
        delay: 250
      },
      {
        id: 'regional-path-tool',
        trigger: 'regionalToolChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="regional-tool-path"]',
        titleKey: 'tutorial.regionalPath.title',
        bodyKey: 'tutorial.regionalPath.body',
        placement: 'top',
        motion: 'cursor',
        once: true,
        interrupt: true,
        delay: 120,
        when: (detail) => detail?.mode === 'path'
      },
      {
        id: 'regional-path-finish',
        trigger: 'regionalPathPointAdded',
        level: 'guided',
        anchor: '[data-action="finish-regional-path"]',
        titleKey: 'tutorial.regionalPathFinish.title',
        bodyKey: 'tutorial.regionalPathFinish.body',
        placement: 'top',
        once: true,
        interrupt: true,
        delay: 160,
        when: (detail) => Number(detail?.count || 0) === 1
      },
      {
        id: 'regional-route-tool',
        trigger: 'regionalToolChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="regional-tool-route"]',
        titleKey: 'tutorial.regionalRoute.title',
        bodyKey: 'tutorial.regionalRoute.body',
        placement: 'top',
        motion: 'cursor',
        once: true,
        interrupt: true,
        delay: 120,
        when: (detail) => detail?.mode === 'route'
      },
      {
        id: 'regional-route-options',
        trigger: 'regionalToolChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="regional-route-options"]',
        titleKey: 'tutorial.regionalRouteOptions.title',
        bodyKey: 'tutorial.regionalRouteOptions.body',
        placement: 'bottom',
        once: true,
        delay: 250
      },
      {
        id: 'regional-route-destination',
        trigger: 'regionalRoutePointAdded',
        level: 'guided',
        anchor: '[data-tutorial-id="regional-map-canvas"]',
        titleKey: 'tutorial.regionalRouteDestination.title',
        bodyKey: 'tutorial.regionalRouteDestination.body',
        placement: 'top',
        once: true,
        interrupt: true,
        delay: 160,
        when: (detail) => Number(detail?.count || 0) === 1
      },
      {
        id: 'settings-toggle',
        trigger: 'settingsOpened',
        level: 'essential',
        anchor: '[data-tutorial-id="tutorial-toggle"]',
        titleKey: 'tutorial.settings.title',
        bodyKey: 'tutorial.settings.body',
        placement: 'left',
        once: true,
        interrupt: true,
        delay: 250
      },
      {
        id: 'settings-language',
        trigger: 'settingsOpened',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-language"]',
        titleKey: 'tutorial.settingsLanguage.title',
        bodyKey: 'tutorial.settingsLanguage.body',
        placement: 'left',
        once: true,
        delay: 260
      },
      {
        id: 'settings-tutorial-level',
        trigger: 'settingsOpened',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-tutorial-level"]',
        titleKey: 'tutorial.settingsGuideLevel.title',
        bodyKey: 'tutorial.settingsGuideLevel.body',
        placement: 'left',
        once: true,
        delay: 270
      },
      {
        id: 'settings-main-texture',
        trigger: 'settingsOpened',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-main-texture"]',
        titleKey: 'tutorial.settingsTexture.title',
        bodyKey: 'tutorial.settingsTexture.body',
        placement: 'left',
        once: true,
        delay: 280
      },
      {
        id: 'settings-fever-loop',
        trigger: 'settingsOpened',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-fever-loop"]',
        titleKey: 'tutorial.settingsFeverLoop.title',
        bodyKey: 'tutorial.settingsFeverLoop.body',
        placement: 'left',
        once: true,
        delay: 290
      },
      {
        id: 'settings-ai-api',
        trigger: 'settingsOpened',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-ai-api"]',
        titleKey: 'tutorial.settingsAi.title',
        bodyKey: 'tutorial.settingsAi.body',
        placement: 'left',
        once: true,
        delay: 300
      },
      {
        id: 'settings-regional',
        trigger: 'settingsOpened',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-regional"]',
        titleKey: 'tutorial.settingsRegional.title',
        bodyKey: 'tutorial.settingsRegional.body',
        placement: 'left',
        once: true,
        delay: 310
      },
      {
        id: 'settings-access-context',
        trigger: 'settingsHintChanged',
        level: 'essential',
        anchor: '[data-tutorial-id="settings-access"]',
        titleKey: 'tutorial.settingsAccess.title',
        bodyKey: 'tutorial.settingsAccess.body',
        placement: 'left',
        interrupt: true,
        delay: 0,
        when: (detail) => detail?.tutorialId === 'settings-access'
      },
      {
        id: 'settings-language-context',
        trigger: 'settingsHintChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-language"]',
        titleKey: 'tutorial.settingsLanguage.title',
        bodyKey: 'tutorial.settingsLanguage.body',
        placement: 'left',
        interrupt: true,
        delay: 0,
        when: (detail) => detail?.tutorialId === 'settings-language'
      },
      {
        id: 'settings-toggle-context',
        trigger: 'settingsHintChanged',
        level: 'essential',
        anchor: '[data-tutorial-id="tutorial-toggle"]',
        titleKey: 'tutorial.settings.title',
        bodyKey: 'tutorial.settings.body',
        placement: 'left',
        interrupt: true,
        delay: 0,
        when: (detail) => detail?.tutorialId === 'tutorial-toggle'
      },
      {
        id: 'settings-tutorial-level-context',
        trigger: 'settingsHintChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-tutorial-level"]',
        titleKey: 'tutorial.settingsGuideLevel.title',
        bodyKey: 'tutorial.settingsGuideLevel.body',
        placement: 'left',
        interrupt: true,
        delay: 0,
        when: (detail) => detail?.tutorialId === 'settings-tutorial-level'
      },
      {
        id: 'settings-tts-context',
        trigger: 'settingsHintChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-tts"]',
        titleKey: 'tutorial.settingsTts.title',
        bodyKey: 'tutorial.settingsTts.body',
        placement: 'left',
        interrupt: true,
        delay: 0,
        when: (detail) => detail?.tutorialId === 'settings-tts'
      },
      {
        id: 'settings-country-hover-context',
        trigger: 'settingsHintChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-country-hover"]',
        titleKey: 'tutorial.settingsCountry.title',
        bodyKey: 'tutorial.settingsCountry.body',
        placement: 'left',
        interrupt: true,
        delay: 0,
        when: (detail) => detail?.tutorialId === 'settings-country-hover'
      },
      {
        id: 'settings-main-texture-context',
        trigger: 'settingsHintChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-main-texture"]',
        titleKey: 'tutorial.settingsTexture.title',
        bodyKey: 'tutorial.settingsTexture.body',
        placement: 'left',
        interrupt: true,
        delay: 0,
        when: (detail) => detail?.tutorialId === 'settings-main-texture'
      },
      {
        id: 'settings-fever-loop-context',
        trigger: 'settingsHintChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-fever-loop"]',
        titleKey: 'tutorial.settingsFeverLoop.title',
        bodyKey: 'tutorial.settingsFeverLoop.body',
        placement: 'left',
        interrupt: true,
        delay: 0,
        when: (detail) => detail?.tutorialId === 'settings-fever-loop'
      },
      {
        id: 'settings-build-context',
        trigger: 'settingsHintChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-build"]',
        titleKey: 'tutorial.settingsBuild.title',
        bodyKey: 'tutorial.settingsBuild.body',
        placement: 'left',
        interrupt: true,
        delay: 0,
        when: (detail) => detail?.tutorialId === 'settings-build'
      },
      {
        id: 'settings-ai-api-context',
        trigger: 'settingsHintChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-ai-api"]',
        titleKey: 'tutorial.settingsAi.title',
        bodyKey: 'tutorial.settingsAi.body',
        placement: 'left',
        interrupt: true,
        delay: 0,
        when: (detail) => detail?.tutorialId === 'settings-ai-api'
      },
      {
        id: 'settings-regional-context',
        trigger: 'settingsHintChanged',
        level: 'guided',
        anchor: '[data-tutorial-id="settings-regional"]',
        titleKey: 'tutorial.settingsRegional.title',
        bodyKey: 'tutorial.settingsRegional.body',
        placement: 'left',
        interrupt: true,
        delay: 0,
        when: (detail) => detail?.tutorialId === 'settings-regional'
      },
      {
        id: 'admin-mode',
        trigger: 'topBarRendered',
        level: 'expert',
        anchor: '[data-tutorial-id="admin-toggle"]',
        titleKey: 'tutorial.admin.title',
        bodyKey: 'tutorial.admin.body',
        placement: 'bottom',
        once: true,
        delay: 350,
        when: () => AppAccess.can('admin:ui-toggle')
      }
    ];
  }

  start() {
    window.addEventListener('settingsChanged', this.boundSettings);
    window.addEventListener('topBarRendered', this.boundTrigger);
    window.addEventListener('topicDetailOpened', this.boundTrigger);
    window.addEventListener('settingsOpened', this.boundTrigger);
    window.addEventListener('viewModeChanged', this.boundTrigger);
    window.addEventListener('regionalSearchOpened', this.boundTrigger);
    window.addEventListener('regionalToolChanged', this.boundTrigger);
    window.addEventListener('regionalPathPointAdded', this.boundTrigger);
    window.addEventListener('regionalRoutePointAdded', this.boundTrigger);
    window.addEventListener('topicComposerOpened', this.boundTrigger);
    window.addEventListener('topicComposerTabChanged', this.boundTrigger);
    window.addEventListener('topicEvidenceEditorOpened', this.boundTrigger);
    window.addEventListener('topicMediaUrlOpened', this.boundTrigger);
    window.addEventListener('topicComposerApplied', this.boundTrigger);
    window.addEventListener('resize', this.boundPosition);
    window.addEventListener('scroll', this.boundPosition, true);
    document.addEventListener('pointerover', this.boundSettingsHint, true);
    document.addEventListener('focusin', this.boundSettingsHint, true);
    document.addEventListener('click', this.boundSettingsHint, true);
    this.notify('tutorial:app-ready');
  }

  destroy() {
    window.removeEventListener('settingsChanged', this.boundSettings);
    window.removeEventListener('topBarRendered', this.boundTrigger);
    window.removeEventListener('topicDetailOpened', this.boundTrigger);
    window.removeEventListener('settingsOpened', this.boundTrigger);
    window.removeEventListener('viewModeChanged', this.boundTrigger);
    window.removeEventListener('regionalSearchOpened', this.boundTrigger);
    window.removeEventListener('regionalToolChanged', this.boundTrigger);
    window.removeEventListener('regionalPathPointAdded', this.boundTrigger);
    window.removeEventListener('regionalRoutePointAdded', this.boundTrigger);
    window.removeEventListener('topicComposerOpened', this.boundTrigger);
    window.removeEventListener('topicComposerTabChanged', this.boundTrigger);
    window.removeEventListener('topicEvidenceEditorOpened', this.boundTrigger);
    window.removeEventListener('topicMediaUrlOpened', this.boundTrigger);
    window.removeEventListener('topicComposerApplied', this.boundTrigger);
    window.removeEventListener('resize', this.boundPosition);
    window.removeEventListener('scroll', this.boundPosition, true);
    document.removeEventListener('pointerover', this.boundSettingsHint, true);
    document.removeEventListener('focusin', this.boundSettingsHint, true);
    document.removeEventListener('click', this.boundSettingsHint, true);
    window.clearTimeout(this.pendingTimer);
    window.clearTimeout(this.settingsHintTimer);
    this.stopReading();
    this.hide();
  }

  notify(trigger, detail = {}) {
    if (!this.isEnabled()) return;
    const candidates = this.steps.filter(step => (
      Array.isArray(step.trigger)
        ? step.trigger.includes(trigger)
        : step.trigger === trigger
    ));
    if (!candidates.length) return;

    window.clearTimeout(this.pendingTimer);
    const delay = Math.max(...candidates.map(step => step.delay || 0));
    this.pendingTimer = window.setTimeout(() => {
      this.showFirstEligible(candidates, detail);
    }, delay);
  }

  handleSettingsHintEvent(event) {
    if (!this.isEnabled()) return;
    if (this.element?.contains(event.target)) return;

    const anchor = event.target?.closest?.('[data-tutorial-id]');
    const tutorialId = anchor?.dataset?.tutorialId || '';
    if (!SETTINGS_HINT_IDS.has(tutorialId)) return;
    if (!anchor.closest?.('#detail-content')) return;
    if (!document.querySelector('#detail-content [data-tutorial-id="settings-language"]')) return;

    const delay = event.type === 'pointerover' ? 180 : 0;
    window.clearTimeout(this.settingsHintTimer);
    this.settingsHintTimer = window.setTimeout(() => {
      if (
        this.lastSettingsHintId === tutorialId
        && this.activeAnchor === anchor
        && this.activeStep?.trigger === 'settingsHintChanged'
      ) {
        this.positionActiveBubble();
        return;
      }
      this.lastSettingsHintId = tutorialId;
      this.notify('settingsHintChanged', { tutorialId, sourceEvent: event.type });
    }, delay);
  }

  handleSettingsChanged(settings = Settings.get()) {
    if (settings.tutorialModeEnabled === false) {
      this.hide();
      return;
    }
    this.positionActiveBubble();
  }

  isEnabled() {
    return Settings.get().tutorialModeEnabled !== false;
  }

  getLevel() {
    const settingsLevel = Settings.get().tutorialLevel || 'guided';
    return LEVEL_ORDER[settingsLevel] ? settingsLevel : 'guided';
  }

  canShowLevel(stepLevel = 'essential') {
    return (LEVEL_ORDER[stepLevel] || 1) <= (LEVEL_ORDER[this.getLevel()] || LEVEL_ORDER.guided);
  }

  loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      return {
        completed: Array.isArray(stored.completed) ? stored.completed : [],
        dismissed: Array.isArray(stored.dismissed) ? stored.dismissed : [],
        lastShownAt: stored.lastShownAt && typeof stored.lastShownAt === 'object' ? stored.lastShownAt : {}
      };
    } catch {
      return { completed: [], dismissed: [], lastShownAt: {} };
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.warn('[Tutorial] Could not save tutorial state:', error);
    }
  }

  isStepDone(step) {
    return step.once && (
      this.state.completed.includes(step.id)
      || this.state.dismissed.includes(step.id)
    );
  }

  getAnchor(step) {
    const anchor = document.querySelector(step.anchor);
    if (!anchor) return null;

    const rect = anchor.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    if (anchor.closest('[hidden], .hidden')) return null;

    return anchor;
  }

  isEligible(step, detail = {}) {
    if (!this.isEnabled()) return false;
    if (!this.canShowLevel(step.level)) return false;
    if (this.isStepDone(step)) return false;
    if (step.when && !step.when(detail)) return false;
    return Boolean(this.getAnchor(step));
  }

  showFirstEligible(candidates, detail = {}) {
    const step = candidates.find(candidate => this.isEligible(candidate, detail));
    if (!step) return;
    if (this.activeStep) {
      if (!step.interrupt) return;
      this.hide();
    }
    this.show(step);
  }

  show(step) {
    const anchor = this.getAnchor(step);
    if (!anchor) return;

    this.activeStep = step;
    this.activeAnchor = anchor;
    this.state.lastShownAt[step.id] = new Date().toISOString();
    this.saveState();

    this.bringAnchorIntoView(anchor);
    this.render(step);
    this.highlightAnchor(anchor, step);
    this.positionActiveBubble();
    window.requestAnimationFrame(() => this.positionActiveBubble());
    document.body.classList.add('tutorial-guide-active');
  }

  bringAnchorIntoView(anchor) {
    const rect = anchor.getBoundingClientRect();
    const margin = 88;
    const isMostlyVisible = rect.top >= margin && rect.bottom <= (window.innerHeight - margin);
    if (isMostlyVisible) return;

    anchor.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'auto'
    });
  }

  render(step) {
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.className = 'tutorial-bubble hidden';
      this.element.setAttribute('role', 'dialog');
      this.element.setAttribute('aria-live', 'polite');
      this.element.setAttribute('data-i18n-skip', 'true');
      this.element.addEventListener('click', (event) => this.handleClick(event));
      document.body.appendChild(this.element);
    }

    const lang = this.getLanguage();
    const readButton = this.canRead()
      ? `<button type="button" class="tutorial-bubble-link" data-tutorial-action="read" aria-pressed="${this.isReading ? 'true' : 'false'}">${this.escapeHtml(LanguageManager.getLabel(this.isReading ? 'tutorial.stopRead' : 'tutorial.read', lang))}</button>`
      : '';
    this.element.innerHTML = `
      <div class="tutorial-bubble-kicker">${this.escapeHtml(LanguageManager.getLabel('tutorial.kicker', lang))}</div>
      <div class="tutorial-bubble-title">${this.escapeHtml(LanguageManager.getLabel(step.titleKey, lang))}</div>
      <div class="tutorial-bubble-body">${this.escapeHtml(LanguageManager.getLabel(step.bodyKey, lang))}</div>
      <div class="tutorial-bubble-actions">
        ${readButton}
        <button type="button" class="tutorial-bubble-link" data-tutorial-action="off">${this.escapeHtml(LanguageManager.getLabel('tutorial.turnOff', lang))}</button>
        <button type="button" class="tutorial-bubble-link" data-tutorial-action="skip">${this.escapeHtml(LanguageManager.getLabel('tutorial.skip', lang))}</button>
        <button type="button" class="tutorial-bubble-primary" data-tutorial-action="next">${this.escapeHtml(LanguageManager.getLabel('tutorial.next', lang))}</button>
      </div>
    `;
    this.element.classList.remove('hidden');
  }

  handleClick(event) {
    const action = event.target.closest('[data-tutorial-action]')?.dataset.tutorialAction;
    if (!action) return;

    if (action === 'off') {
      const settings = Settings.set({ tutorialModeEnabled: false }) || Settings.get();
      window.dispatchEvent(new CustomEvent('settingsChanged', {
        detail: { settings, feverResolutionChanged: false }
      }));
      this.hide();
      return;
    }

    if (action === 'read') {
      this.toggleReadActiveStep();
      return;
    }

    if (action === 'skip') {
      this.dismissActiveStep();
      return;
    }

    this.completeActiveStep();
  }

  completeActiveStep() {
    const completedId = this.activeStep?.id || '';
    const continueGuide = this.activeStep?.trigger !== 'settingsHintChanged';
    if (this.activeStep && !this.state.completed.includes(this.activeStep.id)) {
      this.state.completed.push(this.activeStep.id);
      this.saveState();
    }
    this.hide();
    if (continueGuide) {
      window.setTimeout(() => this.showNextVisibleStep(completedId), 120);
    }
  }

  dismissActiveStep() {
    if (this.activeStep && !this.state.dismissed.includes(this.activeStep.id)) {
      this.state.dismissed.push(this.activeStep.id);
      this.saveState();
    }
    this.hide();
  }

  showNextVisibleStep(previousId = '') {
    if (!this.isEnabled() || this.activeStep) return;

    const previousIndex = this.steps.findIndex(step => step.id === previousId);
    const searchList = previousIndex >= 0
      ? this.steps.slice(previousIndex + 1)
      : this.steps;
    const step = searchList.find(candidate => this.isEligible(candidate, {}));
    if (step) this.show(step);
  }

  highlightAnchor(anchor, step) {
    document.querySelectorAll('.tutorial-anchor-highlight').forEach(element => {
      element.classList.remove('tutorial-anchor-highlight', 'tutorial-anchor-cursor-target');
    });

    anchor.classList.add('tutorial-anchor-highlight');
    if (step.motion === 'cursor' && !this.prefersReducedMotion()) {
      anchor.classList.add('tutorial-anchor-cursor-target');
      this.showGhostCursor(anchor);
    } else {
      this.hideGhostCursor();
    }
  }

  positionActiveBubble() {
    if (!this.element || !this.activeAnchor || this.element.classList.contains('hidden')) return;

    const anchorRect = this.activeAnchor.getBoundingClientRect();
    const bubbleRect = this.element.getBoundingClientRect();
    const margin = 12;
    const preferred = this.activeStep?.placement || 'auto';
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const space = {
      top: anchorRect.top,
      bottom: viewportHeight - anchorRect.bottom,
      left: anchorRect.left,
      right: viewportWidth - anchorRect.right
    };
    const placement = this.choosePlacement(preferred, space, bubbleRect, margin);

    let left = anchorRect.left + (anchorRect.width / 2) - (bubbleRect.width / 2);
    let top = anchorRect.bottom + margin;

    if (placement === 'top') {
      top = anchorRect.top - bubbleRect.height - margin;
    } else if (placement === 'left') {
      left = anchorRect.left - bubbleRect.width - margin;
      top = anchorRect.top + (anchorRect.height / 2) - (bubbleRect.height / 2);
    } else if (placement === 'right') {
      left = anchorRect.right + margin;
      top = anchorRect.top + (anchorRect.height / 2) - (bubbleRect.height / 2);
    }

    left = Math.max(margin, Math.min(left, viewportWidth - bubbleRect.width - margin));
    top = Math.max(margin, Math.min(top, viewportHeight - bubbleRect.height - margin));

    this.element.dataset.placement = placement;
    this.element.style.left = `${Math.round(left)}px`;
    this.element.style.top = `${Math.round(top)}px`;
  }

  choosePlacement(preferred, space, bubbleRect, margin) {
    const fits = {
      bottom: space.bottom >= bubbleRect.height + margin,
      top: space.top >= bubbleRect.height + margin,
      right: space.right >= bubbleRect.width + margin,
      left: space.left >= bubbleRect.width + margin
    };

    if (preferred !== 'auto' && fits[preferred]) return preferred;
    return ['bottom', 'top', 'right', 'left'].find(side => fits[side]) || 'bottom';
  }

  showGhostCursor(anchor) {
    if (!this.ghostCursor) {
      this.ghostCursor = document.createElement('div');
      this.ghostCursor.className = 'tutorial-ghost-cursor';
      document.body.appendChild(this.ghostCursor);
    }

    const rect = anchor.getBoundingClientRect();
    this.ghostCursor.style.left = `${Math.round(rect.left + (rect.width * 0.68))}px`;
    this.ghostCursor.style.top = `${Math.round(rect.top + (rect.height * 0.52))}px`;
    this.ghostCursor.classList.remove('hidden');
  }

  hideGhostCursor() {
    if (this.ghostCursor) this.ghostCursor.classList.add('hidden');
  }

  canRead() {
    if (Settings.get().ttsEnabled === false) return false;
    return Boolean(window.ttsManager?.speak || window.speechSynthesis);
  }

  getActiveStepText() {
    if (!this.activeStep) return '';

    const lang = this.getLanguage();
    return [
      LanguageManager.getLabel(this.activeStep.titleKey, lang),
      LanguageManager.getLabel(this.activeStep.bodyKey, lang)
    ]
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .join('. ');
  }

  toggleReadActiveStep() {
    if (this.isReading) {
      this.stopReading();
      return;
    }
    this.readActiveStep();
  }

  readActiveStep() {
    const text = this.getActiveStepText();
    if (!text || !this.canRead()) return;

    this.stopReading({ rerender: false });
    this.isReading = true;
    this.updateReadButton();
    const langCode = LanguageManager.getSpeechCode(this.getLanguage());

    if (window.ttsManager?.speak) {
      window.ttsManager.speak(text, langCode, {
        onEnd: () => this.handleReadFinished(),
        onError: () => this.handleReadFinished()
      });
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.onend = () => this.handleReadFinished();
      utterance.onerror = () => this.handleReadFinished();
      this.readingUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('[Tutorial] Could not read tutorial bubble:', error);
      this.handleReadFinished();
    }
  }

  stopReading(options = {}) {
    const { rerender = true } = options;
    const wasReading = this.isReading;
    const utterance = this.readingUtterance;
    this.isReading = false;
    this.readingUtterance = null;
    if (wasReading) {
      window.ttsManager?.stop?.();
      if (utterance || !window.ttsManager?.stop) {
        window.speechSynthesis?.cancel?.();
      }
    }
    if (rerender && wasReading) {
      this.updateReadButton();
    }
  }

  handleReadFinished() {
    this.isReading = false;
    this.readingUtterance = null;
    this.updateReadButton();
  }

  updateReadButton() {
    const button = this.element?.querySelector('[data-tutorial-action="read"]');
    if (!button) return;

    const lang = this.getLanguage();
    button.textContent = LanguageManager.getLabel(this.isReading ? 'tutorial.stopRead' : 'tutorial.read', lang);
    button.setAttribute('aria-pressed', String(this.isReading));
  }

  prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  hide() {
    this.stopReading({ rerender: false });
    if (this.element) this.element.classList.add('hidden');
    this.hideGhostCursor();
    document.body.classList.remove('tutorial-guide-active');
    document.querySelectorAll('.tutorial-anchor-highlight').forEach(element => {
      element.classList.remove('tutorial-anchor-highlight', 'tutorial-anchor-cursor-target');
    });
    this.activeStep = null;
    this.activeAnchor = null;
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
}
