import {
  allowedValue,
  contentLengthWithin,
  envList,
  preparePaidRequest,
  sendJson,
} from "./_security.js";

const MODELS = ["eleven_text_to_sound_v2"];
const OUTPUT_FORMATS = [
  "mp3_22050_32",
  "mp3_44100_128",
  "mp3_44100_192",
  "opus_48000_64",
  "wav_44100",
];

function outputContentType(outputFormat) {
  if (outputFormat.startsWith("mp3_")) return "audio/mpeg";
  if (outputFormat.startsWith("opus_")) return "audio/ogg";
  if (outputFormat.startsWith("wav_")) return "audio/wav";
  return "application/octet-stream";
}

function finiteNumber(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function handler(req, res) {
  if (!preparePaidRequest(req, res, ["POST"])) return;
  if (!contentLengthWithin(req, 100_000)) {
    return sendJson(res, 413, { error: "Request body too large" });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return sendJson(res, 503, { error: "ElevenLabs is not configured" });
  }

  const body = req.body || {};
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 2_500) {
    return sendJson(res, 400, {
      error: "Sound description is missing or too long",
    });
  }
  if (
    Object.prototype.hasOwnProperty.call(body, "voice") ||
    Object.prototype.hasOwnProperty.call(body, "voiceId") ||
    Object.prototype.hasOwnProperty.call(body, "voiceAlias") ||
    Object.prototype.hasOwnProperty.call(body, "voice_id")
  ) {
    return sendJson(res, 400, {
      error: "Sound Effects does not accept TTS voice fields",
    });
  }

  const durationSeconds = finiteNumber(
    body.durationSeconds ?? body.duration_seconds,
    undefined,
  );
  if (
    durationSeconds === null ||
    (durationSeconds !== undefined &&
      (durationSeconds < 0.5 || durationSeconds > 30))
  ) {
    return sendJson(res, 400, {
      error: "Sound duration must be between 0.5 and 30 seconds",
    });
  }
  const promptInfluence = finiteNumber(
    body.promptInfluence ?? body.prompt_influence,
    0.3,
  );
  if (
    promptInfluence === null ||
    promptInfluence < 0 ||
    promptInfluence > 1
  ) {
    return sendJson(res, 400, {
      error: "Prompt influence must be between 0 and 1",
    });
  }
  if (body.loop !== undefined && typeof body.loop !== "boolean") {
    return sendJson(res, 400, { error: "Loop must be a boolean" });
  }

  const modelId = allowedValue(
    body.modelId ?? body.model_id,
    "eleven_text_to_sound_v2",
    envList("ELEVENLABS_SOUND_MODELS", MODELS),
  );
  const outputFormat = allowedValue(
    body.outputFormat ?? body.output_format,
    "mp3_44100_128",
    envList("ELEVENLABS_SOUND_OUTPUT_FORMATS", OUTPUT_FORMATS),
  );
  if (!modelId || !outputFormat) {
    return sendJson(res, 400, {
      error: "ElevenLabs sound configuration not allowed",
    });
  }

  const payload = {
    text,
    loop: body.loop === true,
    prompt_influence: promptInfluence,
    model_id: modelId,
  };
  if (durationSeconds !== undefined) {
    payload.duration_seconds = durationSeconds;
  }

  let upstream;
  try {
    const url = new URL("https://api.elevenlabs.io/v1/sound-generation");
    url.searchParams.set("output_format", outputFormat);
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        Accept: outputContentType(outputFormat),
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return sendJson(res, 502, {
      error: "ElevenLabs Sound Effects is temporarily unavailable",
    });
  }

  if (!upstream.ok) {
    return sendJson(res, upstream.status, {
      error: `ElevenLabs Sound Effects HTTP ${upstream.status}`,
    });
  }

  const contentType =
    upstream.headers.get("content-type") || outputContentType(outputFormat);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Smrt-Audio-Format", outputFormat);
  res.setHeader("X-Smrt-Sound-Model", modelId);
  return res.status(200).end(Buffer.from(await upstream.arrayBuffer()));
}
