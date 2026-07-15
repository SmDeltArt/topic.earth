/**
 * /api/openai-chat — Secure OpenAI Chat Completions proxy
 *
 * Ported from private/streaming-studio/app/api/openai-chat/route.ts
 * Adapted to Vercel Serverless Function (req/res) format used by widgets.
 *
 * SECURITY:
 * - API key read ONLY from process.env.OPENAI_API_KEY (server side)
 * - Key is NEVER returned to the browser
 * - Optional bearer token gate via SMRT_PROXY_TOKEN
 *
 * Usage: POST /api/openai-chat
 * Headers (optional): x-smrt-token: <SMRT_PROXY_TOKEN>
 * Body: OpenAI chat completions request JSON
 */

function send(res, status, body) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method !== "POST")
    return send(res, 405, { error: "Method not allowed" });

  // ── Optional token gate ──────────────────────────────────────────────────
  const proxyToken = process.env.SMRT_PROXY_TOKEN;
  if (proxyToken) {
    const clientToken = req.headers["x-smrt-token"];
    if (clientToken !== proxyToken) {
      return send(res, 401, { error: "Unauthorized" });
    }
  }

  // ── Check server key is configured ─────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return send(res, 503, { error: "OpenAI is not configured on this server" });
  }

  // ── Body is pre-parsed by Vercel ────────────────────────────────────────
  const body = req.body;
  if (!body || typeof body !== "object") {
    return send(res, 400, { error: "Invalid JSON body" });
  }

  // ── Forward to OpenAI ───────────────────────────────────────────────────
  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return send(res, 502, {
      error: "Failed to reach OpenAI",
      detail: String(err),
    });
  }

  // ── Relay response ──────────────────────────────────────────────────────
  const data = await upstream
    .json()
    .catch(() => ({ error: "Non-JSON response from OpenAI" }));
  return send(res, upstream.status, data);
}
