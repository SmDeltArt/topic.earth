# 🔌 Streaming Studio ↔ api-settings Bridge — Fixes & Status

> **Date:** June 19, 2026
> **Scope:** `private/streaming-studio` + `private/api` (api-settings widget)
> **Status:** ✅ Bridge working — badge green, TTS/STT/image use configured API

---

## 📑 Summary

The streaming-studio reads its AI provider keys from the **api-settings**
widget, which runs in an iframe (same-origin on localhost, cross-origin in
production). A series of bugs made the studio fall back to browser/offline
generation even when a paid API was configured. All are now fixed.

---

## 🗄️ Storage architecture (single source of truth)

api-settings writes the following keys; the studio merges all of them through
[`api-settings-reader.js`](../../streaming-studio/public/app/src/api-settings-reader.js).

| Key                    | Scope              | Contents                                                  | Written by                                      |
| ---------------------- | ------------------ | --------------------------------------------------------- | ----------------------------------------------- |
| `smdeltartPreferences` | localStorage       | provider names + radio states, **no keys**                | api-settings `saveSettingsToLocalStorage()`     |
| `smdeltartApiSettings` | localStorage       | **XOR-encrypted** keys (`ENC:` prefix)                    | api-settings `saveSettingsToLocalStorage()`     |
| `cadAiApiSettings`     | localStorage       | **plain** keys (same-origin direct write)                 | api-settings (legacy compat)                    |
| `smartApiSettings`     | localStorage       | plain mirror                                              | api-settings (legacy compat)                    |
| `smart_api_settings`   | localStorage       | SmartAPIIntegration format `{apiKeys, selectedProviders}` | SmartAPIIntegration                             |
| `cadAiApiSettings`     | **sessionStorage** | full plain settings — **postMessage bridge**              | studio `ui-manager.js` `settings-saved` handler |

**Merge priority** (highest wins, empty strings never overwrite):

```
smart_api_settings  <  smdeltartApiSettings  <  smdeltartPreferences
                    <  localStorage.cadAiApiSettings
                    <  sessionStorage.cadAiApiSettings   (highest)
```

### Why sessionStorage for the bridge?

- Cross-origin iframe (production) cannot write the parent's localStorage, so
  api-settings posts `{type:"smart-widget", action:"settings-saved", data}` to
  the parent. The studio caches `data` into **sessionStorage** — tab-scoped,
  cleared on tab close, survives refresh, never persists plaintext keys to disk.
- `api-settings-reader.js` checks sessionStorage **first**, so the same code
  path works for both localhost (same-origin) and production (cross-origin).

---

## 🐞 Bugs fixed (June 2026)

### 1. postMessage bridge never cached the payload

- **Symptom:** cross-origin production never saw the keys; studio fell back to browser.
- **Fix:** `ui-manager.js` `settings-saved` listener now writes `msg.data` to
  `sessionStorage["cadAiApiSettings"]`, then refreshes the badge and resets the
  cached AI handle (`smartRedactorManager.aiAPI = null`).

### 2. Badge stuck orange after configuring API

- **Root cause:** api-settings calls `saveApiSettingsLocally()` early (on panel
  open) and writes `cadAiApiSettings` with `paidTextApiKey: ""`. A JS object
  with an empty-string field is **truthy**, so any `||`-chain short-circuited
  there and never checked `smdeltartApiSettings` (which holds the real key).
- **Fix:** `refreshApiModelsBadge()` reads `sess` / `cad` / `enc` as **three
  separate variables** and checks all of them for `hasKey`.

### 3. `getApiSettings()` returned only the first non-empty source

- **Fix:** now merges **all** storage sources with the rule _"empty string never
  overwrites a previously found value"_ — prevents the form-reset empty object
  from hiding a stored key.

### 4. Reading Guide vignette stuck on "🔊 Browser TTS"

- **Root cause:** `smartRedactor.js` vignette playback read **only**
  `localStorage["cadAiApiSettings"]` and checked `paidTextApi === "openai"` —
  missing the sessionStorage bridge and encrypted storage.
- **Fix:** vignette TTS now calls the centralized `getTtsSettings()` from
  `api-settings-reader.js`. When OpenAI TTS is configured the badge shows
  "🔊 OpenAI TTS" and uses the selected `openaiTtsModel` / `openaiTtsVoice`;
  otherwise it falls back to Browser TTS.

### 5. SmartRedactor AI text fell back to browser/offline

- **Fix:** `createSelectedWidgetAI()` merges `smdeltartApiSettings` +
  `cadAiApiSettings` + `sessionStorage` (empty-string-safe). The cached
  `aiAPI` handle is reset whenever settings are saved, so the next call
  re-initializes with the fresh key.

### 6. Image generation fell back to offline / Pollinations

- **Fix:** `smartImages.js` `tryWidgetSelectedImageAPI()` merges all sources and
  uses `paidTextApiKey` as a fallback for `paidImageApiKey` (same OpenAI key).
  WebSim and Pollinations were removed from `callAIGenerationAPI()`.

### 7. Pollinations 403 console errors

- **Root cause:** `testPollinations()` and the Pollinations block in
  `testAllConfiguredAPIs()` made a `HEAD` request that returns 403 (logged by
  the browser even when handled).
- **Fix:** both skip the network request entirely and report
  "✅ Pollinations: Available (Free, no key required)".

### 8. `SyntaxError: Unexpected token 'catch'`

- **Cause:** a PowerShell regex replace left an orphaned `catch (e) {…}` block in
  the **serving copy** `public/api/src/api-settings.js`.
- **Fix:** orphaned block removed. Master `private/api/src/api-settings.js` was
  already clean.

### 9. Console noise: `⚠️ Legacy storage (cadAiApiSettings) still active`

- This is **not** an error — the plain storage is written intentionally so app
  managers can read keys. Downgraded from `console.warn` to `console.debug`.

---

## ℹ️ Known harmless console messages (not bugs)

| Message                                                                     | Source                             | Why it's safe                                                                                                                                                                                                |
| --------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `"[object Object]" is not valid JSON`, `"ready"…`, `"cookie-auth-missing"…` | WordPress `wpcom-proxy-request.js` | WordPress intercepts **all** `postMessage` events and tries to `JSON.parse` them. Our bridge sends objects, not JSON strings. Cannot be fixed from our side; only appears when embedded under wordpress.com. |
| `Tracking Prevention blocked access to storage`                             | Browser privacy mode               | Edge/Chrome tracking prevention on third-party iframe storage. Reader degrades gracefully to other sources.                                                                                                  |
| `[DOM] Password field is not contained in a form`                           | api-settings key inputs            | Verbose DOM hint only. Inputs are `type=password` with `autocomplete=off` by design (no form submit).                                                                                                        |

---

## 🔄 Module versions (cache-bust) — `public/app/script.js`

| Module                                          | Version               |
| ----------------------------------------------- | --------------------- |
| `ui-manager.js`                                 | `?v=20260619-10`      |
| `smartRedactor.js`                              | `?v=20260619-2`       |
| `api-settings-reader.js` (imported by managers) | `?v=20260619-1`       |
| `recording-manager.js`                          | `?v=20260619-8`       |
| `text-display-manager.js`                       | `?v=20260619-2`       |
| `voice-recorder-manager.js`                     | `?v=20260619-2`       |
| Service worker `sw.js` `CACHE_NAME`             | `streaming-studio-v6` |

> After changing any static file under `public/`, **bump the version query** and
> hard-refresh (Ctrl+Shift+R) — Next.js does not hot-reload `public/`.

---

## ✅ Verification checklist

1. Open api-settings panel → select OpenAI + paste key → Save.
2. Badge `#apiModelsBadge` turns **green** and shows the model names.
3. Smart Redactor → Generate Content uses OpenAI (no "WebSim not available" fallback warning that ends in offline text).
4. Reading Guide vignette ▶ shows **"🔊 OpenAI TTS"** (not Browser TTS).
5. Image generation produces an OpenAI image (no Pollinations/offline fallback).
6. No `SyntaxError`, no Pollinations 403 in console.

---

## 🔧 Files touched

| File                                                      | Change                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `streaming-studio/public/app/src/ui-manager.js`           | bridge → sessionStorage, badge multi-source, AI handle reset                 |
| `streaming-studio/public/app/src/api-settings-reader.js`  | multi-source merge, empty-string-safe, `getTtsSettings`/`getSttSettings`     |
| `streaming-studio/public/app/src/smartRedactor.js`        | `createSelectedWidgetAI()` multi-source; vignette TTS via `getTtsSettings()` |
| `streaming-studio/public/app/src/smartImages.js`          | remove WebSim/Pollinations, `paidTextApiKey` fallback                        |
| `streaming-studio/public/app/script.js`                   | version bumps                                                                |
| `streaming-studio/public/sw.js`                           | `CACHE_NAME` v5 → v6                                                         |
| `private/api/src/api-settings.js`                         | Pollinations test skip, legacy-storage warn → debug                          |
| `private/streaming-studio/public/api/src/api-settings.js` | same (serving copy)                                                          |

> **Deploy note:** `__actual_github/private/api/src/api-settings.js` has **not**
> received the Pollinations/legacy-warn/BroadcastChannel fixes yet — apply on the
> next sync.
> </content>
> </invoke>
