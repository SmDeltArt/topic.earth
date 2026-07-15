# API Settings — Centralised Deployment

Status: active reference
Created: 2026-06-01
Replaces / extends: `API_SETTINGS_WIDGET_DEPLOYMENT.md` (still valid for widget-host model)

---

## 1. Goal

One copy of `api-settings.html` per **domain**, not one copy per app.

This ensures:

- `localStorage` is shared across all apps running on the same origin
- Keys saved once are available to all apps on that domain
- No duplication of the widget source files per app folder

---

## 2. Deployment topology

### Local development (localhost:3000)

```
streaming-studio/public/
  api/
    api-settings.html         ← local copy for localhost:3000
    domain-config.js
    cad-deltai-logo-128.svg
    src/
      api-settings.js
      api-model-updater.js
    shared/
      smart-spa-base.css
    brand/
      brand.json
      source/brand-meta.js
```

All apps running at `localhost:3000` share the same `localStorage`.
When streaming studio is renamed to `studio/`, keep the `api/` folder beside it.

No domain guard blocks localhost — `allowedHosts` includes both `localhost` and `127.0.0.1`.

### Staging / production (Vercel)

| Domain                 | api-settings location            | localStorage scope   |
| ---------------------- | -------------------------------- | -------------------- |
| `smdeltart.com`        | `/api/api-settings.html`         | smdeltart.com        |
| `studio.smdeltart.com` | `/api/api-settings.html`         | studio.smdeltart.com |
| `caddeltai.com`        | `api.caddeltai.com/api-settings` | caddeltai.com        |
| `studio.caddeltai.com` | `/api/api-settings.html`         | studio.caddeltai.com |

Each subdomain is a **separate origin** → separate `localStorage`.
A key saved at `smdeltart.com` is NOT available at `studio.smdeltart.com`.

Options to sync across subdomains:

- A) Copy `api/` into each app's Vercel root (current approach — simplest)
- B) Use `api.caddeltai.com` as a cross-origin iframe with postMessage sync (future)

---

## 3. Why "Sync blocked: invalid key format" is not an error

`api-settings.js` contains `syncOpenAIKeys()` — a function that auto-fills
OpenAI keys across all OpenAI-type fields (paid text, DALL-E, TTS) when you
enter one `sk-...` key.

Line ~2464:

```javascript
if (!apiKey.match(/^sk-(proj-)?[a-zA-Z0-9_-]{20,}$/)) {
  console.log("❌ Sync blocked: invalid key format or empty");
  return;
}
```

This message appears for **any non-OpenAI key** (Groq `gsk_...`, CAD-AI `key_...`,
Anthropic `sk-ant-...`, etc). It is expected, harmless, and does NOT block the save.

The actual save (`saveSettingsToLocalStorage()`) is called independently and is
unaffected.

---

## 4. Domain guard — localhost is always allowed

`domain-config.js` and the fallback inside `api-settings.js` both include:

```javascript
allowedHosts: ["localhost", "127.0.0.1", ...]
```

When api-settings is **embedded in an iframe**, the domain check is skipped entirely:

```javascript
const isEmbedded = window.self !== window.top;
if (isEmbedded) return true;
```

So localhost:3000 is allowed both standalone and embedded.

---

## 5. postMessage bridge — streaming studio

`public/app/src/smart-api-integration.js` bridges between the api-settings widget
and the streaming studio.

### What api-settings sends (on Save):

```javascript
window.parent.postMessage({
  type: "smart-widget",
  action: "settings-saved",
  data: { paidTextApi, paidTextApiKey, freeTextApi, freeTextApiKey, ... }
}, "*");
```

### What smart-api-integration.js now receives:

```javascript
// Handles both formats:
// - legacy: { type: "smart-api-settings-updated", settings: {...} }
// - api-settings.js: { type: "smart-widget", action: "settings-saved", data: {...} }
```

The `mapApiSettingsToSmartApi()` function translates the api-settings field names
(`paidTextApi`, `paidTextApiKey`, etc.) into the `SmartAPIIntegration` format
(`apiKeys: { openai: "...", groq: "..." }`).

### localStorage keys:

| Key                    | Written by          | Read by                   |
| ---------------------- | ------------------- | ------------------------- |
| `smdeltartApiSettings` | api-settings.js     | api-settings.js (reload)  |
| `cadAiApiSettings`     | api-settings.js     | legacy compatibility      |
| `smart_api_settings`   | SmartAPIIntegration | streaming studio managers |

`loadSettings()` falls back from `smart_api_settings` → `smdeltartApiSettings`
→ `cadAiApiSettings` and promotes to `smart_api_settings` on first load.

---

## 6. Adding api/ to a new app (checklist)

When adding `api-settings` to a new app in the SmDeltArt collection:

1. Copy `private/api/` folder beside the app's `public/` root
2. Serve it at the same origin (e.g. `localhost:3000/api/api-settings.html`)
3. Open it as a popup via `SmartPopup.widget('api-settings')` or direct `window.open`
4. Import `smart-api-integration.js` in the app's main script
5. The `window.message` listener in `smart-api-integration.js` handles postMessage sync automatically
6. No bridge handler needed for popup mode (SmartWidgetPopup opens a new window, not an iframe overlay)

For **iframe overlay** mode (like old clipboard-manager pattern), also copy
`src/api-bridge-handler.js` and add `#apiSettingsFrame` + `#apiSettingsOverlay` elements.

---

## 7. Relation to existing docs

| Document                                 | Purpose                                         | Status        |
| ---------------------------------------- | ----------------------------------------------- | ------------- |
| `API_SETTINGS_WIDGET_DEPLOYMENT.md`      | Widget-host model, embed contract, domain guard | Current       |
| `API_SETTINGS_CENTRALISED_DEPLOYMENT.md` | One copy per domain, bridge, key map            | **This file** |
| `API_BRIDGE_GUIDE.md`                    | iframe overlay pattern (clipboard era)          | Archive       |
| `ARCHITECTURE.md`                        | Mixed guidance, some stale                      | Archive       |
| `AUDIT.md`                               | iframe/subdomain reasoning                      | Reference     |
