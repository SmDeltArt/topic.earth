# AI to Topic Pipeline Review

Date: 2026-04-14

This document captures the current issue in the topic.earth AI/topic workflow: useful AI features were added over time, but they are not yet organized as one simple product flow. The goal is to decide the best next move before adding more buttons, panels, prompts, or storage behavior.

## Executive Summary

The app currently has several AI paths that all touch topics:

- Create Topic AI field helpers
- AI Research Assistant
- Daily Update process
- Source suggestions and source editing
- AI/manual media insertion
- Post generated research back into a topic
- Admin topic export as ZIP

Each path is valuable, but each path has its own UI state, prompt shape, save behavior, source handling, and media handling. This creates friction:

- Users cannot easily understand what is saved vs only previewed.
- Sources are represented in several slightly different ways.
- Media can come from title-only AI generation, research output image prompts, URL import, file upload, or generated news images.
- The same topic can be touched by multiple flows, but there is no single "topic workspace" that owns the whole lifecycle.

Recommended direction: create one unified **Topic Workspace** with consistent sections for Essentials, AI Assist, Sources, Media, Research, Review, and Save/Export. AI features should become actions inside that workspace, not separate semi-overlapping workflows.

## Current Pipeline Map

### 1. Settings and AI Provider Link

Current behavior:

- The app loads shared API bridge scripts from `index.html`.
- `lib/ai-api-bridge.js` installs an app-level AI bridge.
- Settings shows linked provider/model information.
- The API Settings widget opens as a framed overlay.
- The bridge still exposes `window.websim` compatibility so older call sites can continue working.

Issue:

- Most AI calls still call `window.websim.chat.completions.create` or `window.websim.imageGen` directly.
- This works because the bridge fills `window.websim` when Websim is absent, but the code still reads conceptually as "Websim first".

Decision to consider:

- Rename the concept in app code from `window.websim` to a neutral `window.ourEarthAI` or imported AI service.
- Keep `window.websim` only as backward compatibility.

### 2. Daily Update Process

Current behavior:

- `showNewsUpdate()` renders the Daily News Update UI.
- `executeNewsUpdate()` asks AI for JSON candidate news items.
- `renderNewsResults()` displays candidates.
- `addTopicFromNews()` pre-fills the Smart Topic Builder.
- The candidate is not actually recorded until the user clicks Save Topic.

Issue:

- Users can interpret "Add Topic" as "save this topic", but it currently means "open/edit draft".
- The update flow does not yet merge with existing topic review in a formal way.
- The prompt asks for candidates, but does not enforce a full topic schema.

Decision to consider:

- Rename button from **Add Topic** to **Review as Topic** or **Create Draft**.
- After click, show a draft status banner: "Not saved yet".
- Make the update AI return the same `TopicDraft` schema used by all other AI actions.

### 3. Create Topic AI

Current behavior:

- Smart Topic Builder has Essentials and AI Auto-Setup tabs.
- AI helpers can generate summary, insight, coordinates, source suggestions, and images.
- The topic can be saved to browser localStorage.
- Admin can export saved local topics as ZIP.

Issue:

- AI tools are scattered across form fields and tab sections.
- `AI Auto-Setup` sounds like a single assistant, but it is really source mode, media insertion, output intent, and prompt preview.
- The media section shows count only, not a full media manager.
- Source editing is present but hidden inside the research tab.

Decision to consider:

- Replace "AI Auto-Setup" with a clearer **AI Assist** tab.
- Add one **Generate Draft** action that can fill title, summary, coordinates, sources, and suggested media prompts in one pass.
- Keep field-specific AI buttons, but make them secondary tools.

### 4. AI Research Assistant

Current behavior:

- `showResearch()` opens a separate AI Research Assistant.
- It builds context from an existing topic.
- User chooses source categories, action type, and response length.
- User can edit the generated prompt.
- AI output can include `IMAGE:` prompts.
- Generated media can be added to the research output.
- Admin can use Post to Topic to write research output and media back to the topic.

Issue:

- Research Assistant is powerful, but separate from the Topic Builder.
- Source category selections here are separate from the topic source editor.
- "Post to Topic" is another save path with a different mental model from Save Topic.
- Media generated in research has different behavior from media generated in Create Topic.

Decision to consider:

- Move AI Research Assistant into the unified Topic Workspace as a **Research** section.
- Convert research output into structured `researchNotes`, `insight`, `sourceCandidates`, and `mediaCandidates`.
- Rename "Post to Topic" to **Apply to Topic Draft**.

### 5. Source Management

Current behavior:

- A topic can have `researchSources`.
- The source manager can add, remove, verify, and edit sources.
- AI can suggest sources.
- Detail view can show and manage sources for custom/admin topics.
- Research Assistant also has source category toggles, but those are not the same thing as concrete source records.

Issue:

- The app has two concepts mixed together:
  - Source categories: official, scientific, media, favorites.
  - Real source records: name, URL, reliability, verified.
- "Manage sources" exists, but it is not a first-class consistent drawer/modal available everywhere the user expects it.

Decision to consider:

- Create one reusable **Source Manager** used by Topic Builder, Research Assistant, detail view, and future admin review.
- Separate source filters from source records.

Suggested source record shape:

```json
{
  "id": "source_...",
  "name": "European Commission",
  "url": "https://example.com",
  "type": "official",
  "reliability": "high",
  "verified": false,
  "addedBy": "ai|user|import",
  "notes": ""
}
```

### 6. Media Management

Current behavior:

- Create Topic supports AI image generation from the title.
- Research output can generate images from `IMAGE:` prompts.
- Update process can fetch or generate images for candidate news.
- Manual media import can use file or URL.
- Topic detail now supports in-panel zoom.
- Admin ZIP export can package local data URLs and fetchable remote images.

Issue:

- Topic media is currently stored mostly as an array of strings.
- Metadata such as source, prompt, alt text, rights, original URL, generated date, and packaging status is not standardized.
- Manual import uses prompts and moderation behavior that feel separate from the rest of the app.

Decision to consider:

- Replace plain `media: string[]` with a normalized `mediaAssets` structure, while keeping `media` for compatibility during migration.
- Create one reusable **Media Manager** with these actions:
  - Generate from topic text
  - Generate from custom prompt
  - Add from research media prompt
  - Upload file
  - Add image URL
  - Choose cover image
  - Remove item
  - Zoom/preview in right panel

Suggested media asset shape:

```json
{
  "id": "media_...",
  "kind": "image",
  "url": "assets/topics/example/media-1.png",
  "originalUrl": "",
  "prompt": "Professional climate dashboard image...",
  "alt": "Satellite-style image of...",
  "source": "ai|upload|url|update",
  "status": "draft|approved|failed",
  "createdAt": "2026-04-14T00:00:00.000Z"
}
```

### 7. Save, Export, and Future Multiuser Submit

Current behavior:

- Save Topic records custom topics to browser localStorage.
- Admin ZIP export packages browser topics and media.
- GitHub/Vercel deployment remains static.

Issue:

- Browser save is not the same as app data save.
- Vercel static hosting cannot write directly back into source files.
- Multiuser submission needs a real backend or review queue.

Decision to consider:

- Keep current localStorage save as **Draft Save**.
- Add explicit statuses:
  - Draft in browser
  - Exported for admin
  - Submitted for review
  - Approved into app data
  - Published
- Use the ZIP format as the future server submission format.

Future backend flow:

1. User creates Topic Draft.
2. User submits draft.
3. API stores JSON and media assets.
4. Admin reviews draft.
5. Admin approves, edits, or rejects.
6. Approved topic appears in app data/API.
7. Optional scheduled export or GitHub PR generation later.

## Core Problem

The app has AI features, but not yet a single AI product model.

Current model:

```text
Update AI -> candidate -> Add Topic -> Topic Builder -> Save
Topic Builder -> field AI helpers -> Save
Topic Detail -> Research Assistant -> Generate -> Post to Topic
Topic Builder -> AI Image or Import -> Save
Source Detail -> Manage Sources -> Edit Topic
Admin Settings -> Export ZIP
```

Target model:

```text
Any input -> Topic Draft -> AI Assist -> Source Manager -> Media Manager -> Review -> Save/Export/Submit
```

## Proposed Unified Topic Workspace

### Tab 1: Essentials

Purpose: what the topic is.

Fields:

- Title
- Category/layer
- Date/time
- Country
- Region
- Latitude/longitude
- Summary
- Insight

AI actions:

- Generate Draft
- Improve Summary
- Find Coordinates
- Rewrite for Clarity

### Tab 2: Sources

Purpose: evidence and provenance.

Actions:

- Add source
- AI suggest sources
- Verify URL shape
- Mark official/scientific/media
- Add note
- Remove source

Important: source categories should not replace real source records.

### Tab 3: Media

Purpose: visual assets.

Actions:

- Generate image from topic
- Generate image from custom prompt
- Add URL
- Upload file
- Select cover image
- Zoom/preview
- Remove media

Important: media should have metadata, not only URL strings.

### Tab 4: Research

Purpose: deeper AI work on the same draft.

Actions:

- Research brief
- Compare sources
- Suggest angles
- Create social post
- Generate media prompts
- Apply selected output to topic fields

Important: this should not feel like leaving the topic builder.

### Tab 5: Review and Save

Purpose: clarity before persistence.

Shows:

- What will be saved
- Missing required fields
- Where it will be saved
- Media packaging status
- Source count
- AI-generated fields requiring review

Actions:

- Save browser draft
- Export ZIP
- Submit to admin, future
- Publish, admin only, future

## Recommended Data Model

Use one `TopicDraft` structure internally.

```json
{
  "id": "topic_...",
  "status": "draft",
  "title": "",
  "category": "",
  "date": "",
  "country": "",
  "region": "",
  "lat": 0,
  "lon": 0,
  "summary": "",
  "insight": "",
  "sources": [],
  "mediaAssets": [],
  "aiRuns": [],
  "review": {
    "needsHumanReview": true,
    "notes": ""
  },
  "storage": {
    "origin": "browser-localStorage",
    "exportedAt": null,
    "publishedAt": null
  }
}
```

Keep compatibility for existing topics:

- Continue reading `researchSources`.
- Continue reading `media`.
- On save/export, also write `sources` and `mediaAssets`.

## AI Action Model

Every AI action should return a patch against the same draft shape.

Suggested action types:

- `generate_topic_draft`
- `improve_summary`
- `generate_insight`
- `find_coordinates`
- `suggest_sources`
- `research_brief`
- `compare_sources`
- `suggest_angles`
- `generate_media_prompt`
- `generate_image`
- `daily_update_candidates`

Suggested AI result shape:

```json
{
  "action": "suggest_sources",
  "draftPatch": {
    "sources": []
  },
  "notes": "Why these changes were suggested",
  "confidence": 0.78,
  "requiresReview": true
}
```

This makes every AI output visible, reviewable, and reversible.

## UX Principles

### Make Save Meaning Explicit

Use labels like:

- Save Browser Draft
- Export Admin ZIP
- Submit for Review
- Publish to App

Avoid ambiguous labels like:

- Add Topic
- Post to Topic
- AI Gen and Update

### One Source Manager

Sources should always look and behave the same.

### One Media Manager

Media should always look and behave the same.

### AI Should Suggest, Not Secretly Mutate

AI can fill fields, but the user should see what changed.

### Keep The Right Panel Calm

Avoid many unrelated buttons in the same visual weight.

Preferred pattern:

- Primary action: Generate Draft or Save Draft
- Secondary actions: Improve, Suggest, Add, Export
- Advanced actions: prompt preview, raw JSON, manual import

## Suggested Next Implementation Steps

### Step 1: Rename and Clarify Existing Buttons

Low risk, high clarity.

- Add Topic -> Review as Topic Draft
- Save Topic -> Save Browser Draft
- Post to Topic -> Apply to Topic Draft
- AI Auto-Setup -> AI Assist
- AI Gen and Update -> Generate Research and Apply

### Step 2: Introduce `TopicDraftService`

Centralize:

- load draft
- save draft
- validate draft
- convert old topic format
- export draft
- apply AI patch

### Step 3: Introduce `SourceManager`

Reusable UI/component methods for:

- Topic Builder
- Detail Panel
- Research Assistant
- Future Admin Review

### Step 4: Introduce `MediaManager`

Reusable UI/component methods for:

- AI image generation
- manual upload
- URL add
- preview/zoom
- export packaging metadata

### Step 5: Merge AI Research Into Topic Workspace

Keep the current research logic, but make it a tab/section of the same draft flow.

### Step 6: Prepare Future Admin Submission

Use the existing ZIP/export package as the future payload contract:

- `TopicDraft`
- `sources`
- `mediaAssets`
- `manifest`
- approval metadata

## Decision Questions

We should decide these before major refactoring:

1. Should the app stay browser-local plus admin ZIP for now, or should we add a backend review queue soon?
2. Should media be stored as files in the repo, Vercel Blob, Cloudinary, or another storage bucket?
3. Should AI actions auto-apply patches, or always show a review diff first?
4. Should the right panel remain the only editor, or should admin editing become a larger modal/workspace?
5. Should daily update produce only candidates, or should it also auto-match and update existing topics?

## Recommended Decision

Short term: do not add more AI buttons.

First unify the mental model:

```text
Topic Draft -> Sources -> Media -> AI Research -> Review -> Save/Export
```

Then refactor implementation around that model.

This gives us an app that feels smarter and more intuitive, instead of a set of powerful but separate tools.

## Implementation Note: Calmer AI Media Flow

Applied on 2026-04-14:

- AI Research `IMAGE:` lines are now media suggestions first, not automatic generated images.
- Legacy research-media generation entry points should also render suggestions, so old paths cannot silently create three images.
- Daily update candidates expose source/media tokens and require explicit `Generate media` before AI image generation.
- Applying research to an existing built-in topic now creates a draft copy instead of mutating the original topic object.
- Browser-save language is now explicit: `Review Draft`, `Save Browser Draft`, and `Apply to Topic Draft`.
- Topic Builder now shows a draft-status banner so update candidates, new topics, draft copies, and saved-topic edits declare whether they are saved or still pending review.

This keeps AI helpful while preserving admin control over topic identity, sources, and media.
