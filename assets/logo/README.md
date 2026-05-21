# topic.earth Logo Kit

This folder is the portable source area for the topic.earth animated logo modes.

## Modes

- `main`: calm Earth intelligence signal.
- `regional`: local/regional map signal.
- `space`: orbital space signal.
- `fever`: climate/tipping-point signal.

## Source

- `topic-earth-logo-kit.html` renders the four animated logo modes together.
- `topic-earth-vignette-animated.svg` is the English animated vignette used for loading and social motion exports.
- `sujet-terre-vignette-animated.svg` is the French animated vignette variant for internationalization previews.
- `metadata.json` describes the logo URLs, colors, and preferred export formats.

## Export Recommendations

- Keep SVG/HTML/CSS as the editable source.
- Export animated WebP for small reusable web graphics.
- Export WebM for video or transparent motion use.
- Export GIF only for compatibility previews such as README embeds.

The current app uses Cloudinary first and local `assets/icons/` files as fallback.
