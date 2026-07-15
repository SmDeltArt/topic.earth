/**
 * brand-meta.js — single source of truth for OG / Twitter / favicon meta.
 *
 * Usage (any page under private/api/):
 *
 *   <script type="module">
 *     import { applyBrandMeta } from "./brand/source/brand-meta.js";
 *     applyBrandMeta({ pageUrl: "https://api.smdeltart.com/api-settings.html" });
 *   </script>
 *
 * Reads brand/brand.json, injects/updates these <head> tags:
 *   - <title>, <meta name="description">
 *   - <link rel="icon">  (from favicon.ico + svg)
 *   - <meta og:type / og:site_name / og:title / og:description / og:url / og:image*>
 *   - <meta twitter:card / title / description / image / site / creator>
 *
 * All paths in brand.json are repo-relative (e.g. "brand/social/foo.webp").
 * They are resolved against the page's location so this works from any depth
 * (api/index.html, api-settings.html, brand/source/banner/cad-ai-api-banner.html).
 */

const BRAND_JSON_CANDIDATES = [
  "./brand/brand.json", // api/index.html, api-settings.html
  "../brand.json", // any file one level inside brand/
  "../../brand.json", // brand/source/<sub>/file.html
  "../../../brand.json", // brand/source/<sub>/<sub>/file.html
];

async function loadBrand() {
  for (const url of BRAND_JSON_CANDIDATES) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) {
        const json = await r.json();
        // remember which prefix resolved so asset URLs can be rewritten
        const base = url.replace(/brand\.json$/, ""); // e.g. "../"
        const repoRoot = base.replace(/brand\/?$/, ""); // strip trailing "brand/"
        return { json, repoRoot, jsonUrl: url };
      }
    } catch {
      /* try next */
    }
  }
  throw new Error("brand.json not found from " + location.href);
}

function asset(brand, repoRoot, repoRelPath) {
  // brand.json paths look like "brand/social/foo.webp"; convert to relative URL
  // from the current page by prepending the repoRoot we deduced from where
  // brand.json was located.
  if (!repoRelPath) return null;
  return new URL(repoRoot + repoRelPath, location.href).href;
}

function setMeta(attr, key, value) {
  if (value == null) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", String(value));
}

function setLink(rel, href, attrs = {}) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

export async function applyBrandMeta(opts = {}) {
  const { json: b, repoRoot } = await loadBrand();

  const title = opts.title || b.name;
  const desc = opts.description || b.tagline || b.description;
  const url = opts.pageUrl || b.baseUrl || location.href;
  const og = b.social?.og;
  const tw = b.social?.twitter;
  const ogImg = asset(b, repoRoot, og?.image);
  const twImg = asset(b, repoRoot, tw?.image || og?.image);

  // <title> and description
  if (!opts.keepTitle) document.title = title;
  setMeta("name", "description", desc);

  // favicons
  setLink("icon", asset(b, repoRoot, b.favicon?.svg), {
    type: "image/svg+xml",
  });
  setLink("alternate icon", asset(b, repoRoot, b.favicon?.ico));

  // Open Graph
  setMeta("property", "og:type", "website");
  setMeta("property", "og:site_name", b.shortName || b.name);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", desc);
  setMeta("property", "og:url", url);
  if (ogImg) {
    setMeta("property", "og:image", ogImg);
    if (og?.w) setMeta("property", "og:image:width", og.w);
    if (og?.h) setMeta("property", "og:image:height", og.h);
    if (og?.mime) setMeta("property", "og:image:type", og.mime);
  }

  // Twitter
  setMeta("name", "twitter:card", b.twitter?.card || "summary_large_image");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", desc);
  if (twImg) setMeta("name", "twitter:image", twImg);
  if (b.twitter?.site) setMeta("name", "twitter:site", b.twitter.site);
  if (b.twitter?.creator) setMeta("name", "twitter:creator", b.twitter.creator);

  return { brand: b, repoRoot };
}

/** Convenience for pages that want the brand JSON without the meta side-effects. */
export async function getBrand() {
  const { json, repoRoot } = await loadBrand();
  return { brand: json, repoRoot, asset: (p) => asset(json, repoRoot, p) };
}
