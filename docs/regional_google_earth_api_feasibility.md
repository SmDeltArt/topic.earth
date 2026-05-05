# Regional Tab + Google Earth/Maps API Feasibility

Date: 2026-04-14
Workspace: `_actual_vs_y1`

## Goal

Add a new `Regional` tab before `Main` in the header. The tab should focus on regional initiative discovery rather than global news: climate action, sharing networks, short local circuits, sustainable food, repair/reuse, community energy, water, biodiversity, mobility, and other local resilience projects.

The important product question is whether this should use a "Google Earth API" directly. Based on current public Google documentation, the practical web options are not one single old Earth API. They are:

- Google Maps JavaScript 3D Maps for a built-in browser 3D map experience.
- Google Maps Platform Map Tiles API / Photorealistic 3D Tiles, usually rendered with CesiumJS or another 3D Tiles renderer.
- Google Earth Engine for geospatial/environmental analysis, usually as a data/backend pipeline rather than a direct user-facing map widget.
- Google Maps environment and place APIs for local contextual data.

## Short Answer

Recommended path: build `Regional` as an app-native tab first, then make Google 3D optional behind API settings.

The first useful version does not need Google at all. It can reuse our current layer/topic structure and add a regional initiative data model. Once the UX is clear, we can enable a Google-powered view only when a Maps API key is configured.

Best fit for the app:

1. Phase 1: `Regional` tab in our existing UI, with local/regional initiative layers and topic cards.
2. Phase 2: optional Google Maps JavaScript 3D Maps view for selected region/city focus.
3. Phase 3: optional Earth Engine or Environment API backend for climate indicators and evidence.

Avoid starting with old "Google Earth API" assumptions. It is safer to treat `Google Earth` as a product family and choose the specific current API per job.

## Current Google Options

### Option A: Google Maps JavaScript 3D Maps

Use when we want a fast browser integration with a Google-provided 3D scene.

Official docs describe 3D Maps in Maps JavaScript as a Maps JavaScript API product for immersive 3D map experiences, with built-in 3D rendering and support for photorealistic environments, custom markers, popovers, polylines, camera paths, and 3D models.

Pros:

- Fastest path to a polished regional 3D view.
- Uses a custom element, `gmp-map-3d`, through `google.maps.importLibrary("maps3d")`.
- Better fit for a tab/page experience than trying to replace the existing Three.js Earth.
- Can show local initiative markers and region navigation.

Cons/Risks:

- Requires Google Maps Platform setup, billing, API key restrictions, and coverage checks.
- Needs lazy loading so the app does not pay/load Google 3D before the Regional tab is opened.
- Some 3D Maps features are channel/stage dependent; we should expect API changes.
- In the EEA, Google Maps Platform terms and returned content can differ, so this matters for Belgium/EU users.

Best use in our app:

- Add a regional panel that can switch between our native globe/card mode and Google 3D mode.
- Keep initiative data in our app, not inside Google.
- Use Google only as the visual/geospatial base.

### Option B: Photorealistic 3D Tiles + CesiumJS

Use when we want maximum control over a 3D geospatial scene and renderer.

Official docs say Photorealistic 3D Tiles provide high-resolution 3D maps of populated areas and are consumed through a root tileset URL by a compatible 3D Tiles renderer such as CesiumJS. Google also documents CesiumJS as a renderer path and notes attribution requirements.

Pros:

- Strong fit with Cesium and geospatial overlays.
- More control than the Maps JS 3D widget.
- Better long-term path if `Regional` grows into a serious GIS explorer.
- Can combine local GeoJSON, initiative markers, heat layers, and 3D mesh.

Cons/Risks:

- Heavier implementation than Maps JS 3D.
- Requires Map Tiles API, billing, API key, attribution, and performance tuning.
- More complex to blend with current Three.js globe unless we isolate it as a separate Regional scene.

Best use in our app:

- Good if we decide Regional becomes a dedicated Cesium-powered map module.
- Not the first move unless we intentionally replace or complement the current globe with Cesium.

### Option C: Google Earth Engine

Use when we need environmental analysis, not when we need a simple embedded map.

Official docs say Earth Engine runs on Google Cloud and needs a Cloud project with the Earth Engine API enabled, registered for commercial or noncommercial use, and correct IAM roles. This makes it powerful but heavier than a front-end-only feature.

Pros:

- Strong for regional climate indicators: vegetation, surface water, heat, land use, forest change, drought/flood risk.
- Useful for generating evidence snapshots for initiatives.
- Can feed our AI topic/source pipeline with real geospatial indicators.

Cons/Risks:

- Not a drop-in interactive map for our current app.
- Requires Cloud project registration, roles, possible quotas/subscription planning, and likely backend/service account handling.
- Should not expose service credentials in front-end code.

Best use in our app:

- Later backend/data worker that writes region indicators into app data.
- Admin-only research tool to enrich regional topics.

### Option D: Google Environment + Places APIs

Use when the regional tab needs practical local context.

Google Maps Platform lists environment APIs such as Air Quality, Solar, and Weather. Places APIs can support local initiative discovery, geocoding, photos, and place metadata.

Pros:

- Good for initiative cards: air quality, solar potential, weather risks, nearby places, local photos.
- Easier than Earth Engine for simple context.

Cons/Risks:

- Costs can grow if every marker/card calls live APIs.
- Some APIs should be proxied or cached.
- Terms may restrict storing/displaying certain Google content.

Best use in our app:

- Optional enrichment for a selected region or selected initiative, not global background polling.

## Proposed Regional UX

Header order:

```text
Regional | Main | Space | Fever
```

Regional mode should answer:

- What sustainable initiatives exist around this region?
- Which ones are climate-related, food/short-circuit, sharing, mobility, energy, repair/reuse, biodiversity, water?
- What sources/media prove or illustrate them?
- Can an admin submit a local initiative topic?
- Can future users submit a topic to admin validation?

Suggested Regional layers:

- Climate adaptation
- Local food / short circuits
- Sharing / mutual aid
- Repair, reuse, circular economy
- Community energy
- Water and biodiversity
- Sustainable mobility
- Education / citizen science

Suggested Regional topic fields:

- Initiative name
- Category
- Region/city/country
- Coordinates
- Short description
- Source URLs
- Source media tokens
- Organizer/team
- Status: proposed, verified, archived
- Admin review fields
- Optional Google place id
- Optional environmental indicators

## Technical Recommendation

### Phase 1: App-native Regional tab

Implement before any Google dependency.

- Add `Regional` filter before `Main` in `components/TopBar.js`.
- Add regional layers/data in local project files.
- Reuse existing topic creation/source/media workflows.
- Add a regional initiative card layout in the right panel.
- Keep it deployable without API keys.

Why: this gives us product clarity and avoids locking the app into Google costs/API terms too early.

### Phase 2: Optional Google 3D regional view

Add only after API settings can hold a Google Maps key.

- Add an API setting: `googleMapsApiKey` with referrer restriction guidance.
- Lazy-load Google Maps JS only inside Regional mode.
- Render `gmp-map-3d` in a contained panel or full regional scene.
- Show app-owned markers/cards on top.
- If key missing, fall back to the app-native view.

### Phase 3: Data enrichment

Add selectively, probably backend/proxy-first.

- Places/geocoding for locating initiatives.
- Environment APIs for selected-region context.
- Earth Engine only for heavier climate analysis snapshots.

## Security + Cost Guardrails

- Do not hardcode unrestricted Google API keys in source files.
- Use API key restrictions by HTTP referrer for browser Maps usage.
- Use a backend/proxy for APIs that need secrets or service accounts.
- Lazy load Google services only when `Regional` is active.
- Cache regional enrichments so topic browsing does not call paid APIs repeatedly.
- Keep attribution visible when Google imagery/tiles are displayed.
- Check EEA terms/content behavior because this project is developed from Belgium/EU context.

## Decision

My recommendation: create the `Regional` tab as an app-native layer first, with a Google-ready integration slot. Then use Google Maps JavaScript 3D Maps as the first optional API integration if we want a fast immersive regional view. Reserve Earth Engine for later analysis/enrichment, not for the initial tab.

This keeps the app smart and intuitive without making every regional action depend on paid/geospatial APIs.

## Build Choice For This Step

Because the app already has a world scene, the most appropriate immediate move is a country/regional tool rather than another globe. `Regional` should be a focused mode on the existing scene, showing local initiative topics, country news, and regional news. Google can stay optional for a later city/3D detail view once the API key, cost, attribution, and caching rules are clear.

Follow-up decision: the preferred default map should be no-key and topic-first. See `docs/regional_no_key_map_options.md` for Leaflet/OpenStreetMap, OpenFreeMap/MapLibre, Natural Earth, PMTiles, ViaMichelin, and Google pricing notes.

## Phase 1.5: Optional Google Map View

The current implementation adds a lightweight Google Maps JavaScript view inside the Regional panel. This is intentionally a 2D country/regional map first, not a replacement for the existing Earth scene.

Behavior:

- Settings can store `googleMapsApiKey`, `googleMapsMapId`, `googleMapsDefaultZoom`, and an opt-in auto-load toggle.
- Regional mode shows a Google Map card with a manual `Load Google Map` action.
- The Google script is lazy-loaded only when the Regional map is requested, or when auto-load is enabled.
- Regional markers come from our existing app/topic data.
- If a Map ID is configured, the app attempts Google Advanced Markers. Without a Map ID, it falls back to standard Google markers.
- If no key is configured, the native Regional overview remains the default.

Guardrail:

The browser API key is public by nature. It must be restricted by HTTP referrer in Google Cloud, and the Maps JavaScript API plus billing must be enabled. Do not use unrestricted keys in production.

## Implementation Checklist When We Decide To Build

1. Add `Regional` button before `Main` in the header. Done in Phase 1.
2. Add `regional` filter handling in layer visibility. Done in Phase 1.
3. Add a `regional-initiatives` dataset and layers. Seeded in Phase 1.
4. Add a regional detail mode/card in `DetailPanel`. Seed metadata added in Phase 1.
5. Add a Regional overview panel with counts, seed initiatives, and source-first/new-initiative actions. Done in Phase 1.
6. Add initiative metadata fields for type, organizer, status, and admin review state. Done in Phase 1.
7. Add admin submit/review workflow for regional initiatives.
8. Add optional Google key fields in app settings. Done in Phase 1.5 for Maps JavaScript view.
9. Add lazy Google Maps loader behind `Regional` only. Done in Phase 1.5 for 2D Maps JavaScript view.
10. Add fallback when no Google key is configured. Done in Phase 1.5.
11. Add docs for API key restrictions and cost controls. Started in Phase 1.5.
12. Decide if the next Google step should be 3D Maps, Cesium Photorealistic 3D Tiles, or selected-region enrichment.
13. Only then add Earth Engine/environment enrichments.

## Sources Checked

- Google Maps Platform product list: 3D Maps, Photorealistic 3D Tiles, Places, Environment APIs, Google Earth, and Earth Engine.
  https://mapsplatform.google.com/maps-products/3d-maps/
- Google Maps JavaScript 3D Maps overview.
  https://developers.google.com/maps/documentation/javascript/3d/overview
- Google Maps JavaScript 3D Maps reference (`Map3DElement`).
  https://developers.google.com/maps/documentation/javascript/reference/3d-map
- Google Maps JavaScript API loading guide.
  https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- Google Maps JavaScript Advanced Markers guide.
  https://developers.google.com/maps/documentation/javascript/advanced-markers/start
- Google Map Tiles API Photorealistic 3D Tiles.
  https://developers.google.com/maps/documentation/tile/3d-tiles
- Google Map Tiles API renderer guidance for CesiumJS and other 3D Tiles renderers.
  https://developers.google.com/maps/documentation/tile/use-renderer
- Google Earth Engine access requirements.
  https://developers.google.com/earth-engine/guides/access
