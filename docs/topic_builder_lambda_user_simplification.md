# Issue Proposal: Central Topic Composer

Date: 2026-05-06

Status: Phase 2 started in `__actual_vs\topic.earth`.

This replaces the older `Describe -> Evidence -> Review` simplification proposal. User testing showed that three consecutive input areas still feel like three different tools. The next target should be one centralized composer where search, sources, media, AI help, and the final topic preview are part of the same interaction.

## Issue Title

Replace scattered topic creation with one centralized, editable Topic Composer.

## Problem

Topic creation currently feels redundant and inconsistent.

Users see several separate concepts:

- manual topic fields;
- source search;
- source editor;
- media manager;
- AI research output;
- draft review;
- posted topic display.

Even when these are organized into tabs or steps, users still experience them as different workflows with different visual styles. The app asks them to understand the system before they can contribute.

The tested user reaction can be summarized as:

```text
Simplify.
Standardize.
Make it smart.
Make it intuitive.
Remove redundant inputs.
```

## Product Direction

Use one composer.

```text
Central input
  -> AI/source/media/search suggestions
  -> editable live preview
  -> save/update/export
```

The topic creation display should look like the posted topic from the beginning. The user should not fill a form and then discover a different display later. They should edit the future topic itself.

## Target Mental Model

The user should feel:

```text
I am drafting the topic that will be shown.
I can add evidence or media from one place.
AI helps exactly where my cursor is.
I can delete, edit, or improve a part without changing screens.
```

Not:

```text
I must fill three forms, open a source manager, then run AI, then review a different preview.
```

## Proposed UI Shape

### 1. Central Smart Input

One input bar is the primary creation surface.

It accepts:

- plain text;
- URLs;
- source links;
- media URLs;
- YouTube or website links;
- search requests;
- AI instructions;
- pasted notes.

Examples:

```text
Brussels adds a protected bike corridor near Gare du Midi
```

```text
https://example.org/source-page
```

```text
Find official sources for this and add them as evidence
```

```text
Generate a short summary at the cursor
```

The composer should classify input into chips or cards:

- Search;
- Source;
- Media;
- Note;
- AI instruction;
- Location.

### 2. Editable Topic Preview

The center of the composer is a live preview that looks like the posted topic detail.

Editable blocks:

- title;
- category/layer;
- summary;
- insight;
- location;
- date;
- evidence/source cards;
- media cards;
- regional path/route attachment;
- admin notes, admin only.

Expected actions on each block:

- edit;
- delete;
- regenerate;
- improve wording;
- insert at cursor;
- add source;
- add media;
- mark needs review.

The preview can be implemented as a sandboxed editable iframe or, preferably, as the same topic-rendering component in an edit mode. The important product rule is that the draft preview and posted topic display share one visual language.

### 3. AI Works On The Selection Or Cursor

AI should not be a separate panel by default.

Normal actions:

- generate at cursor;
- rewrite selected text;
- shorten selected text;
- suggest missing source;
- suggest media;
- extract topic from pasted URL;
- improve the whole draft.

AI output should appear as a patch or inline suggestion:

```text
Apply
Insert here
Replace selection
Keep as note
Discard
```

No silent mutation. The user sees what changes.

### 4. One Evidence Lane

Sources and media should not feel like different apps.

Use one `Evidence` lane in the composer preview:

- source link;
- image;
- video;
- website;
- document;
- source note.

Each item can still keep technical metadata internally, but the user-facing label is simple:

```text
Evidence
  Official page
  Image
  Video
  Research note
```

Admin can open advanced metadata from an item.

## User Mode

User mode should be a simplified composer.

Visible:

- central smart input;
- editable posted-topic preview;
- evidence lane;
- simple AI actions;
- save on this device;
- preview update.

Hidden:

- source category matrix;
- raw prompt preview;
- provider settings;
- packaging diagnostics;
- admin ZIP language;
- deep AI mode cards.

User action labels:

```text
Save on this device
Preview update
Find sources
Add media
Improve this
```

User mode cannot update published topics directly. It can prepare a local proposal or update preview.

## Admin Mode

Admin mode uses the same composer, with expert controls added around it.

Visible additions:

- source reliability metadata;
- media rights/license fields;
- route/path attachment controls;
- review state;
- admin notes;
- export/submit ZIP;
- publish readiness checks;
- advanced AI settings;
- raw source/media records.

Admin action labels:

```text
Save draft
Submit ZIP
Export review package
Mark source reviewed
Attach route/path
Prepare for publish
```

The admin experience can be denser, especially in Regional mode, but it should still use the same central composer and posted-topic preview.

## Regional Composer

Regional can be more advanced because the map gives context.

Regional composer should prefill:

- location;
- map focus;
- layer/category;
- path or route state;
- local search context;
- regional label.

Regional-specific controls:

- attach current map point;
- attach drawn path;
- attach bike/walk/drive route;
- use current search/focus as source context;
- suggest nearby sources;
- propose local action.

Regional user mode should stay simple:

```text
What local action should be added here?
```

Regional admin mode can expose:

- route/path geometry;
- active layers;
- source radius;
- local authority search;
- route source and review state.

## Desired Workflow

### Create New Topic

```text
Open composer
  -> type or paste into central input
  -> app creates a live topic preview
  -> user edits preview directly
  -> add source/media through same input
  -> AI improves selected block or cursor position
  -> save local draft or submit/export for review
```

### Update Existing Topic

```text
Open topic
  -> Preview update
  -> composer opens with posted topic display
  -> search/source/media suggestions appear as cards
  -> user applies selected changes
  -> save local update proposal
```

### Admin Review

```text
Open saved proposal
  -> same composer
  -> admin validates source/media/path
  -> admin edits posted-topic preview
  -> export ZIP or prepare publish
```

## UI Standardization Rules

Use the same components everywhere:

- same source card;
- same media card;
- same AI suggestion card;
- same topic preview block;
- same status badges;
- same save/export button hierarchy.

Avoid:

- one source input in the topic form and another in source manager;
- one media URL input and another generated-media UI;
- one AI output style in research and another in topic creation;
- separate posted-topic preview that cannot be edited;
- duplicate save buttons with different meanings.

## Suggested Composer Layout

```text
Top
  Topic Composer title
  status badge: Unsaved / Saved on this device / Ready for review

Center
  editable topic preview

Bottom
  smart input
  chips: Source / Media / AI / Location / Search

Side or drawer
  evidence lane
  AI suggestions
  advanced admin controls
```

On small screens:

```text
Preview
  smart input docked bottom
  evidence/AI in bottom sheet
```

## Data Model Fit

The current data model can support this without a full backend migration.

The composer should still write:

- `title`;
- `summary`;
- `insight`;
- `category`;
- `date`;
- `lat/lon`;
- `researchSources`;
- `mediaTokens`;
- `regionalState`;
- `review`;
- `storage`;
- `topicStatus`.

Later, normalize this through a `TopicDraftService`.

## Proposed New Internal Object

Add a composer state object before saving:

```js
TopicComposerState = {
  topicDraft: {},
  cursor: {
    blockId: '',
    offset: 0,
    selectionText: ''
  },
  evidenceItems: [],
  mediaItems: [],
  aiSuggestions: [],
  pendingPatch: null,
  mode: 'user|admin',
  context: {
    source: 'new-topic|existing-topic|regional|search-result',
    regionalState: null
  }
}
```

This object is UI state. Saving still produces a normal topic draft.

## Implementation Plan

### Phase 1: Issue And Architecture

- accept this document as the target issue;
- stop adding new separate topic/source/media inputs;
- identify duplicated inputs in `DetailPanel`;
- define the shared source card, media card, and AI suggestion card.

### Phase 2: Composer Shell

- add `TopicComposer` or split it from `DetailPanel`;
- render posted-topic-style preview in edit mode;
- add the central smart input;
- route pasted URL/text/media into evidence or topic blocks;
- keep existing save handlers.

Started in `__actual_vs\topic.earth`, 2026-05-07:

- the opening topic builder tab is now `Compose`, not `Describe`;
- a single smart input accepts text, source URLs, direct image URLs, video/site links, and AI requests;
- `Use in draft` routes pasted text into title/summary/analysis and URLs into the existing evidence/media lane;
- the main title, category, date, place, and summary inputs are rendered as an editable posted-topic-style preview;
- the normal evidence/media lane is now visible in `Compose`, while the older `Evidence` tab remains available for deeper controls;
- existing save, update, Regional path state, media tokens, source records, and ZIP/export handlers are still reused.

Remaining Phase 2 work:

- move this shell into a dedicated `TopicComposer` module after the interaction settles;
- replace prompt-based media import with inline URL/file controls;
- make AI suggestions apply as visible patches instead of writing directly into fields.

### Phase 3: Inline Editing

- make preview blocks editable;
- add block actions: edit, delete, rewrite, insert source, add media;
- support AI on cursor/selection;
- show patch preview before applying.

### Phase 4: Source And Media Unification

- replace separate source/media inputs with one evidence lane;
- keep advanced metadata under an admin disclosure;
- make source/media cards reusable in detail, composer, and review package views.

### Phase 5: Regional Advanced Composer

- add map/path/route attachments into composer state;
- show route/path card in the preview;
- keep user Regional flow simple;
- expose geometry/source controls only in admin mode.

## Acceptance Criteria

A normal user can:

- create a topic from one central input;
- paste a URL and see it become evidence;
- add media without opening a separate manager;
- edit the preview directly;
- ask AI to write at the cursor;
- save a local proposal without understanding admin packaging.

An admin can:

- use the same composer;
- open expert controls;
- validate source/media/path metadata;
- export or submit ZIP;
- keep published-topic edits behind capability checks.

The UI passes the user-testing complaint when:

```text
There is one obvious place to type.
There is one preview that looks like the final topic.
There is one evidence system.
There is one AI suggestion style.
There is no redundant form sequence.
```

## Related Existing Docs

- `docs/topic_management_standardization_plan.md`
- `docs/smart_ai_topic_assistant_design.md`
- `docs/topic_pathway_state_restore.md`
- `docs/admin_identity_phasing.md`

## Recommended Next Step

Create the GitHub/project issue from this document, then implement only Phase 2 first: the composer shell, central input, and posted-topic-style editable preview. Keep the existing save/export code under it until the new UI proves itself.
