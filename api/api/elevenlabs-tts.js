/**
 * /api/elevenlabs-tts — Secure ElevenLabs Text-to-Speech proxy
 *
 * Ported from private/streaming-studio/app/api/elevenlabs-tts/route.ts
 * Adapted to Vercel Serverless Function (req/res) format used by widgets.
 *
 * SECURITY:
 * - API key read ONLY from process.env.ELEVENLABS_API_KEY (server side)
 * - Key is NEVER returned to the browser
 * - Returns audio/mpeg blob directly
 * - Optional bearer token gate via SMRT_PROXY_TOKEN
 *
 * Usage: POST /api/elevenlabs-tts
 * Headers (optional): x-smrt-token: <SMRT_PROXY_TOKEN>
 * Body: { text, voiceId?, model_id?, voice_settings? }
 * Response: audio/mpeg
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
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return sendJson(res, 503, {
      error: "ElevenLabs is not configured on this server",
    });
  }

  // ── Validate body ───────────────────────────────────────────────────────
  const body = req.body || {};
  if (!body.text?.trim()) {
    return sendJson(res, 400, { error: "Missing required field: text" });
  }

  const voiceId = body.voiceId || "JBFqnCBsd6RMkjVDRZzb";

  // ── Forward to ElevenLabs ───────────────────────────────────────────────
  let upstream;
  try {
    upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: body.text,
          model_id: body.model_id || "eleven_multilingual_v2",
          voice_settings: body.voice_settings ?? {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true,
          },
        }),
      },
    );
  } catch (err) {
    return sendJson(res, 502, {
      error: "Failed to reach ElevenLabs",
      detail: String(err),
    });
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return sendJson(res, upstream.status, {
      error: `ElevenLabs HTTP ${upstream.status}`,
      detail: errText.slice(0, 200),
    });
  }

  // ── Return audio/mpeg directly ──────────────────────────────────────────
  const audioBuffer = await upstream.arrayBuffer();
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).end(Buffer.from(audioBuffer));
}
