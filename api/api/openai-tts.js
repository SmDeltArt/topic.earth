import {
  allowedValue,
  contentLengthWithin,
  envList,
  preparePaidRequest,
  sendJson,
} from "./_security.js";

const MODELS = ["gpt-4o-mini-tts", "tts-1", "tts-1-hd"];
const VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
];
const FORMATS = ["mp3", "wav", "opus", "aac", "flac", "pcm"];

export default async function handler(req, res) {
  if (!preparePaidRequest(req, res, ["POST"])) return;
  if (!contentLengthWithin(req, 100_000)) {
    return sendJson(res, 413, { error: "Request body too large" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return sendJson(res, 503, { error: "OpenAI is not configured" });

  const body = req.body || {};
  const inputValue = body.input ?? body.text;
  const input = typeof inputValue === "string" ? inputValue.trim() : "";
  if (!input || input.length > 4_096) {
    return sendJson(res, 400, { error: "TTS input is missing or too long" });
  }

  const model = allowedValue(
    body.model,
    "gpt-4o-mini-tts",
    envList("OPENAI_TTS_MODELS", MODELS),
  );
  const voice = allowedValue(body.voice, "alloy", VOICES);
  const format = allowedValue(body.format, "mp3", FORMATS);
  if (!model || !voice || !format) {
    return sendJson(res, 400, { error: "TTS configuration not allowed" });
  }

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, voice, input, format }),
    });
  } catch {
    return sendJson(res, 502, { error: "OpenAI is temporarily unavailable" });
  }

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => null);
    return sendJson(res, upstream.status, {
      error: data?.error?.message || `OpenAI HTTP ${upstream.status}`,
    });
  }

  const types = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    opus: "audio/opus",
    aac: "audio/aac",
    flac: "audio/flac",
    pcm: "application/octet-stream",
  };
  res.setHeader("Content-Type", types[format]);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).end(Buffer.from(await upstream.arrayBuffer()));
}
