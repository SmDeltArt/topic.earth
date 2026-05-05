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
    models/                  GLB models and overlays
    textures/
      main/                  Main Earth material maps
      fever/                 Fever milestone textures
  components/                UI panels and controls
  data/                      Topic, layer, point, and research data
  lib/                       Runtime services and Three.js renderer
  shared/                    Shared bridge, API sync, CSV, and widget helpers
  docs/                      Flow and maintenance notes
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

Cloudinary CDN delivery is bridged through [lib/asset-bridge.js](lib/asset-bridge.js), so code can keep stable local asset names while selected assets resolve to Cloudinary. See [docs/CLOUDINARY_ASSET_BRIDGE.md](docs/CLOUDINARY_ASSET_BRIDGE.md).

## Product Flow

The current docs converge on one cleaner model:

```text
Explore globe -> Propose or update topic -> Describe -> Evidence -> Review -> Save or export for admin
```

For admin and AI features, the preferred internal model is:

```text
Topic Draft -> Sources -> Media -> AI Assist -> Review -> Save / Export / Submit / Publish
```

See [docs/FLOW.md](docs/FLOW.md) for the current flow analysis.

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
