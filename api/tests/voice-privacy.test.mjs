import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, test } from "node:test";
import elevenLabsTtsHandler from "../api/elevenlabs-tts.js";
import { __test as sourceMetadata } from "../api/source-metadata.js";

const originalFetch = global.fetch;

function response() {
  return { headers: new Map(), statusCode: 0, body: null, setHeader(k, v) { this.headers.set(k.toLowerCase(), v); }, status(v) { this.statusCode = v; return this; }, end(v) { this.body = v; return this; } };
}

function request(body = {}, method = "POST") {
  return { method, body, headers: { origin: "https://studio.caddeltai.com", "x-smrt-token": "test-token", "content-length": String(Buffer.byteLength(JSON.stringify(body))) } };
}

beforeEach(() => {
  process.env.SMRT_PROXY_TOKEN = "test-token";
  process.env.ELEVENLABS_API_KEY = "test-key";
  delete process.env.ELEVENLABS_ALLOWED_VOICES_JSON;
  process.env.ELEVENLABS_PUBLIC_VOICE_ID = "PublicVoiceForMockOnly";
  delete process.env.ELEVENLABS_VOICE_ID;
});
afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.ELEVENLABS_ALLOWED_VOICES_JSON;
  delete process.env.ELEVENLABS_PUBLIC_VOICE_ID;
  delete process.env.ELEVENLABS_VOICE_ID;
});

test("Secure Proxy parses alias JSON and returns only safe aliases and labels", async () => {
  process.env.ELEVENLABS_ALLOWED_VOICES_JSON = JSON.stringify({
    "server-default": {
      label: "Server default",
      voiceId: "ServerDefaultSecretVoice",
    },
    bendes: {
      label: "BenDes",
      voiceId: "BenDesSecretVoice",
    },
  });
  const res = response();
  await elevenLabsTtsHandler(request({}, "GET"), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), {
    voices: [
      { alias: "server-default", label: "Server default" },
      { alias: "bendes", label: "BenDes" },
    ],
    defaultVoiceAlias: "server-default",
    source: "server-allowlist",
  });
  assert.doesNotMatch(res.body, /voiceId|voice_id|preview_url|SecretVoice/);
});

test("Secure Proxy rejects every raw voice field before upstream", async () => {
  for (const field of ["voice", "voiceId", "voice_id"]) {
    let calls = 0;
    global.fetch = async () => { calls += 1; return new Response(); };
    const res = response();
    await elevenLabsTtsHandler(request({ text: "test", [field]: "PrivateVoiceIdentifier" }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(calls, 0);
  }
});

test("Secure Proxy rejects unknown aliases before upstream", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response();
  };
  const res = response();
  await elevenLabsTtsHandler(request({ text: "test", voiceAlias: "unknown" }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(calls, 0);
});

test("proxy maps JSON alias server-side and keeps Eleven v3 accepted", async () => {
  process.env.ELEVENLABS_ALLOWED_VOICES_JSON = JSON.stringify({
    bendes: {
      label: "BenDes",
      voiceId: "BenDesSecretVoice",
    },
  });
  let upstream;
  global.fetch = async (url, options) => {
    upstream = { url: String(url), body: JSON.parse(options.body) };
    return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "audio/mpeg" } });
  };
  const res = response();
  await elevenLabsTtsHandler(request({ text: "[laughs] exact source", voiceAlias: "bendes", modelId: "eleven_v3", outputFormat: "mp3_44100_192" }), res);
  assert.equal(res.statusCode, 200);
  assert.match(upstream.url, /BenDesSecretVoice/);
  assert.equal(upstream.body.text, "[laughs] exact source");
  assert.equal(upstream.body.model_id, "eleven_v3");
  assert.match(upstream.url, /output_format=mp3_44100_192/);
  assert.equal(res.headers.get("x-smrt-voice-selection"), "bendes");
});

test("public voice fallback maps server-default without exposing the ID", async () => {
  let upstream;
  global.fetch = async (url, options) => {
    upstream = { url: String(url), body: JSON.parse(options.body) };
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
  };
  const listed = response();
  await elevenLabsTtsHandler(request({}, "GET"), listed);
  assert.deepEqual(JSON.parse(listed.body), {
    voices: [{ alias: "server-default", label: "Server default" }],
    defaultVoiceAlias: "server-default",
    source: "server-allowlist",
  });
  assert.doesNotMatch(listed.body, /PublicVoiceForMockOnly/);

  const res = response();
  await elevenLabsTtsHandler(request({ text: "test", voiceAlias: "server-default", modelId: "eleven_multilingual_v2" }), res);
  assert.equal(res.statusCode, 200);
  assert.match(upstream.url, /PublicVoiceForMockOnly/);
  assert.equal(upstream.body.model_id, "eleven_multilingual_v2");
});

test("legacy ELEVENLABS_VOICE_ID fallback is explicit and documented", async () => {
  delete process.env.ELEVENLABS_PUBLIC_VOICE_ID;
  process.env.ELEVENLABS_VOICE_ID = "LegacyVoiceForMockOnly";
  let upstream;
  global.fetch = async (url) => {
    upstream = String(url);
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
  };
  const res = response();
  await elevenLabsTtsHandler(request({ text: "test", voiceAlias: "server-default" }), res);
  assert.equal(res.statusCode, 200);
  assert.match(upstream, /LegacyVoiceForMockOnly/);
  const docs = await readFile(new URL("../SECURITY_SETUP.md", import.meta.url), "utf8");
  assert.match(docs, /ELEVENLABS_VOICE_ID/);
  assert.match(docs, /legacy fallback/i);
});

test("API Settings and consumers do not render or export raw voice values", async () => {
  const files = [
    "../api-settings.html", "../src/api-settings.js",
    "../../widgets/api-settings.html", "../../widgets/src/clipboard-manager.js",
    "../../widgets/src/smart-svg-editor.js", "../../studio/public/app/index.html",
  ];
  for (const relative of files) {
    const source = await readFile(new URL(relative, import.meta.url), "utf8");
    assert.doesNotMatch(source, /JBFqnCBsd6RMkjVDRZzb|BenDes \(Clone\)|Default \(BenDes clone/);
  }
});

test("URL metadata parser sanitizes readable text and GitHub adapter identifies targets", () => {
  const parsed = sourceMetadata.parseHtmlMetadata(`<!doctype html><html lang="en"><head><title>Public page</title><meta name="description" content="Safe description"><script>alert(1)</script><script type="application/ld+json">{"@type":"Article"}</script></head><body><form>secret form</form><main>Hello world</main></body></html>`, "https://example.com/page");
  assert.equal(parsed.title, "Public page");
  assert.equal(parsed.description, "Safe description");
  assert.match(parsed.readableText, /Hello world/);
  assert.doesNotMatch(parsed.readableText, /alert\(1\)|secret form/);
  assert.deepEqual(sourceMetadata.parseGitHubUrl(new URL("https://github.com/acme/demo/tree/main/src")), { owner: "acme", repo: "demo", mode: "tree", branch: "main", path: "src" });
});

test("URL metadata rejects private and non-HTTP targets before fetching", async () => {
  await assert.rejects(() => sourceMetadata.validateRemoteUrl("http://127.0.0.1/private"), /Private, link-local, or reserved/);
  await assert.rejects(() => sourceMetadata.validateRemoteUrl("file:///etc/passwd"), /Only HTTP and HTTPS/);
});

test("URL endpoint documents bounded GitHub guidance and honest YouTube transcript status", async () => {
  const source = await readFile(new URL("../api/source-metadata.js", import.meta.url), "utf8");
  assert.match(source, /importantFiles/);
  assert.match(source, /Inspect manifests and entry points first/);
  assert.match(source, /transcriptStatus:\s*"unavailable"/);
  assert.match(source, /Metadata loaded · transcript unavailable/);
  assert.match(source, /MAX_RESPONSE_BYTES = 2 \* 1024 \* 1024/);
  assert.match(source, /validateRemoteUrl\(new URL\(location, url\)\.href\)/);
  assert.doesNotMatch(source, /\b501\b/);
  assert.match(source, /Private, link-local, or reserved network addresses are blocked/);
});
