# topic.earth UI Translation CSV Workflow

## Goal

Move UI translation work out of `lib/translations.js` and into a spreadsheet-friendly CSV that Smart-IceOff, AI translation, and later user contributors can manage.

## Source of Truth

Editable catalog:

```text
shared/topic-earth-ui.csv
```

Format:

```csv
key,en,fr,nl,de,es,ar,zh,hi,ja,ru,uk
common.settings,Settings,Paramètres,,,,,,,,,
```

Rules:

- `key` stays stable and is what code can call with `LanguageManager.getLabel(key, lang)`.
- `en` is the canonical English source.
- Empty language cells fall back to `en`.
- `auto.*` keys are generated from scanned app text and can be renamed later when they become stable UI copy.
- Placeholders such as `{count}`, `{name}`, `{year}`, and `{value}` must stay in every translated cell.

## Runtime

`lib/translations.js` now parses CSV and exposes a synchronous catalog to the app. `LanguageManager.loadTranslationCatalog()` fetches the CSV before the UI renders, then `LanguageManager.getLabel()` continues to work as before.

There is also a DOM translation pass for hardcoded UI text that has not yet been refactored to `getLabel()`. It uses the English text in the CSV as a lookup and translates matching text nodes, titles, placeholders, and aria labels after panels render.

## Regenerating the CSV

Run:

```powershell
node tools\generate-ui-translations.mjs
```

The extractor keeps existing curated keys and adds scanned visible-text candidates from:

- `index.html`
- `app.main.js`
- `components/*.js`
- selected `lib/*.js`
- selected `data/*.js`

After regeneration, review `auto.*` rows before asking AI or users to translate them.

## Contributor Flow

1. Export or sync `shared/topic-earth-ui.csv` to a sheet-like editor.
2. Lock `key` and `en` columns.
3. Let AI prefill `fr` or other language columns.
4. Let trusted users review only their language column.
5. Import the CSV back unchanged in shape.
6. Run the app; blank cells safely fall back to English.
