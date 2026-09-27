# API Settings integration and local Ollama

This is an implementation brief for controlled AI use in topic.earth. It separates local learning, personal provider keys, organization-funded use, and any ASBL-funded proxy. The existing API Settings integration is a user interface and provider router; it is not yet a topic.earth identity or billing system.

**Entity boundary:** topic.earth is an ASBL project. The embedded API Settings product and its current canonical Vercel proxy belong to the separate CAD-DELTAI professional ecosystem. Shared code or an iframe does not authorize the ASBL to spend CAD-DELTAI funds or expose its team token to topic.earth users. A public ASBL-funded mode needs its own explicit funding, provider account or agreement, Vercel environment, and authorization policy.

**Source versions checked on 27 September 2026:** `SmDeltArt/topic.earth` has a 22 September update to its vendored `api/` copy and `index.html`. `SmDeltArt/private/api` on `main` has the full API Settings product, including Ollama host/model selection, tests, vault and Secure Proxy, but its latest `api/` commit shown in GitHub is from 14 August and it lacks topic.earth's new portable panel logic. The production iframe uses the central API host, so repository code alone cannot establish which version visitors currently see. Sync the intended portable behavior into the product source, deploy it deliberately, then test the live iframe from topic.earth. Do not copy the topic.earth `api/` tree over the canonical product wholesale.

## Confirmed in the current repository

| Component | Current behavior | Limit |
| --- | --- | --- |
| `index.html` | Loads `shared/smart-ai-api-bridge.js` and embeds `api-settings.html?embed=true&portable=true&host=topic-earth` from the central API host in production. | The local topic.earth copy interprets `portable=true`; confirm the separately deployed central iframe has the intended implementation. It does not grant managed proxy access. |
| `lib/ai-api-bridge.js` | Connects app settings and exposes `window.ourEarthAI`. | The runtime feature flags are app preferences, not server authorization. |
| `shared/smart-ai-api-bridge.js` | Reads local provider settings, calls a configured Ollama `/api/generate` endpoint, and can call cloud providers directly with BYOK. | The browser holds usable BYOK keys at request time. An enabled fallback can route a failed text request to an external service. |
| `api/api/_security.js` | The CAD-DELTAI paid routes require `x-smrt-token`, check allowed browser origins, and reject unsupported methods. | A shared bearer token does not identify a user, impose a user quota, or prove an Ambassador role. An Origin header is not an identity check. |
| `api/api/openai-chat.js` | Uses a server-side provider key and an allowed model list with body limits. | No per-user topic.earth entitlement or budget ledger is present here. |

The proxy's current controls are meaningful for a small trusted team, but a shared token must not be distributed to public users. The old browser bridge also includes reversible legacy key decoding for compatibility. Treat old `ENC:` values as obfuscation, not secure key storage, and plan their retirement.

## Local Ollama request path

1. The visitor runs Ollama and downloads a model on their own computer. The configured default host is `http://localhost:11434`. The full API Settings product tests `/api/version`, lists local models from `/api/tags`, and tests `/api/generate`.
2. In topic.earth, `index.html` loads `shared/smart-ai-api-bridge.js` before the main app. `lib/ai-api-bridge.js` creates `window.ourEarthAI` and observes topic.earth runtime settings.
3. The browser bridge reads the chosen Ollama host and model from the user's API Settings. For text completion it posts a compacted prompt directly from that visitor's browser to `<ollamaHost>/api/generate` with `stream: false`. The public Vercel deployment does not run the visitor's local model.
4. The model response returns to the browser. The app must label a failure accurately: unreachable local server, missing model, origin/CORS rejection, or a request error. No managed token is required for a truly local request.

The topic.earth vendored API Settings page has an extra `portable=true` quick-start card that selects Ollama. `SmDeltArt/private/api` main still has the full provider controls without that card. Reconcile and deploy the central interface before relying on the quick start. Also test whether an HTTPS topic.earth page can call the chosen local or remote endpoint in the actual browser and network environment. Do not solve a connection failure by publishing an unauthenticated Ollama server.

**Local-only invariant:** the current `shared/smart-ai-api-bridge.js` can fall back to an external text service when `aiWebSearchEnabled` is true and `enableFallback` has not been disabled. A local-only learning task must set and enforce a no-external-fallback policy before any prompt is sent, and an unavailable Ollama model must return a visible error. The current app setting alone is not a server-side policy for managed routes.

## Proposed trust paths

| Path | Browser may hold | Server must enforce | Billing owner |
| --- | --- | --- | --- |
| Local Ollama | Model name and local server URL | No topic.earth paid route; a remote Ollama operator must secure its own server | User/operator |
| Personal BYOK | User's restricted provider key while unlocked | No ASBL-funded request; validate any app content separately | Individual |
| BYORG | Session identifying organization and permitted task; no provider master key | Verified membership, organization scope, allowed models, per-member and organization quotas | Organization |
| ASBL proxy | Short-lived topic.earth session; no shared provider key or team bearer token | Verified account, role, task, rate and spend limits, audit, origin/CSRF checks | topic.earth ASBL |

BYORG is a proposed name for an organization-owned provider account. It is distinct from personal BYOK. A municipality could be an organization only after a real agreement and verification of who may administer it. Residence or an itsme identity check never creates an organization mandate.

## Request and policy flow for managed use

1. A signed-in user chooses an AI-assisted action and sees the provider route and whether it is billed to their own account, their organization, or the ASBL.
2. The topic.earth server checks the application session, age-specific feature rules, account status, role, organization membership if any, and the action's geographic scope. Discord or GitHub login alone does not satisfy these checks.
3. The server evaluates an explicit policy for the action: allowed provider/model, maximum request size and output, rate, daily/monthly budget, and whether external fallback is permitted. Reject before calling a provider if a check fails.
4. Only a server-side component retrieves the relevant organization or ASBL provider credential. Secrets are separated by legal entity and environment. The server records a request ID, policy decision, billing scope, usage, and outcome without logging full private prompts by default.
5. The response states the provider used and whether fallback occurred. Public claims or community posts enter a human review and moderation workflow before publication.

Store budgets and usage in a durable server-side ledger, with a hard ceiling at the provider account as a second control. Browser toggles, CSS, a vault password, `dev=1`, and the current `SMRT_PROXY_TOKEN` are not substitutes for per-user authorization.

## Data and security decisions

- **Locality and youth:** Keep identity and exact address data away from AI prompts by default. For a local initiative, pass the commune identifier only when needed. Treat a 16–17-year-old's public posting and AI features as separate policy decisions.
- **Provider routing:** Disable silent external fallback for local/private tasks. A provider failure should produce a visible error or request explicit consent for a different route; do not silently transmit the same prompt to another provider.
- **Iframe bridge:** Accept `postMessage` only from the expected iframe window and exact trusted origin, validate message shapes, and send only the fields needed by topic.earth. Do not treat the current broad origin list or a visible settings control as paid-access authorization.
- **Secrets:** Keep BYORG and ASBL keys in their respective server environments, never in the public bundle or localStorage. Rotate credentials and revoke organization access without affecting another organization. Retire the legacy reversible browser key format after migration.
- **Ollama:** `localhost:11434` points to each visitor's machine. A shared remote model needs authentication, TLS, abuse controls and clear operator disclosure; its prompts are no longer local to the visitor. Test browser connectivity and origin policy without broadening server access unnecessarily.
- **Legal entities:** Keep ASBL, CAD-AI-Support/SPRL, and personal SmDeltArt provider accounts, Vercel projects or cost allocation, data processing terms, and access policies distinct. Reusing a component does not imply shared ownership of user data or spend.

## Delivery phases

1. **Document and verify current behavior.** Inventory every AI call, including geography, translation and voice; map prompt data and external fallbacks. Compare the topic.earth vendored `api/` files with `SmDeltArt/private/api`, reconcile the portable Ollama change in the canonical product source, then test the deployed iframe, Ollama and BYOK on local and production origins.
2. **Make personal use predictable.** Show the active provider and billing owner, provide an explicit fail-closed option, and remove legacy secret handling after a safe migration. No public proxy token.
3. **Add identity and policy service.** Build server sessions, account and role checks, organization membership and delegation, quota ledger, moderation, and revocation. Keep a public educational path without sign-in.
4. **Pilot managed funding.** Start with one separately funded ASBL configuration or one approved organization. Set hard budgets and alerts, limited models/tasks, audit and a kill switch. Expand only after reviewing usage and safeguarding minors.

## Acceptance checks

- An anonymous or unapproved account cannot call an ASBL or BYORG paid route, even by calling the endpoint directly.
- A personal BYOK failure cannot silently charge the ASBL or another organization.
- A local Ollama failure does not send the prompt to an external service when local-only was selected.
- A member removed from an organization immediately loses its paid access; their personal BYOK remains their own choice.
- A verified local resident cannot claim a commune's organizational billing or official representation.
- Client source, browser storage and network responses never expose provider master keys, organization keys, or a shared managed-proxy bearer token.
- A request above the server's quota or budget is rejected before the provider call, and the event is traceable without publishing the prompt.

## Related code and documentation

- [`index.html`](../index.html), [`lib/ai-api-bridge.js`](../lib/ai-api-bridge.js), and [`shared/smart-ai-api-bridge.js`](../shared/smart-ai-api-bridge.js) show the topic.earth integration.
- [`api/docs/API_SETTINGS_SECURITY.md`](../api/docs/API_SETTINGS_SECURITY.md) documents the CAD-DELTAI team proxy, vault, and BYOK boundary. It is not a public topic.earth entitlement design.
- The separately maintained [CAD-DELTAI API Settings source](https://github.com/SmDeltArt/private/tree/main/api) is the product home; its version and topic.earth's vendored copy must be checked together before a deployment claim.
- [`api/api/_security.js`](../api/api/_security.js) and [`api/api/openai-chat.js`](../api/api/openai-chat.js) show current canonical paid-route guards.
- [Presentation note on AI learning and local action](ai-learning-presentation.md) explains the choices for citizens and partners.
