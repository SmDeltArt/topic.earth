# Topic Pathway State Restore

Date: 2026-05-06

Status: partially implemented in `__actual_vs\topic.earth` for browser/admin Regional topics, especially `bike-ways`.

This note answers how a topic under a bike layer could remember a complete pathway and restore it when the topic is opened.

## Short Recommendation

Do not track a user's entire hidden behavior path.

Instead, save an intentional topic context snapshot:

```text
topic opens
  -> Regional map focuses the topic
  -> saved path or route is restored
  -> selected layer, zoom, and route mode return
  -> detail panel explains what the path represents
```

This is useful for bike corridors, walking routes, evacuation paths, community walks, charging trips, flood-safe routes, and similar local topics.

## Current Code Support

`RegionalMap` already has important pieces:

- `pathPoints` for hand-drawn multi-point paths;
- `routePoints` for start/end routing;
- `routeProfile` with `bike`, `foot`, and `driving`;
- `routePreference` with `shortest` and `fastest`;
- `restorePath(points)`;
- `restoreRoute(points)`;
- `getCurrentView()`;
- `getTopicRegionalState(options)`;
- `restoreTopicState(state)`;
- deferred restore when the Leaflet map is still loading;
- explicit path/route attach actions for saving state to the selected topic;
- app topic selection that switches into Regional mode when `topic.regionalState` exists.
- `restoreMapView(view)`;
- `focusTopic(point)`.

The missing piece is a serializer and a restore contract between topic data and the Regional map.

## Proposed Topic Field

Add a field like `regionalState` to topics that need map replay.

```js
regionalState: {
  version: 1,
  layerId: 'bike-ways',
  restoreMode: 'route',
  focus: {
    lat: 50.8503,
    lon: 4.3517,
    zoom: 14,
    label: 'Brussels bike spine',
    precision: 'city'
  },
  map: {
    center: [50.8503, 4.3517],
    zoom: 13,
    activeLayers: ['bike-ways']
  },
  route: {
    profile: 'bike',
    preference: 'shortest',
    waypoints: [
      { lat: 50.8466, lon: 4.3528, label: 'Central station', role: 'start' },
      { lat: 50.8725, lon: 4.3776, label: 'North-east corridor', role: 'end' }
    ],
    geometry: [
      [50.8466, 4.3528],
      [50.8522, 4.3601],
      [50.8725, 4.3776]
    ],
    distanceM: 4200,
    durationS: 980,
    provider: 'routing.openstreetmap.de',
    calculatedAt: '2026-05-06T00:00:00Z'
  }
}
```

For a hand-drawn pathway, use `restoreMode: 'path'`:

```js
regionalState: {
  version: 1,
  layerId: 'bike-ways',
  restoreMode: 'path',
  path: {
    points: [
      [50.8466, 4.3528],
      [50.8522, 4.3601],
      [50.8610, 4.3690]
    ],
    source: 'user-drawn',
    label: 'Suggested protected corridor'
  }
}
```

## Route Vs Path

Use route when the topic should restore a calculated route:

- two endpoints;
- routing profile matters;
- shortest/fastest matters;
- route can be recalculated later.
- the user can choose the destination either by clicking the map endpoint or by typing a topic, address, city, or coordinates into the Regional destination field.

OpenStreetMap can support this in two pieces: Nominatim resolves typed destinations to coordinates, then `routing.openstreetmap.de` calculates the bike/walk/road line from the selected start to the destination. If the routing service is unavailable, the app should fall back to a direct guide line rather than silently pretending it has a detailed route.

Use path when the topic should preserve an authored shape:

- many points;
- route is conceptual or manually corrected;
- source is a planning document, GPX, KML, GeoJSON, or local drawing;
- exact geometry should not be replaced by routing service output.

Bike infrastructure topics will often need both:

```text
route
  shows how a rider can travel now

path
  shows the proposed, missing, or protected corridor
```

## Restore Flow

When a topic is selected:

```text
select topic
  -> DetailPanel opens topic
  -> app checks topic.regionalState
  -> if Regional is not active, open Regional
  -> ensure layerId is enabled
  -> RegionalMap.focusTopic(topic)
  -> RegionalMap.restoreTopicState(topic.regionalState)
  -> status says route/path restored
```

`RegionalMap.restoreTopicState(state)` should:

- set `routeProfile` and `routePreference`;
- restore saved `map.center` and `map.zoom` if present;
- restore `path.points` with `restorePath(points)`;
- restore `route.waypoints` with `restoreRoute(points)`;
- draw saved `route.geometry` directly if available;
- only call a live routing service when geometry is missing or stale.

## Capture Flow

When an Admin or local proposal author is building a bike topic:

```text
draw path or choose route points
  -> click "Attach path to topic"
  -> app serializes Regional state
  -> topic draft stores regionalState
  -> topic preview opens and restores it
```

The serializer should be explicit:

```js
RegionalMap.getTopicRegionalState({
  layerId: 'bike-ways',
  restoreMode: 'route'
})
```

It should not save location history automatically.

## Privacy Rule

Only save a route when the user asks to attach it to a topic.

Do not store continuous user movement, hidden GPS traces, IP location results, or private home/work patterns as topic data. For public topics, prefer generalized or approved paths unless the user intentionally publishes a route.

Good Phase 1 wording:

```text
Attach this path to the topic
```

Avoid:

```text
Track my pathway
```

## Phase Plan

### Phase 1: Local Topic Snapshot

- document the `regionalState` shape;
- add no backend requirement;
- save only in browser-local custom topics or admin drafts;
- restore path/route when a local topic is opened.

### Phase 2: Admin Draft Support

- add "Attach path to topic" in the admin topic builder;
- include `regionalState` in export/review packages;
- preview the restored route before submission.

### Phase 3: Published Topic Support

- allow reviewed `regionalState` on published topics;
- render bike paths on topic open;
- keep geometry stable across deployments;
- allow a source field for GPX/KML/GeoJSON/imported planning documents.

### Phase 4: Member Routes

- allow signed-in members to save private routes;
- let members propose a route update to an existing topic;
- require moderation before any route becomes public.

## Remaining Implementation Notes

Useful next hardening:

- add a small schema validator before saving;
- add an explicit clear saved path/route action in the topic builder;
- add import fields for GPX/KML/GeoJSON or planning documents;
- decide whether reviewed published topics can carry `regionalState`.

This keeps bike pathways as topic data, not as a tracker.

## 2026-05-31 regional mobility rule

Bike ways, EV charging, and hydrogen/H2 access are now Regional-only layers. They should not compete with world/globe climate layers because their value depends on the current user or map focus.

On each Regional focus change, the app checks the nearest built-in or browser-local mobility topics by distance:

- nearest EV/H2 charging topic;
- nearest bike-way topic;
- nearest saved bike route/path attached to a topic through `regionalState`.

This first pass uses the app's own topic coordinates and recorded topic routes. Later live source connectors can enrich those same regional layers with station availability, public water points, verified bike infrastructure, or imported trip files, but the UI contract should remain the same: local context first, topic draft/validation second.
