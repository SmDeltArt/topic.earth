import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../lib/globe.js', import.meta.url), 'utf8');
const names = ['normalizeTextureQualityPreference', 'getAutoTextureQuality', 'detectPreferredQuality', 'refreshMainTextureQuality'];
const methods = names.map(name => source.match(new RegExp(`  ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}`))[0]);
let preference = '1k';
// The browser deliberately has no window.Settings global.
const globe = vm.runInNewContext(`({${methods.join(',')}})`, {
  Settings: { get: () => ({ baseTextureQuality: preference }) }, window: {}, console: { log() {}, debug() {} }
});
globe.renderer = { capabilities: { maxTextureSize: 8192 } };
globe.getTextureQualitySignals = () => ({ browserFamily: 'firefox' });
globe.earth = { material: {} };
globe.textureCache = { mainMaterials: new Map() };
let rebuilds = 0;
globe.createMainEarthMaterial = quality => {
  rebuilds++;
  const material = { quality };
  globe.textureCache.mainMaterials.set(quality, material);
  return material;
};
for (const quality of ['1k', '4k', '8k']) {
  preference = quality;
  globe.refreshMainTextureQuality();
  assert.equal(globe.earth.material.quality, quality);
}
globe.refreshMainTextureQuality();
assert.equal(rebuilds, 3, 'Unrelated settings must not reapply the current material');
globe.renderer.capabilities.maxTextureSize = 4096;
assert.equal(globe.detectPreferredQuality(), '4k', 'GPU cap still applies to manual 8k');
preference = 'auto';
assert.equal(globe.detectPreferredQuality(), '1k', 'Firefox Auto keeps its conservative default');
globe.inFeverMode = true;
const current = globe.earth.material;
globe.refreshMainTextureQuality();
assert.equal(globe.earth.material, current, 'World settings must not replace Fever material');

const regionalSource = await readFile(new URL('../components/RegionalMap.js', import.meta.url), 'utf8');
const scaleMethod = regionalSource.match(/  updateReliefLabelScale\([^\n]*\) \{[\s\S]*?\n  \}/)[0];
const regional = vm.runInNewContext(`({${scaleMethod}})`);
let labelSize;
regional.element = { style: { setProperty: (name, value) => { assert.equal(name, '--regional-relief-label-size'); labelSize = value; } } };
for (const [zoom, expected] of [[4, '8px'], [8, '8px'], [9, '12px'], [11, '12px'], [12, '16px'], [17, '16px']]) {
  regional.map = { getZoom: () => zoom };
  regional.updateReliefLabelScale();
  assert.equal(labelSize, expected);
}
console.log('Imported Settings controls 1k/4k/8k, unchanged quality is reused, GPU/Firefox/Fever guards hold; relief labels scale 8/12/16px with zoom.');
