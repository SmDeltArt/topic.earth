import dns from "node:dns/promises";
import net from "node:net";
import { contentLengthWithin, preparePaidRequest, sendJson } from "./_security.js";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 4;
const ALLOWED_CONTENT = /^(?:text\/html|text\/plain|application\/(?:json|ld\+json|xhtml\+xml))/i;

function isBlockedIp(address) {
  if (!net.isIP(address)) return true;
  if (address === "::1" || address === "::" || /^fe[89ab]/i.test(address) || /^fc|^fd/i.test(address)) return true;
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  const ipv4 = mapped || (net.isIPv4(address) ? address : "");
  if (!ipv4) return false;
  const [a, b] = ipv4.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

async function validateRemoteUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Invalid URL"); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "metadata.google.internal") throw new Error("Local and metadata hosts are blocked");
  const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedIp(address))) throw new Error("Private, link-local, or reserved network addresses are blocked");
  return url;
}

async function safeFetch(input, { accept = "text/html, application/json;q=0.9, text/plain;q=0.8" } = {}) {
  let url = await validateRemoteUrl(input);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { Accept: accept, "User-Agent": "SmDeltArt-Source-Metadata/1.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirect === MAX_REDIRECTS) throw new Error("Too many redirects");
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect did not include a location");
      url = await validateRemoteUrl(new URL(location, url).href);
      continue;
    }
    const type = String(response.headers.get("content-type") || "").split(";")[0].trim();
    if (!ALLOWED_CONTENT.test(type)) throw new Error(`Unsupported response content type: ${type || "unknown"}`);
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_RESPONSE_BYTES) throw new Error("Remote response exceeds 2 MB");
    const reader = response.body?.getReader();
    const chunks = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error("Remote response exceeds 2 MB"); }
      chunks.push(value);
    }
    const body = new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
    if (!response.ok) throw new Error(`Remote HTTP ${response.status}`);
    return { body, contentType: type, url: response.url || url.href };
  }
  throw new Error("Remote fetch failed");
}

function decodeEntities(text) {
  return String(text || "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function metaValue(html, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const a = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"));
    const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["']`, "i"));
    if (a?.[1] || b?.[1]) return decodeEntities(a?.[1] || b?.[1]).trim();
  }
  return "";
}

function parseHtmlMetadata(html, finalUrl) {
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] || finalUrl;
  const title = metaValue(html, ["og:title", "twitter:title"]) || decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const jsonLd = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { jsonLd.push(JSON.parse(match[1])); } catch {}
    if (jsonLd.length >= 8) break;
  }
  const text = decodeEntities(html
    .replace(/<(script|style|form|noscript|template|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[^]*?-->/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 60000);
  return {
    canonicalUrl: new URL(canonical, finalUrl).href,
    title,
    description: metaValue(html, ["description", "og:description", "twitter:description"]),
    author: metaValue(html, ["author", "article:author"]),
    siteName: metaValue(html, ["og:site_name"]),
    publishedAt: metaValue(html, ["article:published_time", "datePublished"]),
    modifiedAt: metaValue(html, ["article:modified_time", "dateModified"]),
    language: html.match(/<html[^>]+lang=["']([^"']+)/i)?.[1] || "",
    openGraph: { image: metaValue(html, ["og:image"]), type: metaValue(html, ["og:type"]) },
    jsonLd,
    readableText: text,
  };
}

function parseGitHubUrl(url) {
  if (url.hostname.toLowerCase() !== "github.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo, mode, branch, ...rest] = parts;
  return { owner, repo: repo.replace(/\.git$/i, ""), mode: mode || "repo", branch: mode === "tree" || mode === "blob" ? branch : "", path: rest.join("/") };
}

async function githubJson(path) {
  const result = await safeFetch(`https://api.github.com${path}`, { accept: "application/vnd.github+json" });
  return JSON.parse(result.body);
}

async function analyzeGitHub(url) {
  const target = parseGitHubUrl(url);
  if (!target) throw new Error("Unsupported GitHub URL");
  const repository = await githubJson(`/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`);
  const branch = target.branch || repository.default_branch;
  const tree = await githubJson(`/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  const paths = (tree.tree || []).filter((item) => item.type === "blob").map((item) => item.path).slice(0, 1500);
  const important = paths.filter((path) => /(^|\/)(readme[^/]*|package\.json|vercel\.json|index\.html?|script\.(?:js|ts)|src\/(?:main|index)\.[^/]+|[^/]*(?:manager|controller|adapter|reader)\.(?:js|ts))$/i.test(path)).slice(0, 80);
  let readme = "";
  try {
    const data = await githubJson(`/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/readme?ref=${encodeURIComponent(branch)}`);
    readme = data.content ? Buffer.from(data.content, "base64").toString("utf8").slice(0, 30000) : "";
  } catch {}
  return {
    sourceType: "github",
    canonicalUrl: repository.html_url,
    repository: { fullName: repository.full_name, description: repository.description || "", defaultBranch: repository.default_branch, branch, requestedPath: target.path, visibility: repository.visibility || "public" },
    readme,
    sourceTree: paths,
    importantFiles: important,
    guidance: `Inspect manifests and entry points first, then follow local imports. Important candidates: ${important.join(", ") || "none detected"}.`,
  };
}

function isYouTubeUrl(url) {
  return /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(url.hostname);
}

export default async function handler(req, res) {
  if (!preparePaidRequest(req, res, ["POST"])) return;
  if (!contentLengthWithin(req, 20_000)) return sendJson(res, 413, { error: "Request body too large" });
  const input = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  if (!input || input.length > 2048) return sendJson(res, 400, { error: "A valid URL is required" });
  try {
    const url = await validateRemoteUrl(input);
    if (parseGitHubUrl(url)) return sendJson(res, 200, await analyzeGitHub(url));
    const page = await safeFetch(url.href);
    const metadata = parseHtmlMetadata(page.body, page.url);
    if (isYouTubeUrl(url)) {
      return sendJson(res, 200, {
        sourceType: "youtube",
        ...metadata,
        channel: metaValue(page.body, ["author", "og:video:tag"]),
        thumbnail: metadata.openGraph.image,
        transcriptStatus: "unavailable",
        transcriptMessage: "Metadata loaded · transcript unavailable. Paste a transcript or upload .srt, .vtt, or .txt.",
      });
    }
    return sendJson(res, 200, { sourceType: "website", ...metadata });
  } catch (error) {
    return sendJson(res, 400, { error: error?.message || "URL analysis failed" });
  }
}

export const __test = { isBlockedIp, validateRemoteUrl, parseGitHubUrl, parseHtmlMetadata };
