# topic.earth Minimal MCP Server

This repo includes a minimal read-only MCP endpoint for OpenAI Platform scanning:

- `topic_summary`
- `translate_to_french`

The endpoint is implemented at `api/mcp.js` and exposed as `/mcp` through `vercel.json`.

## Local Check

```powershell
npm install
npm run check:mcp
```

## Deploy To Vercel

```powershell
npm install
npx vercel login
npx vercel --prod
```

If the project is already linked to `topic.earth`, the final MCP URL should be:

```text
https://topic.earth/mcp
```

If Vercel gives a temporary deployment domain first, use:

```text
https://YOUR-DEPLOYMENT.vercel.app/mcp
```

## OpenAI Platform Form

Use these values:

- MCP Server URL: `https://topic.earth/mcp`
- Authentication: `No Auth`
- General contact: `info@topic.earth`
- Support contact: `support@topic.earth`
- Publishing/contact page address: `contact@topic.earth`
- Then click `Scan Tools`

For domain verification, OpenAI Platform will show a token. Put that token at the required `.well-known` URL on the same HTTPS host, then click `Verify Domain`.

## Tool Safety

Both tools are read-only. They do not publish, update, delete, or save topic.earth content.

`translate_to_french` currently includes a safe local starter glossary so the MCP server can scan and run without storing a server API key. A later version can connect to a backend translation model by adding an encrypted Vercel environment variable.
