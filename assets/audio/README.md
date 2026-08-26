# topic.earth Audio Cache

This folder stores generated read/transcript audio for local tutorials and stable UI messages during recording work.

Runtime playback now prefers the Fever static audio repository:

```text
https://raw.githubusercontent.com/SmDeltArt/fever/main/assets/audio/read-messages/manifest.json
https://raw.githubusercontent.com/SmDeltArt/fever/main/shared/topic-earth-ui.csv
https://cdn.jsdelivr.net/gh/SmDeltArt/fever@main/assets/audio/read-messages/
```

The local `read-messages/manifest.json` and `.webm` files are fallback/working copies only. Stable UI/tutorial messages can point to `shared/topic-earth-ui.csv` with `csvKeys` plus `lg`, so English/French/etc. text stays linked to the same translation table. Generated `.mp3` and `.webm` files are intentionally reusable so recording a tutorial does not call paid TTS repeatedly.

```powershell
$env:OPENAI_API_KEY = "sk-..."
npm run audio:read-cache
```

Batch by language column:

```powershell
npm run audio:read-cache -- --dry-run --lg=en,fr
$env:OPENAI_API_KEY = "sk-..."
npm run audio:read-cache -- --lg=fr
```

VS Code terminal helper:

```powershell
npm run audio:record -- -DryRun -Lg en,fr
$env:OPENAI_API_KEY = "sk-..."
npm run audio:record -- -Lg fr
```

Batch exact messages:

```powershell
npm run audio:read-cache -- --dry-run --ids=tutorial-explore-earth-en,tutorial-explore-earth-fr
```

Batch by tag, for example the Shimmer Fever loop narration:

```powershell
npm run audio:record -- --dry-run --tag=fever-loop
npm run audio:record -- --tag=fever-loop
```

The Fever loop batch is generated from `fever-scenarios.json` as separate cached clips by scenario, milestone year, language, and speed profile:

```text
fever-loop-objective-2025-short-fr
fever-loop-objective-2025-normal-fr
fever-loop-objective-2025-full-fr
```

Tutorial bubbles are also generated message by message from their CSV title/body keys:

```powershell
npm run audio:record -- --dry-run --tag=tutorial-step --lg=fr
npm run audio:record -- --tag=tutorial-step --lg=en
```

Stable UI text has its own curated English/French batch:

```powershell
npm run audio:record -- --dry-run --tag=ui-text
npm run audio:record -- --tag=ui-text --lg=fr
npm run audio:record -- --tag=ui-text --lg=en
```

To fill or improve CSV text before recording audio, use the text-only CSV helper. It dry-runs by default and only writes when `--write` is passed:

```powershell
npm run csv:copy -- --tag=ui-text --langs=fr --limit=10
$env:OPENAI_API_KEY = "sk-..."
npm run csv:copy -- --tag=ui-text --langs=fr --write
```

Use `--force` only when you intentionally want to overwrite existing cells.

The generator uses OpenAI `tts-1-hd` by default and converts `.mp3` to `.webm` with `C:\ffmpeg\bin\ffmpeg.exe` when available.

Example manifest link:

```json
{
  "id": "tutorial-explore-earth-fr",
  "lang": "fr-FR",
  "lg": "fr",
  "csvKeys": ["tutorial.globe.title", "tutorial.globe.body"]
}
```
