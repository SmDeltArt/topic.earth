# API Settings Widget Deployment

Status: current reference
Updated: 2026-05-06

This document is the canonical reference for the current api-settings widget architecture, embedding contract, and protected deployment surface.

## 1. Current deployment model

The active production model is:

- `__actual_vs/private/widgets/api-settings.html` is the development source.
- `__actual_github/widgets/api-settings.html` is the public deploy surface for `widgets.smdeltart.com`.
- `__actual_github/private/widgets/api-settings.html` is the clean private staging copy.
- The canonical public URL is `https://api.smdeltart.com/api-settings.html`.
- Vercel path alias should also support `https://widgets.smdeltart.com/api-settings`.

The widgets host is a single project with path routing, not one separate project per widget.

## 2. Same-origin and cross-origin behavior

There are two different integration modes and they must not be mixed up.

### 2.1 Same-origin widgets on `widgets.smdeltart.com`

Examples:

- `https://widgets.smdeltart.com/api-settings`
- `https://widgets.smdeltart.com/clipboard`

These pages share origin and can use the same `localStorage` keys directly.

Primary keys:

- `smdeltartPreferences`
- `smdeltartApiSettings`
- `smdeltartApiVault`
- legacy compatibility keys such as `cadAiApiSettings` may still exist during migration

### 2.2 Cross-subdomain callers

Examples:

- `https://smdeltart.com`
- `https://studio.smdeltart.com`
- `https://media.smdeltart.com`

These do not share origin with `widgets.smdeltart.com`, so they do not share `localStorage`.

Current integration rule:

- embed `api-settings.html` in an `iframe`
- use `?embed=true`
- communicate through `postMessage`
- close or return to the caller through parent message handlers

Current close/back contract:

- child sends `smart-widget` messages
- actions: `api-settings-back`, `api-settings-close`, `api-settings-saved`, `api-settings-ready`
- parent overlay closes on `api-settings-back` or `api-settings-close`

## 3. Current clipboard integration pattern

`clipboard-manager.html` now uses a full-frame overlay inside the widget frame.

Key points:

- the API settings panel is not a side drawer anymore
- the panel fills the widget frame cleanly
- the terminal was removed from clipboard embed mode
- the header `🗝️` button toggles only through `api-bridge-handler.js`
- back and close buttons inside `api-settings.html` are visible in embed mode and return to the caller

## 4. Protected deploy surface

The api-settings deploy surface should stay minimal.

Required files in deploy copies:

- `api-settings.html`
- `src/api-settings.js`
- `shared/smart-app-binding.js`
- `shared/smart-favicon.js`
- `shared/smart-nav-manager.js`
- `shared/smart-spa-base.css`

Do not treat unrelated widget files as part of api-settings deployment unless they are explicitly needed.

## 5. Domain and CDN guard layer

The current protection model is implemented in both HTML and JS.

### 5.1 Domain guard

`SMART_DOMAIN_GUARD_CONFIG` allows only approved hosts such as:

- `widgets.smdeltart.com`
- `smdeltart.com`
- localhost development hosts
- approved Vercel preview hosts when enabled

If the page is opened on an unauthorized host, it should block UI use and point the user to the official URL.

### 5.2 CDN policy

`SMART_CDN_POLICY` currently whitelists `cdn.jsdelivr.net` for allowed external script hosts.

Important distinction:

- jsDelivr may be allowed for external script assets
- jsDelivr should not be the primary host for direct HTML iframe pages
- official widget pages should stay on `widgets.smdeltart.com`

## 6. Embed contract for apps

Recommended embed URL:

```html
<iframe
  src="https://api.smdeltart.com/api-settings.html?embed=true"
></iframe>
```

For local development inside the widgets repo, a local relative source is acceptable:

```html
<iframe src="/api/api-settings.html?embed=true"></iframe>
```

Embed expectations:

- no extra double framing around the inner widget
- parent owns overlay shell if needed
- child owns its own back/close buttons in header
- parent listens for `smart-widget` postMessage events

## 7. Document status of older files

These files still contain useful background, but they are not the first source to follow anymore:

- `ARCHITECTURE.md` contains both correct single-project guidance and stale per-widget-project guidance
- `API_BRIDGE_GUIDE.md` still overemphasizes direct shared storage patterns for cross-origin apps
- `AUDIT.md` remains a strong reference for iframe and subdomain reasoning

Use this file first when implementing or reviewing api-settings deployment.

## 8. Immediate maintenance rules

- Keep `widgets.smdeltart.com` as the canonical public host for api-settings.
- Keep `api-settings.html` and `src/api-settings.js` guarded in both source and deploy copies.
- Keep embed mode controls visible and parent-aware.
- Keep deploy copies minimal.
- Prefer updating this document when architecture changes, then archive older guidance with pointers here.
