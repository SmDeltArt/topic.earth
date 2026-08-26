# Cloudinary Asset Bridge

The app keeps local asset paths as the canonical names:

```text
assets/textures/fever/earth_1950_1k.png
assets/models/solar-system.glb
assets/models/tipping_point_circular.glb
```

`lib/asset-bridge.js` can redirect any canonical local path to a Cloudinary
delivery URL. Unmapped assets continue to load from the repository, so the app
does not break while Cloudinary migration is partial.

## Current Bridge

```text
assets/textures/fever/earth_1950_1k.png
-> https://res.cloudinary.com/dsbfcgtdv/image/upload/f_auto,q_auto:good/v1777894948/earth_1950_1k_yfkp3e.png

assets/models/solar-system.glb
-> https://res.cloudinary.com/dsbfcgtdv/image/upload/v1777924349/solar-system_q79g8o.glb
```

This is a visual color texture, so `f_auto,q_auto:good` is acceptable after
visual checking.

## Rules

- Use `f_auto,q_auto:good` for visual color textures and illustrative images.
- Use `q_auto:best` only when visible compression artifacts appear.
- Do not use lossy Cloudinary optimization for normal maps, roughness maps,
  masks, alpha-critical files, or exact data textures unless reviewed.
- Do not use `q_auto` or `f_auto` for `.glb` files.
- `solar-system.glb` is served through Cloudinary after the under-10 MB Draco
  optimized export.

## Adding More URLs

Add one entry per logical local path in `lib/asset-bridge.js`:

```js
export const ASSET_URL_OVERRIDES = {
  'assets/textures/fever/earth_1950_1k.png':
    'https://res.cloudinary.com/.../earth_1950_1k_yfkp3e.png'
};
```

Prefer stable Cloudinary public IDs when uploading new assets. Media Library
folders are useful for organization, but Cloudinary public IDs are what define
delivery URLs.
