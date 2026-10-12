# Content Modification Settings

The runtime now lives in [Widgets HTML Manager](../widgets/html-manager/index.html),
so Widgets can serve it without depending on a sibling Vercel project.
The original [entry point](index.html) redirects there, preserving query parameters
and the fragment. Serve the `private` folder to use this compatibility URL locally.

## Iceoff document-page integration

[Smart Iceoff](../widgets/smart-iceoff.html) opens the panel from its **Page**
button. It sends `mode: "iceoff-document"` in the init payload. In this mode:

- Settings style the active document, including already-generated/imported content, not Iceoff's UI.
- Supported settings include document title, light/dark page appearance, colors, typography,
  page width/custom dimensions, existing header/navigation styles, section spacing, lists,
  media presentation, scrollbars, and inclusion of the generated export TOC.
- Header/navigation settings style structures already present in a document;
  they do not insert a new header/sidebar into a plain text document.
- Page sizes/custom dimensions are used by generated HTML and print/export.
  Orientation continues to follow Iceoff's existing orientation control.
- Controls without document implementations (such as widget injection and presets) remain hidden.
- Edits remain drafts until either Apply button is pressed.
- Applied settings belong to each tab's `documentSettings` and travel with local state,
  history snapshots, copied tabs and `.smartproj` files.
- Document appearance is independent of Iceoff's existing UI theme toggle.
- Generated HTML/export contains document-scoped CSS. Multi-document exports keep
  each document's styles isolated. Embedded HTML `srcdoc` pages receive their own styles.
- Reset All removes that document's formatting overrides; it does not discard content
  or rename the document back.
- Previous interface-only settings are no longer read or applied to the editor.
- JSON export includes current panel values; JSON import validates, applies and saves
  them to the document for which the panel was opened.
- Close, Escape and backdrop clicks close the panel. Bridge/load/storage errors are shown.

The host checks the exact iframe source window, origin, channel and version.
Style values are allowlisted and validated before CSS generation. Editor chrome is
never a target of the generated stylesheet. The iframe is
served from `widgets/html-manager/index.html` in both local and production Widgets
contexts. No sync or deployment is needed for local testing.

## Embed

Serve the Widgets folder over HTTP(S) and embed `html-manager/index.html` in an iframe.
Send an init message from the parent to establish an origin-checked handshake.
To pin a known parent in advance, add a URL parameter named parentOrigin, URL-encoded
(for example, ?parentOrigin=http%3A%2F%2Flocalhost%3A3000).
The bridge works with localhost and cross-domain deployments. Do not use wildcard target origins.

```html
<iframe id="contentSettings" src="https://panel.example/html-manager/index.html?parentOrigin=http%3A%2F%2Flocalhost%3A3000" title="Content settings"></iframe>
```

```js
const frame = document.querySelector("#contentSettings");
const channel = "content-modification-settings";
window.addEventListener("message", (event) => {
  if (event.source !== frame.contentWindow || event.origin !== "https://panel.example") return;
  const message = event.data;
  if (message?.channel !== channel || message.version !== 1) return;
  if (["ready", "change", "state"].includes(message.type)) console.log(message.payload.settings);
});
frame.addEventListener("load", () => frame.contentWindow.postMessage({
  channel, version: 1, type: "init", payload: { settings: { fields: {}, activeTab: "theme" } }
}, "https://panel.example"));
```

## Message API

- Parent to panel: init with optional payload.settings ({ fields, activeTab }), set-settings, show, and hide.
- Panel to parent: ready, change (complete field state), state, action (button id/label and current settings), file-selected (metadata only), and close.
- Messages use { channel: "content-modification-settings", version: 1, type, payload }.
- App-specific apply/import/reset/export actions are reported to the host; the embedding app owns persistence and document updates.
