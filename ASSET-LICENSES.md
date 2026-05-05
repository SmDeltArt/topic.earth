# Asset Licences And Provenance

This file tracks the rights status of bundled media, data, generated images,
models, map references, and externally hosted assets used by topic.earth.

The source-code licence in [LICENSE](LICENSE) does not automatically license
third-party assets, externally sourced media, map data, or service-hosted files.

## Current Policy

- Treat bundled visual assets as project runtime assets until provenance is
  confirmed.
- Do not reuse bundled assets outside topic.earth unless this file lists a clear
  source, author, licence, and reuse permission.
- Keep source URLs, authors, licence names, modification notes, and generation
  prompts where applicable.
- Cloudinary or another CDN is delivery infrastructure only; hosting an asset
  there does not change its copyright or reuse terms.

## Asset Inventory

| Path | Purpose | Current rights status | Notes |
| --- | --- | --- | --- |
| `assets/models/solar-system.glb` | Solar system view model | Provenance to confirm | Runtime asset only until confirmed. |
| `assets/models/tipping_point_circular.glb` | Tipping Points overlay | Provenance to confirm | Runtime asset only until confirmed. |
| `assets/models/amoc_circular_overlay.glb` | AMOC Watch overlay | Provenance to confirm | Runtime asset only until confirmed. |
| `assets/textures/main/*` | Main Earth material maps | Provenance to confirm | Source, author, and modification chain needed. |
| `assets/textures/fever/*` | Earth's Fever milestone textures | Project-generated/provenance to confirm | Keep generation/source notes per file or batch. |
| `data/*` | Topic and layer data | Mixed project and sourced data | Keep citations in topic records where available. |
| OpenStreetMap tiles/geocoding | Regional map display and search | Third-party service/data terms | Preserve OSM attribution and usage limits. |

## Cloudinary Bridge

Selected runtime assets can be delivered through Cloudinary while keeping their
logical local paths in code. The active mapping lives in
[`lib/asset-bridge.js`](lib/asset-bridge.js).

Current mapped asset:

| Local path | Cloudinary delivery | Optimization |
| --- | --- | --- |
| `assets/textures/fever/earth_1950_1k.png` | `https://res.cloudinary.com/dsbfcgtdv/image/upload/f_auto,q_auto:good/v1777894948/earth_1950_1k_yfkp3e.png` | Visual color texture optimization. |

## Recommended Asset Records

For each confirmed asset or generated batch, add:

```text
Asset:
Path:
Author / source:
Source URL:
Licence:
Created or downloaded:
Modified by topic.earth:
Allowed use:
Notes:
```

## Proposed Future Split

- `assets/first-party/`: project-owned media suitable for explicit licensing.
- `assets/vendor/`: third-party assets with stored licence notices.
- `assets/generated/`: AI- or tool-generated media with prompt/source metadata.
- `assets/topics/`: packaged topic media, each with a local manifest.
