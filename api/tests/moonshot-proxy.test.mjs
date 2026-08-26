import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, test } from "node:test";
import moonshotHandler from "../api/moonshot-chat.js";

const originalFetch = global.fetch;

function response() {
  return {
    headers: new Map(),
    statusCode: 0,
    body: "",
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), value);
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    end(value = "") {
      this.body = value;
      return this;
    },
  };
}

function request(body, options = {}) {
  return {
    method: options.method || "POST",
    body,
    headers: {
      origin: options.origin || "https://studio.caddeltai.com",
      "x-smrt-token": options.token || "test-token",
      "content-length": String(Buffer.byteLength(JSON.stringify(body || {}))),
    },
  };
}

beforeEach(() => {
  process.env.SMRT_PROXY_TOKEN = "test-token";
  process.env.MOONSHOT_API_KEY = "moonshot-test";
  delete process.env.MOONSHOT_CHAT_MODELS;
});

afterEach(() => {
  global.fetch = originalFetch;
});

test("Moonshot proxy rejects unauthorized calls before upstream", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response();
  };
  const res = response();
  await moonshotHandler(request({ messages: [] }, { token: "wrong" }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls, 0);
});

test("Moonshot proxy enforces CORS and requires a server key", async () => {
  const forbidden = response();
  await moonshotHandler(
    request(
      { messages: [{ role: "user", content: "test" }] },
      { origin: "https://attacker.example" },
    ),
    forbidden,
  );
  assert.equal(forbidden.statusCode, 403);

  delete process.env.MOONSHOT_API_KEY;
  const unconfigured = response();
  await moonshotHandler(
    request({ messages: [{ role: "user", content: "test" }] }),
    unconfigured,
  );
  assert.equal(unconfigured.statusCode, 503);
});

test("Moonshot proxy rejects non-allowlisted models before upstream", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response();
  };
  const res = response();
  await moonshotHandler(
    request({
      model: "moonshot-v1-obsolete",
      messages: [{ role: "user", content: "test" }],
    }),
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.equal(calls, 0);
});

test("Moonshot K3 request forwards only supported bounded fields", async () => {
  let upstream;
  global.fetch = async (url, options) => {
    upstream = {
      url: String(url),
      headers: options.headers,
      body: JSON.parse(options.body),
    };
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "OK" } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: "Describe this" },
        { type: "image_url", image_url: { url: "data:image/png;base64,AA==" } },
      ],
    },
  ];
  const res = response();
  await moonshotHandler(
    request({
      model: "kimi-k3",
      messages,
      max_completion_tokens: 99_999,
      reasoning_effort: "high",
      temperature: 0.7,
      n: 4,
    }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(upstream.url, "https://api.moonshot.ai/v1/chat/completions");
  assert.equal(upstream.headers.Authorization, "Bearer moonshot-test");
  assert.equal(upstream.body.model, "kimi-k3");
  assert.equal(upstream.body.max_completion_tokens, 8192);
  assert.equal(upstream.body.reasoning_effort, "high");
  assert.deepEqual(upstream.body.messages, messages);
  assert.equal("temperature" in upstream.body, false);
  assert.equal("n" in upstream.body, false);
});

test("Moonshot model list returns sanitized capability fields", async () => {
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        data: [
          {
            id: "kimi-k3",
            object: "model",
            created: 123,
            owned_by: "moonshot",
            context_length: 1_000_000,
            supports_image_in: true,
            supports_video_in: true,
            supports_reasoning: true,
            secret_internal_field: "omit",
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  const res = response();
  await moonshotHandler(request(null, { method: "GET" }), res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.data[0].id, "kimi-k3");
  assert.equal(body.data[0].context_length, 1_000_000);
  assert.equal(body.data[0].supports_image_in, true);
  assert.equal("secret_internal_field" in body.data[0], false);
});

test("API Settings exposes Kimi models and only the v2.3 badge enables dev UI", async () => {
  const html = await readFile(
    new URL("../api-settings.html", import.meta.url),
    "utf8",
  );
  const source = await readFile(
    new URL("../src/api-settings.js", import.meta.url),
    "utf8",
  );
  assert.match(html, /id="apiSettingsVersionBadge"/);
  assert.match(html, />v2\.3 ✅<\/a/);
  assert.match(html, /<span class="header-title-text">/);
  assert.match(html, /value="kimi-k3"/);
  assert.match(html, /value="kimi-k2\.7-code"/);
  assert.match(source, /https:\/\/api\.moonshot\.ai\/v1\/models/);
  assert.doesNotMatch(source, /platform\.moonshot\.cn/);
});
