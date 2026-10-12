# Embedded content: mobile reading, AI review and styling

12 October 2026 · topic.earth admin story editor.

## Reading

Each embedded presentation has a **Full view** button on desktop and mobile. On narrow screens (up to 620px), only the Full view entry is shown; inline previews are hidden to save space. Any programmatic badge-open action also uses the full-view reader. A fixed close/back overlay remains outside the sandboxed iframe. Escape closes it; mobile browser Back closes the viewer through a separate history entry. The originating panel and draft remain in place.

The reader uses compact margins, readable text and bounded headings on small screens. All these document rules run inside the embedded content. They do not change the app's World, Regional, Space or Fever interface.

## Authoring

The **+ 🧭** button between story title and type reveals an optional AI direction field for audience, language, emphasis and intended changes. Hide it to disable its instructions without deleting the text. Four emoji theme choices use the existing World, Regional, Space and Fever palettes; the current layer/mode supplies the default. Theme selection affects the content only.

**🎨 Content layout and theme** opens local document controls: text size, margins, line spacing, maximum width, appearance and mobile reading. Apply changes to the supplied HTML; retain the original CSS and append a validated override stylesheet. Settings, direction and theme are stored in `topicStory`, and the CSS travels inside its HTML through topic save/export/import.

## AI sequence

1. **AI review** sends the current topic, evidence references, active direction, palette, reading preferences and existing editable text blocks to the configured AI route. It returns a plain-text summary, plan and warnings. No HTML changes yet.
2. Read the review, then choose **Generate reviewed content**. Its request includes the reviewed plan and active direction.
3. Any draft change requires another review. Results arriving after a draft change are discarded. No automatic second model request is made.

For a new card, the model returns structured JSON and the app renders a trusted HTML template. For supplied HTML, the model returns plain-text replacements for indexed leaf text blocks. The app preserves CSS, attributes, media, links and layout; AI cannot replace them. This intentionally does not redesign existing HTML or add new sections. Use manual editing or a new card when a structural redesign is intended. AI edits remain drafts until normal review/save.

The review is a model suggestion, not factual verification. It uses the existing configured AI provider; this feature does not provision a free model or credentials. Scripts remain blocked in preview and full view.

## Doc Forge package boundary

The supplied `content-modification-settings.zip` contains only `index.html` (a redirect to `../widgets/html-manager/index.html`) and a README. The runtime is absent. The linked GitHub runtime path was unavailable through the connected account. See [the supplied integration reference](content-settings-reference.md).

The local content controls above are implemented independently, with no dependency on a separate SmΔrt or SPRL hosting service. They are not advertised as the complete Doc Forge HTML Manager. To integrate that panel, provide the complete `widgets/html-manager/` runtime and dependencies, or its confirmed deployed URL and full field contract. The host must verify iframe source, exact origin, channel and version, validate field values, and apply only document-scoped CSS. Do not inject imported panel CSS into the topic.earth app.

## Validation

Focused checks exercise stylesheet preservation, safe text replacement, settings validation, review gating, concurrent draft changes, four palettes, saved fields and full-view history/close. DOM checks use the development-only `linkedom` package; it is not an app dependency:

```sh
npm install --prefix /tmp/topic-story-dom-tests --no-save --ignore-scripts linkedom@0.18.12
node tools/check-topic-story-controls.mjs /tmp/topic-story-dom-tests/node_modules/linkedom
```

Real mobile device rendering and provider-specific AI responses still need user testing. The available cloud browser cannot initialise this app's WebGL scene; static presentations and source responses can be inspected separately.
