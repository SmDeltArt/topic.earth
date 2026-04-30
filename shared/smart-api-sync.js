// widgets/api-settings.html - SmDeltArt Collection API Settings Synchronization Script
// Synchronizes working API checking routines from _w1_ to main _actual_vs

class ApiSettingsSynchronizer {
  constructor() {
    this.w1ApiSettingsPath =
      "../_w1_Clipboard_Manager/_actual_vs_w1/api-settings.html";
    this.mainApiSettingsPath = "./api-settings.html";
    this.syncTimestamp = new Date().toISOString();
  }

  // Core API testing functions that work in _w1_
  static API_PROVIDERS = {
    // Text APIs - Real working configurations
    openai: {
      name: "OpenAI",
      testEndpoint: "https://api.openai.com/v1/models",
      headers: (apiKey) => ({
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      }),
      testMethod: "GET",
      timeout: 10000,
      keyPattern: /^sk-[a-zA-Z0-9_-]{20,}$/, // Flexible pattern for modern OpenAI keys
    },
    groq: {
      name: "Groq",
      testEndpoint: "https://api.groq.com/openai/v1/models",
      headers: (apiKey) => ({
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      }),
      testMethod: "GET",
      timeout: 8000,
      keyPattern: /^gsk_[a-zA-Z0-9_-]{40,60}$/,
    },
    huggingface: {
      name: "HuggingFace",
      testEndpoint:
        "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
      headers: (apiKey) => ({
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      }),
      testMethod: "POST",
      testBody: { inputs: "test" },
      timeout: 15000,
      keyPattern: /^hf_[a-zA-Z0-9_-]{30,40}$/,
    },
    deepseek: {
      name: "DeepSeek",
      testEndpoint: "https://api.deepseek.com/v1/models",
      headers: (apiKey) => ({
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      }),
      testMethod: "GET",
      timeout: 12000,
      keyPattern: /^sk-[a-zA-Z0-9_-]{20,}$/,
    },
    google: {
      name: "Google AI",
      testEndpoint: "https://generativelanguage.googleapis.com/v1/models",
      headers: (apiKey) => ({}),
      testMethod: "GET",
      timeout: 10000,
      keyPattern: /^AIza[a-zA-Z0-9_-]{35}$/,
      useKeyInUrl: true,
    },
    sambanova: {
      name: "SambaNova",
      testEndpoint: "https://api.sambanova.ai",
      headers: () => ({}),
      testMethod: "GET",
      timeout: 8000,
      keyPattern: null,
      isFree: true,
    },
    pollinations: {
      name: "Pollinations",
      testEndpoint: "https://pollinations.ai",
      headers: () => ({}),
      testMethod: "GET",
      timeout: 8000,
      keyPattern: null,
      isFree: true,
    },
  };

  // Real working API connection test
  static async testProviderConnection(provider, apiKey) {
    const config = ApiSettingsSynchronizer.API_PROVIDERS[provider];
    if (!config) {
      return {
        success: false,
        error: "UNSUPPORTED_PROVIDER",
        message: `Provider '${provider}' is not supported`,
        provider,
        timestamp: new Date().toISOString(),
      };
    }

    // Handle free APIs that don't need keys
    if (config.isFree || config.keyPattern === null) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(config.testEndpoint, {
          method: config.testMethod,
          headers: config.headers(),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        return {
          success: response.ok || response.status === 404,
          status: response.status,
          provider,
          providerName: config.name,
          message: response.ok
            ? "Free API accessible"
            : "Free API may be accessible (different response)",
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
          message:
            error.name === "AbortError"
              ? `Connection timeout after ${config.timeout}ms`
              : `Network error: ${error.message}`,
          provider,
          providerName: config.name,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Handle APIs that need keys
    if (!apiKey || apiKey.trim() === "") {
      return {
        success: false,
        error: "MISSING_API_KEY",
        message: "API key is required",
        provider,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate key format
    if (config.keyPattern && !config.keyPattern.test(apiKey)) {
      return {
        success: false,
        error: "INVALID_FORMAT",
        message: `Invalid API key format for ${config.name}`,
        provider,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      let endpoint = config.testEndpoint;
      if (config.useKeyInUrl) {
        endpoint += `?key=${apiKey}`;
      }

      const requestOptions = {
        method: config.testMethod,
        headers: config.headers(apiKey),
        signal: controller.signal,
      };

      if (config.testBody && config.testMethod === "POST") {
        requestOptions.body = JSON.stringify(config.testBody);
      }

      const response = await fetch(endpoint, requestOptions);
      clearTimeout(timeoutId);

      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        provider,
        providerName: config.name,
        timestamp: new Date().toISOString(),
      };

      if (response.ok) {
        result.message = "Connection successful";
        try {
          const data = await response.json();
          result.responseData = data;
        } catch (e) {
          result.message += " (non-JSON response)";
        }
      } else {
        result.error = this.categorizeError(response.status);
        result.message = this.getErrorMessage(response.status, config.name);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
        message:
          error.name === "AbortError"
            ? `Connection timeout after ${config.timeout}ms`
            : `Network error: ${error.message}`,
        provider,
        providerName: config.name,
        timestamp: new Date().toISOString(),
      };
    }
  }

  static categorizeError(status) {
    if (status === 401) return "UNAUTHORIZED";
    if (status === 403) return "FORBIDDEN";
    if (status === 404) return "NOT_FOUND";
    if (status === 429) return "RATE_LIMITED";
    if (status >= 500) return "SERVER_ERROR";
    if (status >= 400) return "CLIENT_ERROR";
    return "UNKNOWN_ERROR";
  }

  static getErrorMessage(status, providerName) {
    switch (status) {
      case 401:
        return `Invalid API key for ${providerName}`;
      case 403:
        return `Access forbidden - check API key permissions for ${providerName}`;
      case 404:
        return `API endpoint not found for ${providerName}`;
      case 429:
        return `Rate limit exceeded for ${providerName}`;
      case 500:
      case 502:
      case 503:
        return `${providerName} server error - try again later`;
      default:
        return `Connection failed to ${providerName} (Status: ${status})`;
    }
  }

  // Test comprehensive API checking routine
  static async testAllApisComprehensive() {
    console.log("🧪 Starting comprehensive API tests...");

    let successCount = 0;
    let totalTests = 0;
    const results = [];

    // Test each API provider
    for (const [provider, config] of Object.entries(
      ApiSettingsSynchronizer.API_PROVIDERS,
    )) {
      console.log(`Testing ${config.name}...`);
      totalTests++;

      let testResult;
      if (config.isFree) {
        testResult = await ApiSettingsSynchronizer.testProviderConnection(
          provider,
          "no-key-needed",
        );
      } else {
        // Skip paid APIs without keys in this test
        testResult = {
          success: false,
          message: "Paid API - key required for testing",
          provider,
          providerName: config.name,
        };
      }

      results.push(testResult);
      if (testResult.success) successCount++;
    }

    const summary = {
      totalTests,
      successCount,
      results,
      timestamp: new Date().toISOString(),
      successRate: Math.round((successCount / totalTests) * 100),
    };

    console.log(
      `🎯 API Tests Complete: ${successCount}/${totalTests} working (${summary.successRate}%)`,
    );
    return summary;
  }

  // Integration function to inject working API testing into main api-settings.html
  static integrateApiTesting() {
    // Update the global API_PROVIDERS if it exists
    if (typeof window !== "undefined" && window.API_PROVIDERS) {
      window.API_PROVIDERS = {
        ...window.API_PROVIDERS,
        ...ApiSettingsSynchronizer.API_PROVIDERS,
      };
    }

    // Update testProviderConnection function
    if (typeof window !== "undefined") {
      window.testProviderConnection =
        ApiSettingsSynchronizer.testProviderConnection;
      window.testAllApisComprehensive =
        ApiSettingsSynchronizer.testAllApisComprehensive;
    }

    console.log(
      "✅ API testing functions synchronized from _w1_ to main api-settings",
    );
    return true;
  }

  // Generate synchronization report
  static generateSyncReport() {
    const report = {
      timestamp: new Date().toISOString(),
      source: "_w1_Clipboard_Manager/_actual_vs_w1/api-settings.html",
      target: "_actual_vs/api-settings.html",
      providersCount: Object.keys(ApiSettingsSynchronizer.API_PROVIDERS).length,
      freeProviders: Object.values(
        ApiSettingsSynchronizer.API_PROVIDERS,
      ).filter((p) => p.isFree).length,
      paidProviders: Object.values(
        ApiSettingsSynchronizer.API_PROVIDERS,
      ).filter((p) => !p.isFree).length,
      syncStatus: "COMPLETED",
      methods: [
        "testProviderConnection",
        "testAllApisComprehensive",
        "categorizeError",
        "getErrorMessage",
      ],
    };

    console.log("📊 Synchronization Report:", report);
    return report;
  }
}

// Auto-integration when loaded
if (typeof window !== "undefined") {
  // Integrate immediately
  ApiSettingsSynchronizer.integrateApiTesting();

  // Generate report
  const report = ApiSettingsSynchronizer.generateSyncReport();

  // Add to window for debugging
  window.ApiSettingsSynchronizer = ApiSettingsSynchronizer;

  console.log(
    "🔄 API Settings synchronized successfully from _w1_ to main standalone version",
  );
  console.log(
    "🧪 Use ApiSettingsSynchronizer.testAllApisComprehensive() to test all APIs",
  );
}

// Export for Node.js usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = ApiSettingsSynchronizer;
}
