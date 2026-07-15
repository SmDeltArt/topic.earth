# 🔐 SmΔrt Widgets - Encryption & Security Documentation

> **Version:** 2.4 (December 2024)  
> **Status:** Implemented & Tested  
> **Widgets:** `clipboard-manager.html`, `api-settings.html`

---

## ⚠️ Security Audit Summary

### Known Vulnerabilities

| Finding | Risk | Status |
|---------|------|--------|
| XOR encryption uses static key (obfuscation only) | 🔴 Critical | By design for compatibility |
| Double storage: encrypted + plaintext copies | 🔴 Critical | Required for app compatibility |
| Console logging of decrypted key prefixes | ⚠️ Medium | Remove in production |

### Storage Keys Containing Secrets

| Key | Encrypted? | Notes |
|-----|------------|-------|
| `smdeltartApiSettings` | XOR only | Obfuscated, not secure |
| `cadAiApiSettings` | ❌ Plaintext | For legacy widget compat |
| `smartApiSettings` | ❌ Plaintext | For app compat |
| `smdeltart-api-vault` | ✅ AES-256 | Optional secure vault |

### Security Best Practices

1. **Never use on shared/public computers**
2. **Browser extensions can read localStorage**
3. **Use "Clear API Data" before leaving**
4. **For production:** Deploy with Vercel proxy (keys in env vars)

---

## Overview

The SmΔrt Widgets implement a **Unified Security Architecture** with two complementary systems:

| Widget | Primary Protection | Secondary |
|--------|-------------------|-----------|
| **Clipboard Manager** | ClipboardVault (XOR + AES) | 30s auto-lock |
| **API Settings** | ApiVault (AES-256-GCM) | SmartEncryption (XOR) |

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│                    API SETTINGS WIDGET                       │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ ApiVault    │    │SmartEncrypt  │    │ Plain Storage │  │
│  │ AES-256-GCM │    │ XOR+Base64   │    │ (Compat Mode) │  │
│  │ 🔐 Secure   │    │ ⚠️ Legacy    │    │ ❌ Exposed    │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    postMessage / localStorage
                              │
┌─────────────────────────────────────────────────────────────┐
│                   CONSUMING APPS (Studio, etc)              │
│  Read from: cadAiApiSettings, smartApiSettings              │
│  No encryption handling needed - plain JSON                 │
└─────────────────────────────────────────────────────────────┘
```

---

# Part 1: Clipboard Manager Encryption

---

## 🔑 ClipboardVault Object

The central encryption controller managing all protected content.

### Properties
```javascript
ClipboardVault = {
    VAULT_KEY: 'smdeltart-clipboard-vault',  // AES vault storage
    ADMIN_KEY: 'smdeltart-vault-admin',       // Admin password (obfuscated)
    isUnlocked: false,                         // Current lock state
    masterKey: null,                           // Derived CryptoKey (AES)
    currentPassword: null,                     // Plain password for XOR ops
    autoLockMs: 30 * 1000                      // Auto-lock timeout
}
```

### Key Methods

| Method | Purpose |
|--------|---------|
| `createVault(password)` | Initialize new vault with password |
| `unlock(password)` | Authenticate and unlock vault |
| `lock()` | Lock vault and clear keys |
| `encrypt(data)` | AES-256-GCM encryption |
| `decrypt(encryptedBase64)` | AES-256-GCM decryption |
| `showVaultPopup(options)` | Display unlock/create UI |
| `deleteVaultWithContent()` | Remove vault and all encrypted content |

---

## 🖼️ Asset Encryption Flow

### Encryption Process

```
User clicks 🔺 → Vault popup (if locked) → Password verified → 
XOR encrypt image URL → Store encrypted data → Show placeholder
```

**Key Format:** `'smdeltart-asset-' + password`

### Storage Structure
```javascript
// In localStorage 'custom-icon-images'
{
    id: "icon-12345",
    encrypted: true,
    encryptedContent: "base64-xor-data",  // XOR encrypted URL
    originalDataUrl: "data:image/png...", // BACKUP - original image
    dataUrl: "data:image/png...",         // BACKUP - original image
    placeholderSeed: 742,                 // Random placeholder ID
    name: "asset_742.enc"                 // Obfuscated name
}
```

### Decryption Process

```
User clicks encrypted asset → Vault popup → Password verified →
Try 5 key formats → Success: restore image | Fail: use backup
```

**Key Formats Tried (backwards compatibility):**
1. `NEW`: `'smdeltart-asset-' + password`
2. `OLD_HASH`: `'smdeltart-vault-asset-' + storedHash`
3. `SIMPLE`: `password` (raw)
4. `ENIGMA`: `'enigma-' + password`
5. `HASH_ONLY`: `storedHash`

### Backup Recovery

If all decryption attempts fail, the system checks:
1. `icon.originalDataUrl` - Stored before encryption
2. `icon.dataUrl` - Original data URL
3. `element.dataset.content` - DOM fallback

---

## 📝 Text Snippet Encryption

### Visibility Control

Snippets in the **General** folder are encrypted when the vault is locked:

```javascript
// Encryption check
const isEncrypted = isViewingGeneralTab && 
                    isInGeneralFolder && 
                    hasEnigmaPassword() && 
                    !enigmaIsDecrypted;
```

### Display States

| Vault State | General Folder | Other Folders |
|-------------|----------------|---------------|
| **Locked** | Shows `•••••••` | Normal view |
| **Unlocked** | Shows content | Normal view |

---

## 🔒 XOR Encryption Functions

### enigmaEncrypt(text, key)
```javascript
function enigmaEncrypt(text, key) {
    const keyBytes = new TextEncoder().encode(key);
    const textBytes = new TextEncoder().encode(text);
    const encrypted = new Uint8Array(textBytes.length);
    
    for (let i = 0; i < textBytes.length; i++) {
        encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return btoa(String.fromCharCode(...encrypted));
}
```

### enigmaDecrypt(encryptedBase64, key)
```javascript
function enigmaDecrypt(encryptedBase64, key) {
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(key);
    const decrypted = new Uint8Array(combined.length);
    
    for (let i = 0; i < combined.length; i++) {
        decrypted[i] = combined[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(decrypted);
}
```

---

## ✅ URL Validation

Strict validation prevents garbage XOR output from being used:

```javascript
function isValidAssetUrl(url) {
    // Data URLs: must have ;base64, and length > 50
    if (url.startsWith('data:')) {
        return url.includes(';base64,') && url.length > 50;
    }
    
    // HTTP URLs: must have valid domain structure
    if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlPart = url.substring(url.indexOf('://') + 3);
        return urlPart.includes('.') && !urlPart.includes('{') && !urlPart.includes('^');
    }
    
    // Asset paths: no garbage characters, valid extension
    if (url.startsWith('assets/')) {
        const hasGarbage = /[\{\}\^\|\[\]<>]/.test(url);
        const hasValidExtension = /\.(png|jpg|jpeg|gif|webp|svg|mp4|webm)($|\?)/i.test(url);
        return !hasGarbage && hasValidExtension;
    }
    
    return false;
}
```

---

## 🛡️ Admin Recovery

### Admin Password
- Default: `smdeltart.com` (base64 obfuscated)
- Stored: `smdeltart-vault-admin` (can be changed)

### Admin Actions

| Action | Effect |
|--------|--------|
| **View Bypass** | View encrypted content without decryption |
| **Remove All Encryption** | Clear encryption flags, restore backups |
| **Delete Vault** | Remove all encrypted content and vault |

### Remove All Encryption Flow
```javascript
// 1. Clear asset encryption
icons.forEach(icon => {
    icon.encrypted = false;
    delete icon.encryptedContent;
    if (icon.originalDataUrl) {
        icon.dataUrl = icon.originalDataUrl;  // Restore backup
    }
});

// 2. Clear text encryption
localStorage.removeItem('enigma-master-hash');
localStorage.removeItem('smdeltart-clipboard-vault');

// 3. Reload UI
loadStoredIcons();
renderSnippets(getStoredSnippets());
```

---

## 📊 localStorage Keys (Clipboard Manager)

| Key | Type | Purpose |
|-----|------|---------|
| `enigma-master-hash` | String | Password verification hash |
| `smdeltart-clipboard-vault` | JSON | AES vault metadata |
| `smdeltart-vault-admin` | String | Admin password (base64) |
| `custom-icon-images` | JSON | Icon library with encryption |
| `iconLibrary` | JSON | Alternative icon storage |
| `textSnippets` | JSON | Text snippets array |
| `snippetFolders` | JSON | Custom folder definitions |
| `enigma-vault-secrets` | JSON | Legacy secret storage |

---

## ⚠️ Known Limitations (Clipboard)

1. **XOR is reversible** - Anyone with the key can decrypt
2. **Key in memory** - `currentPassword` stored during session
3. **No server-side** - All encryption is client-side only
4. **Old assets** - Assets encrypted before backup storage are unrecoverable

---

# Part 2: API Settings Protection System

## Overview

The API Settings widget manages API keys for all SmΔrt apps with a **dual-storage architecture**:

1. **Encrypted Storage** (`smdeltartApiSettings`) - XOR encrypted for obfuscation
2. **Plain Storage** (`cadAiApiSettings`, `smartApiSettings`) - For app compatibility
3. **Vault Storage** (`smdeltart-api-vault`) - AES-256-GCM encrypted (optional)

### Why Dual Storage?

```
API Settings Widget                    Consuming Apps
┌──────────────────┐                  ┌────────────────────┐
│                  │                  │ SmartRedactor      │
│  Save Settings   │──────────────────│ VoiceRecorder      │
│                  │  cadAiApiSettings│ ImageDisplay       │
│  XOR Encrypted   │  (plain JSON)    │ Studio App         │
│  + AES Vault     │                  │                    │
└──────────────────┘                  └────────────────────┘

Apps don't need decryption logic - they read plain keys directly
```

---

## 🔐 ApiVault Object (AES-256-GCM)

The secure vault for API key storage.

### Properties
```javascript
ApiVault = {
    STORAGE_KEY: 'smdeltart-api-vault',
    VAULT_VERSION: '1.0',
    masterKey: null,        // Derived CryptoKey (AES-256)
    isUnlocked: false,      // Lock state
}
```

### Key Methods

| Method | Purpose |
|--------|---------|
| `createVault(password, keys)` | Create new encrypted vault |
| `unlockVault(password)` | Decrypt and access vault |
| `saveKeys(apiKeys)` | Save keys to unlocked vault |
| `getKeys()` | Retrieve decrypted keys |
| `lockVault()` | Clear master key, lock vault |

### AES-256-GCM Implementation

```javascript
// Key derivation using PBKDF2
async deriveKey(password, salt) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encryption with random IV
async encrypt(data, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(JSON.stringify(data))
    );
    return { iv: arrayToBase64(iv), ciphertext: arrayToBase64(ciphertext) };
}
```

---

## 🔧 SmartEncryption (XOR Legacy)

Simple obfuscation for localStorage storage.

```javascript
const SmartEncryption = {
    SECRET_KEY: 'SmΔrt2025!ApiKey#Secure',  // Static key (obfuscation only)
    
    encrypt(plainText) {
        const xored = this.xorCipher(plainText, this.SECRET_KEY);
        return 'ENC:' + btoa(unescape(encodeURIComponent(xored)));
    },
    
    decrypt(encryptedText) {
        if (!encryptedText.startsWith('ENC:')) return encryptedText;
        const base64 = encryptedText.substring(4);
        const xored = decodeURIComponent(escape(atob(base64)));
        return this.xorCipher(xored, this.SECRET_KEY);
    },
    
    isEncrypted(value) {
        return value?.startsWith('ENC:');
    }
}
```

⚠️ **Security Note:** XOR with static key is **obfuscation, NOT encryption**. The key ships with the widget.

---

## 📊 Storage Keys (API Settings)

| Key | Encryption | Consumer |
|-----|------------|----------|
| `smdeltartApiSettings` | XOR (ENC: prefix) | API Settings widget |
| `cadAiApiSettings` | **None (plain)** | SmartRedactor, old apps |
| `smartApiSettings` | **None (plain)** | Studio, new apps |
| `smdeltart-api-vault` | AES-256-GCM | Optional secure storage |
| `smdeltartApiLastCheck` | None | Version check date |
| `smdeltartApiRevision` | None | API version tracking |

---

## 🔄 Save Flow

```javascript
function saveSettingsToLocalStorage() {
    const settings = collectAllSettings();
    
    // 1. XOR encrypt API keys for smdeltart storage
    inputs.forEach(id => {
        if (id.includes('ApiKey') && value) {
            settings[id] = SmartEncryption.encrypt(value);
        }
    });
    localStorage.setItem('smdeltartApiSettings', JSON.stringify(settings));
    
    // 2. Save PLAIN copy for app compatibility
    localStorage.setItem('cadAiApiSettings', JSON.stringify(plainSettings));
    localStorage.setItem('smartApiSettings', JSON.stringify(plainSettings));
    
    // 3. If vault unlocked, also save AES encrypted
    if (ApiVault.isUnlocked) {
        await ApiVault.saveCurrentKeys();
    }
}
```

---

## 📤 App Integration Pattern

### Reading API Keys in Apps

```javascript
// In consuming app (Studio, etc.)
function getApiSettings() {
    // Read from plain storage (no decryption needed)
    const settings = JSON.parse(
        localStorage.getItem('smartApiSettings') || 
        localStorage.getItem('cadAiApiSettings') || 
        '{}'
    );
    return settings;
}

// Get specific key
function getOpenAiKey() {
    const settings = getApiSettings();
    return settings.openaiTextApiKey || '';
}

// Get active provider
function getActiveTextProvider() {
    const settings = getApiSettings();
    return settings.activeTextProvider || 'websim';
}
```

### API Settings Structure

```javascript
{
    // API Keys (stored plain for app access)
    openaiTextApiKey: "sk-...",
    openaiImageApiKey: "sk-...",
    anthropicApiKey: "sk-ant-...",
    
    // Provider selections
    activeTextProvider: "paid",      // 'websim' | 'paid' | 'free'
    activeImageProvider: "paid",     // 'websim' | 'paid' | 'free'
    activeTtsProvider: "browser",    // 'websim' | 'browser' | 'external'
    
    // Model selections
    openaiTextModel: "gpt-4o",
    openaiImageModel: "gpt-image-1",
    openaiTtsModel: "tts-1",
    ollamaModel: "llama3.1"
}
```

---

## 🏗️ Centralized API Management Benefits

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API SETTINGS WIDGET                       │
│         (Single source of truth for all API keys)           │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │    Studio     │ │  Clipboard    │ │  Image Suite  │
    │               │ │   Manager     │ │               │
    └───────────────┘ └───────────────┘ └───────────────┘
```

### Advantages

1. **Single Update Point** - Change API key once, all apps use it
2. **No App Updates Needed** - API changes don't require app redeployment
3. **Provider Switching** - Change from OpenAI to Anthropic without code changes
4. **Model Updates** - New GPT models available immediately

---

## 📝 Testing Checklist (API Settings)

- [ ] Save settings → all 3 storage keys populated
- [ ] Verify XOR encryption in `smdeltartApiSettings`
- [ ] Verify plain JSON in `cadAiApiSettings`
- [ ] Create vault with password
- [ ] Unlock vault → AES decryption works
- [ ] App reads `smartApiSettings` correctly
- [ ] Provider switching persists
- [ ] Model selection persists

---

## 🔄 Migration Path

### Current → Enhanced Security

| Current | Enhanced |
|---------|----------|
| XOR keys in smdeltart | Remove XOR, use vault only |
| Plain keys for apps | Encrypted + runtime decrypt |
| Static XOR key | Per-user derived keys |

### Future Consideration: Server-Side Keys

```
Browser Widget ──► API Gateway ──► OpenAI
                      │
                 Keys stored
                 server-side
```

---

# Part 3: Security Audit - Plain JSON Protection

## 🔴 Current Vulnerability: Plain JSON Storage

### The Problem

Apps read API keys from plain JSON (`cadAiApiSettings`, `smartApiSettings`) for compatibility:

```javascript
// CURRENT: Keys exposed in localStorage
localStorage.getItem('smartApiSettings')
// Returns: {"openaiTextApiKey": "sk-abc123...", ...}
```

**Attack vectors:**
1. **Browser extensions** - Can read all localStorage
2. **XSS attacks** - JavaScript can access localStorage
3. **Physical access** - DevTools → Application → Local Storage
4. **Shared computers** - Next user can see keys

---

## 🛡️ Protection Strategies

### Strategy 1: Session-Only Keys (Recommended)

Store keys in `sessionStorage` instead of `localStorage`:

```javascript
// Session storage clears when browser closes
sessionStorage.setItem('smartApiSettings', JSON.stringify(settings));

// Benefits:
// ✅ Keys don't persist after browser close
// ✅ Each tab has isolated storage
// ❌ User must re-enter keys each session
```

**Implementation:**
```javascript
// In API Settings widget - save to session
function saveForApps(settings) {
    // Primary: Session storage (secure)
    sessionStorage.setItem('smartApiSettings', JSON.stringify(settings));
    
    // Fallback: localStorage only if user opts-in
    if (userWantsPersistence) {
        localStorage.setItem('smartApiSettings', JSON.stringify(settings));
    }
}

// In consuming apps - check both
function getApiSettings() {
    return JSON.parse(
        sessionStorage.getItem('smartApiSettings') ||
        localStorage.getItem('smartApiSettings') ||
        '{}'
    );
}
```

---

### Strategy 2: Runtime Decryption in Apps

Apps decrypt at runtime instead of reading plain JSON:

```javascript
// In API Settings - save encrypted only
function saveSettings(settings) {
    const encrypted = await ApiVault.encrypt(settings);
    localStorage.setItem('smartApiSettingsSecure', encrypted);
}

// In consuming apps - decrypt at runtime
async function getApiSettings() {
    const encrypted = localStorage.getItem('smartApiSettingsSecure');
    if (!encrypted) return {};
    
    // Prompt user for vault password
    const password = await promptVaultPassword();
    return await decryptWithPassword(encrypted, password);
}
```

**Trade-off:** Apps need decryption logic + user enters password per session.

---

### Strategy 3: Key Proxy Pattern

Never store full keys - use truncated references:

```javascript
// Store only key identifier
{
    "openaiKeyRef": "sk-...abc",  // Last 3 chars only
    "openaiKeyHash": "sha256:...",
    "useVault": true
}

// Full key retrieval requires vault unlock
function getFullKey(keyRef) {
    if (!ApiVault.isUnlocked) {
        await ApiVault.showUnlockPrompt();
    }
    return ApiVault.getKey(keyRef);
}
```

---

### Strategy 4: Memory-Only Keys

Keep keys in JavaScript memory, never in storage:

```javascript
// Global state (cleared on page refresh)
window.__apiKeys = {};

// API Settings broadcasts keys via postMessage
window.postMessage({ type: 'API_KEYS', keys: encryptedKeys }, '*');

// Apps listen and decrypt
window.addEventListener('message', async (e) => {
    if (e.data.type === 'API_KEYS') {
        window.__apiKeys = await decrypt(e.data.keys);
    }
});
```

**Benefits:**
- ✅ No localStorage exposure
- ✅ Keys cleared on page close
- ❌ Requires iframe communication
- ❌ Keys lost on refresh

---

### Strategy 5: Environment-Based Keys (Production)

For deployed apps, use server-side environment variables:

```javascript
// Vercel/Netlify deployment
// API keys in environment variables, not browser

// Frontend calls your API route
const response = await fetch('/api/openai', {
    method: 'POST',
    body: JSON.stringify({ prompt: userPrompt })
});

// Backend (api/openai.js)
export default async function handler(req, res) {
    const response = await fetch('https://api.openai.com/v1/...', {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
    });
    return res.json(await response.json());
}
```

**Benefits:**
- ✅ Keys never reach browser
- ✅ Rate limiting possible
- ✅ Key rotation without frontend changes
- ❌ Requires backend deployment

---

## 📊 Recommendation Matrix

| Strategy | Security | UX | Effort | Best For |
|----------|----------|-----|--------|----------|
| **Session Storage** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ | Quick fix |
| **Runtime Decrypt** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | Single user |
| **Key Proxy** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Multi-app |
| **Memory Only** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | High security |
| **Server-Side** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Production |

---

## 🚀 Immediate Action: Hybrid Approach

Combine strategies for best balance:

```javascript
// api-settings-secure.js

const SecureApiStorage = {
    // 1. Primary: Session storage (auto-clears)
    saveToSession(settings) {
        sessionStorage.setItem('smartApiSettings', JSON.stringify(settings));
    },
    
    // 2. Persistent: Encrypted in vault
    async saveToVault(settings) {
        if (ApiVault.isUnlocked) {
            await ApiVault.saveKeys(settings);
        }
    },
    
    // 3. Legacy fallback: localStorage with warning
    saveToLocalStorage(settings, userConsent = false) {
        if (!userConsent) {
            console.warn('⚠️ Saving API keys in plain localStorage');
        }
        localStorage.setItem('smartApiSettings', JSON.stringify(settings));
    },
    
    // Reading priority: session → vault → localStorage
    async getSettings() {
        // Try session first (most secure)
        let settings = sessionStorage.getItem('smartApiSettings');
        if (settings) return JSON.parse(settings);
        
        // Try vault (requires unlock)
        if (ApiVault.hasVault()) {
            const vaultKeys = await ApiVault.getKeys();
            if (vaultKeys) return vaultKeys;
        }
        
        // Fallback to localStorage
        settings = localStorage.getItem('smartApiSettings');
        return settings ? JSON.parse(settings) : {};
    }
};
```

---

## 📝 Combined Testing Checklist

### Clipboard Manager
- [ ] Create vault → password hash stored
- [ ] Lock vault → General snippets encrypted
- [ ] Unlock vault → content decrypted, 30s timer starts
- [ ] Auto-lock after 30s → vault locked
- [ ] Encrypt asset → placeholder shown, backup stored
- [ ] Decrypt asset → original image restored
- [ ] Re-encrypt asset → works (content preserved)
- [ ] Admin bypass → remove all encryption works
- [ ] Delete vault → all encrypted content removed

### API Settings
- [ ] Save settings → all 3 storage keys populated
- [ ] Verify XOR encryption in `smdeltartApiSettings`
- [ ] Verify plain JSON in `cadAiApiSettings`
- [ ] Create vault with password
- [ ] Unlock vault → AES decryption works
- [ ] App reads `smartApiSettings` correctly
- [ ] Provider switching persists
- [ ] Model selection persists

### Security Audit
- [ ] Test sessionStorage implementation
- [ ] Verify keys clear on browser close
- [ ] Test vault-only mode (no plain storage)
- [ ] Check DevTools exposure
- [ ] Test cross-tab isolation
