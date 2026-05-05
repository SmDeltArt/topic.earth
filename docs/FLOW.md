# Flow Analysis

This note condenses the current `docs/*.md` planning direction into one public project flow.

## Current Product Shape

`topic.earth` has two connected experiences:

1. The public globe experience for exploring Earth, climate layers, Fever milestones, Tipping Points, AMOC Watch, and regional topics.
2. The contribution/admin experience for creating, researching, reviewing, packaging, and eventually publishing topics.

The strongest direction across the docs is to avoid adding more separate AI or admin panels. The app should feel like one workflow with optional expert controls.

## Recommended User Flow

```text
Explore
  -> Find or propose a topic
  -> Describe what happened
  -> Add evidence
  -> Review what will be saved
  -> Save on this device
  -> Export or submit for admin review
```

User-facing labels should stay plain:

- Save on this device
- Review update
- Download for admin review
- Published

Avoid ambiguous labels such as `Add Topic`, `Post to Topic`, or `AI Gen and Update` when the action is really draft review or local save.

## Recommended Admin Flow

```text
Topic Draft
  -> Sources
  -> Media
  -> AI Assist
  -> Review
  -> Save / Export / Submit / Publish
```

AI should return suggestions or patches into the same draft. The human should see and apply the change. This keeps the product trustworthy and prevents silent mutation of topic data.

## Data Flow

The docs point toward these source-of-truth layers:

- `fever-scenarios.json` for Fever years, scenario values, warnings, AMOC values, tipping risk, and texture paths.
- `data/*.js` for current topic/layer datasets.
- `shared/topic-earth-ui.csv` for UI translation text.
- Future `TopicDraft` JSON packages for user/admin submissions.

## Asset Flow

Assets now live under `assets/`:

```text
assets/models/            GLB overlays and model scenes
assets/textures/main/     Main Earth material textures
assets/textures/fever/    Fever milestone textures
```

Main mode can use 1k, 4k, or 8k textures. Fever mode should stay on 1k or 4k only.

## Next Implementation Order

1. Keep asset paths and texture naming stable.
2. Keep Fever scenario values and texture references in JSON.
3. Continue simplifying the contribution path into `Describe -> Evidence -> Review`.
4. Move repeated source/media logic toward reusable managers.
5. Add backend/admin review only after the browser draft and export flow feels calm.

## Principle

The app should default to contribution, not configuration. Normal users should be able to tell topic.earth what they found, add proof, and understand that it is saved as a draft. Admins can keep the deeper research, source, media, AI, and publishing controls behind expert paths.
