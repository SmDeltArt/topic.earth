# COP, Ozone, Atmosphere And Satellite Layer Plan

Date: 2026-06-01  
Workspace: `C:\Users\bedes\OneDrive\SmDeltArt_Collection\__actual_vs\topic.earth`

## Question

Where should yearly COP summaries live, and can topic.earth add an ozone-hole / atmosphere composition layer that behaves like live meteo and climate indicators?

Short answer:

- COP should be a World policy layer, connected to Climate Change but not hidden inside it.
- Ozone should be a visual atmosphere layer, connected to Climate Change, Space, and Earth-monitoring satellites.
- Both should follow the runtime-source-review pattern:
  - official/current signal;
  - visual surface;
  - reviewed yearly/topic summary;
  - AI only for digesting and translating sourced material.

Related Space architecture: [Solar System Focus Sphere And VR Plan](solar_system_focus_sphere_vr_plan.md) keeps the whole solar system while giving Earth and selected planets lazy-loaded focus spheres, bounded camera controls, satellite orbits, and a future WebXR path.

## COP Placement

### Best Layer Structure

Add a top-level World layer:

- `cop-climate-process`
- label: `COP / Climate Process`
- mode: `main`
- source rhythm: yearly plus conference-period live updates
- confidence default: `official` or `needs-review`

Why not only inside `Climate Change`?

- COP is policy/process, not a physical climate indicator.
- Climate Change should show measured climate state and science.
- COP should show governance: decisions, finance, adaptation, carbon markets, loss and damage, NDCs, stocktake, fossil fuels, implementation gaps.

But every COP topic should link back to Climate Change:

- physical reason: climate indicators;
- political response: COP decisions;
- implementation signal: country/EU/world initiatives;
- evidence: official UNFCCC decisions and negotiation summaries.

### Topic Model

Every COP gets one anchor topic:

```json
{
  "id": "cop29-2024-baku-summary",
  "category": "cop-climate-process",
  "title": "COP29 Baku outcome summary",
  "country": "Azerbaijan",
  "region": "Baku",
  "date": "2024-11-24",
  "sourceType": "official",
  "confidence": "source-confirmed",
  "reviewState": "published",
  "cop": {
    "number": 29,
    "year": 2024,
    "hostCity": "Baku",
    "hostCountry": "Azerbaijan",
    "mainTracks": ["finance", "carbon markets", "adaptation", "loss and damage"],
    "summaryAvailable": true
  }
}
```

And optional child/update topics:

- `COP29 climate finance outcome`
- `COP29 Article 6 / carbon markets outcome`
- `COP29 adaptation and loss-and-damage update`
- `COP29 criticism / implementation gap`

### Source Strategy

Primary sources:

- UNFCCC Decisions database for official adopted decisions.
- UNFCCC conference pages and outcome pages for official context.
- Earth Negotiations Bulletin / IISD for readable daily and final negotiation summaries.

Secondary/analysis sources:

- WRI COP outcome explainers.
- IISD analysis articles.
- UN DESA and official UN summaries where relevant.

Rule:

- COP yearly summary can be available in the app as a reviewed topic.
- During conference weeks, app can create `runtime` or `draft` updates, but should not mark them final until decisions are adopted or a trusted final summary is available.

### UI

In World mode:

- COP layer marker at host city.
- A timeline/list from COP1 to latest COP.
- Current/upcoming COP badge.
- Summary card with:
  - main outcomes;
  - unresolved issues;
  - implementation watch;
  - official decision links.

In Climate Change detail:

- show related COP topics as policy response, not as measured climate evidence.

## Ozone And Atmosphere Composition Layer

### Best Layer Structure

Add a visual layer:

- `atmosphere-composition`
- sublayer/toggles:
  - `ozone-hole`
  - `stratospheric-ozone`
  - `surface-ozone-air-quality`
  - `aerosols-smoke-dust`
  - `methane-co2-watch`
  - `satellite-observation`

This layer can appear in:

- World mode: atmosphere shell around Earth;
- Space mode: Earth observation satellites and instruments;
- Climate Change detail: connected indicator/source topics.

### Ozone Hole Visual

Best first target:

- Antarctic ozone hole, because it has a strong visual identity, clear source pages, and a known threshold.

The ozone hole is not literally a hole. It is the area where total column ozone falls below about 220 Dobson Units over Antarctica. NASA Ozone Watch uses this threshold and publishes daily images, animations and data. Copernicus CAMS monitors ozone, gives daily maps/charts/animations, and provides forecasts/reanalyses of atmospheric composition.

Visual design:

- translucent atmosphere shell above Earth;
- Antarctic polar cap overlay;
- purple/blue depression for low ozone;
- outline/edge for hole extent;
- tooltip:
  - date;
  - area;
  - minimum ozone;
  - source;
  - confidence;
  - trend/rank if available.

Severity color:

- cyan: no notable depletion;
- yellow: seasonal depletion developing;
- orange: strong ozone hole;
- red/purple: very large/deep ozone hole.

### Data Sources

Primary:

- NASA Ozone Watch: latest status, images, Antarctic ozone hole data, threshold explanation.
- Copernicus Atmosphere Monitoring Service (CAMS): ozone layer monitoring, atmospheric composition forecasts/reanalyses, ozone hole maps/animations.

Useful linked sources:

- NASA/NOAA yearly ozone hole ranking reports.
- CAMS yearly seasonal ozone hole articles.
- Montreal Protocol / UNEP reports for recovery context.

### Runtime Data Strategy

Phase 1:

- add source-backed topic and layer plan;
- use NASA Ozone Watch latest image as visual/evidence;
- show a static/daily-refreshed polar overlay if exact numeric endpoint is not yet parsed.

Phase 2:

- parse NASA Ozone Watch or CAMS data tables/images where accessible;
- compute:
  - latest date;
  - ozone hole area;
  - minimum ozone;
  - minimum temperature;
  - seasonal rank if source publishes it.

Phase 3:

- draw true geospatial contour from gridded data if a usable API/NetCDF pipeline is added.

### Topic Model

```json
{
  "id": "ozone-hole-runtime-watch",
  "category": "atmosphere-composition",
  "title": "Antarctic ozone hole latest status",
  "country": "Antarctica",
  "region": "South Polar Stratosphere",
  "lat": -90,
  "lon": 0,
  "sourceType": "scientific",
  "confidence": "measured",
  "reviewState": "runtime",
  "atmosphere": {
    "indicator": "ozone-hole",
    "threshold": "220 Dobson Units",
    "altitudeBand": "stratosphere",
    "composition": ["O3", "chlorine chemistry", "polar stratospheric clouds"],
    "satelliteSources": ["Aura OMI", "OMPS", "CAMS"]
  }
}
```

### Space Mode Link

Space mode can show Earth-observation satellites as a separate visual/story layer:

- Aura / OMI for ozone;
- Suomi NPP / NOAA-20 OMPS for ozone;
- Sentinel-5P for atmospheric composition;
- Copernicus/ECMWF as data service;
- NASA/NOAA as observation/report source.

Clicking a satellite should not replace the Earth topic. It should open:

- instrument purpose;
- current linked Earth layer;
- source URL;
- latest dataset/status.

## Atmosphere Composition Expansion

Ozone is a good entry point, but the same visual shell can support:

- ozone hole and stratospheric ozone;
- surface ozone / air-quality risk;
- aerosols from wildfire smoke, dust, volcanic ash;
- methane hotspots;
- CO2 column / emissions monitoring;
- nitrogen dioxide from industry/transport;
- UV index / surface radiation.

Important distinction:

- stratospheric ozone protects from UV and is linked to ozone depletion;
- surface ozone is an air pollutant and health/ecosystem risk;
- greenhouse gases such as CO2/CH4 are climate forcing indicators;
- aerosols affect air quality, clouds, radiation, health and regional climate.

Do not merge them all into one "pollution" topic. Use a shared visual shell but keep separate indicator metadata.

## Basic Version Polish Before Expanding Too Far

Highest-value polish:

1. Source confidence and review badges must be consistent everywhere:
   - `runtime`;
   - `needs-review`;
   - `measured`;
   - `official-confirmed`;
   - `published`.
2. Every auto topic should have one clear action:
   - `Check official sources`;
   - `Summarize source`;
   - `Save as draft`;
   - `Publish/update topic`.
3. Layer list must stay readable:
   - World mode should show sparse signals;
   - Regional mode can show denser local information;
   - Space mode should show instruments/satellites, not every Earth event.
4. Add source-registry docs/data:
   - source name;
   - source URL;
   - layer;
   - update rhythm;
   - confidence;
   - parser status.
5. Cache state visibly:
   - last checked time;
   - live/fallback/partial status;
   - refresh button.
6. Keep static topics and runtime points visually distinct.
7. Improve mobile controls before adding many more layers:
   - close/collapse right panel;
   - reachable fullscreen;
   - short bottom panels;
   - no heavy blur on transparent panel.
8. Add one test/demo route for:
   - live meteo;
   - climate indicators;
   - COP summary;
   - ozone layer.

## Recommended Next Coding Sequence

1. Add `cop-climate-process` layer with curated yearly COP anchor topics and source links.
2. Add `atmosphere-composition` layer with one runtime ozone-hole watch topic.
3. Add source registry file shared by meteo, climate, COP and atmosphere.
4. Add a visual ozone shell/Antarctic overlay using source-backed status first.
5. Add satellite/instrument topics in Space mode and link them to atmosphere indicators.

## Source Notes, 2026-06-01

- NASA Ozone Watch publishes latest Antarctic ozone hole status, images, animations and explains the 220 Dobson Unit threshold.
- Copernicus CAMS provides monitoring and forecasts for atmospheric composition including ozone, aerosols and greenhouse gases, and has ozone layer monitoring pages with daily maps/charts/animations.
- UNFCCC Decisions is the official place for adopted COP decisions.
- IISD Earth Negotiations Bulletin is a strong source for readable daily/final COP negotiation summaries.
