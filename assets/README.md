# Assets

Runtime media lives here so the repository root stays clean and Vercel can serve assets from stable relative URLs.

## Layout

```text
assets/
  models/
    solar-system.glb
    tipping_point_circular.glb
    amoc_circular_overlay.glb
  textures/
    main/
      Material.001_baseColor_*.jpeg
      Material.001_normal_*.jpeg
      Material.001_metallicRoughness_*.png
    fever/
      earth_1950_1k.png
      earth_1950_4k.png
      ...
      earth_2125_1k.png
      earth_2125_4k.png
```

## Path Rules

- GLB models load from `./assets/models/`.
- Main Earth material maps load from `./assets/textures/main/`.
- Fever milestone textures load from `./assets/textures/fever/`.
- `fever-scenarios.json` may use either a bare filename or a full `assets/...` path for Fever textures.

## Naming Rules

- Main Earth: `Material.001_baseColor_1k.jpeg`, `Material.001_baseColor_4k.jpeg`, `Material.001_baseColor_8k.jpeg`.
- Main maps: matching `normal` and `metallicRoughness` files where available.
- Fever loop: `earth_<year>_<quality>.png`.
- Fever quality tiers are `1k` and `4k`; keep `8k` for main mode only.

## Provenance

Keep source and rights information for assets in `ASSET-LICENSES.md` as it is confirmed. Until provenance is complete, treat bundled assets as part of the running topic.earth project rather than standalone reusable media.

## Cloudinary Delivery

The app can map selected local asset paths to Cloudinary URLs through `../lib/asset-bridge.js`. Keep the files here as the canonical development fallback unless a future build/deploy step intentionally removes them.
