# Agent Workspace Note

Use `C:\Users\bedes\OneDrive\SmDeltArt_Collection\__actual_vs\topic.earth` as the active topic.earth working folder.

The previous folder `C:\Users\bedes\OneDrive\SmDeltArt_Collection\_Y__ourEarth\_actual_vs_y1` is legacy. Keep it only as a migration source until the new working folder has been verified.

The GitHub sync checkout is `C:\Git\__actual_github\topic.earth`. Sync from the active working folder into that checkout deliberately, after reviewing generated or heavy files.

Do not push to Git/GitHub/Vercel for test iterations unless the user explicitly gives a push/deploy signal. Local edits, local regeneration, and local validation are okay; commits/pushes should wait for approval to avoid noisy history.

## api-settings Bridge (2026-06-02)

**Production URL:** `https://api-caddeltai.vercel.app/api-settings.html?embed=true`

- Centralized for ALL apps (topic.earth, studio, media, portal). Not an internal api/ copy.
- Opened as a fixed right-panel iframe overlay (#apiSettingsOverlay) via the "AI Keys" button in the top-bar.

**Env-aware URL pattern (in index.html):**

```js
var isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
var API_SETTINGS_URL = isLocal
  ? "./api/api-settings.html?embed=true"
  : "https://api-caddeltai.vercel.app/api-settings.html?embed=true";
```

**postMessage bridge:** `shared/smart-ai-api-bridge.js` listens for `{type:"smart-widget", action:"settings-saved"}` and syncs to `smdeltartApiSettings` + `cadAiApiSettings`.

- `WIDGET_ALLOWED_PROD_ORIGINS` includes `https://api-caddeltai.vercel.app`
- `WIDGET_ALLOWED_VERCEL_PATTERN` matches `api-caddeltai*` and `topic-earth*` Vercel previews

**CSP:** `api-caddeltai.vercel.app/vercel.json` has `frame-ancestors` allowing `https://*.topic.earth https://*.smdeltart.com https://*.caddeltai.com https://*.vercel.app http://localhost:*`.

**localStorage read order:** `smdeltartPreferences` → `smdeltartApiSettings` → `cadAiApiSettings`

**Local dev copy:** `./api/api-settings.html` — synced from `__actual_vs/private/api/` in SmDeltArt_Collection.
