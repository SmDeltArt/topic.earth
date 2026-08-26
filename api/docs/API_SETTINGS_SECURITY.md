# API Settings security and deployment guide

This guide documents the current API Settings, Streaming Studio, Vercel proxy,
vault, BYOK, and cross-domain security model. It is intended for SmDeltArt team
members and future maintainers.

## Recommended decision

Keep one current application with three explicit modes:

1. **Browser only** — no paid provider is configured.
2. **Local BYOK** — the user supplies their own provider key on their own device.
3. **Secure Proxy** — provider keys remain server-side and authorized team members
   unlock a session-scoped proxy token from API Settings.

Do not publish an older BYOK-only build as a security measure. An older fork
creates maintenance and patching risk, while hiding a button or route is only
security through obscurity. Anyone can inspect browser HTML, JavaScript, storage,
and network requests.

For the private team deployment, keep **Secure Proxy behind the vault**. For a
public deployment, default to Browser or BYOK and do not distribute the proxy
token. The proxy routes must remain protected even when the Secure Proxy UI is
hidden.

## Security boundaries

| Control | What it protects | What it does not protect |
| --- | --- | --- |
| Vercel server environment variables | Provider keys stay out of browser bundles | A stolen server account or leaked deployment logs |
| `SMRT_PROXY_TOKEN` | Blocks unpaid proxy calls without the shared bearer token | Per-user identity, permissions, or usage attribution |
| `SMRT_ALLOWED_ORIGINS` | Blocks browser calls from unapproved origins | A non-browser client that omits `Origin`; the token is still required |
| Model and voice allowlists | Prevents callers from selecting unexpected paid models/voices | Spending within the allowed choices |
| Body-size and method checks | Reduces abuse and accidental oversized requests | High request volume; add rate limits and provider budgets |
| API Settings vault/password | Prevents casual access and controls when the token enters the tab session | Server-grade authentication or protection from malicious JavaScript/XSS |
| `sessionStorage` token bridge | Avoids persistent plaintext proxy tokens and clears on tab close | Exposure to JavaScript already running in that tab |
| Domain, iframe, logo/title checks | Reduces unauthorized embedding and confusing UI copies | Authorization for paid API routes |
| `dev=1` | Enables development UI/behavior | Any paid API permission |

The browser must be treated as observable. Logo checks, hidden controls,
minification, and client-side encryption can improve UX and deter casual
inspection, but they are not the final security boundary.

## Current request flow

### Secure Proxy

1. Provider keys exist only in the Vercel environment of the canonical API.
2. A team member unlocks API Settings and chooses Secure Proxy.
3. API Settings sends the proxy token only through the trusted
   `postMessage` bridge.
4. Streaming Studio validates the sender origin and stores the token in
   `sessionStorage`.
5. Studio calls its same-origin `/api/*` relay with `x-smrt-token`.
6. The Studio relay checks the same token and forwards to the canonical API.
7. The canonical API checks the token again, applies the origin/method/body and
   model/voice policies, then calls the provider.

Closing the tab clears the active proxy token. Unlock the vault again in a new
tab or session.

### Local BYOK

BYOK sends the user's provider key from their browser to the selected provider.
It avoids using the team's server-side keys, but the key is available to code in
that browser session. BYOK should therefore be used only on a trusted device and
with restricted, low-budget provider keys.

Never advertise BYOK storage as equivalent to server-side secret storage.
Client-side encrypted storage protects mainly against casual reading at rest; a
page that can decrypt and use a key can expose it if that page is compromised.

## Vercel configuration

Configure secrets in **Vercel Project Settings → Environment Variables**. Do
not commit real values to `.env`, screenshots, issues, documentation, or chat.
Do not prefix secrets with `NEXT_PUBLIC_`, `VITE_`, or another browser-public
prefix.

Use different proxy tokens for Production, Preview, and Development where
practical. Redeploy after changing variables.

### Canonical API project

Required for the enabled providers:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Server-only OpenAI key |
| `ELEVENLABS_API_KEY` | Server-only ElevenLabs key |
| `ELEVENLABS_VOICE_ID` | Server-controlled default voice |
| `SMRT_PROXY_TOKEN` | Long random shared bearer token; required for paid routes |

Recommended policy variables:

| Variable | Purpose |
| --- | --- |
| `SMRT_ALLOWED_ORIGINS` | Comma-separated additions to the built-in production origins |
| `OPENAI_CHAT_MODELS` | Comma-separated allowed chat models |
| `OPENAI_TTS_MODELS` | Comma-separated allowed OpenAI TTS models |
| `OPENAI_IMAGE_MODELS` | Comma-separated allowed image models |
| `OPENAI_STT_MODELS` | Comma-separated allowed transcription models |
| `ELEVENLABS_ALLOWED_VOICE_IDS` | Comma-separated allowed voice IDs |
| `ELEVENLABS_MODELS` | Comma-separated allowed ElevenLabs models |

The canonical ElevenLabs proxy keeps the server allowlist authoritative. If a
browser sends a stale or disallowed voice ID, the proxy uses
`ELEVENLABS_VOICE_ID`; it does not expand the allowlist.

Generate a token on Windows PowerShell 5.1 or newer:

```powershell
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$bytes = New-Object byte[] 48
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

Store the result in Vercel and in the encrypted API Settings vault. Do not paste
the value into source code.

### Streaming Studio project

| Variable | Purpose |
| --- | --- |
| `SMRT_PROXY_TOKEN` | Must match the canonical API token for the same environment |
| `SMRT_API_BASE_URL` | API base: use `https://api-caddeltai.vercel.app` from Vercel-hosted consumers, or `https://api.caddeltai.com` from custom-domain consumers |
| `SMRT_API_PROTECTION_BYPASS` | Preview-only Vercel Deployment Protection bypass, when required |

The browser still sends the proxy token to the Studio relay, but provider keys
never enter the browser. The relay validates the token and forwards its own
server-side copy.

### Vault setup

1. Set the provider keys and proxy token in Vercel.
2. Enter only the matching proxy token into the API Settings vault.
3. Select **Secure Proxy**.
4. Keep the proxy base URL empty for same-origin relay use, or set only the
   approved canonical URL.
5. Save and unlock the vault.
6. Confirm Studio badges show OpenAI Proxy or ElevenLabs Proxy.
7. After a reload or new tab, unlock the vault again.

Provider keys do not belong in the Secure Proxy browser form. Only the proxy
token is bridged to Studio, and only for the current tab session.

## Correct BYOK setup

1. Select **Local BYOK**.
2. Enter only a personal/restricted provider key.
3. Use a provider key with the lowest necessary permissions and a low budget.
4. Do not use an organization owner key.
5. Do not use BYOK on shared or untrusted devices.
6. Clear the local vault/storage when handing the device to someone else.
7. Rotate the provider key if the browser, extension set, or device may have
   been compromised.

BYOK is appropriate for local development, a self-hosted personal copy, or users
who should pay their own provider costs. Secure Proxy is preferable for the
managed team deployment because provider keys stay server-side.

## Cloudinary warning

Cloudinary is optional and is not required for OpenAI chat/TTS or ElevenLabs
TTS.

The hardened canonical endpoint `api/api/ai-health.js` reports only OpenAI and
ElevenLabs. However, two legacy paths can still display Cloudinary:

- `api/src/api-settings.js` still contains a Cloudinary entry in one combined
  AI Health text line.
- `widgets/api/ai-health.js` still returns a Cloudinary boolean.

Therefore **“Cloudinary: not set” is informational** when the app does not use
Cloudinary. It does not mean the AI proxy failed. Configure
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` only for apps that actually use Cloudinary upload or
asset routes.

## Canonical source and folder synchronization

The hardened source of truth is:

```text
api/api/
```

The current `widgets/api/` folder still contains older handlers where
`SMRT_PROXY_TOKEN` is optional, the origin/model/body policies are incomplete,
and Cloudinary remains in health output.

When synchronizing into `widgets/api/`:

1. Copy the complete guarded endpoint set, not individual TTS files.
2. Include `_security.js`.
3. Require `SMRT_PROXY_TOKEN`; do not keep “leave empty for anonymous proxy”
   behavior.
4. Preserve origin, method, size, model, and voice validation.
5. Keep the health response consistent with services actually used.
6. Re-run anonymous, wrong-token, wrong-origin, and allowed-request tests.
7. Review the diff before replacing the Widgets version.

Do not copy the older Widgets handlers back into `api/api/`.

## Expected status codes

| Status | Meaning | Correct action |
| --- | --- | --- |
| `200` | Request accepted | No action |
| `400` | Invalid body, model, voice, or configuration choice | Check allowed values and request body |
| `401` | Proxy token missing or different | Unlock the vault and verify matching Vercel tokens |
| `403` | Browser origin is not allowed | Add the exact trusted origin to `SMRT_ALLOWED_ORIGINS` |
| `405` | HTTP method not allowed | Use the documented method |
| `413` | Request too large | Reduce text/file/request size |
| `503` | Required server environment variable is missing | Configure Vercel and redeploy |
| `502` | Provider or canonical API is temporarily unreachable | Inspect Vercel logs and provider status |

Do not solve a 401 by making the token optional, or a 403 by allowing every
origin.

## Production verification checklist

- Anonymous paid requests return 401.
- An incorrect token returns 401.
- An unapproved browser origin returns 403.
- The correct token from each production Studio domain succeeds.
- `dev=1` does not grant paid API access.
- Disallowed models return 400.
- Oversized requests return 413.
- ElevenLabs uses the configured server default/allowlist.
- Provider keys never appear in HTML, JavaScript bundles, localStorage, network
  responses, or logs.
- The proxy token is absent from persistent localStorage and clears with the tab.
- OpenAI and ElevenLabs provider budgets and alerts are enabled.
- Vercel Firewall/rate limiting is configured when the proxy is exposed to a
  wider audience.
- Preview and Production use separate tokens where practical.
- The already-tested deployment is promoted rather than rebuilt differently.

## Team operations and rotation

The current proxy token is a shared team bearer secret. Anyone holding it can use
the allowed paid endpoints, so distribute it only through an approved password
manager or the protected API Settings vault.

Rotate the proxy token when a team member leaves, a device is lost, the token is
shown in a screenshot/log, or unusual spending appears:

1. Generate a new token.
2. Update the canonical API and Studio Vercel environments.
3. Redeploy both projects.
4. Update the protected vault entry.
5. Invalidate old sessions by closing/reloading Studio tabs.
6. Check provider usage and Vercel runtime logs.
7. Rotate provider keys too if they may have been exposed.

For a larger team or external customers, replace the shared token with real
per-user authentication and authorization, then add per-user quotas and audit
logging. The vault remains useful for session UX, but should not be the identity
system.

## Final rule

Assume attackers can see every browser control and endpoint. Keep the managed
Secure Proxy under the vault for the team, but rely on enforced server-side
controls—not invisibility—to protect provider keys and spending.
