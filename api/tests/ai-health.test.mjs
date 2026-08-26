import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import aiHealthHandler from "../api/ai-health.js";

function response() {
  return {
    headers: new Map(),
    statusCode: 0,
    body: null,
    setHeader(key, value) {
      this.headers.set(key.toLowerCase(), value);
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    end(value) {
      this.body = value;
      return this;
    },
  };
}

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.MOONSHOT_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.SMRT_PROXY_TOKEN;
});

test("health is available without proxy credentials and reveals only booleans", () => {
  process.env.OPENAI_API_KEY = "private-openai-key";
  process.env.MOONSHOT_API_KEY = "private-moonshot-key";
  const res = response();

  aiHealthHandler({ method: "GET", headers: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), {
    status: "ok",
    services: { openai: true, moonshot: true, elevenlabs: false },
  });
  assert.doesNotMatch(res.body, /private-/);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("health allows configured browser origins and handles preflight", () => {
  const origin = "https://widgets.smdeltart.com";
  const res = response();

  aiHealthHandler({ method: "OPTIONS", headers: { origin } }, res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), origin);
});

test("health rejects unknown origins and unsupported methods", () => {
  const forbidden = response();
  aiHealthHandler(
    { method: "GET", headers: { origin: "https://example.invalid" } },
    forbidden,
  );
  assert.equal(forbidden.statusCode, 403);

  const wrongMethod = response();
  aiHealthHandler({ method: "POST", headers: {} }, wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);
});