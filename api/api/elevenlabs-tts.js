import {
  allowedValue,
  contentLengthWithin,
  envList,
  preparePaidRequest,
  sendJson,
} from "./_security.js";

const MODELS = [
  "eleven_v3",
  "eleven_multilingual_v2",
];
const OUTPUT_FORMATS = [
  "mp3_22050_32",
  "mp3_44100_128",
  "mp3_44100_192",
  "opus_48000_64",
  "pcm_16000",
  "wav_44100",
];
const ALIAS_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function outputContentType(outputFormat) {
  if (outputFormat.startsWith("mp3_")) return "audio/mpeg";
  if (outputFormat.startsWith("opus_")) return "audio/ogg";
  if (outputFormat.startsWith("wav_")) return "audio/wav";
  if (outputFormat.startsWith("pcm_")) return "audio/pcm";
  return "application/octet-stream";
}

function parseAllowedVoiceAliases() {
  const configured = String(process.env.ELEVENLABS_ALLOWED_VOICES_JSON || "")
    .trim();
  if (!configured) return null;

  let parsed;
  try {
    parsed = JSON.parse(configured);
  } catch {
    throw new Error("ELEVENLABS_ALLOWED_VOICES_JSON is invalid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("ELEVENLABS_ALLOWED_VOICES_JSON must be an object");
  }

  const aliases = {};
  for (const [alias, entry] of Object.entries(parsed)) {
    if (!ALIAS_PATTERN.test(alias)) continue;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const voiceId = String(entry.voiceId || entry.voice_id || "").trim();
    if (!voiceId) continue;
    aliases[alias] = {
      alias,
      label: String(entry.label || alias).trim() || alias,
      voiceId,
    };
  }

  if (Object.keys(aliases).length === 0) {
    throw new Error("ELEVENLABS_ALLOWED_VOICES_JSON has no usable aliases");
  }
  return aliases;
}

function legacyVoiceAliases() {
  const publicVoiceId = String(process.env.ELEVENLABS_PUBLIC_VOICE_ID || "")
    .trim();
  if (publicVoiceId) {
    return {
      "server-default": {
        alias: "server-default",
        label: "Server default",
        voiceId: publicVoiceId,
      },
    };
  }

  const legacyVoiceId = String(process.env.ELEVENLABS_VOICE_ID || "").trim();
  if (legacyVoiceId) {
    return {
      "server-default": {
        alias: "server-default",
        label: "Server default",
        voiceId: legacyVoiceId,
      },
    };
  }

  return null;
}

function getAllowedVoiceAliases() {
  return parseAllowedVoiceAliases() || legacyVoiceAliases();
}

function publicVoiceList(aliases) {
  return Object.values(aliases).map((voice) => ({
    alias: voice.alias,
    label: voice.label,
  }));
}

export default async function handler(req, res) {
  if (!preparePaidRequest(req, res, ["GET", "POST"])) return;
  if (!contentLengthWithin(req, 100_000)) {
    return sendJson(res, 413, { error: "Request body too large" });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return sendJson(res, 503, { error: "ElevenLabs is not configured" });
  }

  let voiceAliases;
  try {
    voiceAliases = getAllowedVoiceAliases();
  } catch (error) {
    return sendJson(res, 503, { error: error.message });
  }
  if (!voiceAliases) {
    return sendJson(res, 503, {
      error: "A public ElevenLabs proxy voice is not configured",
    });
  }

  if (req.method === "GET") {
    const aliases = publicVoiceList(voiceAliases);
    return sendJson(res, 200, {
      voices: aliases,
      defaultVoiceAlias: aliases[0]?.alias || "server-default",
      source: "server-allowlist",
    });
  }

  const body = req.body || {};
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 5_000) {
    return sendJson(res, 400, { error: "TTS text is missing or too long" });
  }

  if (
    Object.prototype.hasOwnProperty.call(body, "voice") ||
    Object.prototype.hasOwnProperty.call(body, "voiceId") ||
    Object.prototype.hasOwnProperty.call(body, "voice_id")
  ) {
    return sendJson(res, 400, {
      error: "Raw ElevenLabs voice identifiers are not accepted",
    });
  }
  const voiceAlias = String(body.voiceAlias || "server-default").trim();
  const selectedVoice = voiceAliases[voiceAlias];
  if (!selectedVoice) {
    return sendJson(res, 400, { error: "ElevenLabs voice alias not allowed" });
  }
  const voiceId = selectedVoice.voiceId;
  const modelId = allowedValue(
    body.modelId ?? body.model_id,
    "eleven_v3",
    envList("ELEVENLABS_MODELS", MODELS),
  );
  if (!modelId) {
    return sendJson(res, 400, { error: "ElevenLabs model not allowed" });
  }
  const outputFormat = allowedValue(
    body.outputFormat ?? body.output_format,
    "mp3_44100_128",
    envList("ELEVENLABS_OUTPUT_FORMATS", OUTPUT_FORMATS),
  );
  if (!outputFormat) {
    return sendJson(res, 400, { error: "ElevenLabs output format not allowed" });
  }

  const settings = body.voiceSettings || body.voice_settings || {};
  const clamp = (value, fallback) =>
    Math.min(1, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : fallback));
  const speed = Math.min(
    1.2,
    Math.max(
      0.7,
      Number.isFinite(Number(settings.speed)) ? Number(settings.speed) : 1,
    ),
  );

  let upstream;
  try {
    upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`,
      {
        method: "POST",
        headers: {
          Accept: outputContentType(outputFormat),
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: clamp(settings.stability, 0.5),
            similarity_boost: clamp(settings.similarity_boost, 0.75),
            style: clamp(settings.style, 0),
            use_speaker_boost: settings.use_speaker_boost !== false,
            speed,
          },
        }),
      },
    );
  } catch {
    return sendJson(res, 502, { error: "ElevenLabs is temporarily unavailable" });
  }

  if (!upstream.ok) {
    return sendJson(res, upstream.status, {
      error: `ElevenLabs HTTP ${upstream.status}`,
    });
  }

  res.setHeader("Content-Type", outputContentType(outputFormat));
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "X-Smrt-Voice-Selection",
    selectedVoice.alias,
  );
  res.setHeader("X-Smrt-Audio-Format", outputFormat);
  return res.status(200).end(Buffer.from(await upstream.arrayBuffer()));
}
