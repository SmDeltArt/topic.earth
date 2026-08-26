import {
  allowedValue,
  contentLengthWithin,
  envList,
  preparePaidRequest,
  sendJson,
} from "./_security.js";

const MODELS = [
  "gpt-image-2",
  "gpt-image-1.5",
  "gpt-image-1",
  "gpt-image-1-mini",
  "chatgpt-image-latest",
  "dall-e-3",
  "dall-e-2",
];
const NATIVE_ALPHA_MODELS = new Set([
  "gpt-image-1.5",
  "gpt-image-1",
  "gpt-image-1-mini",
]);
const SIZES = ["256x256", "512x512", "1024x1024", "1024x1536", "1536x1024"];
const QUALITIES = ["auto", "low", "medium", "high", "standard", "hd"];
const BACKGROUNDS = ["auto", "opaque", "transparent"];
const OUTPUT_FORMATS = ["png", "webp", "jpeg"];

export default async function handler(req, res) {
  if (!preparePaidRequest(req, res, ["POST"])) return;
  if (!contentLengthWithin(req, 100_000)) {
    return sendJson(res, 413, { error: "Request body too large" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return sendJson(res, 503, { error: "OpenAI is not configured" });

  const body = req.body || {};
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > 4_000) {
    return sendJson(res, 400, { error: "Prompt is missing or too long" });
  }

  const model = allowedValue(
    body.model,
    "gpt-image-2",
    envList("OPENAI_IMAGE_MODELS", MODELS),
  );
  const size = allowedValue(body.size, "1024x1024", SIZES);
  const quality = allowedValue(body.quality, "auto", QUALITIES);
  const background = allowedValue(body.background, "auto", BACKGROUNDS);
  const outputFormat = allowedValue(body.output_format, "png", OUTPUT_FORMATS);
  if (!model || !size || !quality || !background || !outputFormat) {
    return sendJson(res, 400, { error: "Image configuration not allowed" });
  }
  if (background === "transparent" && !NATIVE_ALPHA_MODELS.has(model)) {
    return sendJson(res, 400, {
      error: "Transparent background is not supported by this image model",
    });
  }

  const payload = { model, prompt, n: 1, size };
  if (model.startsWith("gpt-image") || model === "chatgpt-image-latest") {
    payload.quality = quality;
    payload.background = NATIVE_ALPHA_MODELS.has(model)
      ? background
      : "opaque";
    payload.output_format = outputFormat;
  } else if (
    model === "dall-e-3" &&
    (quality === "standard" || quality === "hd")
  ) {
    payload.quality = quality;
  }

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return sendJson(res, 502, { error: "OpenAI is temporarily unavailable" });
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return sendJson(res, upstream.status, {
      error: data?.error?.message || `OpenAI HTTP ${upstream.status}`,
    });
  }
  return sendJson(res, 200, data);
}
