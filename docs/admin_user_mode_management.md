# Admin / User Mode Management

Status: proposal with first implementation slice.

Implementation note, 2026-04-22: the first slice is now coded with `lib/capabilities.js`, wired into `app.js`, `TopBar`, `LayerPanel`, and `DetailPanel`. The browser entry sets localhost/127.0.0.1 to `admin` and other hosts to `demo`; without an explicit profile, the access layer itself defaults to `demo`.

Identity note, 2026-05-06: keep Phase 1 as guest-readable public app plus local/admin development. Later identity should be staged as described in `docs/admin_identity_phasing.md`: GitHub for MasterAdmin-level infrastructure control, Google/Microsoft for Admin contributors, and optional member login only when comments, follows, reports, or public proposals are added.

This document is a companion to `docs/admin_demo_version_strategy.md`. That strategy decides that topic.earth should stay one codebase with different profiles. This document proposes how Admin / User mode should be managed inside that codebase.

## Short Recommendation

Use three separate concepts:

1. `profile`: where the app is allowed to run admin capabilities.
2. `mode`: whether the current admin-capable session is currently in User or Admin view.
3. `capability`: whether a specific action is allowed right now.

Do not let every component read `localStorage.euroearth_admin_mode` directly forever. Keep the current behavior for now, but move toward one central capability layer.

## Current State

The app already has a useful first draft:

- `TopBar` toggles `euroearth_admin_mode` in `localStorage`.
- `app.js` applies `admin-mode` and `user-mode` body classes.
- `DetailPanel` removes some `[data-admin-only="true"]` UI when admin mode turns off.
- `LayerPanel` hides create/delete controls in user mode.
- Several mutation handlers block create/update/delete actions outside admin mode.

The weak point is that the state is scattered. Components ask `localStorage` directly, and `localStorage` is not security. A public visitor can change it from dev tools.

## Proposed Model

### Profile

`profile` answers: what kind of build/deployment is this?

Recommended profile values:

- `demo`: public topic.earth. Always user-safe. No admin toggle.
- `admin`: private/local creator tool. Can show the Admin/User toggle.
- `dev`: local developer mode. Same as admin, with debug tools allowed.

Default should be `demo` when no profile is explicitly set.

### Mode

`mode` answers: in an admin-capable profile, is the current session acting as User or Admin?

Recommended mode values:

- `user`: browse, read, translate, listen, change safe preferences.
- `admin`: create, edit, delete, manage sources/media, export packages, configure AI/API.

Important rule: `mode=admin` only matters when `profile` allows admin capabilities. In `demo`, admin mode is forced off.

### Capability

`capability` answers: can this exact action happen?

Recommended capability names:

```text
admin:toggle
debug:view
settings:user
settings:api
topic:create
topic:update
topic:delete
topic:submit-package
topic:export-admin-zip
topic:check-update
layer:create
layer:delete
source:manage
media:manage
ai:research
ai:apply-to-topic
project:data-write
```

Every UI button and every mutation handler should eventually ask the same capability function.

## Proposed Capability Rules

| Capability | Demo profile | Admin profile, User mode | Admin profile, Admin mode |
| --- | --- | --- | --- |
| Browse globe/map/topics | Yes | Yes | Yes |
| Fever loop, warnings, TTS | Yes | Yes | Yes |
| Language/display/sound settings | Yes | Yes | Yes |
| AI search/read-only research | Optional | Yes | Yes |
| Admin toggle | No | Yes | Yes |
| API/model settings | No | No | Yes |
| Create topic/layer | No | No | Yes |
| Edit/update/delete topic | No | No | Yes |
| Manage media/sources | No | No | Yes |
| Apply AI output to a topic | No | No | Yes |
| Download admin ZIP/package | No | No | Yes |
| Debug bar/history/admin tools | No | No | Yes |

## Proposed Module

Add a central module later:

```text
lib/capabilities.js
```

Shape:

```js
const DEFAULT_PROFILE = 'demo';

const PROFILE_CAPABILITIES = {
  demo: new Set([
    'settings:user',
    'ai:research'
  ]),
  admin: new Set([
    'admin:toggle',
    'settings:user',
    'settings:api',
    'ai:research',
    'ai:apply-to-topic',
    'topic:create',
    'topic:update',
    'topic:delete',
    'topic:submit-package',
    'topic:export-admin-zip',
    'layer:create',
    'layer:delete',
    'source:manage',
    'media:manage',
    'project:data-write'
  ]),
  dev: new Set([
    'debug:view'
  ])
};

export const AppAccess = {
  getProfile() {},
  getMode() {},
  setMode(mode) {},
  can(capability) {}
};
```

`dev` can inherit from `admin`; the actual implementation can keep this simpler than the sketch.

## UI Rules

User mode should feel complete, not broken.

Show in User mode:

- topic exploration;
- map/globe controls;
- Fever controls safe for viewers;
- language selection;
- reading/voice settings;
- sources and citations as read-only;
- AI research only if output stays draft/local and cannot overwrite published content.

Hide in User mode:

- create layer/topic buttons;
- edit/delete buttons;
- source/media management buttons;
- admin ZIP/package export;
- API provider/model settings;
- debug/admin history controls;
- any copy that says "admin package" or "review package".

Admin mode should be the maker cockpit:

- create and update topics;
- manage source/media tokens;
- run AI checks and apply output to topic drafts;
- export packages;
- use debug/history tools;
- configure API/provider settings.

## Mutation Rules

UI hiding is not enough. Every write path should guard itself:

- `handleNewLayer` must require `layer:create`.
- `handleNewTopic` must require `topic:create`.
- `handleUpdateTopic` must require `topic:update`.
- `handleDeleteTopic` must require `topic:delete`.
- `handleDeleteLayer` must require `layer:delete`.
- source/media editing must require `source:manage` or `media:manage`.
- "Post to Topic" must require `ai:apply-to-topic`.
- admin exports must require `topic:submit-package` or `topic:export-admin-zip`.
- API settings must require `settings:api`.

The guard should be in code paths, not only in button visibility.

## Storage Rules

User-safe storage:

- language;
- display preferences;
- read/TTS preferences;
- Fever sound/voice preferences;
- map view preferences.

Admin storage:

- custom layers;
- custom topics;
- source metadata;
- media tokens;
- draft state;
- admin exports;
- API/provider settings.

Public demo should never depend on `localStorage` to protect admin storage. It should not expose admin write capabilities at all.

## API Settings And Secrets

The admin toggle is not authentication.

For public demo:

- do not expose API keys;
- do not expose API vault bypasses;
- do not expose provider/model configuration;
- keep any AI calls behind safe, server-side endpoints later.

For local/private admin:

- API settings can remain available while the project is local;
- document clearly that local storage is convenience storage, not a secure multi-user secret manager.

## Migration Plan

### Phase 1: Document And Inventory

- Keep this document as the mode contract.
- Keep `docs/admin_demo_version_strategy.md` as the deployment/profile contract.
- Inventory every `localStorage.getItem('euroearth_admin_mode')` call.
- Inventory every `[data-admin-only="true"]` UI element.

### Phase 2: Add Central Access Module

- Add `lib/capabilities.js`.
- Make it default to `demo`.
- In local/private use, set profile to `admin` or `dev`.
- Make `isAdminMode()` call the central module.

### Phase 3: Replace Direct Checks

Replace scattered checks in:

- `TopBar`;
- `LayerPanel`;
- `DetailPanel`;
- `app.js`;
- settings/API UI.

Use `AppAccess.can(capability)` everywhere.

### Phase 4: Public Demo Lockdown

- Hide admin toggle unless `can('admin:toggle')`.
- Force mode to `user` in `demo`.
- Guard every write function with capabilities.
- Confirm no API settings or admin packages are reachable in demo.

### Phase 5: Admin Experience Polish

- Make Admin/User toggle explain what changes.
- Add a small Admin badge only in admin-capable profiles.
- Add a "Back to User View" action for testing the public experience.
- Keep User mode calm and free of half-disabled admin controls.

## Acceptance Checklist

Before shipping a public demo:

- Demo loads with `profile=demo`.
- Admin toggle is not visible.
- `localStorage.euroearth_admin_mode=true` cannot enable admin actions in demo.
- Create/edit/delete actions are blocked at handler level.
- API settings are hidden or user-safe only.
- Admin exports cannot be triggered.
- User settings still work.
- Fever translation/voice still works.
- Globe, map, topics, and regional view still work.

Before using private admin:

- Admin profile can toggle User/Admin mode.
- Admin mode can create, edit, delete, manage media/sources, and export.
- User mode inside admin profile previews the public experience.
- Debug/history tools stay admin-only.

## Proposed Next Step

Implement the central `lib/capabilities.js` layer first, then migrate only the top-level access checks:

- `TopBar` admin toggle visibility and click handling;
- `app.js` `isAdminMode()`;
- `DetailPanel.isAdminMode()`;
- `LayerPanel` admin-only buttons.

After that, migrate write handlers one by one.
