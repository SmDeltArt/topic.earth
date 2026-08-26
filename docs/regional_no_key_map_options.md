# Regional No-Key Map Options

Date: 2026-04-14
Workspace: `__actual_vs\topic.earth`

## Short Answer

Yes, we can use a continent/country/region map without a Google key.

For `topic.earth`, the best next move is not a detailed Google map by default. The app only needs to display topic points, usually approximately. A topic can start at country, region, city, or manually selected coordinates. Exact street address should be optional.

Recommended path:

1. Default map: no-key regional topic map.
2. Optional address lookup: manual, user-triggered only, cached.
3. Optional Google: keep as premium/detail fallback, not the main dependency.

## Product Fit

The Regional tab should answer:

- What initiatives exist in this country or region?
- What topic/source/media is attached to each point?
- Can a user add an approximate location without being blocked by a missing address?
- Can an admin later improve location precision?

So the map does not need satellite imagery, turn-by-turn routing, or street-level detail. It needs:

- A recognizable basemap.
- Pins/clusters for topics.
- Popups/cards linked to our topic data.
- Approximate coordinates when exact coordinates are missing.
- Clear attribution when external map data is used.

## Best Options

### Option A: Leaflet + OpenStreetMap Raster Tiles

Best quick implementation.

Leaflet is an open-source JavaScript library for mobile-friendly interactive maps. It supports tile layers, markers, popups, GeoJSON, and simple controls. It is small and easy to add to the current app.

Use:

- Leaflet for the UI.
- OpenStreetMap raster tiles for the basemap.
- Existing topic coordinates for pins.
- Country/region fallback coordinates when topic coordinates are missing.

Pros:

- No Google key.
- Fast to build.
- Good enough for country/region topic browsing.
- Very compatible with a right-panel embedded map.
- Easy markers and popups.

Risks:

- OpenStreetMap public tile servers are free to use under policy, but they are donation-funded, best-effort, and not for heavy production usage.
- Must show attribution.
- Must not bulk download or prefetch tiles.
- For production scale, we should be able to switch tile providers or self-host.

Decision:

Use this as the first no-key implementation if we want the fastest working Regional map.

### Option B: OpenFreeMap + MapLibre GL JS

Best prettier no-key vector map.

OpenFreeMap provides OpenStreetMap-based vector maps with no registration, no API keys, and no cookies on its public instance. MapLibre GL JS is an open-source WebGL map renderer with vector styling, clustering, globe view, 3D terrain, and PMTiles support.

Use:

- MapLibre GL JS for the map renderer.
- OpenFreeMap public styles for no-key vector tiles.
- Topic markers/clusters from our app data.

Pros:

- No key and more modern visual style.
- Vector map styling is stronger than basic raster tiles.
- Can grow toward clustering and richer overlays.
- MapLibre can later use PMTiles if we self-host a map file.

Risks:

- More moving parts than Leaflet.
- OpenFreeMap public instance currently has no SLA.
- WebGL map inside an already WebGL-heavy app may need performance care on weak devices.

Decision:

Good second choice if we want a cleaner visual map and still avoid Google. For fastest safe implementation, start Leaflet. For nicest no-key map, start OpenFreeMap + MapLibre.

### Option C: Bundled Static Basemap From Natural Earth

Best zero-network, zero-key fallback.

Natural Earth provides public-domain vector and raster map data at continent/country scales. We can ship a simplified world/country GeoJSON or SVG inside the app and draw pins over it.

Use:

- Natural Earth countries/continents as bundled data.
- A simple SVG/canvas or lightweight GeoJSON renderer.
- Pins projected from latitude/longitude.
- Region/country centroid fallback for missing coordinates.

Pros:

- No API key.
- No external tile server.
- No runtime map cost.
- Works offline and in static deployments.
- Very good for continent/country/regional overview.

Risks:

- Not detailed enough for street addresses.
- No roads, local labels, or rich map interactions unless we add them.
- Need a projection and simplified geometry pipeline.

Decision:

Excellent fallback layer. It matches the app philosophy: topic-first, not navigation-first. If we want maximum independence, this should become the baseline.

### Option D: PMTiles / Self-Hosted Vector Map

Best long-term production no-key map.

PMTiles is a single-file archive format for tiled map data. It can be hosted as a static file and read in the browser with range requests. MapLibre, Leaflet, and OpenLayers can consume PMTiles workflows.

Use:

- A small PMTiles region file first, such as Europe or selected countries.
- MapLibre or Leaflet for rendering.
- Vercel/static hosting if range requests and cache headers work correctly.

Pros:

- No third-party map API key.
- No paid map provider by default.
- Strong production control.
- Good path for future multiuser app.

Risks:

- Need a map data build/download step.
- Full planet vector basemap can be large.
- We must keep attribution and update data periodically.

Decision:

Good later, after Regional UX is stable. Start with public no-key tiles or a static Natural Earth map; move to PMTiles if usage grows.

### Option E: Eurostat GISCO / NUTS Regions

Best for EU regional administrative shapes.

Eurostat GISCO provides downloadable country, region, NUTS, LAU, and related geodata. NUTS data is useful for Belgium/EU regional levels.

Use:

- NUTS 0 for country.
- NUTS 1/2/3 for major/basic/small regions.
- Topic region selection for EU initiatives.

Pros:

- Great for EU regional thinking.
- Useful for climate/regional policy layers.
- Multiple formats exist, including GeoJSON/TopoJSON.

Risks:

- Specific copyright/download rules apply.
- Some datasets are non-commercial unless licensed through EuroGeographics.
- Better for EU/regional admin boundaries than worldwide mapping.

Decision:

Use for EU regional overlays only after checking the project's intended publication/commercial status. Natural Earth is cleaner for global public-domain base shapes.

## About ViaMichelin

ViaMichelin is useful as a consumer route planner, especially for Europe and road-trip context. It is not the best embedded no-key map base for this app.

Why:

- The public ViaMichelin site/app is navigation and trip-planning oriented.
- I did not find a current clean no-key public web-map embed API suitable for app basemaps.
- Historical developer/API references point toward key-based integration.

Possible use:

- Add an external link like `Open route in ViaMichelin` later.
- Do not use it as the Regional embedded map foundation.

## Is A Google Maps API Key Free?

Short answer: the key itself is not the cost problem; usage is.

As of the current Google Maps Platform pricing page:

- Google Maps Platform is pay-as-you-go.
- The old USD $200 monthly credit was replaced on March 1, 2025 by free monthly calls per SKU.
- Google lists 10K free monthly calls per SKU for Essentials, 5K for Pro, and 1K for Enterprise.
- Essentials Map Tiles APIs can have up to 100K calls at no cost per SKU per month.
- Usage above the free monthly calls is billed.
- Google says map/panorama load events and API calls can be billable requests; user panning/zooming itself is not charged as a separate interaction.

Meaning for us:

- Google is not a no-key solution.
- Google can be safe for testing if quotas/budgets are set.
- For an open/public project, do not make Google the default map dependency unless we intentionally accept billing setup, quotas, referrer restrictions, and terms.

## Geocoding And Address Input

We should not require an exact address to create a topic.

Recommended topic location levels:

1. Country only.
2. Region/province/state.
3. City/town.
4. Approximate manual map click.
5. Exact address, optional.

Fallback behavior:

- If lat/lon exists, use it.
- If no lat/lon but city/region exists, use stored city/region centroid.
- If only country exists, use country centroid.
- If nothing exists, keep the topic in an `Unplaced` list and ask admin later.

Address lookup:

- OSM Nominatim public service can be used only for light, user-triggered lookup, with attribution, valid identification, caching, and a hard maximum of 1 request/second.
- Do not use Nominatim for autocomplete, bulk geocoding, or repeated background update jobs.
- If the app grows, switch to a self-hosted geocoder or paid provider.

## Recommended Implementation For Our App

### Phase 1: No-Key Topic Map

Build a map mode that does not require a key:

- Add `mapProvider: "leaflet-osm"` or `mapProvider: "simple-natural-earth"` in Settings.
- Default to no-key.
- Render Regional topic pins from existing topic data.
- Add popup with title, category, source/media count, and `Open Topic`.
- Use country/region/city centroid fallback when coordinates are missing.
- Add an `Approximate location` label when precision is not exact.

Best first choice:

- If we want interactive pan/zoom quickly: Leaflet + OSM tiles.
- If we want absolute independence: bundled Natural Earth SVG/GeoJSON map.

### Phase 2: Optional Better Basemap

Add OpenFreeMap + MapLibre as an optional no-key vector provider.

- Better style.
- Better clustering.
- Still no Google key.
- Keep provider switchable in Settings.

### Phase 3: Production Hardening

If usage grows:

- Move to PMTiles/static self-hosted map tiles.
- Cache aggressively.
- Keep attribution visible.
- Add admin geocoding queue for unresolved topics.

### Phase 4: Optional Google

Keep Google Maps in Settings as a detail/premium mode:

- Useful for exact addresses, street context, or richer local browsing.
- Not required for the Regional default.
- Disable by default.

## Decision

Change the product direction from `Google map first` to `No-key topic map first`.

I recommend:

1. Default: Leaflet + OSM for the quickest working map.
2. Fallback/offline: Natural Earth static map.
3. Later visual upgrade: OpenFreeMap + MapLibre.
4. Optional only: Google Maps when a key is configured.

This keeps `topic.earth` more independent, cheaper to run, and better aligned with approximate regional initiative mapping.

## Sources Checked

- Google Maps Platform pricing overview.
  https://developers.google.com/maps/billing-and-pricing/overview
- Google Maps Platform pricing page and FAQ.
  https://mapsplatform.google.com/pricing/
- Leaflet official site.
  https://leafletjs.com/
- OpenStreetMap tile usage policy.
  https://operations.osmfoundation.org/policies/tiles/
- OpenStreetMap copyright and attribution.
  https://www.openstreetmap.org/copyright
- OpenStreetMap Nominatim usage policy.
  https://operations.osmfoundation.org/policies/nominatim/
- MapLibre GL JS official site.
  https://maplibre.org/projects/gl-js/
- OpenFreeMap official site.
  https://openfreemap.org/
- Protomaps PMTiles docs.
  https://docs.protomaps.com/pmtiles/
- Natural Earth terms of use.
  https://www.naturalearthdata.com/about/terms-of-use/
- Eurostat GISCO NUTS datasets and copyright notes.
  https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics
  https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units
