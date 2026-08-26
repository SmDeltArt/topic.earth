import {
  allowedValue,
  contentLengthWithin,
  envList,
  preparePaidRequest,
  sendJson,
} from "./_security.js";

const DEFAULT_MODELS = [
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5-mini",
  "gpt-5",
  "gpt-5.1",
  "gpt-5.4-pro",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1-mini",
];

function isGpt5FamilyModel(model) {
  return /^gpt-5(\b|[\s.-])/i.test(model);
}

export default async function handler(req, res) {
  if (!preparePaidRequest(req, res, ["POST"])) return;
  if (!contentLengthWithin(req, 1_000_000)) {
    return sendJson(res, 413, { error: "Request body too large" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 503, { error: "OpenAI is not configured" });
  }

  const body = req.body;
  if (!body || typeof body !== "object" || !Array.isArray(body.messages)) {
    return sendJson(res, 400, { error: "A messages array is required" });
  }
  if (
    body.messages.length < 1 ||
    body.messages.length > 100 ||
    JSON.stringify(body.messages).length > 100_000
  ) {
    return sendJson(res, 400, { error: "Messages exceed the allowed limits" });
  }

  const model = allowedValue(
    body.model,
    "gpt-4o-mini",
    envList("OPENAI_CHAT_MODELS", DEFAULT_MODELS),
  );
  if (!model) return sendJson(res, 400, { error: "Model not allowed" });

  const requestedTokens = Number(
    body.max_completion_tokens ?? body.max_tokens ?? 1024,
  );
  const tokenLimit = Math.min(
    Number.isFinite(requestedTokens) ? Math.max(1, requestedTokens) : 1024,
    4096,
  );

  const payload = { ...body, model };
  if (isGpt5FamilyModel(model)) {
    payload.max_completion_tokens = tokenLimit;
    delete payload.max_tokens;
  } else {
    payload.max_tokens = tokenLimit;
    delete payload.max_completion_tokens;
  }

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
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
