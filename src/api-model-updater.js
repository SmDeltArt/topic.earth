/**
 * SmΔrt API Settings — Model Updater
 * ----------------------------------
 * Companion module for api-settings.html (v2.2+).
 *
 * Responsibilities:
 *   1. Refresh the Ollama installed-model dropdown from localhost:11434/api/tags.
 *   2. Refresh provider model lists (OpenAI / Groq / DeepSeek / Google) via their
 *      /v1/models endpoints using the user's saved keys (browser-only — keys
 *      never leave this page).
 *   3. Cache results in localStorage under `smdeltart-model-cache` (24 h TTL).
 *   4. Broadcast `models-updated` to the parent app via WidgetBridge so the
 *      AI Lab badge in clipboard-manager can refresh.
 *
 * This module is additive: it never replaces existing inputs or wiring in
 * api-settings.js. It only reads/writes `#ollamaModel` (string value).
 */
(function () {
  "use strict";

  const CACHE_KEY = "smdeltart-model-cache";
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
  const SETTINGS_KEY = "smdeltartApiSettings";
  const LEGACY_API_SECRET_KEY = "Sm\u0394rt2025!ApiKey#Secure";

  // ---------- utilities ----------

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeCache(next) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn("[model-updater] cache write failed:", err);
    }
  }

  function isEncryptedSecret(value = "") {
    return /^ENC:/i.test(String(value || "").trim());
  }

  function decryptLegacyApiKey(value = "") {
    const text = String(value || "").trim();
    if (!isEncryptedSecret(text)) return text;

    try {
      const encoded = text.slice(4);
      const xored = decodeURIComponent(escape(atob(encoded)));
      let plainText = "";
      for (let index = 0; index < xored.length; index += 1) {
        plainText += String.fromCharCode(
          xored.charCodeAt(index) ^
            LEGACY_API_SECRET_KEY.charCodeAt(
              index % LEGACY_API_SECRET_KEY.length,
            ),
        );
      }
      return plainText;
    } catch (error) {
      console.warn("[model-updater] encrypted API key could not be decoded");
      return "";
    }
  }

  function usableApiKey(value = "") {
    const key = decryptLegacyApiKey(value).trim();
    return key && !isEncryptedSecret(key) ? key : "";
  }

  function normalizeSavedKeys(settings) {
    const next = { ...settings };
    [
      "paidTextApiKey",
      "freeTextApiKey",
      "paidImageApiKey",
      "freeImageApiKey",
      "externalTtsApiKey",
      "externalSttApiKey",
    ].forEach((key) => {
      if (next[key]) next[key] = usableApiKey(next[key]);
    });
    return next;
  }

  function readSavedSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? normalizeSavedKeys(JSON.parse(raw)) : {};
    } catch {
      return {};
    }
  }

  function setProviderCache(provider, models) {
    const cache = readCache();
    cache[provider] = {
      ts: Date.now(),
      models: Array.isArray(models) ? models : [],
    };
    writeCache(cache);
  }

  function setStatus(message, kind) {
    const el = document.getElementById("providerModelsStatus");
    if (!el) return;
    const color =
      kind === "error"
        ? "#f87171"
        : kind === "warn"
          ? "#fbbf24"
          : kind === "success"
            ? "#4ade80"
            : "#b8c1ec";
    el.style.color = color;
    el.innerHTML = message;
  }

  function appendStatus(line, kind) {
    const el = document.getElementById("providerModelsStatus");
    if (!el) return;
    const color =
      kind === "error"
        ? "#f87171"
        : kind === "warn"
          ? "#fbbf24"
          : kind === "success"
            ? "#4ade80"
            : "#93c5fd";
    el.innerHTML += `<div style="color:${color}">${line}</div>`;
  }

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isOpenAiTextModelId(id = "") {
    const value = String(id).toLowerCase();
    if (!value.startsWith("gpt-")) return false;
    return !/(image|audio|realtime|transcribe|tts|whisper|embed|moderation|search-preview)/.test(value);
  }

  function getOpenAiTextModelRank(id = "") {
    const value = String(id).toLowerCase();
    let score = 0;
    const version = value.match(/^gpt-(\d+(?:\.\d+)?)/);
    if (version) score += Number(version[1]) * 100000;
    else if (value.startsWith("gpt-4o")) score += 450000;
    else if (value.startsWith("gpt-4")) score += 400000;

    const date = value.match(/(20\d{2})[-_]?(\d{2})[-_]?(\d{2})/);
    if (date) {
      score += Number(date[1]) * 400 + Number(date[2]) * 31 + Number(date[3]);
    }
    if (value.includes("mini")) score -= 1500;
    if (value.includes("nano")) score -= 2500;
    if (value.includes("preview")) score -= 300;
    return score;
  }

  function getOpenAiTextModels(models = []) {
    return Array.from(new Set(models.filter(isOpenAiTextModelId))).sort((a, b) => {
      const rank = getOpenAiTextModelRank(b) - getOpenAiTextModelRank(a);
      return rank || a.localeCompare(b);
    });
  }

  function pickHighestOpenAiTextModel(models = []) {
    return getOpenAiTextModels(models)[0] || "";
  }

  function updateOpenAITextModelStatus(models = []) {
    const textModels = getOpenAiTextModels(models);
    const maxModel = pickHighestOpenAiTextModel(textModels);
    const payload = {
      openaiTextMaxModel: maxModel,
      openaiTextModelCount: textModels.length,
      openaiTextMaxDetectedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("smdeltartApiModelStatus", JSON.stringify(payload));
    } catch {
      /* noop */
    }

    if (typeof window.updateOpenAIModelStatus === "function") {
      window.updateOpenAIModelStatus(payload);
      return;
    }

    const status = document.getElementById("openaiTextModelStatus");
    if (status) {
      const current = document.getElementById("openaiTextModel")?.value || "not selected";
      status.innerHTML = `<strong>Current:</strong> ${escapeHtml(current)} · <strong>Max:</strong> ${escapeHtml(maxModel || "not checked")}${textModels.length ? ` · ${textModels.length} models` : ""}`;
    }
  }

  function populateOpenAITextModelSelect(models = []) {
    const select = document.getElementById("openaiTextModel");
    if (!select) return;
    const textModels = getOpenAiTextModels(models);
    if (!textModels.length) {
      updateOpenAITextModelStatus(models);
      return;
    }

    const previous = select.value;
    select.innerHTML = "";
    for (const id of textModels) {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = id === textModels[0] ? `${id} (max detected)` : id;
      select.appendChild(opt);
    }
    select.value = textModels.includes(previous) ? previous : textModels[0];
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    updateOpenAITextModelStatus(textModels);
  }

  function broadcastModelsUpdated(detail) {
    // Local DOM event (same-page listeners)
    try {
      window.dispatchEvent(new CustomEvent("models-updated", { detail }));
    } catch {
      /* noop */
    }
    // Cross-frame bridge (clipboard AI Lab badge, etc.)
    try {
      if (
        window.WidgetBridge &&
        typeof window.WidgetBridge.toParent === "function"
      ) {
        window.WidgetBridge.toParent("models-updated", detail);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "smart-widget",
            action: "models-updated",
            data: { source: "api-settings", ...detail },
          },
          "*",
        );
      }
    } catch (err) {
      console.warn("[model-updater] bridge dispatch failed:", err);
    }
  }

  // ---------- Ollama ----------

  async function fetchOllamaModels() {
    const res = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.models || []).map((m) => ({
      name: m.name,
      size: m.size,
      modified: m.modified_at,
    }));
  }

  function populateOllamaSelect(models) {
    const select = document.getElementById("ollamaModelList");
    const input = document.getElementById("ollamaModel");
    if (!select) return;
    const current = input?.value?.trim() || "";
    select.innerHTML = "";
    if (!models.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "— No models found —";
      select.appendChild(opt);
      return;
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = `— Installed (${models.length}) —`;
    select.appendChild(placeholder);
    for (const m of models) {
      const opt = document.createElement("option");
      opt.value = m.name;
      const sizeGb = m.size ? ` · ${(m.size / 1e9).toFixed(1)} GB` : "";
      opt.textContent = `${m.name}${sizeGb}`;
      if (m.name === current) opt.selected = true;
      select.appendChild(opt);
    }
  }

  function setOllamaInfo(html, kind) {
    const el = document.getElementById("ollamaModelInfo");
    if (!el) return;
    const color =
      kind === "error" ? "#f87171" : kind === "success" ? "#4ade80" : "#9ca3af";
    el.style.color = color;
    el.innerHTML = html;
  }

  async function refreshOllamaUI() {
    setOllamaInfo("⏳ Contacting localhost:11434/api/tags …", "info");
    try {
      const models = await fetchOllamaModels();
      populateOllamaSelect(models);
      setProviderCache(
        "ollama",
        models.map((m) => m.name),
      );
      setOllamaInfo(
        `✅ ${models.length} installed model${models.length === 1 ? "" : "s"} · pick from the list or type a custom tag.`,
        "success",
      );
      broadcastModelsUpdated({ provider: "ollama", count: models.length });
      return models;
    } catch (err) {
      const msg = String(err && err.message ? err.message : err);
      setOllamaInfo(
        `⚠️ Ollama not reachable (${msg}). Start it with <code>ollama serve</code>, then click Refresh.`,
        "error",
      );
      populateOllamaSelect([]);
      return [];
    }
  }

  // ---------- Provider /v1/models ----------

  /**
   * Each entry: how to fetch a model list for a paid/free text provider.
   * Pure browser fetches; key is read from the unencrypted localStorage
   * settings only (api-settings.js already writes them there on 💾 Locally).
   */
  const PROVIDERS = [
    {
      id: "openai",
      label: "OpenAI",
      keyField: "paidTextApiKey",
      url: "https://api.openai.com/v1/models",
      headers: (k) => ({ Authorization: `Bearer ${k}` }),
      parse: (j) => (j.data || []).map((m) => m.id),
    },
    {
      id: "groq",
      label: "Groq",
      keyField: "freeTextApiKey",
      providerHint: "groq",
      url: "https://api.groq.com/openai/v1/models",
      headers: (k) => ({ Authorization: `Bearer ${k}` }),
      parse: (j) => (j.data || []).map((m) => m.id),
    },
    {
      id: "deepseek",
      label: "DeepSeek",
      keyField: "paidTextApiKey",
      providerHint: "deepseek",
      url: "https://api.deepseek.com/v1/models",
      headers: (k) => ({ Authorization: `Bearer ${k}` }),
      parse: (j) => (j.data || []).map((m) => m.id),
    },
    {
      id: "google",
      label: "Google AI",
      keyField: "paidTextApiKey",
      providerHint: "google",
      url: (k) =>
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`,
      headers: () => ({}),
      parse: (j) =>
        (j.models || []).map((m) =>
          typeof m.name === "string" ? m.name.replace(/^models\//, "") : "",
        ),
    },
  ];

  function resolveKeyForProvider(p, settings) {
    // Honor provider hint (paid/free selector value matches provider id).
    const paidSel = settings.paidTextApi;
    const freeSel = settings.freeTextApi;
    if (p.providerHint) {
      if (paidSel === p.providerHint) return settings.paidTextApiKey;
      if (freeSel === p.providerHint) return settings.freeTextApiKey;
      // Some providers only sit under one bucket — fall back if a key exists
      // under the explicit keyField and the user picked them previously.
      return settings[p.keyField];
    }
    return settings[p.keyField];
  }

  async function refreshOneProvider(p, settings) {
    const key = resolveKeyForProvider(p, settings);
    if (!key) {
      return { id: p.id, label: p.label, skipped: true, reason: "no key" };
    }
    const url = typeof p.url === "function" ? p.url(key) : p.url;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: p.headers(key),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        return {
          id: p.id,
          label: p.label,
          ok: false,
          status: res.status,
        };
      }
      const json = await res.json();
      const models = (p.parse(json) || []).filter(Boolean);
      setProviderCache(p.id, models);
      if (p.id === "openai") populateOpenAITextModelSelect(models);
      return {
        id: p.id,
        label: p.label,
        ok: true,
        count: models.length,
        maxModel: p.id === "openai" ? pickHighestOpenAiTextModel(models) : "",
      };
    } catch (err) {
      return {
        id: p.id,
        label: p.label,
        ok: false,
        error: String(err && err.message ? err.message : err),
      };
    }
  }

  async function refreshAllProviders() {
    setStatus("⏳ Refreshing provider model lists…", "info");
    const settings = readSavedSettings();
    const results = [];

    // Ollama first (no key needed)
    const ollama = await refreshOllamaUI();
    results.push({
      id: "ollama",
      label: "Ollama",
      ok: true,
      count: ollama.length,
    });

    for (const p of PROVIDERS) {
      // eslint-disable-next-line no-await-in-loop
      const r = await refreshOneProvider(p, settings);
      results.push(r);
    }

    // Render summary
    const lines = results.map((r) => {
      if (r.skipped)
        return `• <strong>${r.label}</strong>: ⚪ skipped (${r.reason})`;
      if (r.ok) return `• <strong>${r.label}</strong>: ✅ ${r.count} models`;
      const why = r.status ? `HTTP ${r.status}` : r.error || "unknown error";
      return `• <strong>${r.label}</strong>: ❌ ${why}`;
    });
    setStatus(
      `<div>Updated ${new Date().toLocaleTimeString()}</div>${lines.join("")}`,
      "success",
    );

    broadcastModelsUpdated({
      provider: "*",
      results: results.map((r) => ({
        id: r.id,
        ok: !!r.ok,
        count: r.count || 0,
      })),
    });

    return results;
  }

  // ---------- wiring ----------

  function wire() {
    const ollamaSelect = document.getElementById("ollamaModelList");
    const ollamaInput = document.getElementById("ollamaModel");
    const ollamaBtn = document.getElementById("refreshOllamaModelsBtn");
    const refreshAllBtn = document.getElementById("refreshAllModelsBtn");

    if (ollamaSelect && ollamaInput) {
      ollamaSelect.addEventListener("change", () => {
        const v = ollamaSelect.value;
        if (v) {
          ollamaInput.value = v;
          ollamaInput.dispatchEvent(new Event("input", { bubbles: true }));
          ollamaInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    }

    if (ollamaBtn) {
      ollamaBtn.addEventListener("click", (e) => {
        e.preventDefault();
        refreshOllamaUI();
      });
    }

    if (refreshAllBtn) {
      refreshAllBtn.addEventListener("click", (e) => {
        e.preventDefault();
        refreshAllProviders();
      });
    }

    // Hydrate Ollama dropdown from cache on load (no network probe).
    const cached = readCache().ollama;
    if (
      cached &&
      Array.isArray(cached.models) &&
      Date.now() - cached.ts < CACHE_TTL_MS
    ) {
      populateOllamaSelect(cached.models.map((name) => ({ name })));
      setOllamaInfo(
        `📦 ${cached.models.length} cached · click 🔄 Refresh to re-scan.`,
        "info",
      );
    }

    const openAiCached = readCache().openai;
    if (
      openAiCached &&
      Array.isArray(openAiCached.models) &&
      Date.now() - openAiCached.ts < CACHE_TTL_MS
    ) {
      populateOpenAITextModelSelect(openAiCached.models);
    } else {
      updateOpenAITextModelStatus([]);
    }
  }

  // Expose a tiny API for other widgets (clipboard AI Lab badge, etc.).
  window.SmartModelUpdater = {
    refreshAll: refreshAllProviders,
    refreshOllama: refreshOllamaUI,
    refreshOpenAI: () => refreshOneProvider(PROVIDERS.find((p) => p.id === "openai"), readSavedSettings()),
    getCache: readCache,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
