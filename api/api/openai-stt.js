/**
 * /api/openai-stt — authenticated OpenAI Speech-to-Text proxy
 *
 * Preferred body: multipart/form-data with file, model and optional language.
 * Legacy body: JSON { audioBase64, mimeType?, model?, filename?, language? }.
 */
import {
  allowedValue,
  contentLengthWithin,
  envList,
  preparePaidRequest,
  sendJson,
} from "./_security.js";

const MODELS = [
  "gpt-4o-mini-transcribe",
  "gpt-4o-transcribe",
  "whisper-1",
];
// Vercel Functions enforce a 4.5 MB invocation body limit. Leave room for
// multipart boundaries and fields so oversized audio fails predictably here.
const MAX_REQUEST_BYTES = 4_000_000;
const MAX_AUDIO_BYTES = 3_750_000;

function cleanLanguage(value) {
  const language = typeof value === "string" ? value.trim() : "";
  if (!language) return "";
  return /^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(language) ? language : null;
}

function cleanFilename(value, mimeType) {
  const fallback = mimeType.includes("wav")
    ? "audio.wav"
    : mimeType.includes("mpeg") || mimeType.includes("mp3")
      ? "audio.mp3"
      : "audio.webm";
  const filename =
    typeof value === "string"
      ? value
          .trim()
          .replace(/[^a-z0-9._-]/gi, "-")
          .slice(0, 120)
      : "";
  return filename || fallback;
}

function validAudioType(value) {
  const mimeType = String(value || "application/octet-stream")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (
    mimeType.startsWith("audio/") ||
    mimeType === "video/webm" ||
    mimeType === "application/octet-stream"
  ) {
    return mimeType;
  }
  return null;
}

async function readRawBody(req, maxBytes) {
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > maxBytes) throw new Error("Request body too large");
    return req.body;
  }
  if (req.body instanceof Uint8Array) {
    const buffer = Buffer.from(req.body);
    if (buffer.length > maxBytes) throw new Error("Request body too large");
    return buffer;
  }
  if (typeof req.body === "string") {
    const buffer = Buffer.from(req.body);
    if (buffer.length > maxBytes) throw new Error("Request body too large");
    return buffer;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new Error("Request body too large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function createUpstreamForm({ bytes, mimeType, filename, model, language }) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), filename);
  form.append("model", model);
  if (language) form.append("language", language);
  return form;
}

async function formFromMultipart(req, contentType) {
  const raw = await readRawBody(req, MAX_REQUEST_BYTES);
  if (!raw.length) throw new Error("Missing multipart request body");

  const parsed = await new Request("http://localhost/openai-stt", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: raw,
  }).formData();
  const file = parsed.get("file");
  if (!(file instanceof Blob)) throw new Error("Missing required file");
  if (!file.size || file.size > MAX_AUDIO_BYTES) {
    throw new Error("Audio file is empty or too large");
  }

  const mimeType = validAudioType(file.type);
  if (!mimeType) throw new Error("Audio type is not allowed");
  const model = allowedValue(
    parsed.get("model"),
    "gpt-4o-mini-transcribe",
    envList("OPENAI_STT_MODELS", MODELS),
  );
  if (!model) throw new Error("STT model is not allowed");
  const language = cleanLanguage(parsed.get("language"));
  if (language === null) throw new Error("STT language is not valid");

  return createUpstreamForm({
    bytes: await file.arrayBuffer(),
    mimeType,
    filename: cleanFilename(file.name, mimeType),
    model,
    language,
  });
}

function formFromJson(body) {
  const rawValue =
    typeof body?.audioBase64 === "string" ? body.audioBase64.trim() : "";
  const audioBase64 = rawValue.replace(
    /^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,/i,
    "",
  );
  if (!audioBase64 || !/^[a-z0-9+/]*={0,2}$/i.test(audioBase64)) {
    throw new Error("Missing or invalid audioBase64");
  }

  const bytes = Buffer.from(audioBase64, "base64");
  if (!bytes.length || bytes.length > MAX_AUDIO_BYTES) {
    throw new Error("Audio file is empty or too large");
  }
  const mimeType = validAudioType(body.mimeType || "audio/webm");
  if (!mimeType) throw new Error("Audio type is not allowed");
  const model = allowedValue(
    body.model,
    "gpt-4o-mini-transcribe",
    envList("OPENAI_STT_MODELS", MODELS),
  );
  if (!model) throw new Error("STT model is not allowed");
  const language = cleanLanguage(body.language);
  if (language === null) throw new Error("STT language is not valid");

  return createUpstreamForm({
    bytes,
    mimeType,
    filename: cleanFilename(body.filename, mimeType),
    model,
    language,
  });
}

export default async function handler(req, res) {
  if (!preparePaidRequest(req, res, ["POST"])) return;
  if (!contentLengthWithin(req, MAX_REQUEST_BYTES)) {
    return sendJson(res, 413, { error: "Request body too large" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return sendJson(res, 503, { error: "OpenAI is not configured" });

  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  let form;
  try {
    form = contentType.startsWith("multipart/form-data")
      ? await formFromMultipart(req, req.headers["content-type"])
      : formFromJson(req.body || {});
  } catch (error) {
    const message = error?.message || "Invalid audio payload";
    const status = message.includes("too large") ? 413 : 400;
    return sendJson(res, status, { error: message });
  }

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch {
    return sendJson(res, 502, {
      error: "OpenAI is temporarily unavailable",
      endpoint: "/api/openai-stt",
    });
  }

  const responseText = await upstream.text().catch(() => "");
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = {};
  }
  if (!upstream.ok) {
    return sendJson(res, upstream.status, {
      error:
        data?.error?.message ||
        data?.message ||
        responseText.slice(0, 400) ||
        `OpenAI HTTP ${upstream.status}`,
      status: upstream.status,
      endpoint: "/api/openai-stt",
    });
  }

  return sendJson(res, 200, { text: data?.text || "" });
}
