# topic.earth

Interactive climate globe and topic workspace for exploring global systems, climate pressure, regional initiatives, and AI-assisted topic research.

The app is currently an advanced browser prototype deployed from this repository to Vercel, with `topic.earth` pointed at the Vercel deployment. The frontend is static; the optional MCP endpoint runs as a Vercel serverless function.

## What It Does

- Renders a Three.js Earth with topic markers and layer navigation.
- Provides an Earth's Fever mode with milestone textures from 1950 to 2125.
- Adds Tipping Points and AMOC Watch overlays as synchronized GLB layers.
- Supports a right-side monitoring panel for scenario explanation and warnings.
- Includes an evolving topic contribution workflow based on drafts, evidence, review, and admin export.
- Keeps scenario data in `fever-scenarios.json` so values and texture routing are visible.
- Offers a lightweight Regional map with drawing tools and paths associated with topic layers.
- Includes a Space view with synchronized solar orbits, video caption preferences, and ZIP topic review imports.
- Provides an installable app shell; offline shell access does not imply that all remote maps, media, or AI services are available offline.

## Project Shape

```text
.
  index.html                 Static app entry
  app.main.js                App orchestration and UI glue
  styles.css                 App styling
  fever-scenarios.json       Fever scenario data and texture references
  assets/
    icons/                   Shared interface icons
    logo/local/              Strategic logo, favicon, PWA and social fallbacks
    logo/social/             Cloudinary catalogues and localized previews
    models/                  GLB models and overlays
    textures/
      main/                  Main Earth material maps
      fever/                 Fever milestone textures
  components/                UI panels and controls
  data/                      Topic, layer, point, and research data
  lib/                       Runtime services and Three.js renderer
  shared/                    Shared AI bridge, widget sync, CSV, and favicon helpers
  vendor/                    Bundled browser libraries
  api/mcp.js                 Optional MCP serverless endpoint
  service-worker.js          App-shell caching
  package.json              MCP dependencies and development checks
  site.webmanifest           Web app metadata
  robots.txt                 Crawler policy
  sitemap.xml                Public URL map for search crawlers
  codemeta.json              Repository/software metadata
  CITATION.cff               Citation metadata
```

## Local Development

This is a static app with browser modules and JSON fetches, so use a local HTTP server instead of opening `index.html` directly.

```powershell
python -m http.server 8123
```

Then open:

```text
http://127.0.0.1:8123
```

VS Code Live Server is also configured for port `5501`. A static server does not execute Vercel serverless routes.

Run the existing checks from the development folder:

```powershell
npm ci
npm run check:captions
npm run check:solar
npm run check:mcp
node tools/check-regional.mjs
node tools/check-settings-routing.mjs
node tools/check-topic-import.mjs
npm --prefix api run check
node --test api/tests/ai-health.test.mjs
```

The development-only `tools/` folder is not part of new runtime syncs.

## Deployment Notes

The repo is ready for static hosting on Vercel. Keep runtime asset URLs relative to the repository root, for example `./assets/textures/fever/earth_2025_1k.png`.

Cloudinary CDN delivery is bridged through [lib/asset-bridge.js](lib/asset-bridge.js), so code can keep stable local asset names while selected assets resolve to Cloudinary.

As of 4 October 2026, BenDes selected `C:\Git\__actual_github\topic.earth`, including reviewed local commit `e8bc315`, as the authoritative working checkout. Edit and validate there directly; do not sync older OneDrive files back over it. This is a topic.earth-specific exception to the collection's default development-root policy.

A verified archive copy of the former `__actual_vs\topic.earth` folder is at `C:\Git\_archive\topic.earth-onedrive-20261004`, outside OneDrive and this repository. Windows blocked moving the original, which remains a retired copy. Neither copy is an active development source or runtime deployment input.

Commit, push, deployment, and imports remain deliberate operations requiring user authorization. Before an import, list and exclude files over 5 MB, `build/`, `dist/`, `*.map`, `*.log`, and `node_modules/` unless inclusion is explicitly confirmed. Development documents, tools, editor settings, and Python caches are not new runtime sync inputs. Excluding an existing checkout file does not delete it. Local agent notes are kept in the Git- and deployment-excluded `.local-agent/` folder. The obsolete root app-submission JSON has been removed; the working API integrations remain.

## AI Settings Routing

- The main Settings panel opens the local [Ollama guide](ollama-install-guide.html) for User mode and offline Admin mode. Online Admin mode opens `https://api.caddeltai.com/api-settings` with embedding and topic.earth host parameters. Changing the mode does not launch the iframe automatically.
- The separate top-bar bridge in [index.html](index.html) retains `./api/api-settings.html?embed=true` locally and `https://api-caddeltai.vercel.app/api-settings.html?embed=true` in production.
- The local API Settings copies are generated integration copies, not the source of truth. Change the canonical `__actual_vs\private\api\` product (or its production repository), then run an explicitly authorized sync rather than editing a local copy directly.
- API Settings belongs to CAD-DELTAI. Shared browser integration does not grant topic.earth identity, billing, or organization-funded AI permissions.

## Public Metadata

The homepage includes canonical SEO tags, Open Graph/Twitter previews, a web
app manifest, and Schema.org JSON-LD for `topic.earth`. Repository and reuse
metadata are also exposed through:

- [site.webmanifest](site.webmanifest)
- [robots.txt](robots.txt)
- [sitemap.xml](sitemap.xml)
- [codemeta.json](codemeta.json)
- [CITATION.cff](CITATION.cff)
- [assets/logo/metadata.json](assets/logo/metadata.json)

Identity, participation, and youth-protection planning briefs are maintained in the development-only `docs/` folder, not newly synced into the public runtime bundle.

## Social Copy And Assets

Social: `topic.earth turns climate, regional, space, and Fever signals into an interactive Earth intelligence dashboard.`

GitHub: `Open-source interactive Earth intelligence dashboard with climate layers, Fever scenarios, regional topic drafting, and linked AI research tools.`

Discord: `Explore topic.earth: Earth layers, Fever scenarios, regional updates, and AI-assisted topic research in one browser dashboard.`

Preview and logo assets live in [assets/social](assets/social), including an animated SVG vignette, a captured English first-frame PNG, a light GIF fallback, a Twitter/Discord-safe PNG resume card, transparent PNG/SVG marks, header variants, and animated GIF marks. GitHub-friendly files under 1 MB are [topic-earth-github-preview-600.gif](assets/social/topic-earth-github-preview-600.gif), [topic-earth-github-vignette-600-short.gif](assets/social/topic-earth-github-vignette-600-short.gif), and the five-frame fallback [topic-earth-github-storyboard-600.jpg](assets/social/topic-earth-github-storyboard-600.jpg).

Project contact addresses:

- General: `info@topic.earth`
- Support: `support@topic.earth`
- Publishing and partnerships: `contact@topic.earth`

## Product Flow

The current docs converge on one cleaner model:

```text
Explore globe -> Propose or update topic -> Describe -> Evidence -> Review -> Save or export for admin
```

For admin and AI features, the preferred internal model is:

```text
Topic Draft -> Sources -> Media -> AI Assist -> Review -> Save / Export / Submit / Publish
```

Internal planning docs stay in the `__actual_vs\topic.earth` development folder rather than the public app bundle.

## License

Unless a file states otherwise, source code and project documentation are
available under the European Union Public Licence, Version 1.2 or later
(`EUPL-1.2-or-later`). See [LICENSE](LICENSE).

Project media, scientific/visual assets, trademarks, and governance are tracked
separately:

- [NOTICE.md](NOTICE.md)
- [TRADEMARKS.md](TRADEMARKS.md)
- [ASSET-LICENSES.md](ASSET-LICENSES.md)
- [GOVERNANCE.md](GOVERNANCE.md)


Fever playback defaults to 2/3. At 2/3, the normal milestone recordings play. At 5/6, small local `fever-loop-*-message-*.mp3` excerpts play only the title/message portion of the original Fever recordings; no extra warning or metric speech runs at 5/6. At 1/3, metric narration remains available. These 168 clips cover the three scenarios, seven milestone years and eight recorded languages (1.92 MiB total). The audio manifest records each original filename and trim boundary. Missing fast recordings stay silent rather than invoking browser or paid speech. The collapsed monitor retains year, temperature, AMOC, risk and visible messages; toolbar buttons float above the scrolling panel content. Monitor opens the expanded panel at the top and hides its dock button until the monitor is collapsed or closed. A return-to-top button sits below the corner controls. Sea-level values and links have their own monitoring tab after AMOC Watch.

Validate recording selection and fallback guards with `node tools/check-fever-audio.mjs`.


### Fever sea-level scenario (2026-10-08)

The live and compact monitors read `seaLevelCm` from `fever-scenarios.json`,
interpolating linearly between milestones. The Objective scenario has a
user-selected +65 cm anchor at 2075, relative to the app’s 1950 reference;
2100 and 2125 continue illustratively to +80 and +95 cm. High 2075 is +70 cm
so Best ≤ Objective ≤ High remains true. These values are provisional
illustrative assumptions, not observations or an IPCC forecast.

Scenario Logic includes a sea-level topic. Its Thwaites button opens the
existing World/Climate Change topic in West Antarctica. Thwaites’ potential
~65 cm contribution from complete loss over centuries is separate from the
2075 total-rise scenario. Texture patches are visual illustrations and do
not identify calculated coastal inundation.

Timeline year buttons pause and publish the selected year immediately.
Validate with `node tools/check-fever-sea-level.mjs`.
