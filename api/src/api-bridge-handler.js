/**
 * SmΔrt API Bridge Handler
 * Manages cross-origin communication between clipboard-manager.html and
 * the embedded api-settings.html widget via WidgetBridge (postMessage)
 *
 * Communication Flow:
 * 1. User opens 🗝️ button → apiSettingsOverlay becomes visible
 * 2. api-settings.html loads and initializes WidgetBridge
 * 3. clipboard-manager listens for 'api-settings-saved' events
 * 4. When user saves API keys in api-settings, event fires with config
 * 5. clipboard-manager updates its AI Lab API providers
 */

class ApiBridgeHandler {
  constructor() {
    this.iframe = document.getElementById("apiSettingsFrame");
    this.overlay = document.getElementById("apiSettingsOverlay");
    this.apiSettingsBtn = document.getElementById("apiSettingsBtn");
    this.messageListeners = {};
    this.isInitialized = false;

    this.init();
  }

  init() {
    if (!this.iframe || !this.overlay) {
      console.warn("⚠️ API Settings overlay elements not found");
      return;
    }

    this.configureIframeSource();

    // Listen for messages from api-settings iframe
    window.addEventListener("message", (event) => {
      // Security: Only accept messages from widgets.smdeltart.com and local testing
      if (!this.isAllowedOrigin(event.origin)) return;

      const { type, action, data } = event.data || {};
      if (type !== "smart-widget") return;

      console.log(`📡 Bridge received: ${action}`, data);

      // Handle specific actions
      switch (action) {
        case "api-settings-saved":
          this.handleApiSettingsSaved(data);
          break;
        case "api-settings-ready":
          this.handleApiSettingsReady();
          break;
        case "api-settings-back":
        case "api-settings-close":
          this.closePanel();
          break;
        case "request-current-settings":
          this.sendCurrentSettings();
          break;
        default:
          if (this.messageListeners[action]) {
            this.messageListeners[action].forEach((cb) => cb(data));
          }
      }
    });

    // Set up button click handler if it exists
    if (this.apiSettingsBtn && !this.apiSettingsBtn.dataset.bridgeAttached) {
      this.apiSettingsBtn.addEventListener("click", () => this.togglePanel());
      this.apiSettingsBtn.dataset.bridgeAttached = "true";
    }

    window.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        this.overlay.classList.contains("visible")
      ) {
        this.closePanel();
      }
    });

    this.isInitialized = true;
    console.log("✅ API Bridge Handler initialized");
  }

  configureIframeSource() {
    if (!this.iframe) return;

    const host = window.location.hostname || "";
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "";
    const isFileProtocol = window.location.protocol === "file:";
    const isSmdDomain = host.endsWith("smdeltart.com");

    // Local dev: use local file. Deployed apps: use protected widgets subdomain.
    const targetSrc =
      isLocal || isFileProtocol
        ? "api-settings.html?embed=true"
        : isSmdDomain
          ? "https://api.smdeltart.com/api-settings.html?embed=true"
          : this.iframe.src;

    if (targetSrc && this.iframe.getAttribute("src") !== targetSrc) {
      this.iframe.setAttribute("src", targetSrc);
    }
  }

  isAllowedOrigin(origin) {
    // Production
    if (origin === "https://widgets.smdeltart.com") return true;
    // Staging
    if (origin.endsWith(".vercel.app")) return true;
    // Local development
    if (
      origin === "http://localhost:5500" ||
      origin === "http://127.0.0.1:5500"
    )
      return true;
    if (
      origin === "http://localhost:3000" ||
      origin === "http://127.0.0.1:3000"
    )
      return true;
    if (
      origin === "http://localhost:8080" ||
      origin === "http://127.0.0.1:8080"
    )
      return true;
    // File protocol for local testing
    if (origin === "null") return true;
    return false;
  }

  togglePanel() {
    if (!this.overlay) return;
    this.overlay.classList.toggle("visible");
    console.log(
      "🔄 API Settings panel toggled:",
      this.overlay.classList.contains("visible"),
    );
  }

  openPanel() {
    if (!this.overlay) return;
    this.overlay.classList.add("visible");
    // Signal to api-settings that it's now visible
    this.send("panel-opened");
  }

  closePanel() {
    if (!this.overlay) return;
    this.overlay.classList.remove("visible");
  }

  handleApiSettingsSaved(settings) {
    console.log("💾 API settings saved:", settings);

    // Store in localStorage for persistence
    try {
      localStorage.setItem(
        "smart-api-settings",
        JSON.stringify({
          ...settings,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (e) {
      console.warn("⚠️ Could not save to localStorage:", e);
    }

    // Emit event for clipboard-manager to listen to
    const event = new CustomEvent("api-settings-changed", {
      detail: settings,
      bubbles: true,
    });
    window.dispatchEvent(event);

    // Optionally close panel after save
    setTimeout(() => this.closePanel(), 500);
  }

  handleApiSettingsReady() {
    console.log("🟢 API Settings widget ready");
    // Load saved settings if any
    try {
      const saved = localStorage.getItem("smart-api-settings");
      if (saved) {
        this.send("restore-settings", JSON.parse(saved));
      }
    } catch (e) {
      console.warn("⚠️ Could not restore settings:", e);
    }
  }

  // Send message to api-settings iframe
  send(action, data = {}) {
    if (!this.iframe?.contentWindow) {
      console.warn("⚠️ API Settings iframe not ready");
      return;
    }

    this.iframe.contentWindow.postMessage(
      { type: "smart-widget", action, data },
      "*",
    );
  }

  // Send current clipboard-manager settings to api-settings
  sendCurrentSettings() {
    const settings = {
      apiProviders: window.API_PROVIDERS || {},
      activeProvider: window.ACTIVE_API_PROVIDER || null,
      timestamp: new Date().toISOString(),
    };
    this.send("current-settings", settings);
  }

  // Public API: Listen for custom messages from api-settings
  on(action, callback) {
    if (!this.messageListeners[action]) {
      this.messageListeners[action] = [];
    }
    this.messageListeners[action].push(callback);
  }

  // Update API providers from api-settings
  updateApiProviders(providersConfig) {
    if (typeof window !== "undefined" && window.API_PROVIDERS) {
      window.API_PROVIDERS = {
        ...window.API_PROVIDERS,
        ...providersConfig,
      };
      console.log("✅ API providers updated from settings");
    }
  }

  // Get saved API settings from localStorage
  getSavedSettings() {
    try {
      return JSON.parse(localStorage.getItem("smart-api-settings")) || null;
    } catch (e) {
      return null;
    }
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.apiBridge = new ApiBridgeHandler();
  });
} else {
  window.apiBridge = new ApiBridgeHandler();
}

// Export for module usage
export default ApiBridgeHandler;
