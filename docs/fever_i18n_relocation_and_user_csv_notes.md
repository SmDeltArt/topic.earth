# Fever Content Relocation And CSV Correction Notes

This is a planning note for moving Fever-specific runtime content into the `SmDeltArt/fever` package without breaking current topic.earth paths.

Read-message playback should prefer Fever-hosted URLs:

```text
https://raw.githubusercontent.com/SmDeltArt/fever/main/assets/audio/read-messages/manifest.json
https://raw.githubusercontent.com/SmDeltArt/fever/main/shared/topic-earth-ui.csv
https://cdn.jsdelivr.net/gh/SmDeltArt/fever@main/assets/audio/read-messages/
```

Topic.earth keeps local copies only as recording/development fallbacks.

## Current Anchors

- Fever scenario data: `fever-scenarios.json`
- Fever topic content: `data/fever-topics.js`
- Fever translations and UI labels: `shared/topic-earth-ui.csv` mirrored in the Fever repo
- Fever narration manifest: `lib/fever-audio-manifest.mjs`
- Recorded/read audio generation: `tools/generate-read-audio.mjs`
- Runtime translation loader: `lib/read-translation.js`

## Target Shape

Suggested future layout:

```text
smdeltart/fever/
  data/
    fever-scenarios.json
    fever-topics.js
  i18n/
    topic-earth-ui.csv
    en/
    fr/
    nl/
    de/
  audio/
    manifest/
    recorded/
  tutorial/
    fever/
  model/
    textures/
    overlays/
```

All application imports, CSV loader URLs, texture references, ZIP export paths, and audio generation defaults must be updated together in one migration. Until then, keep the source files in their current locations.

## User CSV Correction Idea

Expose a safe translation-correction workflow through the existing widget bridge:

- Open `https://widgets.smdeltart.com/smart-iceoff.html` from the app.
- Load the current `shared/topic-earth-ui.csv`.
- Let users suggest corrections for their speaking language.
- Save user-submitted CSV edits as a review artifact, not directly into the production CSV.
- Keep the canonical project CSV in topic.earth until admin review accepts changes.
- Back up accepted Fever-specific translations into the future `smdeltart/fever/i18n/` folder.

The bridge should write correction packages with source language, target language, changed keys, old value, proposed value, user note, and timestamp.

## Migration Rule

Do not move Fever files one-by-one. Move them only with a path audit that updates:

- JavaScript imports
- JSON fetch URLs
- CSV loader paths
- audio generation script defaults
- docs references
- service/manifest references
- Cloudinary or local asset fallback maps
