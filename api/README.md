# api/ — CAD-ΔI-Support (SmΔrt API Product)

Flagship product folder. Hosts the API keys manager (`api-settings.html`)
and the Llama 3.1 install guide.

## Structure

```
api/
├── index.html                  Redirect → api-settings.html (+ brand meta)
├── api-settings.html           Master API keys widget (multi-provider)
├── llama31-install-guide.html  Local LLM setup guide
├── manifest.json               Product manifest
├── vercel.json                 Routes for api.caddeltai.com
├── src/
│   ├── api-settings.js
│   ├── api-bridge-handler.js
│   ├── api-model-updater.js
│   └── smart-ai-models.js
├── docs/                       Product documentation
├── brand/                      Brand assets (logo / banner / social / favicon)
│   ├── brand.json              ⭐ Master brand metadata (single source of truth)
│   ├── source/                 Generators & vector sources
│   │   ├── brand-meta.js       ES6 helper: injects title/og/twitter/favicons
│   │   ├── banner/             Banner generator (HTML) + ffmpeg scripts
│   │   ├── logo/               cad-ai-logo.svg
│   │   └── favicon/            cad-ai-icons.svg
│   ├── banner/                 Web/hero deliverables (WebP)
│   ├── social/                 OG / Twitter / LinkedIn / Story cards (WebP)
│   ├── logo/                   Raster logo exports
│   └── favicon/                Raster favicons + .ico
└── _trash/
```

## Brand metadata pipeline

`brand/brand.json` is the single source of truth for title, description,
colors, logo, favicons, and social cards. Every page in this product
imports `brand/source/brand-meta.js` and calls `applyBrandMeta()` to inject
the matching `<title>`, `<meta>`, OG, Twitter, and favicon tags at load.

Edit `brand.json` once → all pages update.

## Canonical URLs

- Production: `https://api.caddeltai.com/`
- Embed: `/api/api-settings.html?embed=true`

## Owners

- Product: BenDes (CAD-ΔI-Support)
- Pipeline: `__actual_vs/private/api/` → `__actual_github/private/api/` → Vercel
