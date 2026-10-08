import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const config = JSON.parse(await read('../fever-scenarios.json'));
const source = await read('../components/DetailPanel.js');
const methods = source.slice(source.indexOf('  getFeverSeaLevelCm('), source.indexOf('  getWarningSeverity('));
const context = {};
vm.runInNewContext(`this.Panel = class { ${methods} };`, context);
const panel = new context.Panel();
panel.getScenarioMilestones = scenario => config.scenarios[scenario]?.milestones;
assert.equal(panel.getFeverSeaLevelCm(2075, 'objective'), 65);
assert.equal(panel.getFeverSeaLevelCm(2062.5, 'objective'), 48);
assert.equal(panel.getFeverSeaLevelCm(2112.5, 'objective'), 87.5);
assert.equal(panel.getFeverSeaLevelCm(1900, 'objective'), 0);
assert.equal(panel.getFeverSeaLevelCm(2200, 'objective'), 95);
assert.equal(panel.getFeverSeaLevelCm(2075, 'missing'), null);
assert.equal(panel.getFeverSeaLevelCm(NaN, 'objective'), null);
assert.equal(panel.formatFeverSeaLevel(2075, 'objective'), '+65 cm');
for (const year of config.years) {
  const values = ['best', 'objective', 'high'].map(scenario => panel.getFeverSeaLevelCm(year, scenario));
  assert.ok(values[0] <= values[1] && values[1] <= values[2], `${year}: scenario order`);
}
assert.equal(config.seaLevelModel.referenceYear, 1950);
assert.equal(config.seaLevelModel.status, 'illustrative');
const topics = {};
vm.runInNewContext((await read('../data/fever-topics.js')).replaceAll('export const ', 'const ') + '\nthis.topics = FEVER_TOPICS;', topics);
const seaTopic = topics.topics.find(topic => topic.id === 'fever_sea_level');
assert.ok(seaTopic);
const world = {};
vm.runInNewContext((await read('../data/points.js')).replaceAll('export const ', 'const ') + '\nthis.points = MOCK_POINTS;', world);
const glacier = world.points.find(topic => topic.id === seaTopic.linkedWorldTopicId);
assert.ok(glacier);
assert.ok(glacier.lat < -70 && glacier.lon < -90);
assert.match(glacier.region, /West Antarctica/);
// A paused seek must publish its new year immediately so the monitor cannot
// keep showing values from before the seek.
const globeSource = await read('../lib/globe.js');
const seekMethod = globeSource.slice(globeSource.indexOf('  seekToYear('), globeSource.indexOf('  getFeverSoundEnabled('));
const events = [];
const seekContext = { console, window: { dispatchEvent: event => events.push(event) },
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } } };
vm.runInNewContext(`this.Globe = class { ${seekMethod} };`, seekContext);
const globe = new seekContext.Globe();
Object.assign(globe, { inFeverMode: true, feverYears: config.years, feverTextures: config.years.map(() => ({})),
  feverSpeed: 1 / 3, earth: { material: {} }, updateTippingOverlay() {}, updateAMOCOverlay() {}, updateFeverYearText() {} });
globe.seekToYear(2075);
assert.equal(globe.feverPaused, true);
assert.equal(events.at(-1).type, 'feverYearChanged');
assert.equal(events.at(-1).detail.year, 2075);
assert.equal(events.at(-1).detail.progress, 5 / 7);
console.log('Sea-level anchors, interpolation, scenario order and Thwaites topic link passed.');
