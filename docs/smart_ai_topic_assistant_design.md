# Smart AI Topic Assistant Design

Date: 2026-04-16

This document defines the simplest useful assistant for `topic.earth`: a topic companion that can talk with users about the latest added topics, help them search for sources, prepare local draft proposals, and keep admin publishing separate from user exploration.

## Product Goal

The assistant should feel like one calm guide, not another scattered panel.

It should help users answer four questions:

- What was added recently?
- What does this topic mean?
- Which sources or media support it?
- How can I propose an update without changing the published app?

It should help admins answer four different questions:

- Which user proposals are ready to review?
- Which sources and media need validation?
- What changed since the last published topic version?
- Can I export or prepare this topic for publishing?

## Phase 1 Boundary

Phase 1 stays browser-first.

- Users can run AI search and source discovery.
- Users can save browser-local drafts and proposals.
- Users cannot edit, update, or overwrite published posts.
- Admin mode can edit topics, manage sources/media, and download ZIP packages.
- Submitted ZIP files are saved locally for admin review handoff.

The assistant must explain this boundary when needed:

```text
I can help you research and prepare a local proposal. Published posts can only be changed in admin mode.
```

## Core Assistant Modes

Use one assistant entry point with four visible modes.

### 1. Explain This Topic

Use when a user opens a topic and asks what it means.

Inputs:

- selected topic
- summary, insight, source URL
- source/media tokens
- regional position
- related latest topics

Output:

- short explanation
- why it matters
- source confidence
- suggested next question

### 2. Find Updates

Use when the user clicks `Check Topic Update`.

Inputs:

- selected topic
- trusted source categories
- optional user search question
- date window

Output:

- update candidates
- source list
- media candidates
- "save as browser draft" proposal

Never write directly to the selected topic in user mode.

### 3. Prepare Proposal

Use when a user wants to contribute an initiative, correction, local media, YouTube link, site link, or source list.

Inputs:

- user text
- source links
- media links or browser cached files
- selected topic or new topic

Output:

- browser-local `TopicDraft`
- missing fields checklist
- admin review summary
- optional ZIP export later

### 4. Admin Review

Use only in admin mode.

Inputs:

- selected topic or browser draft
- admin notes
- source/media validation state
- package/export state

Output:

- editable topic update
- source/media review checklist
- single-topic ZIP submit package
- publish readiness status

## Topic Context Contract

The assistant should receive a compact context object, not scrape the DOM.

Recommended shape:

```js
{
  mode: "explain-topic",
  userRole: "user",
  selectedTopic: {
    id: "topic-id",
    title: "Topic title",
    category: "climate-adaptation",
    summary: "...",
    insight: "...",
    region: "Europe",
    country: "Belgium",
    date: "2026-04-16",
    topicStatus: "published",
    sourceUrl: "https://example.org/source"
  },
  sources: [
    {
      name: "Source name",
      url: "https://example.org",
      category: "official",
      verified: true
    }
  ],
  media: [
    {
      type: "image",
      url: "https://example.org/image.jpg",
      sourceUrl: "https://example.org/source",
      caption: "Optional caption"
    }
  ],
  latestTopics: [
    {
      id: "latest-id",
      title: "Latest topic",
      date: "2026-04-16",
      category: "energy-transition"
    }
  ]
}
```

## Latest Topic Awareness

The assistant should not guess what is latest. It should read latest topics from app state.

Recommended order:

1. Browser-local custom drafts, sorted by `storage.lastSavedAt`, `review.downloadedForAdminAt`, or `date`.
2. App data topics, sorted by `date`.
3. News/update candidates generated during the current session.
4. Admin packages downloaded during the current session.

When the user asks "what is new?", the answer should be grounded in those lists.

## Access Rules

Use the same role boundary everywhere.

| Action | User mode | Admin mode |
| --- | --- | --- |
| Explain selected topic | Yes | Yes |
| AI source search | Yes | Yes |
| Save browser-local draft | Yes | Yes |
| Edit published topic | No | Yes |
| Manage source records on published topic | No | Yes |
| Apply AI output to existing topic | No | Yes |
| Download single-topic submit ZIP | No in phase 1 UI | Yes |
| Download all browser draft ZIP | No | Yes |
| Publish to app data | No | Future admin backend |

If a user tries a restricted action, the assistant response should redirect:

```text
I cannot change the published post from user mode. I can prepare a local proposal with sources and media for admin review.
```

## Conversation Patterns

Good assistant prompts are short and action-oriented.

### Topic Explanation

```text
Explain this topic in plain language. Use only the selected topic context and attached sources. Mark any uncertain claim as "needs verification".
```

### Update Search

```text
Find recent update angles for this topic. Return candidates with source URL, source type, relevance, and whether each candidate should become a browser draft.
```

### Proposal Builder

```text
Turn this user request into a browser-local TopicDraft. Keep published-topic changes out of scope. Ask for missing fields only when needed for admin review.
```

### Admin Review

```text
Review this TopicDraft for publication readiness. List missing evidence, media rights concerns, duplicate topic risk, and a suggested admin decision.
```

## Source And Media Handling

The assistant should treat sources and media as separate but linked records.

Source record:

- name
- URL
- category
- date accessed
- verification state
- reason it supports the topic

Media record:

- media type
- direct media URL or browser asset key
- source page URL
- caption
- rights/license note
- whether the browser could package it

If the browser cannot fetch source metadata because of CORS, the assistant should still keep the URL and ask for manual review.

## UI Entry Points

Keep the visible assistant access small.

- Topic detail: `Check Topic Update`
- Topic workspace: `AI Assist`
- Source manager: `Suggest Sources`
- Admin topic detail: `Submit ZIP`
- Settings: API provider status and quota diagnostics

Avoid adding separate "Smart Topic Builder" and "AI Research Assistant" buttons that compete with each other. They should feel like modes inside one assistant.

## Future Hosted Version

When hosted, replace local ZIP/email handoff with a real admin queue.

Recommended next step:

1. `POST /api/topic-proposals`
2. Store draft JSON, source records, media records, and packaged files.
3. Send admin notification email.
4. Admin reviews in a queue.
5. Approved topic publishes to app data or a database.

The phase 1 ZIP package should already match this future queue shape, so migration is mostly transport and storage.

## Implementation Checklist

- Build one `TopicAssistantContext` object from app state.
- Keep user mode read-only for published posts.
- Keep source/media updates as browser-local drafts until admin review.
- Add a "latest topics" context provider from `allPoints` and local custom drafts.
- Make AI failures graceful: source search can become manual source entry.
- Save all assistant-generated proposals with explicit `topicStatus`.
- Make admin ZIP export include README, manifest, topic JSON, source records, media references, and email instructions.
