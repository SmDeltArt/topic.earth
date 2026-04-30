/**
 * SmΔrt Navigation Manager v1.0
 * Handles navigation stack for SPA ecosystem
 *
 * Navigation Rules:
 * - Back (←): Goes 1 step back in history
 * - Close (×): Returns to main hub (clipboard-manager.html)
 * - Navigation stack persisted in sessionStorage
 */

(function () {
  "use strict";

  // Main hub - the entry point SPA
  const MAIN_HUB = "clipboard-manager.html";

  // Storage key for navigation stack
  const STORAGE_KEY = "smartNavStack";

  // Get current page name from URL
  function getCurrentPage() {
    const path = window.location.pathname;
    return path.split("/").pop() || MAIN_HUB;
  }

  // Initialize or get navigation stack
  function getStack() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("SmartNav: Could not read stack", e);
    }
    return [MAIN_HUB];
  }

  // Save stack to storage
  function saveStack(stack) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
    } catch (e) {
      console.warn("SmartNav: Could not save stack", e);
    }
  }

  // The SmartNav object
  const SmartNav = {
    // Current navigation stack
    stack: getStack(),

    // Main hub page
    mainHub: MAIN_HUB,

    /**
     * Navigate to a target SPA
     * @param {string} target - Target HTML file (e.g., 'api-settings.html')
     */
    navigateTo(target) {
      const current = getCurrentPage();

      // Don't duplicate if already on stack
      if (this.stack[this.stack.length - 1] !== current) {
        this.stack.push(current);
      }

      // Add target to stack
      this.stack.push(target);
      saveStack(this.stack);

      // Navigate
      window.location.href = target;
    },

    /**
     * Go back one step in navigation
     * If at main hub or stack empty, stays on current page
     */
    goBack() {
      const current = getCurrentPage();

      // Pop current page from stack
      if (
        this.stack.length > 0 &&
        this.stack[this.stack.length - 1] === current
      ) {
        this.stack.pop();
      }

      // Get previous page
      const prev = this.stack.pop() || MAIN_HUB;
      saveStack(this.stack);

      // Navigate
      window.location.href = prev;
    },

    /**
     * Go directly to main hub (clipboard)
     * Clears the navigation stack
     */
    goHome() {
      this.stack = [MAIN_HUB];
      saveStack(this.stack);
      window.location.href = MAIN_HUB;
    },

    /**
     * Get the previous page in stack (without navigating)
     * @returns {string} Previous page name
     */
    getPrevious() {
      const current = getCurrentPage();
      const stack = [...this.stack];

      if (stack.length > 0 && stack[stack.length - 1] === current) {
        stack.pop();
      }

      return stack[stack.length - 1] || MAIN_HUB;
    },

    /**
     * Check if current page is the main hub
     * @returns {boolean}
     */
    isAtHome() {
      return getCurrentPage() === MAIN_HUB;
    },

    /**
     * Get current stack depth
     * @returns {number}
     */
    getDepth() {
      return this.stack.length;
    },

    /**
     * Debug: Print current stack
     */
    debug() {
      console.log("🧭 SmartNav Stack:", this.stack);
      console.log("📍 Current:", getCurrentPage());
      console.log("⬅️ Previous:", this.getPrevious());
    },

    /**
     * Initialize navigation on page load
     * - Detects context (iframe, standalone)
     * - Sets up keyboard shortcuts
     * - Records current page in stack if not already
     */
    init() {
      const current = getCurrentPage();

      // Ensure current page is on stack
      if (
        this.stack.length === 0 ||
        this.stack[this.stack.length - 1] !== current
      ) {
        // Only add if not coming from a navigation
        const fromNav = sessionStorage.getItem("smartNavInProgress");
        if (!fromNav) {
          // Fresh visit - start with main hub if not on it
          if (current !== MAIN_HUB && this.stack.length === 0) {
            this.stack.push(MAIN_HUB);
          }
          this.stack.push(current);
          saveStack(this.stack);
        }
        sessionStorage.removeItem("smartNavInProgress");
      }

      // Keyboard shortcut: Escape to go back
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !this.isAtHome()) {
          e.preventDefault();
          this.goBack();
        }
      });

      // Set navigation in progress flag before unload
      window.addEventListener("beforeunload", () => {
        sessionStorage.setItem("smartNavInProgress", "true");
      });

      console.log("🧭 SmartNav initialized", { current, stack: this.stack });
      return this;
    },
  };

  // Auto-detect context and apply classes to <html> element (available immediately)
  function detectContext() {
    const isIframe = window.self !== window.top;
    const isStandalone = !isIframe;
    const html = document.documentElement;

    if (isStandalone) {
      html.classList.add("detached-mode");
    } else {
      html.classList.add("in-iframe", "widget-mode");
    }

    // Check for portal context
    if (window.portalContext) {
      html.classList.add("in-portal");
      if (window.portalContext.is3D) {
        html.classList.add("in-3d");
      }
    }
  }

  // Run context detection IMMEDIATELY (not on DOMContentLoaded)
  detectContext();

  // Run SmartNav init on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      SmartNav.init();
    });
  } else {
    SmartNav.init();
  }

  // Expose globally
  window.SmartNav = SmartNav;
})();
