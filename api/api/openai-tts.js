/**
 * /api/openai-tts — Secure OpenAI Text-to-Speech proxy
 *
 * Moved from app/api/openai-tts/route.ts (Next.js) to
 * public/api/openai-tts.js (Vercel Serverless Function).
 *
 * SECURITY:
 * - API key read ONLY from process.env.OPENAI_API_KEY (server side)
 * - Key is NEVER returned to the browser
 * - Returns audio/mpeg blob directly
 */

function sendJson(res, status, body) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST")
    return sendJson(res, 405, { error: "Method not allowed" });

  // ── Optional token gate ──────────────────────────────────────────────────
  const proxyToken = process.env.SMRT_PROXY_TOKEN;
  if (proxyToken) {
    const clientToken = req.headers["x-smrt-token"];
    if (clientToken !== proxyToken) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }
  }

  // ── Check server key is configured ─────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 503, {
      error: "OpenAI TTS is not configured on this server",
    });
  }

  // ── Validate body ───────────────────────────────────────────────────────
  const body = req.body || {};
  if (!body.input?.trim()) {
    return sendJson(res, 400, { error: "Missing required field: input" });
  }

  // ── Forward to OpenAI TTS ───────────────────────────────────────────────
  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: body.model || "gpt-4o-mini-tts",
        input: body.input,
        voice: body.voice || "nova",
        speed: body.speed ?? 1.0,
        response_format: "mp3",
      }),
    });
  } catch (err) {
    return sendJson(res, 502, {
      error: "Failed to reach OpenAI TTS",
      detail: String(err),
    });
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return sendJson(res, upstream.status, {
      error: `OpenAI TTS HTTP ${upstream.status}`,
      detail: errText.slice(0, 200),
    });
  }

  const audioBuffer = await upstream.arrayBuffer();
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).end(Buffer.from(audioBuffer));
}
