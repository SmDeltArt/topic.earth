# Admin And Demo Version Strategy

Status: proposal for topic.earth.

Short answer: yes, the app can and should exist in two versions:

- `Admin / creator full`: the complete private tool for building, updating, researching, managing media/sources, exporting, and preparing topics.
- `Demo / user public`: a calm public version where users can explore topics, maps, language, reading, and view settings, but cannot create, edit, delete, export, or configure AI/API keys.

The best move is not to copy the project into two folders. The best move is one codebase with two profiles.

## Recommended Decision

Use one shared app, one shared data model, and two deployment profiles:

- `topic.earth`: public demo/user version.
- `admin.topic.earth`, private Vercel preview, or local-only build: full admin/creator version.

This keeps the project maintainable. Bugs fixed in the map, language, fever loop, reading, topics, and UI are fixed once for both versions. Only the capabilities change.

## Why One Codebase Is Better

Two copied apps look simple at first, but they become fragile fast:

- every translation fix has to be repeated twice;
- every map/topic bug has to be repeated twice;
- every AI/search/media change risks drifting between versions;
- public demo security becomes easy to forget after a quick admin change.

One codebase with profile flags gives us cleaner control:

```js
window.TOPIC_EARTH_PROFILE = 'demo';
// or
window.TOPIC_EARTH_PROFILE = 'admin';
```

Then all important actions ask a central capability layer:

```js
can('topic:create');
can('topic:update');
can('topic:delete');
can('media:upload');
can('source:manage');
can('ai:configure');
can('topic:export');
```

## Profile Matrix

| Feature area | Admin / creator full | Demo / user public |
| --- | --- | --- |
| Globe and map browsing | Yes | Yes |
| Regional OpenStreetMap view | Yes | Yes |
| Existing topic details | Yes | Yes |
| Language selection | Yes | Yes |
| Read aloud / tips / fever warnings | Yes | Yes |
| User display settings | Yes | Yes |
| API/model settings | Yes | No |
| Admin toggle | Yes | No |
| Create topic | Yes | No |
| Modify topic | Yes | No |
| Delete topic | Yes | No |
| Source search/management | Yes | No, or read-only citations only |
| Media upload/AI media insertion | Yes | No |
| Update/check existing topic by AI | Yes | No, or admin-only |
| Export topic ZIP | Yes | No |
| Save custom project data | Yes | No |
| Save local user preferences | Yes | Yes |

For the demo, "settings only" should mean user-safe settings: language, sound/read options, display preferences, and map preferences. It should not mean API keys, provider models, AI settings, or admin workflow settings.

## Current App Is Already Part Way There

The code already contains useful pieces for this split:

- `euroearth_admin_mode` controls whether the current browser session is in admin mode.
- `isAdminMode()` checks whether admin actions should be active.
- `data-admin-only` is used to hide or disable admin UI.
- `TopBar` contains the admin toggle.
- `DetailPanel` contains many creator workflows: source/media management, AI topic actions, topic export, and update flows.
- `LayerPanel` contains admin-only layer/topic controls.
- `app.js` already blocks some create/update/delete operations when admin mode is off.

That is a good first layer. But for a public demo, it is not enough by itself.

Important security note: localStorage admin mode is a UI convenience, not real protection. A visitor can edit localStorage in the browser. The public demo must disable admin capabilities from a central profile, not only hide buttons.

## Proposed Architecture

Add a small capability module, for example:

```text
lib/app-profile.js
```

or:

```text
lib/capabilities.js
```

The module should define:

```js
const PROFILE = window.TOPIC_EARTH_PROFILE || 'demo';

export const Capabilities = {
  profile: PROFILE,
  isAdminBuild: PROFILE === 'admin',
  can(action) {
    const demoBlocked = new Set([
      'admin:toggle',
      'ai:configure',
      'ai:update-topic',
      'source:manage',
      'media:upload',
      'topic:create',
      'topic:update',
      'topic:delete',
      'topic:export',
      'project:data-write',
    ]);

    if (PROFILE === 'demo') {
      return !demoBlocked.has(action);
    }

    return true;
  },
};
```

Then the app should use this everywhere:

```js
if (!Capabilities.can('topic:update')) {
  return;
}
```

This creates a hard public/demo boundary even if a button is accidentally visible.

## Deployment Options

### Option A: Two Vercel Projects

Recommended when topic.earth becomes public.

- `topic.earth`: demo profile, public, no AI secrets exposed.
- `admin.topic.earth`: admin profile, protected by Vercel protection/auth or kept private.

Pros:

- clean mental model;
- easier secrets management;
- safer public deployment;
- easier to explain to contributors.

Cons:

- two deployments to monitor.

### Option B: One Vercel Project, Two Routes

Possible:

- `/`: demo version.
- `/admin`: admin version behind auth.

Pros:

- one project;
- shared hosting configuration.

Cons:

- easier to accidentally expose admin assets;
- requires stricter routing/auth checks;
- not ideal if this remains mostly static HTML/JS.

### Option C: Public Demo On Vercel, Admin Local Only

Good short-term path.

- `topic.earth`: public demo on Vercel.
- local VS/Codex workspace: full admin/creator app.
- exports/backups move content into the public data when ready.

Pros:

- simplest and safest now;
- no public admin risk;
- fits the current workflow while the topic pipeline is still evolving.

Cons:

- admin collaboration is harder until there is a backend/auth layer.

## Static App Profile Setup

Because the current app is mostly static browser JS, the first implementation can be simple:

```html
<script>
  window.TOPIC_EARTH_PROFILE = 'demo';
</script>
```

For the admin version:

```html
<script>
  window.TOPIC_EARTH_PROFILE = 'admin';
</script>
```

Later, if the project moves to a build step, the same idea can become:

```text
APP_PROFILE=demo
APP_PROFILE=admin
```

## Implementation Plan

### Phase 1: Central Profile And Capabilities

- Add `lib/app-profile.js` or `lib/capabilities.js`.
- Default to `demo` when no profile is explicitly set.
- Make demo force admin mode off.
- Make admin mode require both `profile === 'admin'` and the admin toggle.

### Phase 2: Hide Public Admin UI

- Hide the admin toggle in demo.
- Hide API settings in demo.
- Hide create/edit/delete buttons in demo.
- Hide source/media management in demo.
- Hide topic ZIP export in demo.

### Phase 3: Guard All Mutations

UI hiding is not enough. The app should reject blocked actions at the function/event level too:

- topic create;
- topic update;
- topic delete;
- layer create;
- layer delete;
- media upload;
- source management;
- AI update/check;
- export ZIP;
- project data write.

### Phase 4: Data Separation

Demo should read public data and save only harmless preferences:

- selected language;
- sound/read settings;
- map view preferences;
- maybe last opened topic.

Admin can write creator data:

- draft topics;
- source metadata;
- media cache;
- ZIP exports;
- future backend writes;
- future GitHub/Vercel publishing workflows.

### Phase 5: Backend/Auth Later

If topic.earth becomes multi-user, admin writes must be protected server-side.

Rules for later backend:

- public users can read approved topics only;
- pending user submissions go to a moderation queue;
- admins can approve/edit/export/publish;
- API keys stay server-side only;
- AI provider/model settings are admin-only;
- media upload requires authenticated creator/admin permissions.

## Demo UX Target

The demo should feel intentional, not like a disabled admin tool.

Public users should see:

- explore topics;
- open map/regional view;
- read/watch/listen;
- change language;
- change sound/read preferences;
- understand sources/citations;
- maybe submit a future suggestion through a safe form.

Public users should not see:

- admin toggle;
- API model settings;
- "source manage" tooling;
- "AI update topic" tooling;
- create/edit/delete controls;
- raw local draft/export language.

## Admin UX Target

Admin should be the maker cockpit:

- create topic;
- research topic;
- manage sources;
- insert media;
- update/check existing topics;
- translate/review;
- export topic ZIP with data/assets;
- prepare future publication to topic.earth.

Admin can stay a little more technical. Demo must stay simple.

## Test Checklist

Before publishing the demo:

- Demo cannot display the admin toggle.
- Demo cannot open API settings.
- Demo cannot create a topic.
- Demo cannot edit a topic.
- Demo cannot delete a topic.
- Demo cannot upload media.
- Demo cannot manage sources.
- Demo cannot export a topic ZIP.
- Demo cannot trigger AI topic update/check.
- Demo still allows language selection.
- Demo still translates fever warnings and loop messages.
- Demo still allows read/sound preferences.
- Demo still loads globe/map/regional topics.
- Admin version still has the full creator workflow.

## Recommended Next Move

Start with Option C now: public demo profile plus full local/admin profile.

That gives topic.earth a safe public face while we keep improving the smarter creator pipeline privately. When the AI topic pipeline, media/source management, and update process feel stable, move admin to a protected `admin.topic.earth` deployment.

