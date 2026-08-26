# Tutorial Recording Issue

Status: draft workflow for the smart coding tutorial video.

## Problem

Tutorial recording should be stable, repeatable, and cheap to rehearse.

The risk is that every test of `Read`, `Translate + Read`, or tutorial narration can trigger live TTS again. That makes the recording loop expensive and inconsistent: timing, voice, network latency, and provider errors can change between takes.

## Goal

Use a local-first recording loop:

```text
Tutorial message
  -> check cached .webm or .mp3
  -> play cached audio when present
  -> use browser TTS for local preview
  -> generate OpenAI tts-1-hd audio only once when the message is stable
  -> convert with ffmpeg
  -> commit the reusable audio asset
```

## Current Local Setup

- Runtime audio manifest: `https://raw.githubusercontent.com/SmDeltArt/fever/main/assets/audio/read-messages/manifest.json`
- Runtime translation source: `https://raw.githubusercontent.com/SmDeltArt/fever/main/shared/topic-earth-ui.csv`
- Runtime audio files: `https://cdn.jsdelivr.net/gh/SmDeltArt/fever@main/assets/audio/read-messages/`
- Local fallback/recording manifest: `assets/audio/read-messages/manifest.json`
- Local fallback/recording translation source: `shared/topic-earth-ui.csv`
- Audio cache docs: `assets/audio/README.md`
- Generator: `tools/generate-read-audio.mjs`
- Command: `npm run audio:read-cache`
- ffmpeg path: `C:\ffmpeg\bin\ffmpeg.exe`
- Default voice model: `tts-1-hd`
- App fallback order: cached repo audio -> browser TTS -> linked AI voice only when enabled and not forced local.

The selected text `Read` and `Translate + Read` panel now shows small status badges such as:

- `LOCAL FIRST`
- `BROWSER TTS`
- `CACHED AUDIO`
- `LOCAL ORIGINAL`
- `LOCAL TEST OK`
- `VOICE ERROR`

These badges make it visible during recording whether the app is using cache/local audio or trying a live provider.

## Recording Rules

1. Rehearse with browser/local voice first.
2. Keep tutorial message text short and stable before generating paid audio.
3. Generate `.mp3` and `.webm` only for messages that will appear in the video.
4. Prefer cached `.webm` for browser playback when available.
5. Do not regenerate audio unless the text, language, or voice changes.
6. Keep transcript text and audio message text identical, so highlighting and recording stay synchronized.
7. For stable UI/tutorial narration, link manifest messages to CSV keys with `csvKeys` and `lg` instead of copying each language by hand.

## Local Test Commands

Preview what would be generated without spending credits:

```powershell
npm run audio:read-cache -- --dry-run
```

Generate one stable message:

```powershell
$env:OPENAI_API_KEY = "sk-..."
npm run audio:read-cache -- --ids=tutorial-explore-earth-en
```

Generate all manifest messages:

```powershell
$env:OPENAI_API_KEY = "sk-..."
npm run audio:read-cache
```

Generate one language batch:

```powershell
npm run audio:read-cache -- --dry-run --lg=fr
$env:OPENAI_API_KEY = "sk-..."
npm run audio:read-cache -- --lg=fr
```

Regenerate after changing text or voice:

```powershell
$env:OPENAI_API_KEY = "sk-..."
npm run audio:read-cache -- --ids=tutorial-explore-earth-en --force
```

## Acceptance Checklist

Before recording:

- `http://127.0.0.1:8123/` loads without console errors.
- Fever-hosted `assets/audio/read-messages/manifest.json` serves first.
- CSV-linked messages resolve from Fever-hosted `shared/topic-earth-ui.csv` for the selected `lg`, with local fallback during recording/dev.
- Needed `.mp3` and `.webm` files exist for the video messages.
- The read panel shows `CACHED AUDIO` or `BROWSER TTS`, not unexpected paid provider status.
- Transcript text matches the spoken message.
- `Read` stops cleanly when the tutorial bubble closes or the user clicks `Stop`.

Before publishing:

- No API keys are committed.
- Generated audio files are intentional and small enough for the repo.
- The manifest lists only useful reusable tutorial/read messages.
- Public docs explain that cached audio avoids repeated paid TTS calls.

## Useful Starter Messages

The first manifest includes:

- Explore Earth.
- Local read test.
- Translate and Read local-first.
- API settings safety.
- Topic composer flow.
- French versions for the first local read/translation tests.

Add more messages only when they are stable enough to reuse across tutorial takes.
Prefer linking tutorial copy to CSV rows such as `tutorial.globe.title` and `tutorial.globe.body`, then set `lg` to the target language column (`en`, `fr`, `nl`, etc.).

## Open Questions

- Should the tutorial video use one consistent voice for all messages, or different voices for English and French?
- Should public demo builds include generated audio, or should audio stay local/tutorial-only until the onboarding flow is final?
- Should the tutorial bubble expose a small `Cached` indicator only in dev mode, or also in public mode for transparency?
