# Secure proxy deployment setup

> For the full team security model, BYOK guidance, vault limitations, folder-sync warnings, and incident response, see [API Settings security and deployment guide](docs/API_SETTINGS_SECURITY.md).

The canonical paid-provider proxy lives in `api/api/`. Browser vault encryption,
domain guards, logo checks and `dev=1` are UI protections; they do not authorize
paid API requests.

## Generate a proxy token on Windows PowerShell

This command works in Windows PowerShell 5.1 as well as newer PowerShell versions:

```powershell
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$bytes = New-Object byte[] 48
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

Copy the resulting value directly into Vercel and the encrypted API Settings
vault. Do not commit it or paste it into chat.

## Required Vercel variables

Configure these in the **api-caddeltai** project before promoting this branch:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_ALLOWED_VOICES_JSON` — preferred secure alias map for ElevenLabs TTS voices. Example: `{"server-default":{"label":"Server default","voiceId":"..."}, "bendes":{"label":"BenDes","voiceId":"..."}}`
- `ELEVENLABS_PUBLIC_VOICE_ID` — compatibility fallback mapped to the public `server-default` alias when the JSON map is absent
- `ELEVENLABS_VOICE_ID` — legacy fallback for older deployments when neither alias JSON nor public voice env is set
- `SMRT_PROXY_TOKEN` — a long random value, never exposed in public source
- `SMRT_ALLOWED_ORIGINS` — optional comma-separated additions to the built-in origins

The browser receives only ElevenLabs voice aliases and labels. It must never
receive raw ElevenLabs voice IDs from the secure proxy.

Use distinct values for Production, Preview and Development where practical. Never
use `VITE_*`, `NEXT_PUBLIC_*` or another public build-time variable for secrets.

For the **studio** project, configure the matching `SMRT_PROXY_TOKEN` and:

- `SMRT_API_BASE_URL=https://api-caddeltai.vercel.app`

The token entered locally in API Settings may be kept in the encrypted vault. It is
sent only as the `x-smrt-token` request header; it must not be committed.

## Promotion checklist

1. Deploy this branch as Preview.
2. Confirm anonymous paid requests return 401.
3. Confirm an incorrect token returns 401.
4. Confirm a correct token succeeds.
5. Confirm `dev=1` never grants paid API access.
6. Confirm an unapproved Origin returns 403.
7. Confirm oversized and disallowed-model requests return 400/413.
8. Test Studio through its same-origin relay.
9. Configure provider budget limits and alerts.
10. Promote only the already-tested preview artifact.

## Protected Preview relay

For Preview-to-Preview server relays, set Studio Preview's
`SMRT_API_BASE_URL` to the API branch alias. If API Preview uses Deployment
Protection, generate an Automation Bypass secret on the API project and store it
in Studio Preview as `SMRT_API_PROTECTION_BYPASS`.

API Settings iframe previews are intentionally not allowed from arbitrary
`*.vercel.app` parents. Test the API Settings Preview directly while signed in,
and test the production-domain iframe before promotion.
