/**
 * SmΔrt Application Binding Security v1.0
 * 
 * Protects API settings by binding them to authorized applications.
 * Prevents unauthorized scripts/extensions from reading stored API keys.
 * 
 * Features:
 * - Application fingerprinting (origin + hostname + pathname)
 * - Authorized app whitelist stored encrypted
 * - Time-limited access tokens for API key retrieval
 * - Cross-widget communication validation
 * 
 * @author SmΔrt Collection
 * @version 1.0.0
 * @date December 2024
 */

class SmartAppBinding {
    static VERSION = '1.0.0';
    
    // Storage keys
    static AUTHORIZED_APPS_KEY = 'smdeltart-authorized-apps';
    static ACCESS_TOKEN_KEY = 'smdeltart-access-token';
    static APP_BINDING_SALT = 'smdeltart-app-binding-v1';
    
    // Security configuration
    static TOKEN_EXPIRY_MS = 5 * 60 * 1000;  // 5 minutes
    static MAX_FAILED_ATTEMPTS = 5;
    static LOCKOUT_DURATION_MS = 15 * 60 * 1000;  // 15 minutes
    
    // Allowed origins for production and development
    // See: docs/DEPLOYMENT_ARCHITECTURE.md for full mapping
    static TRUSTED_ORIGINS = [
        // Production (subdomains)
        'https://smdeltart.com',
        'https://portal.smdeltart.com',
        'https://api.smdeltart.com',
        'https://clipboard.smdeltart.com',
        'https://cloudinary.smdeltart.com',
        'https://studio.smdeltart.com',
        'https://images.smdeltart.com',
        'https://widgets.smdeltart.com',
        // Vercel preview deployments (pattern matched in isAllowedOrigin)
        // Development (localhost)
        'http://localhost:5500',   // Widgets server
        'http://127.0.0.1:5500',
        'http://localhost:3000',   // Studio/Images server
        'http://127.0.0.1:3000',
        'http://localhost:8080',   // Portal server
        'http://127.0.0.1:8080',
        'http://localhost:8000',   // topic.earth local static server
        'http://127.0.0.1:8000',
        // File protocol for local testing
        'null'  // file:// protocol reports origin as "null"
    ];
    
    // Vercel preview URL pattern (for staging deployments)
    static VERCEL_PREVIEW_PATTERN = /^https:\/\/smdeltart[a-z0-9-]*\.vercel\.app$/;
    
    // Authorized application fingerprints
    // Each app must be registered before it can access API keys
    // Maps to subdomains in production
    static AUTHORIZED_APPS = {
        'clipboard-manager': {
            name: 'Clipboard Manager',
            paths: ['/clipboard-manager.html', '/clipboard-manager', '/clipboard'],
            permissions: ['read', 'write'],
            icon: '📋',
            subdomain: 'clipboard.smdeltart.com'
        },
        'api-settings': {
            name: '⚡',
            paths: ['/api-settings.html', '/api-settings', '/api'],
            permissions: ['read', 'write', 'admin'],
            icon: '⠿',
            subdomain: 'api.smdeltart.com'
        },
        'streaming-studio': {
            name: 'Streaming Studio',
            paths: ['/studio', '/app', '/'],
            permissions: ['read'],
            icon: '🎥',
            subdomain: 'studio.smdeltart.com'
        },
        'images-suite': {
            name: 'Images Production Suite',
            paths: ['/index.html', '/viewer', '/'],
            permissions: ['read'],
            icon: '🖼️',
            subdomain: 'images.smdeltart.com'
        },
        'cloudinary-manager': {
            name: 'Cloudinary Manager',
            paths: ['/cloudinary-manager.html', '/cloudinary-manager', '/cloudinary'],
            permissions: ['read'],
            icon: '☁️',
            subdomain: 'cloudinary.smdeltart.com'
        },
        'portal': {
            name: 'SmΔrt Portal',
            paths: ['/index.html', '/'],
            permissions: ['read', 'write'],
            icon: '🌐',
            subdomain: 'portal.smdeltart.com'
        },
        'tetrais-3d': {
            name: 'TetrAIs 3D',
            paths: ['/TetrAIs-o2.2.html', '/tetrais', '/tetrais-3d'],
            permissions: ['read'],
            icon: '🎮',
            subdomain: 'widgets.smdeltart.com'
        },
        'player-widget': {
            name: 'Player Widget',
            paths: ['/player_widget.html', '/player'],
            permissions: ['read'],
            icon: '▶️',
            subdomain: 'widgets.smdeltart.com'
        },
        'svg-editor': {
            name: 'SVG Editor',
            paths: ['/smart-svg-editor.html', '/svg-editor'],
            permissions: ['read', 'write'],
            icon: '✏️',
            subdomain: 'widgets.smdeltart.com'
        }
    };
    
    constructor() {
        this.failedAttempts = 0;
        this.lockoutUntil = null;
        this.currentToken = null;
        this._init();
    }
    
    /**
     * Initialize the binding system
     */
    _init() {
        // Check for lockout status
        this._checkLockout();
        
        // Listen for cross-origin messages
        window.addEventListener('message', this._handleMessage.bind(this));
        
        console.log('🔐 SmartAppBinding initialized');
    }
    
    /**
     * Generate application fingerprint from current context
     * @returns {Object} Application fingerprint
     */
    generateFingerprint() {
        const fingerprint = {
            origin: window.location.origin,
            hostname: window.location.hostname,
            pathname: window.location.pathname,
            protocol: window.location.protocol,
            port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
            userAgent: navigator.userAgent.substring(0, 50),  // Partial UA
            timestamp: Date.now()
        };
        
        // Create hash of fingerprint
        fingerprint.hash = this._hashFingerprint(fingerprint);
        
        return fingerprint;
    }
    
    /**
     * Hash fingerprint data for comparison
     * @param {Object} fp Fingerprint object
     * @returns {string} Hashed fingerprint
     */
    _hashFingerprint(fp) {
        const data = `${fp.origin}|${fp.pathname}|${SmartAppBinding.APP_BINDING_SALT}`;
        return this._simpleHash(data);
    }
    
    /**
     * Simple string hash (for fingerprinting, not security)
     * @param {string} str Input string
     * @returns {string} Hash string
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * Check if current application is authorized
     * @param {string} permission Required permission level
     * @returns {Object} Authorization result
     */
    isAuthorized(permission = 'read') {
        // Check lockout
        if (this._isLockedOut()) {
            return {
                authorized: false,
                reason: 'LOCKED_OUT',
                message: `Too many failed attempts. Locked until ${new Date(this.lockoutUntil).toLocaleTimeString()}`,
                remainingLockout: this.lockoutUntil - Date.now()
            };
        }
        
        const fingerprint = this.generateFingerprint();
        const origin = fingerprint.origin;
        const pathname = fingerprint.pathname;
        
        // Step 1: Check if origin is trusted
        const originTrusted = this._isOriginTrusted(origin);
        
        if (!originTrusted) {
            this._recordFailedAttempt();
            return {
                authorized: false,
                reason: 'UNTRUSTED_ORIGIN',
                message: `Origin '${origin}' is not in trusted origins list`,
                origin
            };
        }
        
        // Step 2: Match against authorized apps
        let matchedApp = null;
        for (const [appId, app] of Object.entries(SmartAppBinding.AUTHORIZED_APPS)) {
            for (const path of app.paths) {
                // Exact match or starts with (for SPA routes)
                if (pathname === path || pathname.startsWith(path + '/') || 
                    pathname.endsWith(path)) {
                    matchedApp = { id: appId, ...app };
                    break;
                }
            }
            if (matchedApp) break;
        }
        
        if (!matchedApp) {
            // Allow if origin is trusted but path not specifically registered
            // This enables new apps to work in development
            console.warn(`⚠️ Path '${pathname}' not in authorized apps, but origin is trusted`);
            matchedApp = {
                id: 'unknown',
                name: 'Development App',
                permissions: ['read'],
                icon: '🔧'
            };
        }
        
        // Step 3: Check permission level
        if (!matchedApp.permissions.includes(permission) && !matchedApp.permissions.includes('admin')) {
            return {
                authorized: false,
                reason: 'INSUFFICIENT_PERMISSION',
                message: `App '${matchedApp.name}' lacks '${permission}' permission`,
                app: matchedApp.id,
                requiredPermission: permission,
                grantedPermissions: matchedApp.permissions
            };
        }
        
        // Success!
        return {
            authorized: true,
            app: matchedApp,
            fingerprint,
            timestamp: Date.now()
        };
    }
    
    /**
     * Request an access token for API key retrieval
     * @param {string} requester Application ID or description
     * @returns {Object} Token result
     */
    requestAccessToken(requester = 'unknown') {
        const authResult = this.isAuthorized('read');
        
        if (!authResult.authorized) {
            return {
                success: false,
                ...authResult
            };
        }
        
        // Generate time-limited token
        const token = {
            id: crypto.randomUUID ? crypto.randomUUID() : this._generateUUID(),
            app: authResult.app.id,
            appName: authResult.app.name,
            fingerprint: authResult.fingerprint.hash,
            permissions: authResult.app.permissions,
            issuedAt: Date.now(),
            expiresAt: Date.now() + SmartAppBinding.TOKEN_EXPIRY_MS,
            requester
        };
        
        // Sign token
        token.signature = this._signToken(token);
        
        // Store current token
        this.currentToken = token;
        sessionStorage.setItem(SmartAppBinding.ACCESS_TOKEN_KEY, JSON.stringify(token));
        
        console.log(`🎫 Access token issued to ${token.appName} (expires in ${SmartAppBinding.TOKEN_EXPIRY_MS / 1000}s)`);
        
        return {
            success: true,
            token,
            expiresIn: SmartAppBinding.TOKEN_EXPIRY_MS
        };
    }
    
    /**
     * Validate an access token
     * @param {Object|string} token Token to validate
     * @returns {Object} Validation result
     */
    validateToken(token) {
        if (typeof token === 'string') {
            try {
                token = JSON.parse(token);
            } catch (e) {
                return { valid: false, reason: 'INVALID_TOKEN_FORMAT' };
            }
        }
        
        // Check if token exists
        if (!token || !token.id || !token.signature) {
            return { valid: false, reason: 'MISSING_TOKEN_DATA' };
        }
        
        // Check expiry
        if (Date.now() > token.expiresAt) {
            return { valid: false, reason: 'TOKEN_EXPIRED', expiredAt: token.expiresAt };
        }
        
        // Verify signature
        const expectedSignature = this._signToken({ ...token, signature: undefined });
        if (token.signature !== expectedSignature) {
            this._recordFailedAttempt();
            return { valid: false, reason: 'INVALID_SIGNATURE' };
        }
        
        // Verify fingerprint matches current context
        const currentFingerprint = this.generateFingerprint();
        if (token.fingerprint !== currentFingerprint.hash) {
            this._recordFailedAttempt();
            return { 
                valid: false, 
                reason: 'FINGERPRINT_MISMATCH',
                message: 'Token was issued for a different application context'
            };
        }
        
        return {
            valid: true,
            token,
            remainingTime: token.expiresAt - Date.now()
        };
    }
    
    /**
     * Get API settings if authorized
     * @param {Object} token Access token (optional, uses current if not provided)
     * @returns {Object} API settings or error
     */
    getProtectedSettings(token = null) {
        // Use stored token if not provided
        if (!token) {
            const stored = sessionStorage.getItem(SmartAppBinding.ACCESS_TOKEN_KEY);
            token = stored ? JSON.parse(stored) : null;
        }
        
        // Require token for protected access
        if (!token) {
            return {
                success: false,
                reason: 'NO_TOKEN',
                message: 'Request access token first with requestAccessToken()'
            };
        }
        
        // Validate token
        const validation = this.validateToken(token);
        if (!validation.valid) {
            return {
                success: false,
                reason: validation.reason,
                message: validation.message || `Token validation failed: ${validation.reason}`
            };
        }
        
        // Get settings from localStorage
        try {
            // Try encrypted storage first
            const encrypted = localStorage.getItem('smdeltartApiSettings');
            if (encrypted) {
                const settings = JSON.parse(encrypted);
                return {
                    success: true,
                    settings: this._sanitizeSettings(settings, validation.token.permissions),
                    source: 'smdeltartApiSettings',
                    app: validation.token.appName,
                    tokenExpires: validation.remainingTime
                };
            }
            
            // Fallback to plain storage
            const plain = localStorage.getItem('cadAiApiSettings') || 
                         localStorage.getItem('smartApiSettings');
            if (plain) {
                const settings = JSON.parse(plain);
                return {
                    success: true,
                    settings: this._sanitizeSettings(settings, validation.token.permissions),
                    source: 'cadAiApiSettings',
                    warning: 'Using unencrypted storage - consider upgrading to encrypted vault',
                    app: validation.token.appName,
                    tokenExpires: validation.remainingTime
                };
            }
            
            return {
                success: false,
                reason: 'NO_SETTINGS',
                message: 'No API settings found in storage'
            };
            
        } catch (e) {
            return {
                success: false,
                reason: 'PARSE_ERROR',
                message: `Error reading settings: ${e.message}`
            };
        }
    }
    
    /**
     * Sanitize settings based on permission level
     * @param {Object} settings Raw settings
     * @param {Array} permissions Granted permissions
     * @returns {Object} Sanitized settings
     */
    _sanitizeSettings(settings, permissions) {
        // Admin gets everything
        if (permissions.includes('admin')) {
            return settings;
        }
        
        // Read-only gets values but not write capabilities
        if (permissions.includes('read')) {
            // Return copy to prevent modification
            return JSON.parse(JSON.stringify(settings));
        }
        
        // Minimal - just version info
        return {
            version: settings.version,
            lastSaved: settings.lastSaved
        };
    }
    
    /**
     * Sign a token with app-specific data
     * @param {Object} token Token to sign
     * @returns {string} Signature
     */
    _signToken(token) {
        const data = [
            token.id,
            token.app,
            token.fingerprint,
            token.issuedAt,
            token.expiresAt,
            SmartAppBinding.APP_BINDING_SALT
        ].join('|');
        
        return this._simpleHash(data);
    }
    
    /**
     * Generate a UUID (fallback for older browsers)
     * @returns {string} UUID
     */
    _generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Record a failed authentication attempt
     */
    _recordFailedAttempt() {
        this.failedAttempts++;
        console.warn(`⚠️ Failed authentication attempt ${this.failedAttempts}/${SmartAppBinding.MAX_FAILED_ATTEMPTS}`);
        
        if (this.failedAttempts >= SmartAppBinding.MAX_FAILED_ATTEMPTS) {
            this.lockoutUntil = Date.now() + SmartAppBinding.LOCKOUT_DURATION_MS;
            localStorage.setItem('smdeltart-lockout', this.lockoutUntil.toString());
            console.error(`🔒 Too many failed attempts! Locked out until ${new Date(this.lockoutUntil).toLocaleTimeString()}`);
        }
    }
    
    /**
     * Check if currently locked out
     * @returns {boolean} Is locked out
     */
    _isLockedOut() {
        if (this.lockoutUntil && Date.now() < this.lockoutUntil) {
            return true;
        }
        // Reset if lockout expired
        if (this.lockoutUntil && Date.now() >= this.lockoutUntil) {
            this.lockoutUntil = null;
            this.failedAttempts = 0;
            localStorage.removeItem('smdeltart-lockout');
        }
        return false;
    }
    
    /**
     * Check lockout status from storage
     */
    _checkLockout() {
        const stored = localStorage.getItem('smdeltart-lockout');
        if (stored) {
            const lockoutTime = parseInt(stored, 10);
            if (Date.now() < lockoutTime) {
                this.lockoutUntil = lockoutTime;
                this.failedAttempts = SmartAppBinding.MAX_FAILED_ATTEMPTS;
            } else {
                localStorage.removeItem('smdeltart-lockout');
            }
        }
    }
    
    /**
     * Check if an origin is trusted
     * Includes static list + Vercel preview URL pattern
     * @param {string} origin Origin to check
     * @returns {boolean} Is trusted
     */
    _isOriginTrusted(origin) {
        // Check static list
        if (SmartAppBinding.TRUSTED_ORIGINS.includes(origin)) {
            return true;
        }
        // file:// protocol
        if (origin === 'null') {
            return true;
        }
        // Vercel preview deployments (*.vercel.app)
        if (SmartAppBinding.VERCEL_PREVIEW_PATTERN && 
            SmartAppBinding.VERCEL_PREVIEW_PATTERN.test(origin)) {
            console.log(`✅ Vercel preview origin accepted: ${origin}`);
            return true;
        }
        return false;
    }
    
    /**
     * Handle cross-origin messages
     * @param {MessageEvent} event Message event
     */
    _handleMessage(event) {
        // Validate origin using unified check
        if (!this._isOriginTrusted(event.origin)) {
            console.warn(`🚫 Blocked message from untrusted origin: ${event.origin}`);
            return;
        }
        
        const { type, action, data } = event.data || {};
        
        if (type !== 'smart-app-binding') return;
        
        switch (action) {
            case 'request-token':
                const tokenResult = this.requestAccessToken(data?.requester);
                event.source.postMessage({
                    type: 'smart-app-binding',
                    action: 'token-response',
                    data: tokenResult
                }, event.origin);
                break;
                
            case 'get-settings':
                const settingsResult = this.getProtectedSettings(data?.token);
                event.source.postMessage({
                    type: 'smart-app-binding',
                    action: 'settings-response',
                    data: settingsResult
                }, event.origin);
                break;
                
            case 'validate-token':
                const validation = this.validateToken(data?.token);
                event.source.postMessage({
                    type: 'smart-app-binding',
                    action: 'validation-response',
                    data: validation
                }, event.origin);
                break;
        }
    }
    
    /**
     * Register a new authorized application
     * Requires admin permission
     * @param {string} appId Application ID
     * @param {Object} appConfig Application configuration
     * @returns {Object} Registration result
     */
    registerApp(appId, appConfig) {
        const authResult = this.isAuthorized('admin');
        if (!authResult.authorized) {
            return {
                success: false,
                reason: 'ADMIN_REQUIRED',
                message: 'Admin permission required to register new applications'
            };
        }
        
        // Validate config
        if (!appConfig.name || !appConfig.paths || !Array.isArray(appConfig.paths)) {
            return {
                success: false,
                reason: 'INVALID_CONFIG',
                message: 'Application config must include name and paths array'
            };
        }
        
        // Add to authorized apps
        SmartAppBinding.AUTHORIZED_APPS[appId] = {
            ...appConfig,
            permissions: appConfig.permissions || ['read'],
            icon: appConfig.icon || '📱',
            registeredAt: Date.now()
        };
        
        // Save to localStorage
        this._saveAuthorizedApps();
        
        console.log(`✅ Registered new app: ${appId} (${appConfig.name})`);
        
        return {
            success: true,
            app: SmartAppBinding.AUTHORIZED_APPS[appId]
        };
    }
    
    /**
     * Save authorized apps to encrypted storage
     */
    _saveAuthorizedApps() {
        const apps = {};
        for (const [id, app] of Object.entries(SmartAppBinding.AUTHORIZED_APPS)) {
            if (app.registeredAt) {  // Only save custom apps
                apps[id] = app;
            }
        }
        localStorage.setItem(SmartAppBinding.AUTHORIZED_APPS_KEY, JSON.stringify(apps));
    }
    
    /**
     * Load authorized apps from storage
     */
    _loadAuthorizedApps() {
        try {
            const stored = localStorage.getItem(SmartAppBinding.AUTHORIZED_APPS_KEY);
            if (stored) {
                const apps = JSON.parse(stored);
                Object.assign(SmartAppBinding.AUTHORIZED_APPS, apps);
                console.log(`📦 Loaded ${Object.keys(apps).length} custom authorized apps`);
            }
        } catch (e) {
            console.warn('Failed to load authorized apps:', e);
        }
    }
    
    /**
     * Get status information
     * @returns {Object} Status info
     */
    getStatus() {
        const fingerprint = this.generateFingerprint();
        const authResult = this.isAuthorized('read');
        
        return {
            version: SmartAppBinding.VERSION,
            fingerprint,
            authorized: authResult.authorized,
            app: authResult.app?.name || 'Unknown',
            permissions: authResult.app?.permissions || [],
            lockedOut: this._isLockedOut(),
            failedAttempts: this.failedAttempts,
            currentToken: this.currentToken ? {
                id: this.currentToken.id,
                expiresAt: this.currentToken.expiresAt,
                remainingTime: this.currentToken.expiresAt - Date.now()
            } : null,
            trustedOrigins: SmartAppBinding.TRUSTED_ORIGINS,
            authorizedApps: Object.keys(SmartAppBinding.AUTHORIZED_APPS)
        };
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.SmartAppBinding = SmartAppBinding;
    window.smartAppBinding = new SmartAppBinding();
    
    // Load custom authorized apps
    window.smartAppBinding._loadAuthorizedApps();
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartAppBinding;
}
