# Read Message Audio Workflow

topic.earth keeps read-message copy in `assets/audio/read-messages/manifest.json` and generated UI text in `shared/topic-earth-ui.csv`.

## Track New English Messages

Run the monitor after changing tutorial text, UI CSV keys, Fever copy, or read-message batches:

```powershell
tools\monitor-read-messages.ps1
```

For a CI-style check that fails when new English messages appear after the last baseline:

```powershell
tools\monitor-read-messages.ps1 -NoWrite -FailOnNewEnglish
```

Bash equivalent:

```bash
tools/monitor-read-messages.sh --no-write --fail-on-new-en
```

The monitor writes:

- `shared/read-message-tracking.csv`: reviewable tracking table for CSV/audio status.
- `assets/audio/read-messages/tracking.json`: machine-readable baseline used to detect newly added English messages.

Important columns:

- `id`: stable audio/message id.
- `lg`: primary language.
- `csvKeys`: source CSV keys used to resolve the text.
- `missingCsvKeys`: keys referenced by the manifest but missing from the CSV.
- `newSinceLastRun`: `true` when a message id was not present in the previous tracking JSON.
- `mp3Exists` / `webmExists`: local audio cache status.

## Generate Or Preview Audio

Preview the batch without spending API credits:

```powershell
tools\record-read-audio.ps1 -DryRun
```

Generate only English:

```powershell
tools\record-read-audio.ps1 -Lg en
```

Generate selected ids:

```powershell
tools\record-read-audio.ps1 -Ids "ui-text-common-save-en,tutorial-step-globe-intro-en"
```

## Remove Local MP3 Cache

The app can keep smaller `.webm` files and regenerate `.mp3` when needed. To preview cleanup:

```powershell
tools\clean-read-audio-mp3.ps1
```

To delete MP3 files:

```powershell
tools\clean-read-audio-mp3.ps1 -Apply
```

Use `-AudioRoot` when cleaning another local working copy:

```powershell
tools\clean-read-audio-mp3.ps1 -AudioRoot "C:\path\to\assets\audio\read-messages" -Apply
```

## Hosting Note

Keep generated audio out of normal Git history where possible. GitHub is fine for code and small assets, but read-message audio grows quickly and should move to object storage or a media CDN when it becomes part of production delivery.
