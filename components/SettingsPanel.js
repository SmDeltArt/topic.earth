import { Settings } from '../lib/settings.js';
import { LanguageManager } from '../lib/language.js?v=topic-earth-warning-panel-collapse-20260430';

/**
 * Settings panel component
 */
export class SettingsPanel {
  constructor(container, ttsManager, callbacks = {}) {
    this.container = container;
    this.ttsManager = ttsManager;
    this.callbacks = callbacks;
    this.settings = Settings.get();
    
    this.render();
    this.attachEventListeners();
  }

  getSettingsLanguageState() {
    const detectedLang = this.settings.detectedBrowserLanguage || LanguageManager.detectBrowserLanguage();
    const currentLang = this.settings.autoDetectLanguage
      ? detectedLang
      : (this.settings.uiLanguage || detectedLang);

    return { detectedLang, currentLang };
  }

  getVoiceChoicesForLanguage(langCode) {
    const allVoices = this.ttsManager.getAllVoices();
    const matchingVoices = this.ttsManager.getVoicesForLanguage(langCode);

    return {
      allVoices,
      voices: matchingVoices.length > 0 ? matchingVoices : allVoices,
      matchingCount: matchingVoices.length
    };
  }

  renderLanguageOptions(languages, currentLang) {
    return languages.map(lang => `
      <option
        value="${lang.code}"
        ${currentLang === lang.code ? 'selected' : ''}
      >
        ${lang.nativeName} (${lang.name})
      </option>
    `).join('');
  }

  renderBrowserVoiceOptions(voices, preferredVoice, langCode) {
    return `
      <option value="">${LanguageManager.getLabel('settings.voiceAuto', langCode)}</option>
      ${voices.map(voice => `
        <option
          value="${voice.name}"
          ${preferredVoice === voice.name ? 'selected' : ''}
        >
          ${voice.name} (${voice.lang})
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

  updateBrowserVoicePicker(langCode, preferredVoice = '') {
    const voiceSelect = this.container.querySelector('#browser-voice');
    if (!voiceSelect) return;

    const { allVoices, voices, matchingCount } = this.getVoiceChoicesForLanguage(langCode);
    voiceSelect.innerHTML = this.renderBrowserVoiceOptions(voices, preferredVoice, langCode);

    const voiceHint = this.container.querySelector('#browser-voice-hint');
    if (voiceHint) {
      voiceHint.textContent = this.getVoiceFilterHint(langCode, matchingCount, allVoices.length);
    }
  }

  persistSelectedLanguage(langCode) {
    this.settings = Settings.set({
      autoDetectLanguage: false,
      uiLanguage: langCode,
      detectedBrowserLanguage: LanguageManager.detectBrowserLanguage()
    });

    if (this.settings && this.ttsManager?.updateSettings) {
      this.ttsManager.updateSettings(this.settings);
    }

    if (this.callbacks.onSettingsChange) {
      this.callbacks.onSettingsChange(this.settings);
    }
  }

  render() {
    const languages = LanguageManager.getAllLanguages();
    const { detectedLang, currentLang } = this.getSettingsLanguageState();
    const { allVoices, voices, matchingCount } = this.getVoiceChoicesForLanguage(currentLang);
    const detectedLanguageName = LanguageManager.getLanguageInfo(detectedLang)?.nativeName || detectedLang;
    const currentLanguageName = LanguageManager.getLanguageInfo(currentLang)?.nativeName || currentLang;
    const t = (key, values = null) => values
      ? LanguageManager.formatLabel(key, currentLang, values)
      : LanguageManager.getLabel(key, currentLang);
    this.container.lang = currentLang;
    this.container.dir = LanguageManager.getTextDirection(currentLang);
    const aiVoiceEnabled = Boolean(this.settings.aiVoiceEnabled);

    this.container.innerHTML = `
      <div class="settings-overlay">
        <div class="settings-modal">
          <div class="settings-header">
            <h2>${t('common.settings')}</h2>
            <button class="settings-close" data-action="close">×</button>
          </div>
          
          <div class="settings-content">
            <div class="settings-section">
              <h3>${t('settings.language')}</h3>
              <div class="form-group language-picker">
                <select id="ui-language" class="language-scroll-select" size="4" aria-label="Choose language">
                  ${this.renderLanguageOptions(languages, currentLang)}
                </select>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    id="tutorial-mode-enabled" 
                    ${this.settings.tutorialModeEnabled !== false ? 'checked' : ''}
                  >
                  Interactive tutorial tips
                </label>
                <div class="setting-hint">Show short usage hints across the interface. Turn off for a cleaner English-first UI.</div>
              </div>
            </div>

            <div class="settings-section">
              <h3>${t('settings.textToSpeech')}</h3>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    id="tts-enabled" 
                    ${this.settings.ttsEnabled ? 'checked' : ''}
                  >
                  ${t('settings.enableTts')}
                </label>
              </div>

              ${this.settings.ttsEnabled ? `
                <div class="form-group">
                  <label for="browser-voice">${t('settings.browserVoice')}</label>
                  <select id="browser-voice">
                    ${this.renderBrowserVoiceOptions(voices, this.settings.preferredBrowserVoice, currentLang)}
                  </select>
                  <div id="browser-voice-hint" class="setting-hint">${this.getVoiceFilterHint(currentLang, matchingCount, allVoices.length)}</div>
                </div>

                <div class="form-group">
                  <label>${t('settings.speechRate')}</label>
                  <div class="slider-group">
                    <input 
                      type="range" 
                      id="speech-rate" 
                      min="0.5" 
                      max="2" 
                      step="0.1" 
                      value="${this.settings.speechRate}"
                    >
                    <span class="slider-value">${this.settings.speechRate}x</span>
                  </div>
                </div>

                <div class="form-group">
                  <label>${t('settings.speechPitch')}</label>
                  <div class="slider-group">
                    <input 
                      type="range" 
                      id="speech-pitch" 
                      min="0.5" 
                      max="2" 
                      step="0.1" 
                      value="${this.settings.speechPitch}"
                    >
                    <span class="slider-value">${this.settings.speechPitch}x</span>
                  </div>
                </div>

                <div class="form-group">
                  <label>
                    <input 
                      type="checkbox" 
                      id="auto-show-transcript" 
                      ${this.settings.autoShowTranscript ? 'checked' : ''}
                    >
                    ${t('settings.showTranscriptReading')}
                  </label>
                </div>
              ` : ''}
            </div>

            <div class="settings-section">
              <h3>AI API</h3>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    id="ai-voice-enabled" 
                    ${aiVoiceEnabled ? 'checked' : ''}
                  >
                  Use linked TTS bridge for Translate + Read
                </label>
                <div class="setting-hint">TTS/STT providers, voice, and model are managed in API Settings. Off keeps translation reading on browser voice.</div>
              </div>
            </div>
          </div>

          <div class="settings-footer">
            <button class="btn-secondary" data-action="reset">${t('common.resetToDefaults')}</button>
            <button class="btn-primary" data-action="save">${t('common.saveSettings')}</button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'close') {
        this.hide();
      } else if (action === 'save') {
        this.saveSettings();
      } else if (action === 'reset') {
        this.resetSettings();
      }
    });

    // Real-time slider updates
    this.container.addEventListener('input', (e) => {
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
    this.container.addEventListener('change', (e) => {
      if (e.target.id === 'auto-detect-lang') {
        const languageSelect = this.container.querySelector('#ui-language');
        const nextLang = e.target.checked
          ? LanguageManager.detectBrowserLanguage()
          : (languageSelect?.value || this.getSettingsLanguageState().currentLang);
        if (languageSelect && e.target.checked) {
          languageSelect.value = nextLang;
        }
        const selectedLanguageName = LanguageManager.getLanguageInfo(nextLang)?.nativeName || nextLang;
        const currentStatus = this.container.querySelector('#language-current-status');
        if (currentStatus) {
          currentStatus.textContent = `${LanguageManager.getLabel('settings.using', nextLang)}: ${selectedLanguageName}`;
        }
        this.updateBrowserVoicePicker(
          nextLang,
          this.container.querySelector('#browser-voice')?.value || ''
        );
      } else if (e.target.id === 'ui-language') {
        const autoDetect = this.container.querySelector('#auto-detect-lang');
        if (autoDetect) {
          autoDetect.checked = false;
        }
        this.persistSelectedLanguage(e.target.value);
        const selectedLanguageName = LanguageManager.getLanguageInfo(e.target.value)?.nativeName || e.target.value;
        const currentStatus = this.container.querySelector('#language-current-status');
        if (currentStatus) {
          currentStatus.textContent = `${LanguageManager.getLabel('settings.using', e.target.value)}: ${selectedLanguageName}`;
        }
        this.updateBrowserVoicePicker(
          e.target.value,
          this.container.querySelector('#browser-voice')?.value || ''
        );
      } else if (e.target.id === 'tts-enabled') {
        this.container.querySelectorAll('#browser-voice, #speech-rate, #speech-pitch, #auto-show-transcript').forEach(control => {
          control.disabled = !e.target.checked;
        });
      }
    });
  }

  saveSettings() {
    const newSettings = {
      autoDetectLanguage: false,
      uiLanguage: this.container.querySelector('#ui-language')?.value || null,
      tutorialModeEnabled: this.container.querySelector('#tutorial-mode-enabled')?.checked ?? true,
      ttsEnabled: this.container.querySelector('#tts-enabled')?.checked ?? true,
      preferredBrowserVoice: this.container.querySelector('#browser-voice')?.value || null,
      speechRate: parseFloat(this.container.querySelector('#speech-rate')?.value || 1),
      speechPitch: parseFloat(this.container.querySelector('#speech-pitch')?.value || 1),
      autoShowTranscript: this.container.querySelector('#auto-show-transcript')?.checked ?? false,
      aiVoiceEnabled: this.container.querySelector('#ai-voice-enabled')?.checked ?? false,
      aiVoiceFallbackToBrowser: true
    };

    newSettings.detectedBrowserLanguage = LanguageManager.detectBrowserLanguage();

    this.settings = Settings.set(newSettings);
    this.ttsManager.updateSettings(this.settings);

    if (this.callbacks.onSettingsChange) {
      this.callbacks.onSettingsChange(this.settings);
    }

    this.hide();
  }

  resetSettings() {
    const { currentLang } = this.getSettingsLanguageState();

    if (confirm(LanguageManager.getLabel('settings.resetConfirm', currentLang))) {
      this.settings = Settings.reset();
      this.settings.detectedBrowserLanguage = LanguageManager.detectBrowserLanguage();
      Settings.set(this.settings);
      this.ttsManager.updateSettings(this.settings);
      
      if (this.callbacks.onSettingsChange) {
        this.callbacks.onSettingsChange(this.settings);
      }
      
      this.render();
    }
  }

  show() {
    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }
}
