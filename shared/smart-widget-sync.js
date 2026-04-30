// SmΔrt Collection - Widget Settings Sync Manager v2.0
// Manages synchronization between api-settings and other widgets (clipboard, etc.)
// Location: private/widgets/shared/smart-widget-sync.js
//
// ⚠️ SECURITY: This file syncs PREFERENCES ONLY, not API keys!
// API keys are stored encrypted in 'smdeltartApiVault' (AES-256-GCM)
// Apps that need keys must request them from the encrypted vault.

class SmartWidgetSync {
    static VERSION = '2.0.0';
    static STORAGE_KEY = 'smdeltartPreferences';  // Renamed: preferences only, no keys
    static ENCRYPTED_KEY = 'smdeltartApiVault';   // Keys stored here (encrypted)
    static SYNC_STATUS_KEY = 'smdeltartSyncStatus';
    static LEGACY_KEYS = ['cadAiApiSettings', 'smartApiSettings']; // For migration
    
    // Settings schema - PREFERENCES ONLY (no API keys!)
    static SETTINGS_SCHEMA = {
        version: { type: 'string', default: '2.4.0' },
        lastSaved: { type: 'string', default: null },
        source: { type: 'string', default: 'SmDeltArt-ApiSettings' },
        
        // Provider selections (which provider to use, NOT the keys)
        paidTextApi: { type: 'string', default: 'openai' },
        freeTextApi: { type: 'string', default: 'groq' },
        paidImageApi: { type: 'string', default: 'openai' },
        freeImageApi: { type: 'string', default: 'pollinations' },
        paidVideoApi: { type: 'string', default: '' },
        freeVideoApi: { type: 'string', default: '' },
        externalTtsApi: { type: 'string', default: '' },
        browserTtsVoice: { type: 'string', default: '' },
        
        // Radio button states (which tier is active)
        paidTextApiRadio: { type: 'boolean', default: true },
        freeTextApiRadio: { type: 'boolean', default: false },
        paidImageApiRadio: { type: 'boolean', default: true },
        freeImageApiRadio: { type: 'boolean', default: false },
        noVideoRadio: { type: 'boolean', default: true },
        paidVideoApiRadio: { type: 'boolean', default: false },
        freeVideoApiRadio: { type: 'boolean', default: false },
        browserTtsRadio: { type: 'boolean', default: true },
        externalTtsApiRadio: { type: 'boolean', default: false },
        
        // Model selectors (v2.4 - WebSim removed)
        openaiTextModel: { type: 'string', default: 'gpt-4o' },
        openaiImageModel: { type: 'string', default: 'gpt-image-1' },
        openaiTtsModel: { type: 'string', default: 'tts-1' },
        openaiVideoModel: { type: 'string', default: '' },
        
        // Active provider indicators (v2.4 - WebSim removed, default to paid)
        activeTextProvider: { type: 'string', default: 'paid' },
        activeImageProvider: { type: 'string', default: 'paid' },
        activeTtsProvider: { type: 'string', default: 'browser' },
        
        // Fallback settings (v2.4 - new)
        enableFallback: { type: 'boolean', default: true },
        fallbackProvider: { type: 'string', default: 'pollinations' }
    };

    constructor(widgetName = 'unknown') {
        this.widgetName = widgetName;
        this.listeners = [];
        this.lastKnownSettings = null;
        this._setupStorageListener();
    }

    // Get current settings from localStorage
    getSettings() {
        try {
            const raw = localStorage.getItem(SmartWidgetSync.STORAGE_KEY);
            if (!raw) {
                console.warn(`[${this.widgetName}] No settings found in ${SmartWidgetSync.STORAGE_KEY}`);
                return this._getDefaultSettings();
            }
            const settings = JSON.parse(raw);
            this.lastKnownSettings = settings;
            return settings;
        } catch (e) {
            console.error(`[${this.widgetName}] Error reading settings:`, e);
            return this._getDefaultSettings();
        }
    }

    // Save settings to localStorage
    saveSettings(settings) {
        try {
            settings.lastSaved = new Date().toISOString();
            settings.version = settings.version || '2.1.1';
            settings.source = this.widgetName;
            
            localStorage.setItem(SmartWidgetSync.STORAGE_KEY, JSON.stringify(settings));
            localStorage.setItem('smartApiSettings', JSON.stringify(settings)); // backup
            
            this._updateSyncStatus('saved', this.widgetName);
            this.lastKnownSettings = settings;
            
            console.log(`[${this.widgetName}] ✅ Settings saved:`, Object.keys(settings).length, 'keys');
            return true;
        } catch (e) {
            console.error(`[${this.widgetName}] ❌ Error saving settings:`, e);
            return false;
        }
    }

    // Get a specific setting value
    get(key, defaultValue = null) {
        const settings = this.getSettings();
        if (settings && key in settings) {
            return settings[key];
        }
        // Check schema for default
        if (SmartWidgetSync.SETTINGS_SCHEMA[key]) {
            return SmartWidgetSync.SETTINGS_SCHEMA[key].default;
        }
        return defaultValue;
    }

    // Set a specific setting value
    set(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        return this.saveSettings(settings);
    }

    // Get active provider for a type (text, image, tts)
    getActiveProvider(type) {
        const settings = this.getSettings();
        const key = `active${type.charAt(0).toUpperCase() + type.slice(1)}Provider`;
        return settings[key] || 'websim';
    }

    // Get model for provider
    getModel(category, provider = 'openai') {
        const settings = this.getSettings();
        
        // Normalize provider name for key lookup
        // openai-dalle, openai-image -> openai
        // openai-tts -> openai
        let normalizedProvider = provider;
        if (provider.startsWith('openai')) {
            normalizedProvider = 'openai';
        }
        
        const modelKey = `${normalizedProvider}${category.charAt(0).toUpperCase() + category.slice(1)}Model`;
        
        if (settings[modelKey]) {
            return settings[modelKey];
        }
        
        // Fallbacks
        const fallbacks = {
            textModel: 'gpt-4o',
            imageModel: 'dall-e-3',
            ttsModel: 'tts-1',
            videoModel: ''
        };
        return fallbacks[`${category}Model`] || '';
    }

    // Get API credentials for a type and tier (paid/free)
    getCredentials(type, tier = null) {
        const settings = this.getSettings();
        
        // Determine tier from active provider if not specified
        if (!tier) {
            const active = this.getActiveProvider(type);
            tier = active === 'paid' ? 'paid' : (active === 'free' ? 'free' : null);
        }
        
        if (!tier || tier === 'websim') {
            return { provider: 'websim', apiKey: null };
        }
        
        const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
        const provider = settings[`${tier}${typeCapitalized}Api`] || '';
        const apiKey = settings[`${tier}${typeCapitalized}ApiKey`] || '';
        
        return { provider, apiKey, tier };
    }

    // Validate settings against schema
    validateSettings(settings = null) {
        const s = settings || this.getSettings();
        const issues = [];
        
        for (const [key, schema] of Object.entries(SmartWidgetSync.SETTINGS_SCHEMA)) {
            if (!(key in s)) {
                issues.push({ key, issue: 'missing', expected: schema.type });
            } else if (schema.type === 'boolean' && typeof s[key] !== 'boolean') {
                issues.push({ key, issue: 'wrong_type', expected: 'boolean', got: typeof s[key] });
            } else if (schema.type === 'string' && typeof s[key] !== 'string') {
                issues.push({ key, issue: 'wrong_type', expected: 'string', got: typeof s[key] });
            }
        }
        
        // Check for model selectors (v2.1.1 audit)
        const modelKeys = ['openaiTextModel', 'openaiImageModel', 'openaiTtsModel', 'activeTextProvider', 'activeImageProvider', 'activeTtsProvider'];
        for (const key of modelKeys) {
            if (!(key in s) || s[key] === undefined) {
                issues.push({ key, issue: 'audit_fix_missing', message: 'Model selector not saved (pre-v2.1.1 bug)' });
            }
        }
        
        return {
            valid: issues.length === 0,
            issues,
            version: s.version || 'unknown',
            lastSaved: s.lastSaved || 'never'
        };
    }

    // Listen for settings changes from other widgets
    onSettingsChange(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Setup storage event listener for cross-widget sync
    _setupStorageListener() {
        if (typeof window === 'undefined') return;
        
        window.addEventListener('storage', (event) => {
            if (event.key === SmartWidgetSync.STORAGE_KEY) {
                console.log(`[${this.widgetName}] 🔄 Settings changed by another widget`);
                
                try {
                    const newSettings = JSON.parse(event.newValue);
                    const oldSettings = this.lastKnownSettings;
                    
                    // Notify listeners
                    this.listeners.forEach(callback => {
                        try {
                            callback(newSettings, oldSettings, event);
                        } catch (e) {
                            console.error(`[${this.widgetName}] Listener error:`, e);
                        }
                    });
                    
                    this.lastKnownSettings = newSettings;
                } catch (e) {
                    console.error(`[${this.widgetName}] Error parsing changed settings:`, e);
                }
            }
        });
    }

    // Update sync status
    _updateSyncStatus(action, source) {
        const status = {
            lastAction: action,
            source,
            timestamp: new Date().toISOString(),
            syncVersion: SmartWidgetSync.VERSION
        };
        localStorage.setItem(SmartWidgetSync.SYNC_STATUS_KEY, JSON.stringify(status));
    }

    // Get default settings from schema
    _getDefaultSettings() {
        const defaults = {};
        for (const [key, schema] of Object.entries(SmartWidgetSync.SETTINGS_SCHEMA)) {
            defaults[key] = schema.default;
        }
        return defaults;
    }

    // Debug: Print current settings status
    debug() {
        const settings = this.getSettings();
        const validation = this.validateSettings(settings);
        
        console.group(`[${this.widgetName}] SmartWidgetSync Debug`);
        console.log('Version:', SmartWidgetSync.VERSION);
        console.log('Settings Version:', settings.version);
        console.log('Last Saved:', settings.lastSaved);
        console.log('Source:', settings.source);
        console.log('Validation:', validation.valid ? '✅ Valid' : '❌ Issues found');
        if (!validation.valid) {
            console.table(validation.issues);
        }
        console.log('Active Providers:', {
            text: this.getActiveProvider('text'),
            image: this.getActiveProvider('image'),
            tts: this.getActiveProvider('tts')
        });
        console.log('Models:', {
            text: this.getModel('text'),
            image: this.getModel('image'),
            tts: this.getModel('tts')
        });
        console.groupEnd();
        
        return { settings, validation };
    }
}

// Export for different environments
if (typeof window !== 'undefined') {
    window.SmartWidgetSync = SmartWidgetSync;
    console.log('🔄 SmartWidgetSync loaded (v' + SmartWidgetSync.VERSION + ')');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartWidgetSync;
}
