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
