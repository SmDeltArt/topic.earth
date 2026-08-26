# CAD-DELTAI API Settings

Private API-settings product for CAD-DELTAI. It provides browser/BYOK settings,
an encrypted vault workflow, and authenticated Vercel proxy routes for paid AI
providers.

Production: `https://api.caddeltai.com`

## Structure

```text
api-settings.html              Main API settings interface
index.html                     Redirect to API Settings
domain-config.js               Browser host and developer-UI policy
manifest.json                  Product routes and compatibility metadata
vercel.json                    Vercel routes and response headers
package.json                   Validation and sync commands
LICENSE.md                     Private proprietary license
CHANGELOG.md                   Package changes

api/                           Secured Vercel serverless proxy functions
  _security.js                 Origin, token, method and body guards
  ai-health.js
  elevenlabs-tts.js
  openai-chat.js
  openai-image.js
  openai-stt.js
  openai-tts.js

src/                           Browser application modules
shared/                        Shared styles
brand/                         Included CAD-DELTAI metadata and assets
docs/                          Detailed security documentation
scripts/sync-build.js          Selective sync/build utility
sync.config.json               Portal API and Clipboard sync rules
```

The legacy value `cad-ai-support` and existing localStorage keys remain internal
compatibility identifiers. The visible product name is **CAD-DELTAI**.

## Secure proxy

Provider keys remain server-side. Paid routes require `SMRT_PROXY_TOKEN`; an
unset token disables paid proxy requests. Configure the following in the API
Vercel project as needed:

- `SMRT_PROXY_TOKEN`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_ALLOWED_VOICES_JSON` — preferred ElevenLabs TTS alias map; browser receives aliases and labels only
- `ELEVENLABS_PUBLIC_VOICE_ID` — compatibility fallback mapped to `server-default`
- `ELEVENLABS_VOICE_ID` — legacy fallback only when no alias JSON or public voice fallback is configured
- `SMRT_ALLOWED_ORIGINS`

Add every consuming Vercel application origin explicitly to
`SMRT_ALLOWED_ORIGINS`. Do not use a broad `*.vercel.app` authorization rule.
See `SECURITY_SETUP.md` and `docs/API_SETTINGS_SECURITY.md` for the complete
deployment procedure.

## Iframe routing

- Local applications use the local `api-settings.html?embed=true` file.
- Applications hosted on `*.vercel.app` use
  `https://api-caddeltai.vercel.app/api-settings?embed=true`.
- Custom-domain applications use
  `https://api.caddeltai.com/api-settings?embed=true`.

These remain different browser origins. Communication therefore uses
`postMessage`, restricted to the actual API iframe window and resolved origin.

## Selective sync

The sync command is a dry-run unless `--write` is supplied:

```bash
npm run sync:portal-api
npm run sync:portal-api:write

npm run sync:portal-clipboard
npm run sync:portal-clipboard:write
```

The `portal-api` target copies approved API files into `portal/widgets/api` and
removes blocks marked with paired comments such as:

```js
/* sync:begin developer-admin */
// Private developer UI logic
/* sync:end developer-admin */
```

The prepared API package marks the `dev=1` configuration, header activation
logic, and API Access control panel. Removing frontend UI is not authorization:
the server token, origin, method, model and request-size guards remain required.

The `portal-clipboard` target selects the Clipboard Manager,
`smart-svg-editor.html`, API settings files, and their approved shared assets.

## Validation

```bash
npm run check
node scripts/sync-build.js --help
```

Review every dry-run file list before using `--write`. Add `--clean` only when
you intentionally want to remove stale files from the generated destination.

## Ownership

- Product: BenDes / CAD-DELTAI
- Professional ecosystem: CAD-AI-Support
- Pipeline: `private/api/` → GitHub → Vercel
