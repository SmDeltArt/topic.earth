# topic.earth branding

`local/` keeps three editable SVG masters in both clock modes, app Earth textures, live-clock fallback, PWA 192/512 icons, Apple touch icon, ICO, social-card PNG, and one 512px logo / one 64px favicon in PNG/WebP/WebM/GIF per clock mode.

`social/` contains the Cloudinary URL catalog, size manifest, language dictionary and previews. Preview media prefers explicit Cloudinary URLs and uses strategic local fallbacks. Raster clocks contain the captured export time; native SVG/page clocks use live local time. Raster artwork is English; the preview UI and live SVGs support en/fr/nl/de/ru/zh/hi.

Full exports and duplicate size-specific SVGs remain recoverable under the Git/deployment-excluded `local-asset-archive/`.

Import delivery URLs with `python tools/import-cloudinary-brand.py <export.csv> [<export.csv> ...]`. Additional individually supplied URLs are in `social/cloudinary-additional.json`. No guessed public IDs are used.

The two 512px local GIF fallbacks use 4 fps to stay below 5 MB each. Cloudinary and the archive retain the full-rate originals. Local fallback assets total approximately 13.5 MiB.
