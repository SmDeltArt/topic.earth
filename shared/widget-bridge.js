/**
 * SmΔrt Widget Bridge v1.1
 * Cross-origin communication for embedded widgets
 * 
 * Usage from parent app:
 *   const bridge = new WidgetBridge('api-settings-frame');
 *   bridge.on('settings-saved', (data) => console.log(data));
 *   bridge.send('get-settings');
 * 
 * Usage from widget:
 *   WidgetBridge.toParent('settings-saved', { provider: 'openai', model: 'gpt-4' });
 *   WidgetBridge.onParent('get-settings', () => { ... });
 * 
 * See: docs/DEPLOYMENT_ARCHITECTURE.md for subdomain mapping
 */

class WidgetBridge {
  // Production subdomains
  static PROD_ORIGINS = [
    'https://smdeltart.com',
    'https://portal.smdeltart.com',
    'https://api.smdeltart.com',
    'https://clipboard.smdeltart.com',
    'https://cloudinary.smdeltart.com',
    'https://studio.smdeltart.com',
    'https://images.smdeltart.com',
    'https://widgets.smdeltart.com'
  ];
  
  // Development origins
  static DEV_ORIGINS = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
  ];
  
  // Vercel preview pattern
  static VERCEL_PATTERN = /^https:\/\/smdeltart[a-z0-9-]*\.vercel\.app$/;
  
  constructor(iframeId) {
    this.iframe = document.getElementById(iframeId);
    this.listeners = {};
    this._init();
  }
  
  _init() {
    window.addEventListener('message', (event) => {
      if (!this._isAllowedOrigin(event.origin)) return;
      
      const { type, action, data } = event.data || {};
      if (type !== 'smart-widget') return;
      
      if (this.listeners[action]) {
        this.listeners[action].forEach(cb => cb(data, event));
      }
    });
  }
  
  _isAllowedOrigin(origin) {
    // Same origin always allowed
    if (origin === window.location.origin) return true;
    // Production subdomains
    if (WidgetBridge.PROD_ORIGINS.includes(origin)) return true;
    // Development origins
    if (WidgetBridge.DEV_ORIGINS.includes(origin)) return true;
    // Vercel preview deployments
    if (WidgetBridge.VERCEL_PATTERN.test(origin)) return true;
    // file:// protocol
    if (origin === 'null') return true;
    
    return false;
  }
  
  // Parent app: listen for widget messages
  on(action, callback) {
    if (!this.listeners[action]) this.listeners[action] = [];
    this.listeners[action].push(callback);
    return this;
  }
  
  // Parent app: send message to widget
  send(action, data = {}) {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(
        { type: 'smart-widget', action, data },
        '*'
      );
    }
  }
  
  // Widget: send message to parent
  static toParent(action, data = {}) {
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: 'smart-widget', action, data },
        '*'
      );
    }
  }
  
  // Widget: listen for parent messages
  static onParent(action, callback) {
    window.addEventListener('message', (event) => {
      const { type, action: msgAction, data } = event.data || {};
      if (type === 'smart-widget' && msgAction === action) {
        callback(data, event);
      }
    });
  }
  
  // Shared: Get/Set localStorage with widget prefix
  static storage = {
    get(key) {
      try {
        const data = localStorage.getItem(`smart-widget:${key}`);
        return data ? JSON.parse(data) : null;
      } catch { return null; }
    },
    
    set(key, value) {
      try {
        localStorage.setItem(`smart-widget:${key}`, JSON.stringify(value));
        return true;
      } catch { return false; }
    },
    
    remove(key) {
      localStorage.removeItem(`smart-widget:${key}`);
    }
  };
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WidgetBridge;
}

// Global for script tag usage
if (typeof window !== 'undefined') {
  window.WidgetBridge = WidgetBridge;
}
