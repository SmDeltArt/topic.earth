const MODE_SHORTCUTS = {
  regional: {
    name: 'Regional Map',
    description: 'Lightweight 2D regional mapping. No Three.js globe is required.'
  },
  main: {
    name: 'World',
    description: 'Interactive Three.js globe. Requires WebGL2.'
  },
  space: {
    name: 'Space',
    description: 'Three.js solar-system and space layers. Requires WebGL2.'
  },
  fever: {
    name: 'Fever Monitor',
    description: 'Animated climate scenarios and overlays. Requires WebGL2.'
  }
};

const INSTALL_LOG_KEY = 'topicEarthPwaInstallLog';
const PREFERRED_MODE_KEY = 'topicEarthPreferredInstallMode';

class PwaInstallManager {
  constructor() {
    this.installPrompt = null;
    this.installed = window.matchMedia?.('(display-mode: standalone)').matches === true
      || window.navigator.standalone === true;
    this.webgl2Supported = this.detectWebgl2();

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt = event;
      this.dispatchState();
    });
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null;
      this.installed = true;
      this.logInstallEvent('installed', {
        mode: this.getPreferredMode(),
        browser: this.getBrowserInstallGuidance().id
      });
      this.dispatchState();
    });

    this.registerServiceWorker();
  }

  detectWebgl2() {
    try {
      return Boolean(document.createElement('canvas').getContext('webgl2'));
    } catch {
      return false;
    }
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(location.hostname)) return;

    navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch((error) => {
      console.warn('[PWA] Service worker registration failed:', error);
    });
  }

  dispatchState() {
    window.dispatchEvent(new CustomEvent('pwa-install-state-changed', { detail: this.getState() }));
  }

  getState() {
    return {
      canPrompt: Boolean(this.installPrompt),
      installed: this.installed,
      webgl2Supported: this.webgl2Supported,
      browser: this.getBrowserInstallGuidance(),
      preferredMode: this.getPreferredMode(),
      modes: MODE_SHORTCUTS
    };
  }

  getBrowserInstallGuidance() {
    const userAgent = navigator.userAgent || '';
    if (/Edg\//.test(userAgent)) {
      return { id: 'edge', label: 'Microsoft Edge', advice: 'Use the install icon in the address bar or Apps > Install topic.earth.' };
    }
    if (/CriOS\//.test(userAgent)) {
      return { id: 'chrome-ios', label: 'Chrome on iOS', advice: 'Use Share, then Add to Home Screen. iOS controls the final app shortcut.' };
    }
    if (/Chrome\//.test(userAgent) && !/OPR\//.test(userAgent)) {
      return { id: 'chrome', label: 'Google Chrome', advice: 'Use the install icon in the address bar or Install app from the browser menu.' };
    }
    if (/Firefox\//.test(userAgent)) {
      return { id: 'firefox', label: 'Firefox', advice: 'Desktop app installation is not available here. On Android, use Add to Home screen from the menu.' };
    }
    if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) {
      return { id: 'safari', label: 'Safari', advice: 'Use Share, then Add to Home Screen. Safari controls the installed app entry.' };
    }
    return { id: 'other', label: 'This browser', advice: 'Use Install app or Add to Home Screen from the browser menu when available.' };
  }

  getPreferredMode() {
    try {
      const mode = localStorage.getItem(PREFERRED_MODE_KEY);
      return MODE_SHORTCUTS[mode] ? mode : 'main';
    } catch {
      return 'main';
    }
  }

  setPreferredMode(mode) {
    const safeMode = MODE_SHORTCUTS[mode] ? mode : 'main';
    try {
      localStorage.setItem(PREFERRED_MODE_KEY, safeMode);
    } catch {
      // The preference is optional when storage is unavailable.
    }
    return safeMode;
  }

  logInstallEvent(action, details = {}) {
    try {
      const current = JSON.parse(localStorage.getItem(INSTALL_LOG_KEY) || '[]');
      const entries = Array.isArray(current) ? current : [];
      entries.push({ action, at: new Date().toISOString(), ...details });
      localStorage.setItem(INSTALL_LOG_KEY, JSON.stringify(entries.slice(-20)));
    } catch {
      // Installation remains available when private storage blocks logging.
    }
  }

  getModeUrl(mode) {
    const safeMode = MODE_SHORTCUTS[mode] ? mode : 'main';
    const url = new URL('./', window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('mode', safeMode);
    return url.toString();
  }

  async promptInstall(mode = 'main') {
    const preferredMode = this.setPreferredMode(mode);
    const browser = this.getBrowserInstallGuidance();
    this.logInstallEvent('requested', { mode: preferredMode, browser: browser.id });
    if (this.installed) return { outcome: 'installed', mode: preferredMode, browser };
    if (!this.installPrompt) return { outcome: 'unavailable', mode: preferredMode, browser };

    const prompt = this.installPrompt;
    this.installPrompt = null;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    this.logInstallEvent('completed', { mode: preferredMode, browser: browser.id, outcome: choice?.outcome || 'dismissed' });
    this.dispatchState();
    return { outcome: choice?.outcome || 'dismissed', mode: preferredMode, browser };
  }
}

export const pwaInstallManager = new PwaInstallManager();