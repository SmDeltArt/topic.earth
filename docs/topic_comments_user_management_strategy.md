# Topic Comments And User Management Strategy

Date: 2026-04-28

This note proposes how `topic.earth` can add topic-level comments, user accounts, and moderation while staying compatible with Vercel hosting.

## Short Answer

Comments cannot be a purely static feature.

The current app can stay mostly static for globe/map/topic browsing, but comments need:

- an identity provider;
- API routes or Vercel Functions;
- a durable database;
- moderation rules;
- a user/profile model;
- rate limiting and abuse controls.

Recommended direction:

```text
Public static topic.earth UI
  -> Comments API on Vercel
  -> Auth provider for user identity
  -> Postgres for comments/users/moderation
  -> optional Blob storage for avatars or comment media
```

## Important Distinction

There are three different "user" concepts. They should not be mixed.

### Vercel Deployment Access

Vercel Authentication / deployment protection is for controlling who can view a deployment.

Use it for:

- private admin preview;
- staging URLs;
- internal review deployments.

Do not use it as the main public community account system. It expects Vercel accounts and deployment access, so it is not the right mental model for public topic comments.

### Admin / Creator Mode

The existing `admin` profile and capability model is for trusted creators.

Use it for:

- create/edit/delete topics;
- manage evidence/media;
- export packages;
- moderate comments later.

This should stay separate from public comment accounts.

### Public Community Users

Public users are people who want to follow topics, comment, ask questions, or propose local updates.

Use a real auth/user-management provider for them.

Recommended:

- Clerk for fastest Vercel + Next.js user management;
- Auth0 or Descope if we prefer those ecosystems;
- Sign in with Vercel only for a creator/admin audience that already has Vercel accounts.

## Recommended Stack

### Preferred Production Path

```text
Next.js App Router on Vercel
Clerk for authentication and user management
Neon Postgres through Vercel Marketplace for comments
Vercel Blob for user-uploaded comment media later
Upstash Redis for rate limiting later
```

Why:

- Next.js gives clean server route handlers under `app/api/.../route.ts`.
- Clerk gives sign-in, sign-up, sessions, user profiles, and role metadata.
- Postgres is the right store for comments because comments need relations, moderation state, sorting, and queries by topic/user.
- Blob is good for media files, but not for comment records.
- Redis is useful for rate limits and abuse control, not as the source of truth.

### Minimal Hybrid Path

If we want to avoid a full app migration immediately:

```text
Keep current static HTML/JS
Add /api/comments Vercel Functions
Use a hosted auth provider token in frontend
Use Neon Postgres from the API function
```

This is possible, but the auth and session handling will be more manual. It is better as a bridge than as the final architecture.

## Product Model

Comments should attach to published topics first.

Do not attach public comments directly to browser-local drafts in phase 1. Local drafts are private, unstable, and can disappear with browser storage. Later, draft/proposal discussion can exist in an admin review queue.

Recommended first scope:

```text
Published topic -> public comment thread
Regional local proposal -> no public comments yet
Admin review draft -> internal notes only
```

## User Roles

Keep roles simple.

```text
guest
  read published topics and approved comments

member
  create comments
  edit own comments for a short window
  delete own comments by soft-delete
  report comments

trusted_member
  same as member
  lower friction, maybe auto-approve after history is good

moderator
  hide comments
  resolve reports
  lock threads
  mark comments as reviewed

admin
  all moderator rights
  manage topics, users, settings, exports
```

The existing app capabilities can later map these to actions:

```text
comment:create
comment:update-own
comment:delete-own
comment:report
comment:moderate
comment:lock-thread
user:ban
user:assign-role
```

## Comment States

Use explicit states. Never hard-delete by default.

```text
visible
pending-review
hidden-by-moderator
hidden-by-report-threshold
deleted-by-user
deleted-by-admin
spam
```

Public UI should only show `visible` comments.

Admin/moderator UI can show everything with filters.

## Database Model

Recommended first Postgres tables.

### `app_users`

Stores the app-level profile linked to the auth provider.

```sql
create table app_users (
  id uuid primary key default gen_random_uuid(),
  auth_provider text not null,
  auth_user_id text not null,
  display_name text not null,
  avatar_url text,
  role text not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_provider, auth_user_id)
);
```

### `topic_comment_threads`

One row per commentable topic.

```sql
create table topic_comment_threads (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null unique,
  topic_title text not null,
  status text not null default 'open',
  comment_count integer not null default 0,
  last_comment_at timestamptz,
  created_at timestamptz not null default now()
);
```

Use the current static topic id as `topic_id`. This makes comments survive as long as topic IDs remain stable.

### `topic_comments`

```sql
create table topic_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references topic_comment_threads(id),
  topic_id text not null,
  parent_id uuid references topic_comments(id),
  author_id uuid not null references app_users(id),
  body text not null,
  status text not null default 'pending-review',
  language text,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes:

```sql
create index topic_comments_topic_created_idx
  on topic_comments (topic_id, created_at desc);

create index topic_comments_parent_idx
  on topic_comments (parent_id);

create index topic_comments_author_idx
  on topic_comments (author_id, created_at desc);

create index topic_comments_status_idx
  on topic_comments (status);
```

### `comment_reports`

```sql
create table comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references topic_comments(id),
  reporter_id uuid references app_users(id),
  reason text not null,
  note text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);
```

### `comment_moderation_events`

```sql
create table comment_moderation_events (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references topic_comments(id),
  actor_id uuid references app_users(id),
  action text not null,
  from_status text,
  to_status text,
  reason text,
  created_at timestamptz not null default now()
);
```

## API Shape

Public read:

```text
GET /api/topics/:topicId/comments
```

Returns only visible comments:

```json
{
  "topicId": "topic-id",
  "threadStatus": "open",
  "comments": []
}
```

Authenticated write:

```text
POST /api/topics/:topicId/comments
PATCH /api/comments/:commentId
DELETE /api/comments/:commentId
POST /api/comments/:commentId/report
```

Moderator/admin:

```text
GET /api/moderation/comments?status=pending-review
POST /api/moderation/comments/:commentId/hide
POST /api/moderation/comments/:commentId/approve
POST /api/moderation/comments/:commentId/lock-thread
```

## Frontend UX

Topic detail should get one calm section:

```text
Discussion
```

Guest:

- reads approved comments;
- sees `Sign in to comment`;
- no text box until signed in.

Member:

- can write one comment;
- sees whether it is pending review;
- can edit/delete own recent comments.

Moderator/admin:

- sees pending/hidden badges;
- can approve/hide/report-resolve inline;
- can lock a thread from the topic panel.

Keep comments visually separate from evidence/sources. Evidence proves the topic; comments are community discussion.

## Moderation Rules

Start conservative.

Recommended phase 1:

- first comment by any member starts as `pending-review`;
- trusted members can auto-publish later;
- comments with links can require review;
- reports do not delete comments automatically, but can hide after threshold;
- admins can lock a topic thread during abuse or sensitive events;
- user deletion is soft-delete so replies and moderation history remain coherent.

Add clear community rules before launch:

- stay on topic;
- no harassment;
- no doxxing or private personal data;
- sources are welcome;
- moderators can hide comments.

## Privacy And Safety

Do not store more profile data than needed.

Store:

- auth provider user id;
- display name;
- avatar URL, optional;
- role/status;
- comment history.

Avoid storing:

- raw email in public comment records;
- IP addresses unless needed for abuse controls and disclosed;
- private profile fields from the auth provider.

If email is needed for admin/moderation, keep it server-side and never include it in public API responses.

## Topic Identity Requirement

Comments depend on stable topic IDs.

Before enabling comments publicly:

- every published topic needs a durable string id;
- updates should preserve `topic_id`;
- replacing a topic should migrate or alias the old id;
- draft/local proposal ids should not become public comment ids until published.

Add this later if topics can be renamed/replaced:

```text
topic_aliases(old_topic_id, new_topic_id, reason, created_at)
```

## Rollout Plan

### Phase 0: Prepare

- keep comments disabled in current static demo;
- stabilize published topic ids;
- decide provider: Clerk recommended;
- decide database: Neon Postgres recommended;
- add `comment:*` capabilities to the access model docs.

### Phase 1: Read-Only Discussion Placeholder

- add a `Discussion` section in topic detail;
- show "Comments are coming after account setup";
- no backend yet.

### Phase 2: Auth + Database

- create Next.js/Vercel API routes or Vercel Functions;
- provision Clerk and Neon through Vercel Marketplace;
- create user and comment tables;
- support `GET comments` and `POST comment`;
- require sign-in to post.

### Phase 3: Moderation

- add pending review queue;
- add approve/hide/report;
- add role checks;
- add audit log.

### Phase 4: Better Community

- replies;
- comment counts in layer/detail cards;
- follow topic;
- notifications;
- trusted member auto-approval;
- AI summaries of long topic discussions, admin-reviewed only.

## Recommended First Implementation Choice

Do not add a public comment text box directly to the current static app.

First decision should be:

```text
Are comments public community features, or private admin/creator notes?
```

If public community:

```text
Use Clerk + Neon Postgres + Vercel API routes.
```

If private admin notes:

```text
Keep them admin-only first, maybe stored with topic review packages or a private Postgres table.
```

The public community path is more valuable long-term, but it requires real user management and moderation from day one.

## References

- Vercel Storage overview: https://vercel.com/docs/storage
- Vercel Marketplace storage: https://vercel.com/docs/marketplace-storage
- Vercel Functions API reference: https://vercel.com/docs/concepts/functions/edge-functions/edge-functions-api
- Clerk on Vercel Marketplace: https://vercel.com/marketplace/clerk
- Clerk Next.js middleware: https://clerk.com/docs/reference/nextjs/clerk-middleware
- Clerk App Router auth: https://clerk.com/docs/reference/nextjs/app-router/auth
- Sign in with Vercel: https://vercel.com/docs/sign-in-with-vercel
- Vercel Authentication / deployment protection: https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication
