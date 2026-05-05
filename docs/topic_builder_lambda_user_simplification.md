# Topic Builder Lambda User Simplification

Date: 2026-04-27

Implementation note, 2026-04-28: the first app slice is implemented. The builder now uses `Describe`, `Evidence`, and `Review` tabs; source/media/AI settings are presented as evidence plus optional help, with technical AI controls behind `Expert controls`; update results now prioritize review before direct save; Regional now exposes `Propose Action`.

This note reviews the current `topic.earth` creator/update workflow and proposes a simpler model for a normal human user: someone who saw a local initiative, article, event, video, or climate update and wants to contribute it without understanding admin workflow, AI prompt settings, browser storage, source taxonomies, or packaging rules.

## Short Diagnosis

The app is moving in the right direction already.

Good foundations now visible in the code and docs:

- `Topic Workspace` replaced the older "Smart Topic Builder" framing.
- `Save Browser Draft` and draft status banners explain that local saves are not published app data.
- user/admin capabilities are centralized in `lib/capabilities.js`.
- regional mode can open a local proposal flow without full admin mode.
- source/media handling is becoming explicit instead of silent AI mutation.
- admin ZIP export has a real review-package concept.

The remaining problem is not power. The problem is cognitive load.

For a lambda user, the current builder still feels like a maker cockpit. In `components/DetailPanel.js`, the `renderCreateTopic()` flow has two tabs:

- `Essentials`
- `Manage`

But `Manage` contains several different mental models at the same level:

- source category toggles
- source record editor
- AI assist mode cards
- media actions
- geographic scope
- time scope
- output intent
- trusted-only toggle
- raw AI prompt preview

Those are valuable admin controls, but they are too much for the first contribution path.

The human question is simpler:

```text
I found something.
Can I tell topic.earth about it?
Did it save?
What happens next?
```

## Product Principle

Default to contribution, not configuration.

The ordinary-user flow should be a guided proposal, not a full topic editor. Admin mode can keep the richer workspace, but the first path should need only:

1. what is it?
2. where is it?
3. what proves it?
4. save or send it for review.

AI should feel like a helper inside those steps, not as a separate research product with modes, prompts, and output settings.

## Proposed Mental Model

Use two visible experiences on top of the same data model.

```text
Simple Proposal Flow
for lambda users, regional contributors, and quick updates

Expert Topic Workspace
for admin, source/media review, AI research, packaging, and publishing
```

Both can still write the existing browser-local topic shape. This is mostly an information-architecture change before it is a data-model refactor.

## Lambda User Flow

### Step 1: Describe

Label:

```text
Tell us what happened
```

Fields:

- title
- short description
- place
- date, default today
- optional link

AI action:

```text
Help me fill this
```

The AI can suggest category, summary, coordinates, and missing fields, but it should show suggestions before applying them.

### Step 2: Evidence

Label:

```text
Add proof
```

Actions:

- add link
- add photo/video URL
- add note
- ask AI for source suggestions

Hide by default:

- source category matrix
- reliability taxonomy
- source prompt settings
- source metadata fetching details

The user should see a plain evidence list:

```text
1 source added
Needs review
```

instead of source-system terms such as `official`, `scientific`, `media`, `trustedOnly`, or `blocked-cors`.

### Step 3: Review

Label:

```text
Review before saving
```

Show:

- topic title
- location
- source count
- media count
- missing essentials
- where the draft will live

Primary action:

```text
Save on this device
```

Secondary action, when ready:

```text
Download for admin review
```

Future hosted action:

```text
Send for review
```

Avoid showing "admin package" too early to normal users. It is accurate, but it makes the app feel like a file-management tool before the user understands the contribution.

## Rename Map

Use calmer, outcome-based copy.

| Current / technical label | Simpler label |
| --- | --- |
| Topic Workspace | Propose a Topic, for user flow |
| Regional Proposal Workspace | Propose Local Action |
| Manage | Evidence & Help |
| Source Manager | Evidence |
| Media Manager | Photos / Videos |
| AI Assist | Help me improve |
| AI Prompt Preview | Advanced prompt, hidden |
| Geographic Scope | Search area, advanced |
| Time Scope | Time window, advanced |
| Output Intent | Writing style, advanced |
| Trusted/Verified Sources Only | Prefer reliable sources, advanced |
| Save Browser Draft | Save on this device |
| Download Admin Package | Download for admin review |
| Check Updates (AI-Assisted) | Find recent updates |
| Review Draft | Review update |
| Save Draft + AI Assist | Save, then improve |

Internal statuses can stay exact, but the user-facing ladder should be simpler:

```text
Unsaved
Saved on this device
Ready for review
Sent / downloaded for review
Published
```

Map those labels to the existing internal states:

- `unsaved`
- `browser-draft`
- `proposal-local`
- `downloaded-request`
- `submitted-review`
- `published`

## Builder Layout

### Current Builder Shape

```text
Topic Workspace
  status banner
  management summary
  tabs:
    Essentials
    Manage
      Sources
      Source Manager
      AI Assist
      Media Manager
      Geographic Scope
      Time Scope
      Output Intent
      Trusted Only
      Prompt Preview
  Save Browser Draft
  Save Draft + AI Assist
```

### Simpler Builder Shape

```text
Propose a Topic
  step 1: Describe
  step 2: Evidence
  step 3: Review
  Advanced
```

The existing `renderCreateTopic()` UI can be reorganized before deeper refactoring:

- keep title, date, country/region, summary in `Describe`
- move first source URL into `Describe` as "Link, if you have one"
- place source records and media tokens in `Evidence`
- move AI mode cards, scopes, output intent, trusted-only, and prompt preview into a closed `Advanced AI settings` disclosure
- keep `renderTopicManagementSummary()` but rewrite it as a checklist with human labels

Recommended checklist:

```text
Describe: 3/4 complete
Evidence: 1 link added
Media: optional
Review: not ready yet
```

## Update Flow

The current update screen is useful but should avoid presenting two save concepts too early.

Current result actions:

- `Review Draft`
- `Save Browser Draft`

Suggested result actions:

- primary: `Review update`
- secondary menu or small text action: `Save without editing`

Why:

- "Review update" is safer and teaches the main model.
- Direct save is useful for admin speed, but it is dangerous as a first visible choice for a lambda user.
- Existing `buildNewsTopicDraft()`, `applyTopicDraft()`, and `saveTopicFromNews()` can stay; this is mostly presentation and button hierarchy.

When checking one selected topic, say:

```text
We found a possible update to this topic.
Review it before saving a local draft.
```

When checking broadly, say:

```text
We found possible new topics.
Review one to turn it into a local draft.
```

## AI Simplification

AI should have one normal-user promise:

```text
Help me make this clearer and more complete.
```

Hide the following from the normal path:

- raw prompt preview
- response style / output intent
- source category toggles
- research mode cards
- trusted-only toggle

Instead, offer three plain actions:

- `Fill missing details`
- `Improve wording`
- `Suggest sources`

Each AI action should produce a reviewable suggestion card:

```text
AI suggests:
- category: Community Projects
- summary: ...
- coordinates: ...

Apply suggestions
Keep editing manually
```

This matches the existing docs direction: AI returns a patch, and the human applies it.

## Source And Media Simplification

Use one user-facing bucket:

```text
Evidence
```

Inside evidence, represent each item by its human role:

- Link
- Source note
- Image
- Video
- Website

The technical distinction between `researchSources`, `media`, `mediaTokens`, source categories, generated media, URL media, and packaged media can remain internal.

For the ordinary user, the evidence card should show only:

- what was added
- whether it opens
- whether it still needs review

Example:

```text
Evidence
1. Brussels Mobility article
   Link added, needs admin review

2. YouTube video
   Video link added, not packaged
```

## Regional Proposal Simplification

Regional mode has a strong opportunity because it starts from place.

Current regional button label:

```text
Proposal
```

Suggested:

```text
Propose Local Action
```

Regional proposal should prefill and hide as much as possible:

- current map place becomes location
- preferred layer becomes category
- AI search focus becomes an optional helper text
- coordinates come from regional context unless user edits advanced location

The first visible screen should ask:

```text
What local action should be added here?
```

Fields:

- name of initiative or update
- short note
- website/link

Everything else can be inferred or handled later by admin.

## Admin / Expert Surface

Admin mode should keep the complete workspace, but make it explicit:

```text
Expert controls
```

Place these behind that label:

- source category matrix
- AI research modes
- geographic/time scope
- output intent
- trusted-only
- prompt preview
- package/export diagnostics
- raw media packaging state

This preserves power without making every contributor face every tool.

## Implementation Plan

### Phase 1: Copy And Hierarchy

Low risk. No schema change.

Files likely touched:

- `components/DetailPanel.js`
- `components/LayerPanel.js`
- `components/TopBar.js`
- `lib/translations.js`

Changes:

- rename visible labels using the rename map
- make `Review update` primary in update results
- move direct `Save Browser Draft` to secondary visual weight
- rename regional action to `Propose Local Action`
- hide prompt preview in a closed advanced disclosure

### Phase 2: Guided Proposal Shell

Still reuse current data handlers.

Files likely touched:

- `components/DetailPanel.js`
- maybe a new `components/TopicProposalFlow.js`

Changes:

- split `renderCreateTopic()` into `Describe`, `Evidence`, `Review`
- keep `submitTopic()`, `buildTopicWorkflowMetadata()`, `renderSourceEditor()`, and media token code
- add a simple step state, defaulting to `Describe`
- keep expert controls available in admin mode

### Phase 3: Suggestion Cards

Make AI feel safer.

Changes:

- AI actions return draft patches into a pending suggestion state
- show `Apply suggestions` instead of silently changing form fields
- record accepted AI patches in future `aiRuns`

### Phase 4: Draft Service

This aligns with the older standardization docs.

Add one service:

```text
lib/topic-draft-service.js
```

Responsibilities:

- normalize old topic shapes
- validate required fields
- apply AI patches
- save browser drafts
- export review packages
- produce user-facing status labels

## Acceptance Criteria

A lambda user succeeds if they can:

- open Regional and understand how to propose a local action
- enter a title, place, short description, and one link
- save without knowing what localStorage means
- understand that the topic is not published yet
- find the saved draft later
- optionally download/send it for review

An admin succeeds if they can still:

- open expert controls
- verify source and media records
- run deeper AI research
- edit coordinates/category/status
- export a review package
- publish through the later admin process

## Recommended Next Decision

Do not add more topic/update buttons yet.

First make the existing workflow feel like this:

```text
Describe -> Evidence -> Review -> Save
```

Then keep all advanced AI, source, media, and packaging power behind `Expert controls`.

This gives topic.earth a gentle contribution path for normal people while preserving the serious admin cockpit underneath.
