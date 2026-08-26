# Flow Analysis

This note condenses the current `docs/*.md` planning direction into one public project flow.

## Current Product Shape

`topic.earth` has two connected experiences:

1. The public globe experience for exploring Earth, climate layers, Fever milestones, Tipping Points, AMOC Watch, and regional topics.
2. The contribution/admin experience for creating, researching, reviewing, packaging, and eventually publishing topics.

The strongest direction across the docs is to avoid adding more separate AI or admin panels. The app should feel like one workflow with optional expert controls.

Public project routing:

- General questions: `info@topic.earth`
- Support: `support@topic.earth`
- Publishing, partnerships, and stewardship: `contact@topic.earth`

## Recommended User Flow

```text
Explore
  -> Find or propose a topic
  -> Type, paste, search, or add media in one composer
  -> Edit the live topic preview directly
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

## Recommended Identity Flow

Phase 1 keeps the app guest-readable and local/admin-capable for development. Phase 2 should add a private admin surface where Google/Microsoft accounts can act as Admins and GitHub accounts can act as MasterAdmin only after an app role grants that power.

```text
Guest
  -> explore without login

Admin
  -> sign in on private admin surface
  -> create or update drafts
  -> submit for review

MasterAdmin
  -> approve publishing
  -> control GitHub/Vercel/roles
```

Details live in `docs/admin_identity_phasing.md`.

## Data Flow

The docs point toward these source-of-truth layers:

- `fever-scenarios.json` for Fever years, scenario values, warnings, AMOC values, tipping risk, and texture paths.
- `data/*.js` for current topic/layer datasets.
- `shared/topic-earth-ui.csv` for UI translation text.
- Future `TopicDraft` JSON packages for user/admin submissions.
- `regionalState` snapshots for browser/admin topics that restore Regional map focus, routes, or paths.

## Regional Pathway Flow

Bike and mobility topics should be able to restore a saved path without becoming a user tracker.

```text
Open bike topic
  -> Regional mode focuses the topic
  -> saved route/path is restored
  -> layer, zoom, profile, and preference return
```

Only save a route when the user or Admin explicitly attaches it to a topic. The proposed shape is documented in `docs/topic_pathway_state_restore.md`.

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
3. Continue simplifying the contribution path into one Central Topic Composer.
4. Move repeated source/media logic toward reusable managers.
5. Replace always-visible tutorial text with contextual bubbles and guide levels.
6. Add backend/admin review only after the browser draft and export flow feels calm.

Phase 2 start, 2026-05-07:

The `__actual_vs\topic.earth` dev app now opens topic creation on a `Compose` surface. A single smart input can seed the editable preview and route URLs into the current evidence/media records while preserving the existing local save and ZIP/export flow. Local development now boots in protected User mode; Admin mode is available from the visible User/Admin toggle for testing unfinished editing tools.

Tutorial direction, 2026-05-16:

Static help text should move toward an interactive tutorial bubble system with first-visit, guided-task, and expert/admin levels. The guide should reuse `tutorialModeEnabled`, explain actions only when the user needs them, and keep copy in `shared/topic-earth-ui.csv`. Details live in `docs/interactive_tutorial_bubbles_audit.md`.

Tutorial AI micro companion, 2026-05-16:

The tutorial bubble now includes the low-risk `Read` action. The remaining optional enhancement is an `Ask` input only when a linked AI text provider is ready. Answers should be one or two sentences, explain only the current UI step, and never mutate topic data. Build transparency lives in Settings as `Development assistant: Codex`, while runtime provider/model remains separate under linked AI settings. Details live in `docs/tutorial_ai_micro_companion_audit.md`.

## Principle

The app should default to contribution, not configuration. Normal users should get one obvious place to type or paste, one evidence system, and one editable preview that looks like the final posted topic. Admins can keep deeper research, source, media, AI, route/path, and publishing controls behind expert paths.
