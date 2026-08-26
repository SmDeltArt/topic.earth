# Regional OpenStreetMap Notes

Date: 2026-04-15
Workspace: `__actual_vs\topic.earth`

## What We Use Now

The `Regional` tab now uses a real no-key 2D map:

- Leaflet for the browser map UI.
- OpenStreetMap raster tiles for the basemap.
- Existing app topics for the pins.
- Europe as the default center.
- The old schematic Europe map as a fallback if Leaflet or map tiles fail.

This keeps Regional independent from Google Maps. The user does not need a Google API key, and topics can stay approximate until an admin or author adds a better location.

## Does OpenStreetMap Cover The Whole World?

Yes, OpenStreetMap is a worldwide map project.

OpenStreetMap describes itself as a free, editable map of the whole world. It includes roads, buildings, addresses, shops, businesses, points of interest, railways, trails, public transport, land use, natural features, and more. Coverage quality varies by place because the map is community-made: some countries, cities, and regions are extremely detailed; others are less complete.

For `topic.earth`, that is enough because our first need is topic placement, not perfect navigation.

## What OpenStreetMap Gives Us

OpenStreetMap can support:

- Worldwide basemap display.
- Country, region, city, and street-level context where data exists.
- Topic markers and popups.
- Approximate topic placement by country/region/city.
- Manual map click location selection.
- Clustering many topics in dense areas.
- Filtering topics by category, country, region, source, or status.
- Drawing region shapes, routes, polygons, local zones, and initiative areas.
- Offline or self-hosted maps later if we package our own tiles/data.

## Bike, Humanitarian, And Sustainable Layers

There are two different meanings of "map layer":

- Basemap style: a rendered visual style, such as standard, cycling, transport, humanitarian, outdoors, or dark.
- Data overlay: our own topic/filter layer, such as bike repair, humanitarian aid, local food, renewable energy, repair/reuse, sharing networks, water points, community gardens, etc.

OpenStreetMap data is open, but public tile servers are not all the same. Some are community services with usage policies, some are third-party services, and some require an API key or commercial plan for embedded app usage.

### Cycling

Useful OSM data:

- Bike lanes and cycleways.
- Bicycle parking.
- Bike sharing stations.
- Bike repair stations and shops.
- Trails and low-traffic routes where mapped.

What we can build:

- A `Bike / Mobility` overlay for sustainable mobility topics.
- Optional nearby bike infrastructure search around a selected initiative.
- Later: route links to external cycle route planners.

Free-mode note:

The data is open, but ready-made cycle tile styles may have their own hosting limits or API keys. For production, it is safer to use OSM data as an overlay or choose a tile provider with clear terms.

### Humanitarian

Useful OSM/HOT-related data:

- Roads, buildings, health facilities, schools, water points, shelters, and critical infrastructure in vulnerable regions.
- Disaster response mapping through Humanitarian OpenStreetMap Team workflows.

What we can build:

- A `Humanitarian / Resilience` topic layer.
- Community needs and resilience markers.
- Local climate adaptation, shelter, water, food, and emergency support overlays.

Free-mode note:

Humanitarian mapping uses open OSM data, but the public humanitarian tile style/server should not be treated as an unlimited production CDN. If this becomes central to the app, contact HOT or use a provider/self-hosted tiles.

### Sustainable Solution Layers For topic.earth

Good app-owned overlays:

- `Bike / Mobility`: cycle lanes, bike repair, shared mobility, rail/bus access.
- `Repair / Reuse`: repair cafes, reuse centers, tool libraries, maker spaces.
- `Local Food`: markets, community-supported agriculture, gardens, short-circuit food projects.
- `Energy`: solar cooperatives, energy communities, public EV charging, district heating examples.
- `Water / Biodiversity`: water fountains, wetlands, river restoration, community gardens, biodiversity projects.
- `Humanitarian / Resilience`: shelters, health, mutual aid, water access, local emergency support.
- `Education / Citizen Science`: schools, libraries, observatories, community labs.

Best implementation:

1. Keep the basemap simple.
2. Add our own sustainable overlays as topic categories.
3. Query OSM/Overpass only on user request and cache results.
4. For production, avoid depending on unpaid public infrastructure for heavy traffic.

## Implementation Chosen

The app now follows the recommended path:

- OpenStreetMap stays as the neutral basemap.
- Sustainable solution overlays should stay app-owned topic categories, not external tile dependencies.
- Regional map pins respect the left panel layer toggles.
- The experimental default sustainable layers were removed from the main layer panel because empty categories made the UI feel broken.
- Add sustainable categories later as real custom layers only when there are topics/data to show.
- OSM/Overpass enrichment should come later, only from user-triggered actions and with caching.

This keeps the map useful immediately while avoiding a second uncontrolled pipeline of external data calls.

## Usage And Copyright Check

Checked against the official OpenStreetMap copyright page, tile policy, API policy, Nominatim policy, and featured layer notes on 2026-04-15.

### Important Distinction

OpenStreetMap has two different things we must not mix up:

- OSM data: open map data licensed under ODbL.
- OSM-hosted services: public servers for tiles, geocoding, editing, etc. These are community-funded and have usage limits.

So: the map data is open, but `tile.openstreetmap.org` is not an unlimited free production map API.

### Current App Status

The current Regional map is acceptable as a lightweight prototype because:

- It uses the correct Standard raster tile URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
- Leaflet displays visible attribution on the map.
- Browser tile loading normally sends a browser User-Agent and Referer.
- The map only loads tiles that the user views interactively.

Still, for public Vercel production or higher traffic, we should not depend forever on free OSMF tile servers.

### Attribution Requirements

When using OSM data or OSM tiles:

- Show visible OpenStreetMap attribution on or near the map.
- Do not hide attribution behind panels, toggles, or off-screen UI.
- The credit should make clear that OpenStreetMap data is under the Open Database License.
- A standard acceptable wording is `Copyright OpenStreetMap contributors`, linked to `https://www.openstreetmap.org/copyright`.

Leaflet already supports attribution, but our UI must leave it readable.

### Tile Usage Rules

For `tile.openstreetmap.org`:

- OK: normal human map viewing, pan, zoom, and revisits from browser cache.
- Required: keep visible attribution, use HTTPS, allow Referer, and respect caching.
- Required for apps/proxies: identify the app with a stable User-Agent/contact.
- Not OK: bulk tile downloads, prefetching large areas, offline download buttons, `.mbtiles`/`.zip` tile archives from OSMF tiles, or headless bots that pan/zoom to force rendering.
- Risk: access can be blocked without notice if usage harms the shared service.

Practical app rule: no background tile preloading and no "download this region from OSMF tiles" feature.

### OSM API And Editing

The main OSM API is primarily for editing map data, not for read-only app data extraction.

For our app:

- Do not use the main OSM editing API to power topic search or overlays.
- If we need raw OSM data, use planet/extract files, a provider, or small user-triggered Overpass queries.
- If we want to contribute corrections back to OSM, that is where an OSM account/sign-in matters.

### Address Search / Nominatim

Nominatim is the OSM geocoder. The public service can be used only lightly.

Safe for us:

- A user clicks `Find address` while editing one topic.
- We cache the returned coordinates.

Avoid:

- Autocomplete on every keystroke.
- Background geocoding many topics.
- Bulk reverse-geocoding grids or large datasets.

The public Nominatim policy has an absolute maximum of one request per second per app, and requests must identify the application.

### Bike / Humanitarian / Transport Layers

The layers visible on openstreetmap.org, such as CyclOSM, Cycle Map, Transport, or Humanitarian, are separate tile styles/services.

Important:

- They are not automatically available through `tile.openstreetmap.org`.
- Each style/provider can have its own hosting terms.
- The OSM tile policy explicitly says its Standard tile policy does not apply to other layers.

Best path for `topic.earth`:

- Keep the Standard OSM basemap.
- Keep our sustainable categories as app-owned overlays.
- Later, add OSM-derived POI enrichment through controlled user-triggered search, not automatic tile-layer scraping.

### Recommended Production Path

For early testing:

- Keep current Leaflet + OSM Standard tiles.
- Keep attribution visible.
- Keep traffic low and interactive.

For public/serious deployment:

- Switch basemap hosting to a provider with explicit production terms, or self-host.
- Consider vector tiles or PMTiles if we need more control.
- Add a configurable tile provider setting so we can switch without changing topic code.
- Keep app topics independent from basemap provider.

### Copyright / License Impact For topic.earth Topics

If a user creates an original topic in our app, that topic is our app data.

If we copy or import substantial OSM data into our topic database, then ODbL obligations may apply:

- credit OpenStreetMap,
- preserve license notices,
- and for derivative databases, share under compatible ODbL terms when publicly used.

Safer first implementation:

- Store user/authored topic data separately.
- Store only coordinates and minimal cached geocoding result metadata.
- Clearly mark any OSM-derived fields if we add them later.

## What Leaflet Gives Us

Leaflet is the JavaScript map library currently used for Regional.

It gives:

- Pan and zoom.
- Markers, circle markers, popups, and tooltips.
- Tile layers, including OpenStreetMap and other providers.
- GeoJSON overlays.
- Easy custom controls.
- Many plugins, including clustering, drawing/editing, heatmaps, and minimaps.

Why Leaflet fits this step:

- Small and simple.
- No build-system migration.
- Good enough for topic maps.
- Easy fallback to another tile source later.

## What We Can Build Next

### 1. Click-To-Place Topic

When creating or editing a topic:

- User clicks the map.
- The app stores `lat`, `lon`, and `locationPrecision: "manual"`.
- Optional text fields stay simple: country, region, city, address.

This avoids forcing exact addresses.

### 2. Approximate Location Levels

Recommended topic location precision:

1. `country`
2. `region`
3. `city`
4. `manual`
5. `address`

This is good for regional initiatives because many topics do not need a street address.

### 3. Topic Clustering

If there are many topics around Brussels, Paris, Berlin, etc.:

- Group nearby pins into clusters.
- Click a cluster to zoom.
- Click a pin to open the existing topic detail.

Leaflet.markercluster is a common next plugin for this.

### 4. Region Shapes

We can draw:

- EU boundaries.
- Country boundaries.
- NUTS regions for EU regional levels.
- Initiative service areas.
- Climate/adaptation zones.

For global public-domain country shapes, Natural Earth is a good lightweight option. For EU regional administrative detail, Eurostat GISCO/NUTS is useful but needs license checking for the intended publication context.

### 5. Search And Geocoding

OpenStreetMap has a geocoder called Nominatim.

Important: the public Nominatim service is not for heavy app search, autocomplete, bulk geocoding, or background jobs. It is acceptable only for light, user-triggered requests if we follow the policy, identify the app, cache results, and keep request volume low.

For this app:

- OK: user clicks `Find address` once while editing a topic.
- Not OK: live autocomplete on every keystroke.
- Not OK: automatically geocoding hundreds of topics in the browser.
- Better later: self-host a geocoder or use a paid geocoding provider.

### 6. OSM Data Queries

OpenStreetMap data can be queried with Overpass API.

Possible examples:

- Find repair cafes near a city.
- Find bike parking, train stations, water fountains, community gardens.
- Find schools, libraries, food markets, solar/energy-related features where mapped.

Important: public Overpass instances are shared community infrastructure. Use only for small, user-triggered lookups, cache responses, and avoid polling/background automation.

### 7. Better Basemap Later

If public OSM tiles become too limited for production, we can switch without changing topic data:

- OpenFreeMap with MapLibre for no-key vector tiles.
- A paid tile provider with a normal API key.
- Self-hosted tiles.
- PMTiles static map archives for controlled hosting.

## Current Limitations

- The current map starts on Europe, but OpenStreetMap itself is global.
- The current code filters visible topics to Europe bounds.
- Public OpenStreetMap tiles are not a heavy-production CDN for high traffic.
- Routing is not included yet.
- Address search is not included yet.
- Offline map data is not included yet.

## Recommended Next Step

Keep it minimal:

1. Add a `World / Europe / Country` map scope control.
2. Add click-to-place coordinates in topic edit/create.
3. Add optional address lookup later, user-triggered only.
4. Add clustering only when there are enough regional topics to need it.

This keeps the app intuitive and prevents another overgrown AI/search/topic layer.

## Sources Checked

- OpenStreetMap Welcome Mat: what OpenStreetMap is.
  https://welcome.openstreetmap.org/what-is-openstreetmap/
- OpenStreetMap about page.
  https://www.openstreetmap.org/about
- OpenStreetMap tile usage policy.
  https://operations.osmfoundation.org/policies/tiles/
- OpenStreetMap API usage policy.
  https://operations.osmfoundation.org/policies/api/
- OpenStreetMap copyright and license page.
  https://www.openstreetmap.org/copyright
- OpenStreetMap attribution guidelines.
  https://osmfoundation.org/wiki/Licence/Attribution_Guidelines
- OpenStreetMap Nominatim usage policy.
  https://operations.osmfoundation.org/policies/nominatim/
- OpenStreetMap featured tile layers.
  https://wiki.openstreetmap.org/wiki/Featured_tile_layers
- Leaflet official site.
  https://leafletjs.com/
- Overpass API wiki.
  https://wiki.openstreetmap.org/wiki/Overpass_API
