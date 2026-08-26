# SEO and Metadata Notes

This repository exposes project metadata in multiple places so crawlers,
browser previews, GitHub, and downstream logo users can identify topic.earth.

## Site Metadata

- `index.html` contains title, description, canonical URL, robots directives,
  Open Graph tags, Twitter card tags, and Schema.org JSON-LD.
- `site.webmanifest` describes the installable web app and its icons.
- `robots.txt` allows crawling and points to the sitemap.
- `sitemap.xml` lists the main public URLs.
- `humans.txt` gives lightweight project provenance.

## Repository Metadata

- `README.md` presents the public project summary.
- `codemeta.json` exposes software metadata in CodeMeta format.
- `CITATION.cff` gives GitHub and research tools a citation record.
- `LICENSE`, `NOTICE.md`, `TRADEMARKS.md`, `ASSET-LICENSES.md`, and
  `GOVERNANCE.md` describe reuse, attribution, brand, assets, and stewardship.

## Search Visibility

These files do not make search engines display topic.earth immediately. After
deployment, crawlers still need to discover or be asked to crawl
`https://topic.earth/`. The important production checks are:

- `https://topic.earth/robots.txt` returns the sitemap reference.
- `https://topic.earth/sitemap.xml` returns the canonical URLs.
- The deployed homepage has a single canonical URL: `https://topic.earth/`.
- Open Graph image URLs return `image/png` and are reachable without auth.
