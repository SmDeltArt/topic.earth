import { timingSafeEqual } from "node:crypto";

const DEFAULT_ORIGINS = new Set([
  "https://api.caddeltai.com",
  "https://api-caddeltai.vercel.app",
  "https://api.smdeltart.com",
  "https://widgets.smdeltart.com",
  "https://studio.caddeltai.com",
  "https://studio.smdeltart.com",
  "https://media.caddeltai.com",
]);

function configuredOrigins() {
  const extra = String(process.env.SMRT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

function isLocalOrigin(origin) {
  if (process.env.VERCEL_ENV === "production") return false;
  try {
    const url = new URL(origin);
    return (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      (url.protocol === "http:" || url.protocol === "https:")
    );
  } catch {
    return false;
  }
}

function originAllowed(origin) {
  return !origin || configuredOrigins().has(origin) || isLocalOrigin(origin);
}

function secureEqual(received, expected) {
  const left = Buffer.from(String(received || ""));
  const right = Buffer.from(String(expected || ""));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function sendJson(res, status, body) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).end(JSON.stringify(body));
}

export function preparePublicRequest(req, res, methods) {
  const origin = String(req.headers.origin || "");
  if (!originAllowed(origin)) {
    sendJson(res, 403, { error: "Origin not allowed" });
    return false;
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-smrt-token");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.setHeader("Cache-Control", "no-store");
    res.status(204).end();
    return false;
  }

  if (!methods.includes(req.method)) {
    sendJson(res, 405, { error: "Method not allowed" });
    return false;
  }

  return true;
}

export function preparePaidRequest(req, res, methods) {
  if (!preparePublicRequest(req, res, methods)) return false;

  const expected = String(process.env.SMRT_PROXY_TOKEN || "").trim();
  if (!expected) {
    sendJson(res, 503, { error: "Proxy authentication is not configured" });
    return false;
  }

  if (!secureEqual(req.headers["x-smrt-token"], expected)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }

  return true;
}

export function contentLengthWithin(req, maxBytes) {
  const value = Number(req.headers["content-length"] || 0);
  return Number.isFinite(value) && value >= 0 && value <= maxBytes;
}

export function allowedValue(value, fallback, allowed) {
  const selected = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return allowed.includes(selected) ? selected : null;
}

export function envList(name, defaults) {
  const configured = String(process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.length ? configured : defaults;
}
