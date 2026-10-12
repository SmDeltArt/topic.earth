# Document colours and gradients

Open the admin Topic Story editor → 🎨 Content layout and theme. **Document background** and **Document panels** open the locally hosted Smart Color Picker.

Choose a solid colour, transparency, or a linear/radial gradient. **Use this colour** confirms the picker choice in the settings draft; **Apply to HTML only** commits the settings to the story draft. Cancel does not change the story. **Keep original styling** removes that paint override.

Original HTML/CSS is retained. Validated background/panel overrides and structured gradient stops are stored in `topicStory.contentSettings`; CSS is included in the HTML so it follows save and topic exports. Subsequent AI text updates preserve it. The palette defaults still come from World, Regional, Space or Fever. These controls do not recolour the app interface.

The picker is copied locally from [SmDeltArt/color](https://github.com/SmDeltArt/color), with its own GitHub credit/link. Its UI receives topic.earth's surface colours. No AI request or remote colour-picker domain is needed. Future upstream versions can be copied after checking the integration; this is a pinned local copy, not an automatic live update.

The picker assets are added to the PWA cache. This makes the picker available offline after the updated service worker installs; the rest of the app retains its existing offline limitations.

## Compact document styling (12 October 2026)

Open **🎨 beside the story type** (Carte narrative in French). These controls only style the story HTML. The app and map retain their own theme.

- Click the miniature background, panel, title, text or link to choose that paint. The supplied document appears below in a script-free iframe; desktop/mobile buttons change its preview width.
- The local Smart Color Picker stays in a small overlay. Changes appear immediately in the sample, swatch and document. **Use this colour** confirms the choice; Cancel restores it. Text and links accept solid colours; backgrounds, panels and headings also accept gradients.
- Change text size, margins, line spacing, width and paragraph indentation without AI. List markers and h2/h3 numbering use reversible CSS. Supplied text, links, media and original styles remain in the HTML. An author can exclude a heading using `class="no-numbering"`; existing handwritten numbers remain, so leave automatic numbering off for already numbered documents.
- Four palette buttons offer World, Regional, Space and Fever document defaults. 💾 saves one manual preset per palette on this browser/device; ↺ loads it. Presets do not change the app theme or apply silently to other documents.
- **Apply to HTML only** saves the document settings and CSS into the draft. Closing the formatting popup leaves the draft unchanged. Saving a preset is a separate explicit local action.

New topics inherit the current app tab and the most recently used active layer in that tab. If that layer is inactive or belongs to another tab, the composer uses another active layer in the current tab. The chosen layer is expanded and scrolled into view. Regional drafts also receive the selected place. A draft's initial palette remains fixed when browsing another app tab. Layer choices in a new draft are limited to its current tab; existing topics keep their editable category options.

Forge's preview concept was adapted from `src/modifySettings` and its host styling engine. The whole Forge application, AI CSS completion and its unchecked message bridge were not imported. Manual formatting needs no AI call.
