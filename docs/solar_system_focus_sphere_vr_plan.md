# Solar System Focus Sphere And VR Plan

Date: 2026-06-01  
Workspace: `C:\Users\bedes\OneDrive\SmDeltArt_Collection\__actual_vs\topic.earth`

## Intent

Keep the whole solar system scene, but do not let it become a heavy astronomy app.

The solar system should support topic.earth's main message:

- Earth is the living, climate-active planet.
- Other planets are comparison worlds and reality checks.
- Satellites explain how we observe Earth.
- Mars/Venus/Moon help show why "Planet B" is not a serious substitute for protecting Earth.

Best guiding phrase:

**Solar System remains the scene. Earth Focus is the app surface.**

## Core Architecture

### 1. One Lightweight Solar System

Keep one base solar system scene:

- Sun and planets visible together;
- simple spheres/materials/textures;
- low memory footprint;
- always available in Space mode;
- current selected-planet behavior remains the entry point.

Avoid:

- one huge GLB containing every high-detail planet;
- loading all planet detail assets on startup;
- dense live topic systems around every planet.

Reason:

- current solar scene already approaches asset budget concerns;
- Cloudinary/file-size limits make one large all-in-one asset fragile;
- most users need Earth intelligence first.

### 2. Lazy Planet Detail Packs

When a planet is selected, load only that planet's richer assets:

- better texture resolution;
- normal/roughness/emissive maps if useful;
- local atmosphere/fog shell;
- topic orbit/ring;
- optional satellites/orbiters;
- optional inner/focus sphere.

Suggested asset model:

```text
base-space/
  solar-system-light.glb or procedural scene

planet-packs/
  earth/
    earth-focus-config.json
    earth-textures-1k/4k/8k
    atmosphere-shell
    clouds/meteo/ozone shells
    satellites
  mars/
    mars-focus-config.json
    mars-textures
    thin-atmosphere-shell
    mission/orbiter topics
  venus/
    venus-focus-config.json
    atmosphere/greenhouse comparison
```

Load policy:

- load base scene first;
- load selected planet pack on demand;
- unload or downgrade previous planet pack when leaving focus;
- preserve a small cache for recently selected planet if memory allows.

## Focus Sphere Concept

When a planet is selected, create a "focus sphere" around or inside the planet.

For Earth:

- outer atmosphere shell;
- cloud/meteo shell;
- ozone/composition shell;
- climate indicator shell;
- topic navigation ring;
- satellites/instruments orbiting around;
- bounded camera controls.

For Mars/Venus/Moon:

- simpler comparison shell;
- technical feasibility / habitability topics;
- fewer live layers.

### Camera Bounds

The selected planet focus should constrain the camera:

- camera orbits around selected planet, not the whole solar system;
- max rotation can be limited to about 180 degrees or less if it improves readability;
- zoom-in stops near the planet atmosphere shell;
- zoom-out stops before the topic UI becomes too tiny;
- exit button returns to whole solar system view.

Useful constraints:

- `minDistance`: just outside atmosphere shell;
- `maxDistance`: still within readable planet focus;
- `minPolarAngle` / `maxPolarAngle`: optionally avoid flipping under/over the planet;
- `azimuthAngle` bounds: optional for guided storytelling scenes;
- disable panning too far from planet center.

### Inner Texture / Immersive Sphere

The "inside sphere" idea is promising:

- when zoomed into Earth focus, user can enter a subtle inner sphere;
- inner shell can show sky/atmosphere/cloud texture effects;
- topics float around the inside wall or on orbital rings;
- camera stays bounded inside the focus volume;
- this can later map well to VR/WebXR.

Keep it optional:

- default desktop uses normal planet focus;
- immersive focus can be a button/toggle;
- VR mode can start directly in immersive focus.

## Earth Focus

Earth gets the richest focus sphere because it is the app's main subject.

Earth focus layers:

- live meteo clouds and warning tint;
- climate indicators;
- ozone hole / atmosphere composition;
- COP / climate process;
- regional bridge;
- Earth-observation satellites.

Earth satellite examples:

- Aura / OMI for ozone;
- Suomi NPP / NOAA-20 OMPS for ozone;
- Sentinel-5P for atmospheric composition;
- Copernicus/ECMWF as data service;
- NASA/NOAA climate and meteo observations.

Clicking a satellite should open:

- instrument purpose;
- what Earth layer it supports;
- latest linked source/status;
- link to official source.

## Mars As Reality Check

Mars is useful because it shows the technical difficulty of escaping Earth climate problems.

Mars focus topics:

- thin atmosphere;
- low pressure;
- radiation exposure;
- cold;
- dust storms;
- water scarcity;
- closed-loop life support;
- launch/logistics cost;
- emergency isolation;
- terraforming reality check.

Narrative:

Mars is fascinating and worth studying, but it is not a replacement for Earth. The app can compare:

- Earth already has atmosphere, oceans, soil, biosphere, protection and cycles;
- Mars would require enormous artificial support just to make small habitats survivable;
- saving Earth is difficult but far more feasible than building a second Earth.

Possible layer title:

- `Planet B Reality Check`

## Venus And Greenhouse Comparison

Venus is a useful climate comparison:

- dense CO2 atmosphere;
- runaway greenhouse;
- sulfuric acid clouds;
- extreme surface pressure and temperature;
- warning/comparison topic for greenhouse physics.

Use Venus carefully:

- do not imply Earth becomes Venus literally;
- use it as a planetary comparison of atmosphere and radiative balance.

## VR / WebXR Direction

The app could map well to VR, especially with Meta Vive Pro or similar headsets, because it is already a 3D globe/space experience.

Good VR targets:

- immersive Earth focus sphere;
- satellite/source orbits around Earth;
- topic panels arranged around the user;
- meteo/cloud/ozone layers as visible shells;
- scale transitions from solar system to Earth focus.

Use WebXR / Three.js path:

- keep ordinary web app as primary;
- add progressive VR mode only after desktop/mobile controls are stable;
- reuse the same scene graph and data layers;
- use larger, gaze/controller-friendly buttons;
- avoid dense right panels inside VR;
- use spatial cards, radial menus, and simple hand/controller targets.

Important:

- VR should be an extra presentation mode, not a separate app;
- data/topic logic should remain shared;
- performance budget matters more in VR, so lazy-loaded planet packs are mandatory.

## Basic Implementation Sequence

1. Keep current solar system as base scene.
2. Add selected-planet focus state:
   - `selectedPlanetId`;
   - `planetFocusActive`;
   - `focusTarget`;
   - `focusRadius`.
3. Add camera constraints for selected planet:
   - bounded orbit;
   - min/max zoom;
   - optional rotate-angle limit.
4. Add Earth focus pack first:
   - atmosphere shell;
   - topic orbit;
   - meteo/climate/ozone shell hooks.
5. Add Mars focus pack second:
   - habitability/technical challenge topics;
   - "Planet B Reality Check" story.
6. Add satellite topics around Earth.
7. Add optional immersive inner sphere.
8. Later: add WebXR entry button and VR-specific UI.

## Basic Version Polish Before This

Before building deep Space focus, finish:

- right panel collapse/close consistency;
- mobile fullscreen access;
- runtime vs published topic badges;
- source confidence badges;
- source registry for meteo/climate/COP/ozone;
- clear refresh/check buttons;
- performance check for current Space scene.

This keeps the app usable while the Space idea matures.

## Design Guardrails

- Earth remains central.
- Space explains Earth; it does not replace the app's climate/regional purpose.
- Other planets are comparison and education, not parallel dashboards.
- Lazy load all heavy planet detail.
- One focused planet at a time.
- Avoid too many orbiting labels; topic navigation should stay readable.
- VR mode comes after stable desktop/mobile interaction.
