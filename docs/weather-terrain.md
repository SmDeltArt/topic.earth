# Weather symbols, terrain and picker canvas — 15 October 2026

## Picker transparency

Transparent CSS backgrounds do not guarantee a transparent iframe canvas when the iframe and embedded document use different colour schemes. A Chromium regression fixture reproduces a white canvas with a dark iframe/light document. The fix declares `color-scheme: only light` on both the iframe canvas and widget html root. The picker panel's dark/light styling remains independent. This also opts the canvas out of automatic darkening.

The test runs the actual StoryColorPickerManager, full app CSS and local picker HTML. Dark/light desktop and mobile-sized fixtures retain identical sampled background pixels before and after opening the overlay. It also checks gradients, Escape, native fallback and reopen. `tools/check-picker-transparency.cjs` accepts a Playwright module path and optional Chromium executable path. It saves paired temporary PNGs for inspection. Origin/source validation and local security changes are retained. No Studio files are changed.

## Sampled weather coverage

Nineteen city anchors cover populated areas across the Americas, Europe, Africa, Asia and the Pacific, including New York, Los Angeles, Beijing, Algiers, Moscow and Kyiv. Four additional cells rotate every 15 minutes. A Regional focus adds its location and four nearby samples. One request contains at most 32 locations; the globe shows at most 24 selected topics. Significant sampled events take priority over ordinary city conditions, and event/current pins at the same coordinates are deduplicated. Stable city anchors do not jump to a storm elsewhere.

This is sampled Open-Meteo model screening, not an exhaustive worldwide warning service. It can miss severe weather between sampled cells. It does not discover tornadoes or establish climatological anomalies. Official agency alerts and a seasonal historical baseline would be separate data integrations. Current app severity heuristics are screening conventions, not official alert levels. Offline samples remain labelled as samples; incomplete live responses are not accepted as live zero-valued weather.

Globe and Regional use drawn transparent SVG cloud, wind, rain, thunderstorm, snow, fog, sun and heat symbols. The globe has no emoji tile or rectangular marker background. Hover/current-topic previews show the relevant values: gust maximum for wind, precipitation maximum/total for rain, temperature maximum/minimum for heat/freeze, with units and model time. Forecast-window maxima are distinct from current model conditions.

Regional mode keeps Live Meteo available after its introductory layer preview. Refreshing the weather snapshot also refreshes Regional rendering. New sampling is scheduled every 15 minutes while the page is visible and a weather layer is active.

## Bike relief and heights

The existing stable `bike-ways` and `regional-relief` IDs are retained under a Bike Ways group. Existing saved topic categories and route links keep those IDs. Relief remains the existing topographic surface with stylized height stems, not a new terrain mesh.

Relief labels display centimetres above sea level. Only the text changes colour when the terrain estimate is below 65 cm. This is a user-selected comparison threshold, not a universal 2075 sea-level forecast or a flood prediction. Coastal flooding also depends on datum, connectivity, defences, tide, surge and local land movement.

Selecting a topic or placing a drawing point fetches its estimated terrain elevation. A new path vertex or route endpoint shows A/B heights, height difference, horizontal distance, signed angle in degrees and signed rise per 100 horizontal units (percent grade). This is the straight segment's endpoint grade, not the maximum slope along a routed path. Coincident endpoints have no defined grade. Undo/clear/hide or newer selections invalidate old results.

Open-Meteo elevation uses Copernicus DEM GLO-90 (90 m grid). Displaying cm does not imply cm accuracy. Heights near a 65 cm threshold and short-segment grades are particularly uncertain. Missing heights remain unavailable; they are never replaced by zero. Elevation results and concurrent requests are cached by coordinates, with timeout and a bounded cache.
