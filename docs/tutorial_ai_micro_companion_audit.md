# Tutorial AI Micro Companion Audit

Date: 2026-05-16

Implementation update, 2026-05-17: `Read` is implemented in the tutorial bubble and Settings now shows `Development assistant: Codex`. The optional `Ask` input is still intentionally pending until a linked AI text provider is ready.

Recording update, 2026-05-21: the tutorial read path now has a local-first audio cache plan in `docs/tutorial_recording_issue.md`. Stable tutorial messages can be generated once with OpenAI `tts-1-hd`, converted with local ffmpeg, and replayed from repo `.mp3` or `.webm` files during recording.

## Purpose

This audit studies whether the tutorial bubble system should gain a tiny read/ask layer.

The goal is to make onboarding feel more alive without turning `topic.earth` into another chat-heavy interface. The tutorial should still work with static translated copy. AI should only add a short contextual explanation when a linked text provider is available.

## Recommendation

Add two optional controls to tutorial bubbles:

- `Read`: speaks the current tutorial bubble with browser TTS or the linked TTS bridge when enabled.
- `Ask`: opens a very small inline question box only when a linked AI text provider is ready.

Keep the AI answer to one or two sentences. It should explain the current UI moment, not generate new topic content, not mutate drafts, and not replace the main detail panel.

## Why This Fits The Existing Flow

`docs/FLOW.md` says the app should feel like one workflow with optional expert controls. A small tutorial companion supports this if it stays attached to the active UI element.

`docs/smart_ai_topic_assistant_design.md` says the assistant should feel like one calm guide, not another scattered panel. The tutorial bubble can become that guide at the exact moment the user needs help.

`docs/interactive_tutorial_bubbles_audit.md` says concepts that need more than two lines should move to a `More` drawer or assistant answer. A short inline AI answer is the lightweight version of that.

## Product Shape

Tutorial bubble:

```text
Guide
One Input
Paste a note, source URL, image link, or local idea...

[Read] [Ask] [Turn off] [Skip] [Got it]
```

When `Ask` opens:

```text
Ask about this step...
```

Answer:

```text
This input is the fastest start: paste what you have, then review the card before saving. Links stay attached as evidence.
```

## AI Boundary

The inline tutorial AI must be deliberately small.

Allowed:

- explain the current tutorial step;
- answer "what does this button do?";
- clarify user/admin boundaries;
- explain why evidence or media matters;
- suggest the next safe action in one or two sentences.

Not allowed:

- edit topic data;
- silently save or publish anything;
- invent facts beyond current app context;
- answer broad climate/history questions from a tutorial bubble;
- become a second general chat panel.

If the user asks a broad topic question, the bubble should redirect to the full topic assistant later.

## AI Availability

Show `Ask` only when:

- `Settings.aiApiLinked === true`;
- a text provider and text model are synced into settings;
- `window.ourEarthAI.createChatCompletion` is available;
- tutorial tips are enabled.

If AI is not ready, hide `Ask`. Do not show a disabled button in public user mode because it reads as broken. Admin Settings can still explain how to connect API settings.

`Read` can stay available without AI because browser speech synthesis already exists.

## Context Contract

The tutorial AI should receive a compact object, not the whole DOM.

```js
{
  mode: "tutorial-help",
  role: "user|admin",
  step: {
    id: "topic-composer-input",
    title: "One Input",
    body: "Paste a note, source URL, image link, or local idea."
  },
  appContext: {
    viewMode: "main|regional|space|fever",
    detailMode: "detail|settings|create-topic|news-update",
    topicTitle: "optional active topic title",
    topicSummary: "optional short summary",
    tutorialLevel: "essential|guided|expert"
  }
}
```

## Prompt Contract

Use a strict short-answer prompt.

```text
You are the topic.earth tutorial helper.
Answer only about the current UI step.
Use at most two short sentences.
Do not invent facts. Do not tell the user to save, publish, or edit unless that action is visible in this step.
If the question is broad, say that the full topic assistant can help later.
```

Response constraints:

- max about 280 characters;
- no markdown table;
- no numbered list;
- no source claims unless already in context;
- no confidence theatre;
- preserve the current UI language.

## Read / Voice Behavior

`Read` should read only:

- bubble title;
- bubble body;
- latest AI micro-answer if visible.

It should not read the whole page or topic card. That keeps the interaction light and avoids surprising audio.

Recommended label:

- English: `Read`
- French: `Lire`

## Badge / Transparency

For a public OpenAI Platform-style app submission, a small transparent badge is useful, but it should be careful.

Recommended badge:

```text
Built with Codex assistance
```

In Settings, show runtime AI separately:

```text
Linked AI: OpenAI / model-name
```

Avoid claiming a specific Codex model inside the app unless the project stores that value as release metadata. A safer field is:

```text
Development assistant: Codex
```

This is honest, avoids implying endorsement, and does not confuse the app's runtime AI provider with the development tool used to build it.

## Implementation Slice

### Slice A: Read Button

- Add `Read` to tutorial bubbles.
- Reuse existing TTS/browser speech path where possible.
- Track no extra state except current read status.
- Hide or stop reading when the bubble closes.

### Slice B: Ask Button

- Add `Ask` only when linked AI text is ready.
- Add inline input and answer area inside the tutorial bubble.
- Build context from active tutorial step and app state.
- Use short prompt and response cap.
- Show a calm fallback if the provider fails.

### Slice C: Settings Badge

- Add an About/Build section in Settings.
- Show `Development assistant: Codex`.
- Show linked runtime provider/model only when synced from API settings.
- Keep this separate from admin-only API configuration.

## Risks

- AI can make the tutorial feel heavier instead of lighter.
- Users may think AI answers become topic data.
- A disabled AI button can look broken.
- Provider errors can interrupt onboarding.
- A Codex badge can be misread as OpenAI endorsement or as the runtime model.

## Mitigations

- Hide `Ask` unless AI is ready.
- Keep answers one or two sentences.
- Label answers as `Guide answer`, not topic content.
- Never auto-save AI output from a tutorial bubble.
- Keep `Read` independent of AI.
- Use neutral build transparency copy.

## Recommended Next Move

Implement `Read` first. It improves the tutorial immediately, works offline, and is low risk.

Then add `Ask` as an expert/guided enhancement behind `aiApiLinked`. The first AI step to test should be `One Input`, because it is the moment users most need a tiny explanation of how source, media, and draft preview connect.
