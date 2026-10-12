# World textures and Regional controls

Updated 12 October 2026.

## World texture quality

Settings offers **Auto / 1k / 4k / 8k**. Auto keeps Firefox and other non-Chromium browsers at 1k under the existing conservative policy. Manual choices are bounded by the GPU maximum texture size.

World textures now load packaged files first, then mapped CDN alternatives and smaller resolutions if a load fails. Settings changes update the World material immediately; Fever keeps its own material and quality setting.

## My location

In Settings (available from World or Regional), enter a municipality, city or `latitude, longitude`, then choose **Check and set / Vérifier et définir**. In Regional map search, check **Set the result as my location / Définir le résultat comme ma localisation** before searching to save that result.

The chosen location is saved in this browser, not submitted as a citizen profile. Viewing another topic or searching without the checkbox does not replace it. **Return to automatic location** clears the saved choice. Location search is user-triggered, cached for five minutes and rate-limited; place-name queries are sent to the existing OpenStreetMap Nominatim service. Coordinates can be entered without geocoding. Public-service usage limits apply: https://operations.osmfoundation.org/policies/nominatim/.

Regional topic previews, map pins and previous/next navigation use the optional **25 / 50 / 100 / 250 km** radius. **All distances** is the default. Topics and layers are ordered by proximity; the example layer stays last.

## Regional pilot and examples

Regional opens on **Community Projects**, including the Wallonia ambassador proposal. The old static Regional news, community, cycling, charging and hydrogen samples move to **Examples · learning only**, disabled by default. Country/EU news and the EU source-watch layer remain in World. Samples are retained with stable IDs and labelled as illustrative, not verified active initiatives.

The Regional topic toolbar stays outside scrolling content, above map panes, with previous/next, translate, read and close controls. Previous/next is disabled when there is no adjacent topic.

## Verification

Run `node tools/check-world-regional.mjs` for mocked texture failures, Firefox Auto/GPU bounds, saved-location persistence rules, proximity/radius navigation, toolbar action availability and example isolation. The actual Firefox rendering must still be checked on a WebGL-capable browser; the cloud browser available for this work does not provide WebGL.
