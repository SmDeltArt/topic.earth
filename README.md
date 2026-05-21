# topic.earth

Interactive climate globe and topic workspace for exploring global systems, climate pressure, regional initiatives, and AI-assisted topic research.

The app is currently an advanced static prototype deployed from this repository to Vercel, with `topic.earth` pointed at the Vercel deployment.

## What It Does

- Renders a Three.js Earth with topic markers and layer navigation.
- Provides an Earth's Fever mode with milestone textures from 1950 to 2125.
- Adds Tipping Points and AMOC Watch overlays as synchronized GLB layers.
- Supports a right-side monitoring panel for scenario explanation and warnings.
- Includes an evolving topic contribution workflow based on drafts, evidence, review, and admin export.
- Keeps scenario data in `fever-scenarios.json` so values and texture routing are visible.

## Project Shape

```text
.
  index.html                 Static app entry
  app.main.js                App orchestration and UI glue
  styles.css                 App styling
  fever-scenarios.json       Fever scenario data and texture references
  assets/
    icons/                   topic.earth SVG icon source and favicon fallback
    logo/                    Portable animated logo kit and metadata
    models/                  GLB models and overlays
    textures/
      main/                  Main Earth material maps
      fever/                 Fever milestone textures
  components/                UI panels and controls
  data/                      Topic, layer, point, and research data
  lib/                       Runtime services and Three.js renderer
  shared/                    Shared AI bridge, widget sync, CSV, and favicon helpers
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

## Deployment Notes

The repo is ready for static hosting on Vercel. Keep runtime asset URLs relative to the repository root, for example `./assets/textures/fever/earth_2025_1k.png`.

Cloudinary CDN delivery is bridged through [lib/asset-bridge.js](lib/asset-bridge.js), so code can keep stable local asset names while selected assets resolve to Cloudinary.

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
- [docs/app-trust-and-store-publishing.md](docs/app-trust-and-store-publishing.md)

## Social Copy And Assets

Social: `topic.earth turns climate, regional, space, and Fever signals into an interactive Earth intelligence dashboard.`

GitHub: `Open-source interactive Earth intelligence dashboard with climate layers, Fever scenarios, regional topic drafting, and linked AI research tools.`

Discord: `Explore topic.earth: Earth layers, Fever scenarios, regional updates, and AI-assisted topic research in one browser dashboard.`

Preview and logo assets live in [assets/social](assets/social), including an animated SVG vignette, a captured English first-frame PNG, a light GIF fallback, a Twitter/Discord-safe PNG resume card, transparent PNG/SVG marks, header variants, and animated GIF marks. Cloudinary export metadata is archived in [assets/logo/export-2026-05-21T05_12_25.270Z.csv](assets/logo/export-2026-05-21T05_12_25.270Z.csv), and the cleaned social-preview upload set is archived in [assets/social/export-2026-05-21T07_12_07.418Z.csv](assets/social/export-2026-05-21T07_12_07.418Z.csv).

## Product Flow

The current docs converge on one cleaner model:

```text
Explore globe -> Propose or update topic -> Describe -> Evidence -> Review -> Save or export for admin
```

For admin and AI features, the preferred internal model is:

```text
Topic Draft -> Sources -> Media -> AI Assist -> Review -> Save / Export / Submit / Publish
```

Internal planning docs stay in the `_actual_vs_y1` development folder rather than the public app bundle.

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
