# Studio and topic.earth colour-picker integration — 15 October 2026

Studio was inspected read-only on GitHub at commit 5b99594316f116a0d68bd04d45f88b4c3dc19437. The user's local Codex version was unavailable. No Studio files were changed.

## Studio settings

Bridge: `studio/public/app/src/color-picker-bridge.js` in SmDeltArt/private.
CSS: `studio/public/app/css/camera-overlay.css`.

- Appends a section directly to body, with one iframe: fixed, inset 0, 100vw × 100dvh, transparent background, no border/shadow, z-index 16000. The iframe fills the section and has a transparent background.
- URL is always `smart-color-picker.html?embed=overlay`. Candidates: color-picker.caddeltai.com, color-picker.smdeltart.com, color-iota-five.vercel.app and smdeltart.github.io/color. Window overrides are supported. These are source-configured candidates, not independently verified hosts; branded/Vercel aliases are not independent infrastructure.
- Iframe has clipboard-write and credentialless for Studio's cross-origin isolation. No host modal dialog.
- On load sends scp:open with host theme, palette, appearance and triggering-control anchor, then scp:set and scp:setGradient. The picker owns viewport positioning/expansion. Host ignores scp:size. Overlay picker drags internally; bridge also retains legacy drag handlers.
- Messages are checked against BOTH the selected origin and iframe.contentWindow. Load readiness timeout is 3.5 seconds before trying the next URL. scp:color previews, scp:validate confirms, scp:close hides the section.

## topic.earth

Uses a pinned same-origin picker, not Studio's remote URL. It lives inside a full-screen modal dialog because the story settings can already be modal. Dialog, backdrop and iframe must all remain transparent.

The prior 83a6680 commit accidentally truncated styles.css, removing the host transparency rules and other trailing application CSS. This update restores the full stylesheet from its parent and retains the native Basic colour fallback. File hashes are checked before committing. This repairs a concrete missing-style cause; browser visual verification is reported separately.

## Weather and icon

Globe Settings adds Live weather at the clicked globe point. Interaction mode globe clicks retain country/location details and offer a separate weather button. Hover labels never fetch weather. The weather request uses only clicked coordinates, a 15-minute bounded in-memory cache, cancellation and timeout. No sample is substituted for a failed point request.

Existing meteo topics gain condition icons/stickers and model-signal badges: green conditions, blue watch, yellow notable, orange elevated, red high. These are application conventions, not official warning levels. Data time and model/offline status are included in globe tooltips. Weather-code mapping follows Open-Meteo's WMO table. Cyclones remain separate; this does not identify live tornadoes or create tornado names.

The provided Cloudinary PNG was downloaded and resized to a local RGBA 192×192 PNG without flattening. Its manifest entry uses purpose any, with a fresh cache version. Launchers can still impose their own background; the separate 512 maskable icon is retained.
