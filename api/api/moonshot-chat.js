import {
  allowedValue,
  contentLengthWithin,
  envList,
  preparePaidRequest,
  sendJson,
} from "./_security.js";

const DEFAULT_MODELS = [
  "kimi-k3",
  "kimi-k2.7-code",
  "kimi-k2.7-code-highspeed",
  "kimi-k2.6",
];
const REASONING_EFFORTS = ["low", "high", "max"];

export default async function handler(req, res) {
  if (!preparePaidRequest(req, res, ["GET", "POST"])) return;
  if (!contentLengthWithin(req, 4_000_000)) {
    return sendJson(res, 413, { error: "Request body too large" });
  }

  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    return sendJson(res, 503, { error: "Moonshot Kimi is not configured" });
  }

  if (req.method === "GET") {
    let upstream;
    try {
      upstream = await fetch("https://api.moonshot.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    } catch {
      return sendJson(res, 502, { error: "Moonshot Kimi is temporarily unavailable" });
    }
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return sendJson(res, upstream.status, {
        error: data?.error?.message || `Moonshot HTTP ${upstream.status}`,
      });
    }
    return sendJson(res, 200, {
      object: "list",
      data: (Array.isArray(data?.data) ? data.data : []).map((model) => ({
        id: model.id,
        object: model.object,
        created: model.created,
        owned_by: model.owned_by,
        context_length: model.context_length,
        supports_image_in: Boolean(model.supports_image_in),
        supports_video_in: Boolean(model.supports_video_in),
        supports_reasoning: Boolean(model.supports_reasoning),
      })),
    });
  }

  const body = req.body;
  if (!body || typeof body !== "object" || !Array.isArray(body.messages)) {
    return sendJson(res, 400, { error: "A messages array is required" });
  }
  if (
    body.messages.length < 1 ||
    body.messages.length > 100 ||
    JSON.stringify(body.messages).length > 3_500_000
  ) {
    return sendJson(res, 400, { error: "Messages exceed the allowed limits" });
  }

  const model = allowedValue(
    body.model,
    "kimi-k3",
    envList("MOONSHOT_CHAT_MODELS", DEFAULT_MODELS),
  );
  if (!model) return sendJson(res, 400, { error: "Model not allowed" });

  const reasoningEffort = REASONING_EFFORTS.includes(body.reasoning_effort)
    ? body.reasoning_effort
    : "low";
  const requestedTokens = Number(body.max_completion_tokens ?? 2048);
  const maxCompletionTokens = Math.min(
    Number.isFinite(requestedTokens) ? Math.max(1, requestedTokens) : 2048,
    8192,
  );
  const payload = {
    model,
    messages: body.messages,
    max_completion_tokens: maxCompletionTokens,
    reasoning_effort: reasoningEffort,
  };
  if (Array.isArray(body.tools)) payload.tools = body.tools;
  if (body.tool_choice !== undefined) payload.tool_choice = body.tool_choice;
  if (body.response_format && typeof body.response_format === "object") {
    payload.response_format = body.response_format;
  }

  let upstream;
  try {
    upstream = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return sendJson(res, 502, { error: "Moonshot Kimi is temporarily unavailable" });
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return sendJson(res, upstream.status, {
      error: data?.error?.message || `Moonshot HTTP ${upstream.status}`,
    });
  }
  return sendJson(res, 200, data);
}
