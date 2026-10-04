import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
async function loadClass(path, name, globals = {}) {
  let source = await readFile(new URL(path, root), 'utf8');
  source = source.replace(/^import[^\r\n]*;\r?\n/gm, '').replace(`export class ${name}`, `class ${name}`);
  source = source.split('// Initialize application when DOM is ready')[0];
  const context = vm.createContext({ console, ...globals });
  vm.runInContext(`${source}\nglobalThis.TestClass = ${name};`, context);
  return context.TestClass;
}

// A shared layer may be on in World and off in Regional. Repeated clicks must
// follow Regional's state without modifying the World state.
const LayerPanel = await loadClass('components/LayerPanel.js', 'LayerPanel');
const panel = Object.create(LayerPanel.prototype);
panel.layerFilter = 'regional';
panel.activeLayers = new Set(['meteo-live']);
panel.regionalActiveLayers = new Set();
panel.callbacks = {};
panel.getLayerById = id => ({ id });
panel.isLayerGroup = () => false;
panel.updateData = () => {};
const icon = { dataset: { layerId: 'meteo-live' } };
panel.handleLayerToggle(icon);
assert.equal(panel.regionalActiveLayers.has('meteo-live'), true);
panel.handleLayerToggle(icon);
assert.equal(panel.regionalActiveLayers.has('meteo-live'), false);
assert.equal(panel.activeLayers.has('meteo-live'), true);

const RegionalMap = await loadClass('components/RegionalMap.js', 'RegionalMap');
const map = Object.create(RegionalMap.prototype);
map.reliefElevationCache = new Map();
map.getTopicKey = point => point.id;
map.activeLayers = null;
assert.equal(map.isReliefActive(), false);
assert.equal(map.getPointElevation({ id: 'missing', elevation: null }), null);
assert.equal(map.getPointElevation({ id: 'sea', elevation: 0 }), 0);

// Both callers enter before asynchronous geolocation finishes. Only one
// location lookup and one weather request should occur, even with force=true.
let locationCalls = 0;
let weatherCalls = 0;
let releaseLocation;
const location = new Promise(resolve => { releaseLocation = resolve; });
const App = await loadClass('app.main.js', 'TopicEarthApp', {
  Settings: { get: () => ({ regionalAutoLocate: true }) },
  METEO_CLOUD_LAYER_ID: 'meteo-clouds',
  METEO_REALTIME_LAYER_ID: 'meteo-live',
  fetchRealtimeMeteoSnapshot: async () => { weatherCalls++; return { points: [], livePoints: [] }; },
  window: {}
});
const app = Object.create(App.prototype);
app.currentLayerFilter = 'regional';
app.fetchRegionalIpLocation = () => { locationCalls++; return location; };
app.getLayerById = () => null;
app.rebuildAllPoints = () => {};
app.updateMarkers = () => {};
app.syncRealtimeMeteoLayers = () => {};
const first = app.refreshRealtimeMeteo({ force: true });
const second = app.refreshRealtimeMeteo({ force: true });
await Promise.resolve();
releaseLocation({ lat: 50, lon: 4 });
await Promise.all([first, second]);
assert.equal(locationCalls, 1);
assert.equal(weatherCalls, 1);
assert.equal(app.meteoRefreshPromise, null);
console.log('Regional toggle, elevation and concurrent Meteo checks passed.');

// Completed drawings keep their geometry and chosen layer after storage/reload.
const drawing = Object.create(RegionalMap.prototype);
drawing.pathPoints = [[51, 4], [51.1, 4.2]];
drawing.routePoints = [[51, 4], [51.2, 4.3]];
drawing.routeGeometry = [[51, 4], [51.1, 4.15], [51.2, 4.3]];
drawing.routeDetails = { distanceM: 1200, durationS: 300, fallback: false };
drawing.routeProfile = 'bike'; drawing.routePreference = 'shortest';
drawing.getCurrentView = () => ({ center: [51, 4], zoom: 10 });
drawing.activeLayers = new Set(['bike-ways']);
const Storage = await loadClass('lib/storage.js', 'LocalStorage');
const captured = drawing.getTopicRegionalState({layerId:'bike-ways'});
const saved = JSON.parse(JSON.stringify(Storage.compactRegionalState(captured)));
assert.equal(saved.layerId, 'bike-ways');
assert.deepEqual(saved.path.points, [[51,4],[51.1,4.2]]);
assert.equal(saved.route.geometry.length, 3);
const restored = Object.create(RegionalMap.prototype);
restored.map = {};
restored.restorePath = points => { restored.pathPoints = points; };
restored.clearRoute = () => {};
restored.drawRoute = points => { restored.routeGeometry = points; };
restored.restoreMapView = view => { restored.view = view; };
restored.updateToolButtons = () => {};
assert.equal(restored.restoreTopicState(saved), true);
assert.deepEqual(restored.pathPoints, saved.path.points);
assert.deepEqual(restored.routeGeometry, saved.route.geometry);
let completed;
drawing.callbacks = { onDrawingComplete: value => { completed = value; } };
drawing.activeTopicId = 'chosen-topic'; drawing.renderPathLayer = () => {};
drawing.setAuthorMode = () => {}; drawing.setStatus = () => {}; drawing.t = key => key;
drawing.finishPath();
assert.equal(completed.topicId, 'chosen-topic');
assert.equal(completed.state.path.points.length, 2);
console.log('Path/route capture, chosen layer, storage round-trip and completion association checks passed.');
