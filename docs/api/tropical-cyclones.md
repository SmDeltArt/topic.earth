# World tropical cyclone layer

The World tab has **🌀 Tropical cyclones · world live**, with one agency-linked topic per reported system. Clicking its named spiral opens that same topic. Storms are excluded from spatial clustering so neighbouring systems retain their identities. An additional sources/legend topic reports coverage and connects to the existing El Niño 2026–2027 topic.

## Data flow

`World layer → /api/tropical-cyclones → official agency feeds → validated storm records → topics and globe geometry`.

This is a public meteorological endpoint in the topic.earth deployment. It uses no AI, API keys, private proxy token, vault or CAD-DELTAI settings. The copied `api/AGENTS.local.md` points to the separate CAD-DELTAI product and its private manifest; those settings, encryption, storage keys and paid routes are unchanged.

The server fetches only fixed official URLs or paths built from strictly validated storm IDs:

| Source | Coverage / products |
|---|---|
| NOAA/NHC `CurrentStorms.json` | Names, reported positions and intensity for North Atlantic, eastern and central North Pacific |
| NHC ATCF best-track / official forecast | Reported history, quadrant wind radii, forecast positions |
| JMA `targetTc.json` / cyclone forecast JSON | Western North Pacific names, analysis, track, 30/50 kt areas and forecast positions |
| JTWC `abpwweb.txt` | Western/South Pacific and Australian-region summary, including unnamed depressions |
| JTWC `abioweb.txt` | North/South Indian Ocean and Australian-region summary |

This covers the principal tropical-cyclone basins worldwide, but the feeds are not exhaustive for exceptional South Atlantic systems. No bulletin for a basin, an unavailable source, or an empty list from one agency is not proof that the entire world is storm-free. Each source's success is reported; JTWC Pacific and Indian availability are recorded separately.

The endpoint has bounded upstream timeouts, accepts GET only and uses Vercel CDN caching for 10 minutes. Browser checks run at startup, on the topic's Refresh button and every 10 minutes while World mode and the layer are active. After returning to a visible tab, an expired snapshot is refreshed. Server execution is capped at 30 seconds.

## Geometry and interpretation

- Spirals sit at the reported latitude/longitude and carry the corresponding topic ID and name. Rotation is illustrative and follows hemisphere; reduced-motion preferences stop it.
- Spirals have readability bounds. Only published transparent wind areas represent size to geographic scale; missing radii create no footprint.
- NHC quadrants convert nautical miles to kilometres. JMA radii convert metres to kilometres. Footprints retain their own source time and centre, which may differ from the newest reported centre.
- Wind thresholds remain explicit: NHC 34/50/64 kt, JMA 30/50 kt. Blue footprint = 30/34 kt; amber = 50 kt; red = 64 kt.
- Past tracks are solid cyan, forecasts are dashed. Geometry is subdivided along the sphere for rendering, including across the date line; those subdivisions are not new observations.
- Selecting a storm enlarges only the spiral symbol. Geographic footprints and tracks remain unscaled. Geometry/materials are disposed when markers refresh.
- JMA position and JTWC wind measurements can coexist only with separate provider/averaging-period/time labels. Hurricane categories are assigned only to NHC hurricanes, not automatically to typhoons using a different wind average.
- Reports older than 12 hours or retained during a source failure are grey/stale. Stale wind footprints and forecasts are hidden. When a working feed removes a storm, its globe marker disappears; an already-open topic reports that tracking ended.

The browser's `topicEarthCyclonesV1` cache stores only public source data. A failed basin source retains its last-good systems with explicit unavailability; a confirmed empty source removes ended systems. Official agency links and national warning advice remain visible in the topic.

## El Niño context

The educational explanation cites NOAA's assessment issued **8 October 2026** and links to the current ENSO discussion. El Niño tends to favour eastern/central Pacific development and suppress Atlantic development, while individual Atlantic storms can still form. The app does not claim that the presence of any particular cyclone proves El Niño caused it. The dated explanation must not be interpreted as a continuously refreshed ENSO classification.

The El Niño navigation button sits outside the sandboxed story and uses the application's topic-selection callback, avoiding an HTML link that would reload the entire app inside the story.

## Verification

`node tools/check-cyclones.mjs` checks official-schema parsing, units, coordinates, forecasts, agency deduplication, source outages, empty lists, stale reports, safe content, date-line geometry, reduced motion, unclustered storm identities and the production GlobeRenderer attachment/visibility/disposal path using the actual Three.js library.

`tools/cyclone-controls-preview.html` fetches the same live endpoint and projects the production marker geometry in a software canvas, enabling data/topic/geometry checks in browsers without WebGL. It is a verification view; the application itself uses its existing Three.js globe.

## En français

Dans l'onglet Monde, **🌀 Tropical cyclones · world live** affiche les systèmes des principaux bassins : Atlantique, Pacifique, océan Indien et région australienne. Cliquer sur une spirale ouvre son sujet. Les surfaces transparentes suivent les rayons de vent publiés ; le trait plein correspond au passé et le trait discontinu aux prévisions.

Les dates, sources et unités sont visibles. Une donnée manquante ne produit pas une taille inventée. Une position ancienne ou conservée après une panne est signalée en gris. Le sujet présente le contexte El Niño 2026–2027 et distingue l'influence saisonnière d'une attribution causale à un cyclone précis.
