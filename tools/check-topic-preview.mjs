import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../lib/globe.js', import.meta.url), 'utf8'))
  .replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export class GlobeRenderer', 'class GlobeRenderer');
const timers = new Map(); let nextTimer = 0;
const context = vm.createContext({
  console, document: { body: { style: {} } },
  setTimeout(fn, delay) { assert.equal(delay, 2000); timers.set(++nextTimer, fn); return nextTimer; },
  clearTimeout(id) { timers.delete(id); }
});
vm.runInContext(`${source.slice(source.indexOf('class GlobeRenderer'))}\nthis.GlobeRenderer = GlobeRenderer;`, context);
const globe = Object.create(context.GlobeRenderer.prototype);
let hidden = true; let automaticPreviews = 0;
globe.tooltip = { classList: { add() { hidden = true; }, remove() { hidden = false; } } };
globe.markers = [];
globe.positionTooltip = () => {};
globe.updateCurrentTopicTooltipPosition = () => { automaticPreviews++; hidden = false; };
globe.setCurrentTopic({ id: 'ordinary-topic' });
assert.equal(hidden, true);
assert.equal(automaticPreviews, 0);
globe.setCurrentTopic({ id: 'offline-weather', isRealtimeMeteo: true, isLive: false });
assert.equal(hidden, true);
globe.setCurrentTopic({ id: 'live-weather', isRealtimeMeteo: true, isLive: true });
assert.equal(automaticPreviews, 1);
globe.dismissTopicTooltip();
const marker = { id: 'hover-topic', isCluster: true, count: 2, region: 'Test' };
globe.showTooltip(marker, 10, 10);
assert.equal(hidden, false);
const timer = globe.currentTooltipAutoCloseTimer;
globe.showTooltip(marker, 11, 11);
assert.equal(globe.currentTooltipAutoCloseTimer, timer, 'moving over the same topic must not extend its preview');
timers.get(timer)(); timers.delete(timer);
assert.equal(hidden, true);
globe.showTooltip(marker, 12, 12);
assert.equal(hidden, true, 'expired hover stays hidden until the pointer leaves');
globe.hideTooltip();
globe.showTooltip(marker, 10, 10);
assert.equal(hidden, false, 'hovering again after leaving opens a fresh preview');
globe.dismissTopicTooltip();
assert.equal(timers.size, 0);
console.log('Topic previews: quiet startup, live-weather exception, two-second hover expiry and re-entry passed.');
