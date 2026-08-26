# Interactive Tutorial Bubble Audit

Date: 2026-05-16

Implementation update, 2026-05-17: the `__actual_vs\topic.earth` app has the `TutorialGuide` shell, first-visit/guided/admin steps, contextual triggers, browser storage, `Read`, and Settings controls. Remaining tutorial work is the optional AI `Ask` micro-companion and continued migration of older static hints into on-demand bubbles.

## Purpose

This audit turns the current static help text direction into a lighter interactive tutorial path for `topic.earth`.

The product goal is not to add more text. The goal is to replace scattered hints with contextual info bubbles that appear at the right time, explain one useful thing, then get out of the way.

## Short Recommendation

Build a small `TutorialGuide` layer with guided bubbles, tutorial levels, and contextual triggers.

The first version should:

- reuse the existing `tutorialModeEnabled` setting;
- replace many always-visible `.setting-hint` blocks with on-demand bubbles;
- anchor bubbles to real UI elements with `data-tutorial-id`;
- use short messages from `shared/topic-earth-ui.csv`;
- show one bubble at a time;
- allow Skip, Next, and Turn off;
- persist completed steps in browser storage;
- respect reduced motion and small screens.

This should make the interface feel cleaner while still helping new users understand the globe, topic cards, Regional map, source/evidence flow, and Admin/User mode boundary.

## Existing Direction From Docs

The current docs already support this move.

`docs/FLOW.md` says the app should default to contribution, not configuration, with one obvious place to type or paste. Interactive bubbles match that because they keep configuration text out of the first screen.

`docs/topic_builder_lambda_user_simplification.md` says the user should not have to understand the system before contributing. A contextual guide can explain the composer only when the cursor or pasted input reaches that part.

`docs/topic_management_standardization_plan.md` says there should be one workspace, one evidence system, and fewer separate AI entry points. Tutorial bubbles should reinforce that mental model instead of explaining every panel as a separate tool.

`docs/smart_ai_topic_assistant_design.md` says the assistant should feel like one calm guide, not another scattered panel. The tutorial layer should be the same kind of calm guide: small, contextual, and action-oriented.

`docs/admin_user_mode_management.md` and `docs/admin_demo_version_strategy.md` draw a clear User/Admin boundary. The tutorial must explain this boundary in user mode without exposing admin mechanics.

`docs/translation_coverage_audit.md` requires stable UI phrases to live behind translation keys. Tutorial copy should follow the same rule from the start.

## Current Code Hooks

Useful pieces already exist:

- `Settings.DEFAULT_SETTINGS.tutorialModeEnabled` controls whether tutorial text is visible.
- `app.main.js` applies `body.tutorial-mode-off`.
- `styles.css` hides `.setting-hint`, `.tutorial-hint`, `.help-text`, and `.usage-note` when tutorial mode is off.
- `lib/globe.js` already has a reusable visual pattern for pinned/hover topic tooltips with media vignettes.
- `shared/topic-earth-ui.csv` already contains `settings.tutorialTips` and `settings.tutorialTipsHint`.
- Many buttons already have stable `data-action` attributes that can be used as tutorial anchors.

Main gap:

There is no tutorial state machine. Current help is mostly static text inside panels, so it competes with the actual task.

## Proposed Product Model

Use three guide levels.

### Level 1: First Visit

Audience: new public user.

Tone: very light.

Behavior:

- explain the active view;
- point at the current topic marker;
- show how to open a topic;
- explain that Settings can turn tips off;
- stop after a few interactions.

Example path:

```text
Globe loaded
  -> "Spin the globe or choose a layer."
Open a topic
  -> "This card is the topic. Sources and media live below."
Open Settings
  -> "You can turn interactive tips off here."
```

### Level 2: Guided Tasks

Audience: interested user who starts doing something.

Tone: practical and contextual.

Behavior:

- appears when the user enters Regional, opens a topic, uses Read, or starts a proposal;
- explains one next action, not the whole system;
- can highlight an element or show a small moving cursor hint.

Example path:

```text
Regional mode
  -> "Search or move the map to focus a place."
Tracer chemin active
  -> "Click points on the map. Right-click or long tap can open path actions later."
Topic composer open
  -> "Paste a source, image, or note here. The preview updates from this same draft."
```

### Level 3: Expert/Admin Guidance

Audience: admin or creator.

Tone: denser, but still anchored.

Behavior:

- appears only in admin-capable mode;
- explains source review, media rights, API settings, export packages, and publish readiness;
- avoids public/demo UI.

Example path:

```text
Admin mode on
  -> "Admin mode can edit drafts and manage evidence."
Source manager open
  -> "Mark source type and review state before export."
Export package
  -> "This ZIP is a review package, not a published topic."
```

## Bubble Behavior

Each bubble should be anchored to an element and disappear predictably.

Recommended behavior:

- one active bubble maximum;
- title no longer than 4 words;
- body no longer than 2 lines;
- primary action: Next, Try it, or Got it;
- secondary action: Skip;
- persistent action: Turn off tips;
- auto-close only for passive confirmation bubbles;
- do not block interaction unless it is a guided task;
- avoid full-screen overlays except for first-run orientation.

For motion:

- use a small ghost cursor only for "try this" guidance;
- never animate continuously for more than about 2 seconds;
- disable motion when `prefers-reduced-motion: reduce`;
- never use motion as the only explanation.

## Suggested Technical Shape

Add a guide module:

```text
lib/tutorial-guide.js
components/TutorialBubble.js
```

Suggested state:

```js
{
  enabled: true,
  level: "first-visit|guided|expert",
  completed: ["open-topic", "open-settings"],
  dismissed: ["regional-route-options"],
  currentStep: null,
  lastShownAt: {}
}
```

Suggested step shape:

```js
{
  id: "open-topic-card",
  level: "first-visit",
  mode: "main",
  anchor: "[data-tutorial-id='topic-card']",
  trigger: "topic-opened",
  titleKey: "tutorial.topicCard.title",
  bodyKey: "tutorial.topicCard.body",
  actionKey: "common.gotIt",
  placement: "auto",
  motion: "none|cursor|pulse",
  once: true
}
```

Add stable anchors in UI:

```html
<button data-action="toggle-mode" data-tutorial-id="interaction-mode">
```

Use browser storage for progress:

```text
euroearth_tutorial_state
```

Keep copy in:

```text
shared/topic-earth-ui.csv
```

## First Steps To Implement

Start with a small slice, not the whole app.

### Slice 1: Shell

- Add `TutorialGuide` state and event API.
- Add one reusable `TutorialBubble` DOM component.
- Add `data-tutorial-id` to TopBar buttons, DetailPanel topic card, Settings tutorial toggle, and Regional search panel.
- In Settings, hover, focus, or click on important controls should update the active tutorial bubble so dense options explain themselves without permanent wall text.
- Add bubble positioning with viewport collision handling.
- Add storage for completed and dismissed steps.

### Slice 2: First-Visit Path

- Globe intro.
- Topic marker intro after first hover/click.
- Topic detail intro.
- Settings "turn off tips" intro.

### Slice 3: Regional Path Guidance

- Regional search panel.
- Add point / trace path / route mode explanations.
- When `Tracer chemin` is active, show a contextual bubble on the right side with the next action.
- Keep the layer panel hidden or quiet while a topic is open, matching recent UI direction.

### Slice 4: Composer And Evidence Guidance

- Smart input.
- Evidence lane.
- Media add URL/file.
- AI suggestion patch behavior.
- Save on this device versus admin export.

### Slice 5: Admin Guidance

- Admin/User toggle.
- API settings widget.
- Source review.
- Media rights.
- Export review package.

## Tutorial Copy Strategy

Use short action copy. Avoid long explanations inside bubbles.

Good:

```text
Open A Topic
Click a glowing point to read its topic card.
```

Good:

```text
Evidence
Sources, images, videos, and notes stay attached to this draft.
```

Avoid:

```text
This interface contains several advanced tools for managing sources, media, draft records, route metadata, export package readiness, and admin publishing states.
```

If a concept needs more than two lines, the bubble should link to a "More" drawer or assistant answer.

## Priority Tutorial Map

| Area | User Need | First Bubble |
| --- | --- | --- |
| TopBar modes | Understand views | "Choose Map, Globe, Space, or Fever." |
| Globe markers | Know what to click | "Glowing points are topics." |
| Current topic pulse | Know what is active | "This is the current topic." |
| Detail panel | Read without confusion | "Summary first. Sources below." |
| Layer panel | Filter data | "Open a layer to browse its topics." |
| Regional search | Find a place, topic, address, city, coordinates, or current area | "Search accepts topic names, places, addresses, cities, or coordinates." |
| Regional position | Understand auto-locate precision | "Auto locate only focuses Regional and respects the precision setting." |
| Regional path | Draw/edit/attach a path | "Click points, drag handles, and attach the path to a selected topic." |
| Regional route | Route then manually correct | "Type or click a destination, then edit the route as a path if needed." |
| Composer input | Start contributing | "Paste a note, URL, or media here." |
| Evidence lane | Attach proof | "Evidence supports the draft." |
| Settings | Control tips | "Turn interactive tips off here." |
| Admin toggle | Understand risk | "Admin mode unlocks editing." |
| API settings | Hosted widget | "Provider settings open in the widget." |

## Risks

- Too many bubbles can become another noisy panel.
- Bubbles without persistence will annoy returning users.
- Motion can feel gimmicky or inaccessible if overused.
- Tutorial text can become another hardcoded translation debt.
- Admin guidance can confuse public users if capability checks are not respected.

Mitigations:

- one bubble at a time;
- strict step frequency limits;
- tutorial levels;
- translation keys from day one;
- respect `AppAccess.can(...)`;
- reduced-motion handling;
- a visible off switch in Settings.

## Acceptance Criteria

A first-time user can:

- discover what to click on the globe;
- open a topic;
- understand where sources and media live;
- find Settings and turn tips off;
- use Regional search or route/path mode without reading a manual.

An admin can:

- toggle expert guidance;
- understand evidence/media review actions;
- open API settings without local-path language;
- export a package without confusing it with publishing.

The UI passes the intended product test when:

```text
The app feels less text-heavy, not more.
New users get help only at the moment they need it.
Returning users can keep the interface calm.
```

## Recommended Next Move

Implement Slice 1 and Slice 2 first.

Do not rewrite every hint at once. Create the guide shell, wire four first-visit steps, and test whether the app feels lighter. Once that works, migrate the largest static hints into contextual bubbles one area at a time.
