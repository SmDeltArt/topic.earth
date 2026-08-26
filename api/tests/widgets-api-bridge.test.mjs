import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../../", import.meta.url);

function storage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

async function loadBridge(href = "https://widgets.smdeltart.com/clipboard-manager.html") {
  const source = await readFile(
    new URL("widgets/shared/smart-api-settings-bridge.js", root),
    "utf8",
  );
  const listeners = new Map();
  const pageUrl = new URL(href);
  const window = {
    location: {
      href: pageUrl.href,
      origin: pageUrl.origin,
      protocol: pageUrl.protocol,
      hostname: pageUrl.hostname,
      pathname: pageUrl.pathname,
    },
    addEventListener(type, callback) {
      const callbacks = listeners.get(type) || [];
      callbacks.push(callback);
      listeners.set(type, callbacks);
    },
    removeEventListener() {},
    dispatchEvent(event) {
      for (const callback of listeners.get(event.type) || []) callback(event);
    },
  };
  window.parent = window;
  const context = vm.createContext({
    URL,
    console,
    localStorage: storage(),
    sessionStorage: storage(),
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    document: { referrer: "" },
    window,
  });
  vm.runInContext(source, context, {
    filename: "smart-api-settings-bridge.js",
  });
  return { ...context, bridge: window.SmartApiSettingsBridge, listeners };
}

test("common widgets bridge accepts trusted settings and keeps proxy token session-only", async () => {
  const { bridge, listeners, localStorage, sessionStorage } =
    await loadBridge();
  const onMessage = listeners.get("message")[0];

  onMessage({
    origin: "https://api.caddeltai.com",
    data: {
      type: "smart-widget",
      action: "settings-saved",
      data: {
        providerMode: "proxy",
        activeTextProvider: "paid",
        paidTextApi: "moonshot",
        moonshotTextModel: "kimi-k3",
        smrtProxyToken: "must-not-persist",
      },
    },
  });

  for (const key of [
    "smartApiSettings",
    "smdeltartApiSettings",
    "cadAiApiSettings",
  ]) {
    const saved = JSON.parse(localStorage.getItem(key));
    assert.equal(saved.smrtProxyToken, undefined);
  }

  onMessage({
    origin: "https://api.caddeltai.com",
    data: {
      type: "smart-widget",
      action: "proxy-session",
      data: {
        smrtProxyToken: "0123456789abcdef01234567",
        providerMode: "proxy",
        paidTextApi: "moonshot",
        moonshotTextModel: "kimi-k3",
      },
    },
  });

  const session = JSON.parse(sessionStorage.getItem("cadAiApiSettings"));
  assert.equal(session.smrtProxyToken, "0123456789abcdef01234567");
  assert.deepEqual(
    {
      provider: bridge.getTextConfig().provider,
      model: bridge.getTextConfig().model,
      configured: bridge.getTextConfig().configured,
      badge: bridge.badge().label,
      endpoint: bridge.proxyUrl("/api/moonshot-chat"),
    },
    {
      provider: "moonshot",
      model: "kimi-k3",
      configured: true,
      badge: "Proxy · Kimi · kimi-k3",
      endpoint: "https://api-caddeltai.vercel.app/api/moonshot-chat",
    },
  );
});

test("common bridge routes API Settings and proxy by app context", async () => {
  const widgets = (
    await loadBridge("https://widgets.smdeltart.com/smart-code-editor.html")
  ).bridge;
  assert.equal(
    widgets.getApiSettingsTarget(),
    "https://widgets.smdeltart.com/?app=api",
  );
  assert.equal(
    widgets.getProxyConfig({ providerMode: "proxy" }).baseUrl,
    "https://api-caddeltai.vercel.app",
  );

  const portal = (
    await loadBridge(
      "https://portal.smdeltart.com/widgets/clipboard-manager.html",
    )
  ).bridge;
  assert.equal(
    portal.getApiSettingsTarget(),
    "https://portal.smdeltart.com/widgets/api-settings.html?embed=true",
  );
  assert.equal(
    portal.getProxyConfig({ providerMode: "proxy" }).baseUrl,
    "https://portal.smdeltart.com",
  );

  const studio = (
    await loadBridge("https://studio.caddeltai.com/app/index.html")
  ).bridge;
  assert.equal(
    studio.getApiSettingsTarget(),
    "https://api-caddeltai.vercel.app/api-settings.html?embed=true",
  );
  assert.equal(
    studio.getProxyConfig({ providerMode: "proxy" }).baseUrl,
    "https://api-caddeltai.vercel.app",
  );
});

test("common widgets bridge ignores untrusted API Settings messages", async () => {
  const { bridge, listeners } = await loadBridge();
  listeners.get("message")[0]({
    origin: "https://attacker.invalid",
    data: {
      type: "smart-widget",
      action: "settings-saved",
      data: { paidTextApi: "moonshot" },
    },
  });
  assert.equal(bridge.getTextConfig().provider, "");
});

test("trusted privacy reset clears nested voice data and acknowledges the requesting origin", async () => {
  const { listeners, localStorage } = await loadBridge();
  localStorage.setItem("streamingStudioConfig", JSON.stringify({
    project: "keep",
    text: { provider: "elevenlabs", voice: "PrivateVoiceIdentifier123" },
  }));
  const replies = [];
  listeners.get("message")[0]({
    origin: "https://api.caddeltai.com",
    source: { postMessage: (message, origin) => replies.push({ message, origin }) },
    data: {
      type: "smart-widget",
      action: "api-settings-privacy-reset-request",
      data: { version: 1, requestId: "reset-test" },
    },
  });
  const migrated = JSON.parse(localStorage.getItem("streamingStudioConfig"));
  assert.equal(migrated.project, "keep");
  assert.equal("voice" in migrated.text, false);
  assert.equal(replies[0].origin, "https://api.caddeltai.com");
  assert.equal(replies[0].message.action, "api-settings-privacy-reset-complete");
  assert.equal(replies[0].message.data.requestId, "reset-test");
});

test("target widget apps load the common bridge and requested badges exist", async () => {
  const files = [
    "widgets/clipboard-manager.html",
    "widgets/smart-code-editor.html",
    "widgets/smart-svg-editor.html",
    "widgets/smart-iceoff.html",
  ];
  for (const file of files) {
    const html = await readFile(new URL(file, root), "utf8");
    assert.match(html, /shared\/smart-api-settings-bridge\.js/);
  }
  assert.match(
    await readFile(new URL("widgets/smart-code-editor.html", root), "utf8"),
    /id="apiProviderBadge"/,
  );
  assert.match(
    await readFile(new URL("widgets/smart-iceoff.html", root), "utf8"),
    /id="aiModelBadge"/,
  );
  assert.doesNotMatch(
    await readFile(new URL("widgets/clipboard-manager.html", root), "utf8"),
    /id="apiSettingsFrame"/,
  );
  assert.doesNotMatch(
    await readFile(
      new URL("widgets/src/smart-code-editor-brand-bridge.js", root),
      "utf8",
    ),
    /codeApiSettingsOverlay/,
  );
  assert.doesNotMatch(
    await readFile(
      new URL("widgets/src/smart-iceoff-v2.js", root),
      "utf8",
    ),
    /stxtApiSettingsOverlay/,
  );
});

test("Streaming Studio uses the production API custom-domain fallback", async () => {
  for (const file of [
    "studio/public/app/src/api-settings-reader.js",
    "studio/public/app/src/smart-api-integration.js",
  ]) {
    const source = await readFile(new URL(file, root), "utf8");
    assert.match(source, /https:\/\/api\.caddeltai\.com/);
  }
});

test("Widgets API Settings defaults health checks to the canonical API project", async () => {
  const source = await readFile(
    new URL("api/src/api-settings.js", root),
    "utf8",
  );
  assert.match(source, /function _defaultProxyBaseUrl\(\)/);
  assert.match(source, /https:\/\/api\.caddeltai\.com/);
  assert.match(source, /https:\/\/api-caddeltai\.vercel\.app/);
  assert.match(
    await readFile(new URL("widgets/api-settings.html", root), "utf8"),
    /api-settings\.js\?v=20260730-elevenv3-1/,
  );
  assert.match(
    await readFile(new URL("widgets/index.html", root), "utf8"),
    /api-settings\.html\?embed=true&v=20260729-proxy3/,
  );
});

test("API Settings keeps proxy token session-only and avoids wildcard bridge targets", async () => {
  const source = await readFile(
    new URL("api/src/api-settings.js", root),
    "utf8",
  );
  assert.match(source, /function _withoutPlainSessionToken/);
  assert.match(source, /delete clean\.smrtProxyToken/);
  assert.match(source, /function _restoreProxyTokenToSession/);
  assert.match(source, /sessionStorage\.setItem\(\s*"cadAiApiSettings"/);
  assert.match(source, /const legacySettings = _legacyEncryptedSettings/);
  assert.match(
    source,
    /function setupActionButtonHandlers\(\) \{\s*\/\/ Legacy bootstrap/,
  );
  assert.match(source, /proxyBaseUrl: _proxyBaseUrl\(\) \|\| _defaultProxyBaseUrl\(\)/);
  assert.doesNotMatch(
    source,
    /localStorage\.setItem\("cadAiApiSettings",\s*JSON\.stringify\(plainSettings\)\)/,
  );
  assert.doesNotMatch(
    source,
    /postMessage\([\s\S]{0,220}["']\*["']\s*\)/,
  );
});

test("Smart API Vault separates proxyBaseUrl from encrypted credential backup", async () => {
  const source = await readFile(
    new URL("api/src/api-settings.js", root),
    "utf8",
  );
  assert.match(source, /"smrtProxyToken"/);
  assert.match(source, /if \(id === "proxyBaseUrl"\) return/);
  assert.doesNotMatch(source, /"smrtProxyToken",\s*\n\s*"proxyBaseUrl"/);
});

test("Widgets launcher brokers unlocked proxy sessions without localStorage persistence", async () => {
  const source = await readFile(new URL("widgets/index.html", root), "utf8");
  assert.match(
    source,
    /shared\/smart-api-settings-bridge\.js\?v=20260729-4/,
  );
  const bridge = await readFile(
    new URL("widgets/shared/smart-api-settings-bridge.js", root),
    "utf8",
  );
  assert.match(bridge, /message\.action !== "proxy-session"/);
  assert.match(bridge, /sessionStorage\.setItem\(SESSION_KEY/);
  assert.doesNotMatch(
    bridge,
    /localStorage\.setItem\([^)]*smrtProxyToken/,
  );
});

test("Proxy token control is masked without presenting a browser login password field", async () => {
  const html = await readFile(new URL("api/api-settings.html", root), "utf8");
  assert.match(
    html,
    /type="text"\s+id="smrtProxyToken"\s+name="smrt-proxy-token"/,
  );
  assert.match(html, /-webkit-text-security: disc/);
  assert.match(html, /type="button"\s+id="checkProxyHealthBtn"/);
});
