# GitHub authentication and server permissions

topic.earth uses Auth.js Core with GitHub OAuth, a server callback, state and PKCE validation, CSRF-protected sign-in/sign-out, and encrypted cookie sessions. The vanilla JavaScript Managers remain in place. No database or repository access is required to sign in.

## Register the OAuth applications

Create separate local and production applications in GitHub **Settings → Developer settings → OAuth Apps → New OAuth App**. Do not register these as GitHub Apps requiring repository installation.

| Environment | Homepage URL | Authorization callback URL |
| --- | --- | --- |
| Local development | `http://localhost:5501` | `http://localhost:5501/api/auth/callback/github` |
| Production | `https://www.topic.earth` | `https://www.topic.earth/api/auth/callback/github` |

The production hostname comes from the existing topic.earth project README. `AUTH_URL` explicitly fixes the canonical origin; request Host and forwarding headers cannot change the callback. Production must use HTTPS. Keep previews disabled until a separate OAuth application, fixed preview domain and preview-specific environment variables are configured. Do not reuse production secrets in arbitrary preview deployments. Any alternate domain should redirect to the canonical domain before sign-in.

Default sign-in requests an empty scope, sufficient for public GitHub identity. The optional editor organization requires `read:org` to verify private membership. Neither mode requests `repo`, repository writes, email access, or organization administration. Use a fresh authorization or review previously granted scopes if the same OAuth application has historically requested broader access.

## Enter configuration securely

Copy `.env.example` to the gitignored `.env.local` in the topic.earth checkout used for development. Enter the **local** OAuth application's client ID and secret there using your local editor. Generate at least 32 random bytes for `AUTH_SECRET` with a password manager or local cryptographic generator. Never put secrets in chat, frontend code, a committed file, browser storage, or a `NEXT_PUBLIC_`/`VITE_` variable.

In **Vercel → topic.earth project → Settings → Environment Variables**, enter the production values below, scoped to Production. Mark secret values Sensitive where supported. Applying changed environment variables requires a new deployment; deployment is a separate review step.

| Variable | Value or placeholder |
| --- | --- |
| `AUTH_URL` | Local: `http://localhost:5501`; production: `https://www.topic.earth` |
| `AUTH_GITHUB_ID` | `<oauth-client-id>` |
| `AUTH_GITHUB_SECRET` | `<oauth-client-secret>` — server only |
| `AUTH_SECRET` | `<independent-random-session-secret>` — server only |
| `GITHUB_SUPER_ADMIN_IDS` | `<numeric-user-id>,<another-numeric-user-id>` or blank |
| `GITHUB_EDITOR_ORG` | `<organization-login>` or blank |
| `GITHUB_EDITOR_TEAM` | `<team-slug>` or blank |

Use the numeric `id` returned by GitHub's authenticated `/user` response, not `node_id`, username, organization ID, email or `site_admin`. The signed-in user's numeric ID is also visible in the `/api/identity` response. Verify the intended owner's ID independently before allowing it. An empty owner list grants no owner access; malformed entries grant no privileged roles.

Both editor variables enable active membership in that exact team. Organization alone enables active membership in the organization. A team without an organization grants nothing. Prefer a dedicated team for content editors. Organization OAuth restrictions or SSO may require the organization's approval of the OAuth application and the user's authorization. Pending membership, insufficient scope, denied organization access, timeouts, errors and rate limits never grant editor access.

Run `npm ci` and `npm run dev` with Node.js 22 or later, from the topic.earth checkout. Stop the existing static preview on port 5501 first. The local server serves the same auth, identity, public-data and read-only MCP handlers and applies the API request policy. This runs locally without deploying; open http://localhost:5501 to match the configured OAuth origin. A plain static server cannot run OAuth callbacks or enforce middleware. Local HTTP cookies omit Secure only for `http://localhost`; HTTPS deployments use Secure cookies.

## Roles and enforcement

| Role | Content permission | Owner permission |
| --- | --- | --- |
| Signed out / ordinary user | Denied | Denied |
| Verified active editor | `content:write`, `ai:apply-to-topic` | Denied |
| Explicit numeric owner | `content:write`, `ai:apply-to-topic` | `owner:manage` |

`server/auth.mjs` reads the encrypted HttpOnly cookie and verifies `/user` against GitHub on every permission decision. It compares the GitHub response ID with the authenticated session ID, then reads the current server allowlist and verifies editor membership server-side. Client IDs, role claims, IP addresses, DOM controls and browser demo flags never authorize a write. Unknown permission names deny access. An owner's allowlist permission is independent of editor-team membership.

`middleware.mjs`, explicitly selected by `vercel.json`, runs before routing and denies unregistered mutations everywhere, including future JSON editors and AI update routes. Unknown API routes are denied even for GET, preventing accidental GET-based writes. Existing copied CAD-DELTAI provider routes under `/api/api/` are blocked for all methods on this host; use the existing centralized API Settings/provider service instead. That service has independent authorization and is not modified here. Public cyclone reads and the two existing read-only MCP tools remain allowed. MCP calls use an explicit tool-name allowlist; new tools do not inherit write access.

There are **no enabled content-write endpoints** in this first change, including for owners. Before adding one:

1. Add its exact method/path to `server/request-policy.mjs` and decide its permission explicitly.
2. Inside the endpoint, call `await requirePermission(request, 'content:write')` (or `owner:manage`) before parsing a mutation or doing side effects. Use the actual incoming Request and reject errors; never substitute browser identity.
3. Validate the payload and implement the change only after permission succeeds. Add denied/allowed tests for the endpoint. JSON editors and AI content application need the same guard.

The guard also requires an exact same-origin Origin header for writes, rejecting missing or cross-site origins. Use 401 for signed-out sessions, 403 for denied permission/origin, and a generic 503 for configuration or verification failures. Do not continue after any verification error. Middleware is defense in depth; keep the guard inside every future write handler too.

Browser `AppAccess` remains a UI helper. On production hosts it displays server-verified roles and ignores legacy unlock/profile flags. Local demo editing/proposals can still use browser storage; those changes do not write to production. This change enables no layer reorder, layer deletion or topic deletion permissions in the production UI.

## Logout, expiry and removal of access

Open Settings and right-click the Delta access-mode button (or long-press it for 600 ms on touch) to reveal GitHub login. Keyboard users can focus Delta and use the context-menu key or Shift+F10. A normal click still expands User/Admin choices. The revealed login/sign-out button submits through Auth.js with a CSRF token. The menu shows the authenticated GitHub login and role; hiding this entry point never grants permissions. Sign out clears the current browser's session cookie with a CSRF-protected POST. Sessions have a one-hour absolute authorization lifetime from sign-in, even if Auth.js refreshes its cookie. Cookies are HttpOnly, host-scoped, SameSite=Lax, and Secure on HTTPS. OAuth access tokens stay inside encrypted HttpOnly cookies and never appear in the public session response or localStorage. Identity errors remove privileged UI access; refresh also runs on page activation and every minute while visible.

Remove an owner ID from the server allowlist and deploy the configuration change to remove its privileges on subsequent server decisions, including existing sessions. Remove a member from the editor team/organization to remove editor access on the next permission check. Users can revoke the OAuth application in **GitHub Settings → Applications → Authorized OAuth Apps**; subsequent identity verification fails. Rotate `AUTH_SECRET` and redeploy to invalidate all existing sessions.

These are stateless encrypted sessions: logout clears this browser, but a previously stolen cookie remains usable until its one-hour expiry unless the OAuth grant is revoked or the session secret is rotated. Immediate per-device server revocation would require a durable session store. No refresh token flow or long-lived sessions are introduced.

## Validation and setup-dependent checks

`npm run check:auth` checks ordinary users, exact owner IDs, malformed configuration, active/pending/failed editor membership, owner/editor separation, signed encrypted cookies, tampering, expiry, revoked GitHub tokens, same-origin enforcement, unknown writes, encoded paths, legacy browser flags, CSRF/logout, OAuth failure handling and a complete OAuth callback with mocked GitHub responses. `npm run check:mcp` validates the existing read-only helpers. No live secrets are used by tests.

After securely configuring both OAuth applications, verify the live browser flow on localhost and then on a reviewed HTTPS deployment: ordinary account sign-in, allowed owner sign-in, editor team membership and removal, sign-out, expired sessions, canceling OAuth consent, and denied requests to `/api/future-json` and copied provider routes. Inspect cookie flags and confirm no OAuth token appears in `/api/auth/session` or `/api/identity`. Live GitHub consent, actual organization restrictions, Vercel route bundling and HTTPS cookie behavior require that setup; mocked tests cannot establish them. Keep production deployment for review.

References: [Auth.js Core](https://authjs.dev/reference/core), [GitHub OAuth configuration](https://authjs.dev/guides/configuring-github), [GitHub team membership API](https://docs.github.com/en/rest/teams/members#get-team-membership-for-a-user), [Vercel routing middleware](https://vercel.com/docs/routing-middleware/getting-started).
