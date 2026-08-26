import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, test } from "node:test";
import openAiImageHandler from "../api/openai-image.js";
import elevenLabsSoundHandler from "../api/elevenlabs-sound.js";
import elevenLabsSoundEffectsHandler from "../api/elevenlabs-sound-effects.js";

const originalFetch = global.fetch;

function createResponse() {
  return {
    headers: new Map(),
    statusCode: 0,
    body: null,
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), value);
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

function createRequest(body, { token = "test-token", method = "POST" } = {}) {
  const serialized = JSON.stringify(body || {});
  return {
    method,
    body,
    headers: {
      origin: "https://studio.caddeltai.com",
      "x-smrt-token": token,
      "content-length": String(Buffer.byteLength(serialized)),
    },
  };
}

beforeEach(() => {
  process.env.SMRT_PROXY_TOKEN = "test-token";
  process.env.OPENAI_API_KEY = "openai-test";
  process.env.ELEVENLABS_API_KEY = "eleven-test";
  delete process.env.OPENAI_IMAGE_MODELS;
  delete process.env.ELEVENLABS_SOUND_MODELS;
  delete process.env.ELEVENLABS_SOUND_OUTPUT_FORMATS;
});

afterEach(() => {
  global.fetch = originalFetch;
});

test("rejects o3 before the OpenAI Images endpoint is called", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response();
  };
  const res = createResponse();
  await openAiImageHandler(
    createRequest({ model: "o3", prompt: "test" }),
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.equal(calls, 0);
});

test("API Settings persists gpt-image-2 and does not offer o3 as an image model", async () => {
  const html = await readFile(
    new URL("../api-settings.html", import.meta.url),
    "utf8",
  );
  const source = await readFile(
    new URL("../src/api-settings.js", import.meta.url),
    "utf8",
  );
  assert.match(
    html,
    /<option value="gpt-image-2" selected>/,
  );
  assert.doesNotMatch(html, /<option value="o3"/);
  assert.match(
    source,
    /openaiImageModel:\s*\n\s*document\.getElementById\("openaiImageModel"\)\?\.value \|\| "gpt-image-2"/,
  );
});

test("gpt-image-2 rejects transparent background before upstream", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response();
  };
  const res = createResponse();
  await openAiImageHandler(
    createRequest({
      model: "gpt-image-2",
      prompt: "test",
      background: "transparent",
      output_format: "png",
    }),
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.equal(calls, 0);
});

test("gpt-image-2 forwards only an opaque image request", async () => {
  let upstream;
  global.fetch = async (url, options) => {
    upstream = { url: String(url), body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ data: [{ b64_json: "AA==" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const res = createResponse();
  await openAiImageHandler(
    createRequest({
      model: "gpt-image-2",
      prompt: "test",
      background: "opaque",
      output_format: "png",
      quality: "high",
    }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(upstream.body.background, "opaque");
  assert.notEqual(upstream.body.background, "transparent");
  assert.equal(upstream.body.output_format, "png");
});

test("gpt-image-1.5 forwards native transparent PNG", async () => {
  let payload;
  global.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return new Response(JSON.stringify({ data: [{ b64_json: "AA==" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const res = createResponse();
  await openAiImageHandler(
    createRequest({
      model: "gpt-image-1.5",
      prompt: "test",
      background: "transparent",
      output_format: "png",
    }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(payload.background, "transparent");
  assert.equal(payload.output_format, "png");
});

test("ElevenLabs Sound route requires proxy authorization", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response();
  };
  const res = createResponse();
  await elevenLabsSoundHandler(
    createRequest({ text: "boom" }, { token: "wrong" }),
    res,
  );
  assert.equal(res.statusCode, 401);
  assert.equal(calls, 0);
});

test("ElevenLabs Sound route validates duration and prompt influence", async () => {
  const badDuration = createResponse();
  await elevenLabsSoundHandler(
    createRequest({ text: "boom", duration_seconds: 31 }),
    badDuration,
  );
  assert.equal(badDuration.statusCode, 400);

  const badInfluence = createResponse();
  await elevenLabsSoundHandler(
    createRequest({ text: "boom", prompt_influence: 2 }),
    badInfluence,
  );
  assert.equal(badInfluence.statusCode, 400);

  const badVoice = createResponse();
  await elevenLabsSoundHandler(
    createRequest({ text: "boom", voiceAlias: "server-default" }),
    badVoice,
  );
  assert.equal(badVoice.statusCode, 400);
});

test("ElevenLabs Sound forwards duration, loop, model and output format", async () => {
  let upstream;
  global.fetch = async (url, options) => {
    upstream = {
      url: new URL(url),
      body: JSON.parse(options.body),
      headers: options.headers,
    };
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "audio/mpeg" },
    });
  };
  const res = createResponse();
  await elevenLabsSoundHandler(
    createRequest({
      text: "deep cinematic boom",
      duration_seconds: 2.5,
      loop: true,
      prompt_influence: 0.45,
      model_id: "eleven_text_to_sound_v2",
      output_format: "mp3_44100_128",
    }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(upstream.url.pathname, "/v1/sound-generation");
  assert.equal(
    upstream.url.searchParams.get("output_format"),
    "mp3_44100_128",
  );
  assert.deepEqual(upstream.body, {
    text: "deep cinematic boom",
    duration_seconds: 2.5,
    loop: true,
    prompt_influence: 0.45,
    model_id: "eleven_text_to_sound_v2",
  });
  assert.equal(upstream.headers["xi-api-key"], "eleven-test");
  assert.equal(res.headers.get("content-type"), "audio/mpeg");
  assert.deepEqual([...res.body], [1, 2, 3]);
});

test("ElevenLabs Sound Effects alias uses the same canonical handler", async () => {
  let upstream;
  global.fetch = async (url, options) => {
    upstream = {
      url: new URL(url),
      body: JSON.parse(options.body),
      headers: options.headers,
    };
    return new Response(new Uint8Array([4, 5, 6]), {
      status: 200,
      headers: { "content-type": "audio/mpeg" },
    });
  };
  const res = createResponse();
  await elevenLabsSoundEffectsHandler(
    createRequest({
      text: "soft magical chime",
      durationSeconds: 1.5,
      loop: false,
      outputFormat: "mp3_44100_128",
    }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(upstream.url.pathname, "/v1/sound-generation");
  assert.equal(upstream.body.text, "soft magical chime");
  assert.equal(upstream.body.duration_seconds, 1.5);
  assert.equal(upstream.body.model_id, "eleven_text_to_sound_v2");
  assert.equal(upstream.headers["xi-api-key"], "eleven-test");
  assert.deepEqual([...res.body], [4, 5, 6]);
});

test("Studio relays both ElevenLabs sound routes", async () => {
  const legacyRoute = await readFile(
    new URL("../../studio/app/api/elevenlabs-sound/route.ts", import.meta.url),
    "utf8",
  );
  const aliasRoute = await readFile(
    new URL(
      "../../studio/app/api/elevenlabs-sound-effects/route.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    legacyRoute,
    /relayPaidRequest\(req,\s*"\/api\/elevenlabs-sound"\)/,
  );
  assert.match(
    aliasRoute,
    /relayPaidRequest\(req,\s*"\/api\/elevenlabs-sound-effects"\)/,
  );
});
