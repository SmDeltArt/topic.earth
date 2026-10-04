# Agent Workspace Note

Use `C:\Git\__actual_github\topic.earth` as the authoritative topic.earth working folder. BenDes explicitly selected this checkout, including reviewed local commit `e8bc315`, as the source of truth on 2026-10-04. This topic.earth-specific decision overrides the default OneDrive development-root policy; other projects are unchanged.

The OneDrive folder `C:\Users\bedes\OneDrive\SmDeltArt_Collection\__actual_vs\topic.earth` is retired as a working source. A SHA-256-verified archive copy of all 453 files, including its original Git metadata, is at `C:\Git\_archive\topic.earth-onedrive-20261004`. Windows denied moving the original, so it still exists; do not edit it, sync from it, or delete it automatically. The earlier `_Y__ourEarth\_actual_vs_y1` folder also remains a legacy migration source, not an active workspace.

Edit and validate directly in the authoritative checkout. Do not overwrite it from OneDrive or an archive. Before any explicitly requested import or sync, list files over 5 MB or matching `build/`, `dist/`, `*.map`, `*.log`, or `node_modules/`. Exclude them by default and show the excluded list; include them only with explicit confirmation. Archives are not runtime deployment content.

Codex should read the local `AGENTS.override.md` when present. It is excluded through `.git/info/exclude`, not committed or deployed. The separately prepared `C:\Git\__local_git\topic.earth` metadata belongs to the abandoned OneDrive repair attempt; it is not the active repository.

Do not push to Git/GitHub/Vercel for test iterations unless the user explicitly gives a push/deploy signal. Local edits, local regeneration, and local validation are okay; commits/pushes should wait for approval to avoid noisy history.

## api-settings Bridge (2026-06-02)

**Production URL:** `https://api-caddeltai.vercel.app/api-settings.html?embed=true`

- Centralized for ALL apps (topic.earth, studio, media, portal). Not an internal api/ copy.
- Opened as a fixed right-panel iframe overlay (#apiSettingsOverlay) via the "AI Keys" button in the top-bar.

**Main Settings panel (checked 2026-10-04):** `components/DetailPanel.js` opens `./ollama-install-guide.html` for User mode and offline Admin mode, or `https://api.caddeltai.com/api-settings` for online Admin mode. It adds `embed=true`, `source=topic-earth`, `portable=true`, and `host=topic-earth` to the iframe URL. Selecting a mode does not launch the iframe. The top-bar bridge below is separate.

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
Treat local API Settings integration copies as read-only. Change API Settings behavior in the canonical `__actual_vs/private/api/` product (or its production repository), then import it only with explicit authorization; never edit the generated local copy directly.

## Translation and desktop controls (2026-10-04)

- Continue editing in this checkout; the latest user instruction explicitly authorized `C:/Git` after OneDrive rejected writes. Run the local preview here on port 5501. VS Code provides the `topic.earth: local preview` task.
- Selected text offers Translate, Translate + Read, and browser Read. The Select text control enables paragraph selection on touch screens. UI language and translation/read language remain separate.
- Read & Translate popup saves selected excerpts locally as `readingSelections` in topic JSON; exports and Admin ZIP imports retain these records. Excerpts do not replace complete translated topic fields. MP3 download is offered only with supported linked speech settings enabled; reuse generated audio when available. Browser speech cannot export MP3.
- Translation checks local UI copy/browser translation, then a configured linked text provider (including Ollama), then the MyMemory free fallback for explicit selection/topic translation. Free API requests send selected prose to MyMemory; no API key is required. Automatic Fever translation does not invoke the free service.
- Topic language records use exact source revision matching. Check packaged records/explicit `translationFiles` references, then browser cache. Refresh translation after source text changes. ZIP exports carry language records named `topic-slug-en-v001.json`, `topic-slug-fr-v001.json`, etc. Import/export does not publish topics or send them to admins.
- Admin ZIP upload runs free local content checks and displays a file report before a separate import action. Reject unknown executable/code/archive types, active HTML/unsafe URLs, malformed JSON and mismatched media signatures; limit text files to 2 MB and media to 20 MB within the 40 MB ZIP/expanded total. The legacy `data/custom-topics.js` export is explicitly ignored. This is not an antivirus verdict; remote URLs and factual accuracy remain unverified. Imported main-page prose keeps only passive formatting without attributes.
- Fever 2/3 narrates the message; 1/3 includes metrics; speed 1 stays silent automatically. Desktop Drag mode swaps left/right rotate/pan controls, while stationary left clicks still open topics.
