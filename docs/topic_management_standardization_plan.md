# Topic Management Standardization Plan

Date: 2026-04-15

This document consolidates the current `topic.earth` topic creation, AI research, source/media handling, regional initiative, browser draft, and admin review ideas into one simpler product model.

UX simplification addendum, 2026-04-27: see `docs/topic_builder_lambda_user_simplification.md` for the human-first `Describe -> Evidence -> Review -> Save` proposal that sits on top of this architecture.

The goal is to stop treating `Smart Topic Builder`, `AI Research Assistant`, daily update candidates, source search, media generation, and admin export as separate tools. They should become one coherent workflow:

```text
Any input -> Topic Draft -> Sources -> Media -> AI Assist -> Review -> Save / Export / Submit / Publish
```

## Current Problem

The app already has many useful pieces:

- Smart Topic Builder
- AI Research Assistant
- daily/news update candidates
- source suggestions and source editing
- AI-generated media prompts and images
- manual media URL/file import
- regional initiative topics
- browser-local topic save
- admin ZIP export
- API settings and provider routing

But they overlap too much:

- Several panels can create or modify a topic.
- Several AI actions can write into a topic, but not through one visible review model.
- Sources can mean source categories, source records, favorite sources, page URLs, or AI search targets.
- Media can mean generated image, source-page image, user URL, upload, YouTube/site link, or future packaged asset.
- A user cannot always tell whether something is only a preview, a browser draft, exported, submitted, approved, or published.

The product needs fewer entry points and clearer state.

## Console Issue Triage

These errors are related, but they do not all mean the same thing.

### Browser Tracking Prevention

`Tracking Prevention blocked access to storage` is usually caused by an embedded frame, third-party script, or cross-origin widget trying to use localStorage/cookies in a way the browser restricts.

Product decision:

- Treat `postMessage` as the canonical widget sync path.
- Avoid depending on iframe localStorage for cross-origin API settings.
- Keep API settings synced into the parent app cache after user confirmation.
- For local development, allow `http://localhost:8000` in trusted origin checks where safe.

### Blocked Message From Localhost

`Blocked message from untrusted origin: http://localhost:8000` means the app is receiving postMessage events from the current localhost origin but the trust list does not include it.

Product decision:

- Keep origin checks strict.
- Add a development-only trusted origin for `http://localhost:8000`.
- Do not disable origin checks globally.

### CORS Source Page Fetches

Direct browser fetches to pages such as European Commission or Euractiv can fail because those sites do not allow `http://localhost:8000` to read their page HTML.

Product decision:

- Do not rely on browser-side scraping of arbitrary source pages.
- Store the source URL as a source record even if metadata fetch fails.
- Let media metadata become optional.
- Later, use an admin/backend fetch proxy or manual source metadata entry.

### OpenAI Quota And Billing Errors

`429 Too Many Requests`, `quota exceeded`, and `billing hard limit` are provider/account issues, not UI bugs.

Product decision:

- AI actions must fail softly into draft mode.
- Show a visible provider status message.
- Keep user/admin manual editing available when AI fails.
- Add per-action retry limits so one click does not call the provider multiple times.

### Favicon 404

`favicon.ico 404` is low risk.

Product decision:

- Add a small favicon asset or a link to the existing animated favicon path later.

## Target Product Model

The app should have one first-class object: `TopicDraft`.

Every source of content creates or edits a draft:

- manual user input
- daily update candidate
- AI research result
- source search result
- media URL
- YouTube/site link
- regional map click
- browser cache import
- future submitted ZIP

Nothing should feel published until it moves through review.

## Topic Status Model

Use explicit status labels everywhere:

- `browser-draft`: saved only in the current browser
- `downloaded-request`: exported by a user as a request package
- `submitted-review`: received by admin for validation
- `admin-editing`: accepted into the admin workspace but not published
- `approved`: ready to become app data
- `published`: visible in the official app data
- `rejected`: not accepted, with optional reason
- `archived`: preserved but hidden from active views

User-facing labels:

- Save Browser Draft
- Download Request for Admin
- Submit for Review
- Approve Topic
- Publish Topic

Avoid ambiguous labels:

- Add Topic
- Post to Topic
- AI Gen and Update

## One Workspace

Replace scattered flows with one `Topic Workspace`.

### Essentials

The minimum fields that define the topic:

- title
- category/layer
- country
- region/city
- location precision
- latitude/longitude
- summary
- insight
- initiative organizer, if regional
- date/time, if event-like

Primary action:

- Generate Draft

Secondary actions:

- Improve Summary
- Find Coordinates
- Rewrite for Clarity
- Translate later if needed

### Sources

Sources become real records, not only toggles.

Actions:

- Add URL
- Add note-only source
- AI suggest sources
- Search known sources
- Mark official/scientific/media/community
- Verify URL shape
- Mark as reviewed
- Remove source

Important:

- Source categories help search.
- Source records prove or document the topic.
- They are not the same thing.

### Media

Media becomes a managed asset list.

Actions:

- Add image URL
- Add YouTube URL
- Add website URL as linked media
- Upload local file
- Generate image from topic
- Generate image from prompt
- Use media suggested by research
- Choose cover media
- Preview/zoom
- Mark media as approved
- Remove media

Important:

- A YouTube/site link can be media without becoming an image.
- Source-page image scraping is best-effort only.
- Browser CORS failure should not block the user from saving a source or media link.

### AI Assist

AI should become a set of suggestions inside the workspace, not another destination.

Actions:

- Generate full draft
- Suggest sources
- Create research brief
- Compare sources
- Suggest media prompts
- Generate social post
- Improve admin summary

Rule:

- AI returns a patch.
- The user/admin reviews the patch.
- Applying a patch updates the draft.
- The app records what AI changed.

### Review

The review section answers:

- What will be saved?
- What is still missing?
- Which fields came from AI?
- Which sources are unverified?
- Which media assets are only linked vs packaged?
- Is this only a browser draft?
- Is this ready for admin?

Actions:

- Save Browser Draft
- Download Request for Admin
- Export Admin ZIP
- Submit for Review, later
- Publish, admin only later

## Standard Draft Schema

Use this as the internal shape. Existing `media` and `researchSources` can still be read for compatibility, but new saves should also write the normalized fields.

```json
{
  "id": "topic_...",
  "status": "browser-draft",
  "title": "",
  "category": "",
  "layer": "",
  "country": "",
  "region": "",
  "city": "",
  "locationPrecision": "country|region|city|manual|address|unknown",
  "lat": null,
  "lon": null,
  "summary": "",
  "insight": "",
  "initiative": {
    "organizer": "",
    "contact": "",
    "website": "",
    "requesterNote": ""
  },
  "sources": [],
  "mediaAssets": [],
  "aiRuns": [],
  "review": {
    "needsHumanReview": true,
    "adminNotes": "",
    "userMessage": "",
    "missing": []
  },
  "storage": {
    "origin": "browser-localStorage",
    "savedAt": null,
    "downloadedAt": null,
    "submittedAt": null,
    "publishedAt": null
  }
}
```

## Source Record Schema

```json
{
  "id": "source_...",
  "title": "",
  "url": "",
  "type": "official|scientific|media|community|data|other",
  "reliability": "high|medium|low|unknown",
  "verified": false,
  "addedBy": "user|admin|ai|import",
  "addedAt": "2026-04-15T00:00:00.000Z",
  "notes": "",
  "metadata": {
    "publisher": "",
    "publishedAt": "",
    "retrievalStatus": "not-fetched|fetched|blocked-cors|failed"
  }
}
```

## Media Asset Schema

```json
{
  "id": "media_...",
  "kind": "image|video|youtube|website|document|audio|other",
  "url": "",
  "originalUrl": "",
  "title": "",
  "alt": "",
  "caption": "",
  "source": "ai|upload|url|youtube|source-page|research|update",
  "status": "draft|approved|failed",
  "cover": false,
  "rights": "unknown",
  "prompt": "",
  "createdAt": "2026-04-15T00:00:00.000Z",
  "package": {
    "includeInZip": true,
    "packagedPath": "",
    "fetchStatus": "not-fetched|cached|blocked-cors|failed"
  }
}
```

## AI Result Schema

Every AI action should return the same shape:

```json
{
  "action": "generate_topic_draft",
  "draftPatch": {},
  "sourceCandidates": [],
  "mediaCandidates": [],
  "notes": "",
  "confidence": 0.75,
  "requiresReview": true,
  "errors": []
}
```

This lets the interface show a calm review diff instead of silently mutating topic data.

## User Request Package

For now, before a backend exists, a user request for admin posting can be downloaded as a ZIP.

Recommended package:

```text
topic-request/
  manifest.json
  topic-draft.json
  sources.json
  media-assets.json
  notes.md
  media/
    original-or-generated-files
```

`manifest.json` should include:

- package version
- created date
- app version
- draft id
- topic title
- status: `downloaded-request`
- source count
- media count
- whether any media fetches failed
- whether any fields came from AI

Important:

- A downloaded request is not a published topic.
- Admin can import it, review it, edit it, approve it, then publish it later.

## Browser Cache And Local Save

The browser can support:

- active draft auto-save
- saved local drafts
- cached AI outputs
- cached source metadata, only when fetch is allowed
- cached media data URLs or generated images
- downloaded request ZIP

But browser storage should be described honestly:

- It is local to this browser/profile.
- It can be blocked or cleared.
- It is not the official app database.
- It is not multiuser collaboration.

Use IndexedDB later for large media. Keep localStorage for small settings and draft indexes.

## Search And Source Discovery

Use three separate search modes:

### Search My Drafts

Search browser-local drafts by:

- title
- category
- region
- status
- source URL
- media title
- review state

### Search Known Sources

Search app-curated source lists and existing topic sources.

This can work offline/local and avoids CORS.

### Search The Web

Web search must be explicit and provider-backed.

Rules:

- Do not scrape arbitrary pages from the browser as a default.
- If a fetch is blocked by CORS, keep the URL and ask for manual metadata.
- Later, use a backend/admin proxy for metadata extraction.

## Regional Initiative Flow

The regional tab should feed the same topic draft system.

Recommended flow:

```text
Regional map/card -> Propose Initiative -> Topic Workspace -> Save Browser Draft -> Download Request for Admin
```

The user should only need:

- initiative name
- location level
- short description
- one source or website link
- optional media or YouTube link
- optional note to admin

AI can help after that:

- improve summary
- suggest category
- suggest sources
- suggest media prompt
- find approximate coordinates

Admin can later:

- verify sources
- improve location precision
- approve media
- publish into app data

## UI Simplification

Navigation should be simpler:

- `Create / Propose Topic` opens Topic Workspace.
- `Research` is a tab inside Topic Workspace.
- `Sources` is one manager everywhere.
- `Media` is one manager everywhere.
- `Save` always says where it saves.

Recommended button renames:

- Add Topic -> Review as Draft
- Save Topic -> Save Browser Draft
- Post to Topic -> Apply to Draft
- AI Auto-Setup -> AI Assist
- Generate Research and Apply -> Generate Suggestion
- Export ZIP -> Download Admin Package

Recommended visible badges:

- Draft only
- Unsaved changes
- AI suggestion pending
- Sources need review
- Media not packaged
- Ready for admin
- Published

## Implementation Roadmap

### Phase 1: Language And State

- Rename ambiguous buttons.
- Add visible draft status labels.
- Add AI quota/CORS/storage warnings as friendly messages.
- Keep current localStorage/ZIP behavior.

Implemented Phase 1 choices:

- `Topic Workspace` is the main entry point for draft management.
- `AI Assist` is an advisory tab, not an automatic publish/update destination.
- Source-page scraping is best-effort and same-origin only; blocked external pages stay as source records.
- Saved browser topics write `topicStatus`, `review`, and `storage` metadata.
- The admin download is an `admin-review-package` with `downloaded-request` status, not a published topic.
- Local development trusts `http://localhost:8000` for widget postMessage sync.

### Phase 2: Draft Service

Create one `TopicDraftService` responsible for:

- creating drafts
- migrating old topic shapes
- validating required fields
- saving browser drafts
- applying AI patches
- exporting request packages
- preparing admin import later

### Phase 3: Unified Managers

Create reusable managers:

- `SourceManager`
- `MediaManager`
- `ReviewPanel`

Use them from:

- Topic Builder
- AI Research
- Daily Update
- Regional initiatives
- Detail Panel admin edit

### Phase 4: User Request ZIP

Standardize the ZIP format as the future server submission contract.

For now:

- user downloads request
- sends it to admin manually
- admin imports/validates later

Later:

- submit to backend review queue
- admin approves in browser
- publish via data update, GitHub PR, or API

### Phase 5: Backend Review Queue

Only after the browser workflow feels clean:

- authenticated submissions
- media object storage
- admin dashboard
- audit log
- approval/rejection status
- published topic generation

## Most Important Decision

Do not add more separate AI entry points right now.

The next product move should be:

```text
one draft,
one workspace,
one source manager,
one media manager,
one review state,
many optional AI assists.
```

That gives users a simple path to propose initiatives and gives admins a powerful but controlled path to validate, package, and publish them.
