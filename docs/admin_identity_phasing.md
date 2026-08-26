# Admin Identity And Phase Plan

Date: 2026-05-06

Status: planning contract for Phase 1, with later phases staged but not required now.

This note extends `admin_user_mode_management.md` and `topic_comments_user_management_strategy.md`.

## Short Recommendation

Keep the public app simple now, and treat authentication as a staged control layer.

```text
Phase 1
  public topic.earth stays guest-readable
  localhost/dev stays admin-capable
  no public write access
  no public account requirement

Phase 2
  private admin surface
  Google/Microsoft login for Admins
  GitHub login for MasterAdmin
  server-side role checks before any write

Phase 3
  review queue and publishing workflow
  Admin drafts -> MasterAdmin approval -> GitHub/Vercel publish

Phase 4
  public members only where useful
  sign in only for comments, follows, reports, or proposals
```

Do not make normal users sign in just to explore topic.earth.

## Identity Layers

### Guest

Guests are the default public audience.

Allowed:

- open `topic.earth`;
- explore globe, Regional, Space, Fever, and topics;
- use read-only settings;
- search and focus map locations;
- prepare local, browser-only proposals if the UI clearly marks them as local.

Not allowed:

- publish;
- edit published topics;
- change project settings;
- access API settings;
- moderate comments;
- write to production storage.

### Member

Members are a later community role, not Phase 1.

Use only when the user wants to comment, follow topics, report comments, or submit public proposals.

Recommended providers later:

- Google;
- Microsoft;
- email link or passkey if the auth provider supports it cleanly.

### Admin

Admins are trusted topic contributors or moderators.

Recommended login:

- Google account;
- Microsoft account.

Allowed later:

- create topic drafts;
- update admin-only draft metadata;
- manage topic evidence and media;
- moderate comments;
- submit a topic for review.

Admins should not be able to silently push production changes unless that is explicitly enabled for a trusted account.

### MasterAdmin

MasterAdmin is the infrastructure and governance owner.

Recommended login:

- GitHub account.

Allowed:

- manage GitHub repository access;
- approve production publishing;
- manage Vercel project/domain/secrets;
- assign Admin roles;
- approve governance or license changes;
- handle ASBL stewardship decisions when the association exists.

GitHub login fits this level because production source control and Vercel deployments already flow from GitHub.

## One Auth System, Multiple Providers

Use one app-level identity provider later, with several OAuth providers.

```text
Clerk or equivalent auth provider
  GitHub provider -> possible MasterAdmin
  Google provider -> possible Admin or Member
  Microsoft provider -> possible Admin or Member
```

The app role must be stored separately from the OAuth provider.

Example:

```text
provider = github
role = master_admin

provider = google
role = admin

provider = microsoft
role = member
```

A GitHub login should not automatically mean MasterAdmin. A Google login should not automatically mean Admin. Provider proves identity; the app role grants power.

## Deployment Shape

Recommended production split:

```text
topic.earth
  public
  profile = demo
  no admin toggle
  no API settings
  no production writes

admin.topic.earth or protected preview
  private
  profile = admin
  auth required
  role checks required server-side

localhost / dev folder
  local development
  profile = admin or dev
  can keep the maker cockpit
```

WordPress should stay a domain/content bridge. It should not become the authority for admin roles, publishing, or project secrets.

## Publishing Flow

Phase 2 and Phase 3 should use an explicit review path.

```text
Admin creates or edits a topic draft
  -> draft is stored with author, timestamp, evidence, media, and requested change
  -> Admin submits for review
  -> MasterAdmin approves or requests changes
  -> approved change becomes a GitHub commit/PR or server-side publish event
  -> Vercel deploys production from the approved source
```

This keeps Vercel/GitHub as the production truth while allowing Admins to work from a friendlier surface.

## Phase Plan

### Phase 1: Current Work

Goal: keep the app public, stable, and testable.

- keep `topic.earth` guest-readable;
- keep local/dev admin mode for building;
- keep `AppAccess` as the UI capability gate;
- keep public production writes disabled;
- document the future role split;
- test that local app boot, vendors, favicon, and Regional still work.

Acceptance:

- public/demo profile cannot be unlocked with only localStorage;
- localhost can still run the admin-capable maker cockpit;
- no public login is required;
- no auth provider is required yet.

### Phase 2: Private Admin Access

Goal: introduce real identity for trusted creators.

- create `admin.topic.earth` or a protected Vercel preview;
- add one auth provider;
- enable GitHub, Google, and Microsoft as sign-in providers;
- store app roles separately from provider identity;
- protect admin routes and API writes on the server.

Acceptance:

- Google/Microsoft Admins can enter the admin surface;
- GitHub MasterAdmin can approve/publish/manage roles;
- role checks happen in server endpoints, not only in browser UI.

### Phase 3: Review Queue

Goal: make publishing controlled.

- store topic drafts and review events;
- separate draft, submitted, approved, rejected, and published states;
- allow Admins to submit;
- allow MasterAdmin to approve production publishing;
- preserve audit history.

Acceptance:

- every production change has an actor and timestamp;
- Admin work can be reviewed before reaching GitHub/Vercel production.

### Phase 4: Public Community

Goal: add accounts only where they are worth the friction.

- comments;
- reports;
- follows;
- local proposals;
- member profile and moderation states.

Acceptance:

- guests can still explore without login;
- members sign in only when they write or subscribe;
- comments and proposals have moderation.

### Phase 5: ASBL Stewardship

Goal: map project authority to the Belgian ASBL.

- document board/steward roles;
- define who can be MasterAdmin;
- define who can appoint Admins;
- define asset, trademark, and data responsibilities;
- connect governance to `GOVERNANCE.md`, `NOTICE.md`, and license files.

Acceptance:

- project control is no longer only technical;
- the ASBL can explain how topic.earth is protected and maintained.

## Security Rule

`localStorage.euroearth_admin_mode` is only a local UI convenience.

It is useful for Phase 1 testing, but it must never be the real production security boundary for publishing, moderation, API settings, secrets, or user data.

