import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../lib/globe.js', import.meta.url), 'utf8'))
  .replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export class GlobeRenderer', 'class GlobeRenderer');
const timers = new Map(); const delays = new Map(); let nextTimer = 0;
const context = vm.createContext({
  console, document: { body: { style: {} } },
  setTimeout(fn, delay) { assert.ok([2000,4000].includes(delay)); timers.set(++nextTimer, fn); delays.set(nextTimer,delay); return nextTimer; },
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
assert.equal(delays.get(globe.currentTooltipAutoCloseTimer), 4000);
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
const weather = { ...marker, id: 'meteo-hover', isTropicalCyclone: true };
globe.showTooltip(weather,10,10);
assert.equal(hidden,false);
assert.equal(timers.size,0,'Weather remains visible while hovered');
globe.hideTooltip();
const weatherTimer=globe.currentTooltipAutoCloseTimer;
assert.equal(delays.get(weatherTimer),4000);
globe.hideTooltip(); assert.equal(globe.currentTooltipAutoCloseTimer,weatherTimer,'Moving away does not restart the countdown');
globe.showTooltip(weather,11,11); assert.equal(timers.size,0,'Returning to weather cancels expiry');
globe.showTooltip(marker,12,12);
assert.equal(delays.get(globe.currentTooltipAutoCloseTimer),2000,'Moving from weather back to an ordinary topic restores its timeout');
globe.showTooltip(weather,11,11);
globe.hideTooltip();
const closeTimer=globe.currentTooltipAutoCloseTimer;
timers.get(closeTimer)();timers.delete(closeTimer);
assert.equal(hidden,true);
console.log('Topic previews: quiet startup, ordinary two-second expiry, sustained weather hover and four-second weather dismissal passed.');
