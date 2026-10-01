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
      modes: MODE_SHORTCUTS
    };
  }

  getModeUrl(mode) {
    const safeMode = MODE_SHORTCUTS[mode] ? mode : 'main';
    const url = new URL('./', window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('mode', safeMode);
    return url.toString();
  }

  async promptInstall() {
    if (this.installed) return { outcome: 'installed' };
    if (!this.installPrompt) return { outcome: 'unavailable' };

    const prompt = this.installPrompt;
    this.installPrompt = null;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    this.dispatchState();
    return { outcome: choice?.outcome || 'dismissed' };
  }

  async createModeShortcut(mode) {
    const config = MODE_SHORTCUTS[mode];
    if (!config) throw new Error('Unknown topic.earth mode');

    const url = this.getModeUrl(mode);
    const shareData = {
      title: `topic.earth - ${config.name}`,
      text: config.description,
      url
    };

    if (navigator.share && window.matchMedia?.('(pointer: coarse)').matches) {
      await navigator.share(shareData);
      return { outcome: 'shared', url };
    }

    const shortcut = `[InternetShortcut]\r\nURL=${url}\r\n`;
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([shortcut], { type: 'application/internet-shortcut' }));
    anchor.download = `topic-earth-${mode}.url`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    return { outcome: 'downloaded', url };
  }
}

export const pwaInstallManager = new PwaInstallManager();