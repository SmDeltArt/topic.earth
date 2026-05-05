# Main Mode 3D Layers

Status: first Clouds / Live Meteo implementation slice added on 2026-04-23.

This document describes what 3D layers are available in Main mode today, and what layer families are good candidates for the next phase: clouds, meteo, planes, boats, traffic, and other live global systems.

## Short Answer

Main mode currently supports a textured 3D Earth, atmosphere, stars, clickable country/coordinate interaction, colored 3D topic markers grouped by data layer, a linked cloud shell, and sampled realtime meteo markers.

The first implementation uses Open-Meteo current conditions to update `meteo-live` markers and generate a procedural `meteo-clouds` shell. It does not yet have full satellite cloud imagery, weather raster overlays, aircraft traffic, maritime traffic, or road traffic.

## Regional OpenMap Meteo

Regional mode can show a 2D meteo layer on the OpenStreetMap/Leaflet map. The current first version reuses Open-Meteo samples to render a generated cloud/rain surface and sampled current-condition point markers.

Behavior today:

- `meteo-clouds` paints a translucent generated cloud/rain surface over the Regional OpenStreetMap view;
- `meteo-live` appears in Regional mode when its left-panel layer icon is active;
- switching the `meteo-live` layer off removes the 2D meteo markers while leaving the visual cloud/rain surface if `meteo-clouds` is still active;
- switching both `meteo-clouds` and `meteo-live` off removes the generated meteo overlay;
- the 2D implementation is generated from sampled points, not a full weather raster tile layer yet.

Possible next 2D meteo layers:

- precipitation radar tiles;
- cloud cover raster tiles;
- wind or temperature raster tiles;
- air-quality or smoke overlays;
- regional storm tracks and alerts.

## Current Main Mode Layers

Main mode is defined by `LayerPanel.getFilteredLayers()` as every layer except `space` and `feverOnly` layers.

Available Main mode layer categories today:

| Layer id | Label | Current 3D behavior |
| --- | --- | --- |
| `meteo` | Meteo | Colored point markers for weather/climate topics. |
| `meteo-clouds` | Clouds | Linked left-panel layer controlling a procedural 3D cloud shell. |
| `meteo-live` | Live Meteo | Linked left-panel layer controlling sampled Open-Meteo current-condition markers. |
| `regional-news` | Regional News | Colored point markers for regional topics. |
| `country-news` | Country News | Colored point markers for country topics. |
| `eu` | EU | Colored point markers for EU topics. |
| `world` | World | Colored point markers for global topics. |
| `climate` | Climate Change | Colored point markers for climate topics. |
| `extreme` | Extreme Events | Colored point markers for extreme-event topics. |
| custom admin layers | Browser-created layers | Colored point markers, persisted in local browser storage. |

Excluded from Main mode:

| Layer id | Reason |
| --- | --- |
| `space` | Belongs to Space mode / solar-system view. |
| `earths-fever` | Fever-only simulation layer. |
| `tipping-points` | Fever-only tipping overlay/topics. |
| `amoc-watch` | Fever-only AMOC overlay/topics. |

## What The Renderer Can Do Today

The current `GlobeRenderer` already supports:

- textured Earth sphere with normal and roughness maps;
- atmosphere shader shell;
- starfield background;
- point markers placed from latitude/longitude;
- marker glow and cluster marker glow;
- hover tooltips;
- click selection for marker detail;
- country/coordinate click in Interaction mode;
- camera focus on a selected point;
- special GLB overlays in Fever mode, such as AMOC and tipping overlays.

The current Main-mode layer primitive is therefore:

```js
{
  type: 'marker',
  lat,
  lon,
  category,
  color,
  title,
  summary
}
```

That is enough for news, sampled meteo events, regional alerts, custom topics, and the first procedural cloud shell. It is not enough yet for satellite cloud imagery, moving aircraft, moving ships, dense traffic, or animated weather raster fields.

## Recommended 3D Layer Families

These are the useful 3D layer kinds to support next.

| Family | Example | Main mode fit | First useful version |
| --- | --- | --- | --- |
| Surface markers | Meteo stations, alerts, news | Already supported | Continue with current markers. |
| Transparent shell texture | Global cloud cover | Strong fit | Thin transparent cloud sphere above Earth. |
| Surface raster overlay | Rain, temperature anomaly, wind risk, air quality | Strong fit | Semi-transparent texture projected on globe. |
| Vector field | Wind direction, ocean currents | Good fit if sparse | Curved arrows or animated particles. |
| Moving assets | Planes, ships | Good fit if filtered | Instanced icons moving on lat/lon tracks. |
| Path/trail layer | Flight paths, shipping lanes, storm tracks | Good fit | Arc lines or short fading trails. |
| Heatmap | Event density, emissions, congestion | Good fit | Low-resolution surface heat texture. |
| Dense local traffic | Road traffic, city congestion | Better in Regional mode | Main mode should show aggregated corridors only. |

## Layer Ideas

### Cloud / Meteo

Best first candidate for a true Main-mode 3D layer.

Recommended behavior:

- add a `clouds` or `meteo-clouds` layer;
- render a transparent sphere at radius around `1.018`;
- use a grayscale or alpha cloud texture;
- slowly rotate it independently from Earth;
- keep it optional on mobile and low-end devices;
- combine with existing `meteo` point markers.

Why this fits:

- low interaction complexity;
- visually clear on the globe;
- can start with a static asset before live weather data;
- does not require thousands of live entities.

### Weather Raster

Weather overlays should be separate from the existing `meteo` marker layer.

Possible sublayers:

- precipitation;
- temperature anomaly;
- wind intensity;
- air quality / smoke;
- storm risk;
- drought / soil moisture.

Recommended behavior:

- render as a transparent globe-surface texture or tiled low-resolution canvas;
- keep opacity adjustable;
- avoid loading many high-resolution layers at once;
- refresh only when the source timestamp changes.

### Planes

Aircraft traffic should be a moving-asset layer, not a topic marker layer.

Recommended behavior:

- add an `air-traffic` layer;
- use instanced meshes or sprites for aircraft icons;
- position at radius `1.035` to sit above the atmosphere/ground markers;
- show only a filtered subset by default;
- animate from sampled positions rather than continuous live updates every frame;
- show callsign, altitude, direction, and route on hover when data is available.

Main-mode rule:

- show global air traffic only at low density;
- show detailed traffic after zoom/focus or inside a regional view.

### Boats / Maritime Traffic

Ship traffic should be another moving-asset layer.

Recommended behavior:

- add a `marine-traffic` layer;
- place vessels near radius `1.012`;
- use color by vessel class or risk state;
- draw short wake/trail segments for recent movement;
- aggregate dense port areas until zoomed/focused.

Good sublayers:

- cargo;
- tanker;
- passenger;
- fishing;
- rescue / coast guard;
- port congestion.

### Ground Traffic

Road traffic is less suitable for Main mode because it is dense and local.

Recommended Main-mode behavior:

- show country/corridor-level congestion indicators;
- show major logistics corridors only;
- send city-level or street-level traffic to Regional mode;
- avoid trying to render every car or road segment on the globe.

Good first version:

- a `logistics-traffic` layer with major port, airport, rail, canal, and road bottlenecks as markers/arcs.

## Proposed Layer Contract

Add a new optional `renderKind` or `layerKind` field to `data/layers.js`.

```js
{
  id: 'meteo-clouds',
  name: 'Clouds',
  color: '#b6d8ff',
  enabled: false,
  layerKind: 'shell-texture',
  mode: 'main',
  renderer: {
    radius: 1.018,
    opacity: 0.35,
    rotationSpeed: 0.00008,
    texture: './data/clouds/clouds_latest.png'
  }
}
```

Useful `layerKind` values:

| layerKind | Renderer responsibility |
| --- | --- |
| `markers` | Current behavior: point markers from topics. |
| `shell-texture` | Transparent sphere around Earth. |
| `surface-raster` | Texture or canvas overlay on Earth surface. |
| `moving-assets` | Instanced moving icons for planes/ships. |
| `paths` | Arcs, trails, shipping lanes, flight routes. |
| `heatmap` | Aggregated intensity texture. |
| `vector-field` | Sparse animated arrows or particles. |

## Suggested Build Order

1. Keep existing Main-mode markers as the stable base.
2. Add `shell-texture` support for a cloud layer.
3. Add `surface-raster` support for weather overlays.
4. Add `paths` support for storm tracks, shipping lanes, and flight routes.
5. Add `moving-assets` support with mock/sample aircraft and ships first.
6. Add live data ingestion only after the rendering primitives are stable.

## Performance Rules

Main mode should stay readable and fast.

- Mobile should default heavy live layers off.
- Prefer low-resolution global textures over many tiny objects.
- Use instancing for planes and ships.
- Cap visible moving assets by zoom level and viewport.
- Aggregate dense areas into clusters or heatmaps.
- Avoid refreshing external live data inside the render loop.
- Use cached snapshots for demo/user mode.
- Let Admin mode enable experimental/live sources.

## Admin / User Mode

Recommended behavior:

| Mode | Behavior |
| --- | --- |
| User/demo | Can view stable layers and cached snapshots. |
| Admin | Can enable experimental layers, configure sources, and refresh data. |
| Dev | Can inspect renderer stats, raw payloads, and performance budgets. |

This matches the current capability direction: User mode should be safe and readable; Admin mode can manage and test heavier features.

## Decision

Clouds and weather rasters are the best next 3D Main-mode additions.

Planes and boats are good second-wave layers, but they need a moving-asset renderer and careful filtering. Road traffic should mostly live in Regional mode, with Main mode showing only aggregate logistics or corridor-level signals.