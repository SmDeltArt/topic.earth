# topic.earth Translation Coverage Audit

Date: 2026-04-20

## Purpose

This note tracks the current translation state after the `topic.earth` rename and the first Fever-loop translation pass. The goal is not only to translate labels, but to make the app easier to maintain: every stable UI phrase should live behind a key in `lib/translations.js`, while dynamic topic/research text should keep its original source language unless a read/translate action is requested.

## What Is Wired Now

- App shell: brand, top navigation, view buttons, admin/user state, settings button, and source-search button now read from the UI translation catalog.
- Layer panel: panel title, browser-topic delete tooltip, research tooltip, admin layer/topic buttons, and Fever year HUD labels now read from the catalog.
- Settings panel: language tips, globe settings, Fever-loop resolution, linked API settings, linked model summary, and admin ZIP package text now use catalog keys.
- Fever monitoring panel: main monitor label, controls, scenario/speed labels, pause notice, chart labels, monitoring tabs, and the main explanatory tabs now use catalog keys.
- Fever debug bar: runtime labels, inspector tabs, current-state labels, tipping diagnostics, active-warning empty state, and action logs now use catalog keys.
- The catalog extension currently gives complete English fallback and a complete French pass for the new keys.

## Important Boundaries

- Dynamic topic content is not automatically rewritten into every UI language. Topic titles, summaries, sources, media watermarks, and AI research drafts stay as user/source content.
- Read-aloud and Translate + Read can still use the existing `ReadTranslationService` and TTS bridge for dynamic text.
- Data names from `data/*.js`, climate scenario data, source names, and uploaded media captions should be translated only when we intentionally decide whether they are stable UI or authored content.

## Remaining Gaps

- `components/SettingsPanel.js` is an older standalone settings component. If it is still reachable, it should either be removed or brought in line with `DetailPanel.renderSettings()`.
- `components/DetailPanel.js` still contains many research/source-management/create-topic strings outside the Fever panel. These should be grouped into `topic.*`, `research.*`, `media.*`, and `update.*` keys.
- `lib/globe.js` contains planet/space descriptions and technical logs. User-facing descriptions need a data/content translation strategy; console logs do not need translation.
- Non-Latin catalogs in the existing translation file should be checked in-browser because some terminal views show mojibake even when the browser may render UTF-8 correctly.
- Dutch, German, Spanish, Russian, Hindi, Arabic, and Chinese still mostly rely on English fallback for the newest Fever/settings keys.

## Recommended Next Move

1. Finish the topic/research/update-source panel keys next, because that is where creators spend the most time.
2. Decide whether data-driven climate descriptions are curated content or UI labels.
3. Add a tiny dev-only missing-key scanner so new hardcoded UI text does not silently grow again.
4. Extend the new `topic.earth` keys to Dutch, German, Spanish, Russian, Hindi, Arabic, and Chinese only after the English/French key structure stabilizes.
