import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../lib/globe.js', import.meta.url), 'utf8');
const helper = source.match(/const loadModelWithFallback = async[\s\S]*?\n};/)[0];
const load = vm.runInNewContext(`${helper}\nloadModelWithFallback`, {
 MODEL_ASSET_BASE: './assets/models',
 assetPath: (base, file) => `https://unavailable.example/${file}`
});
for (const file of ['amoc_circular_overlay.glb', 'tipping_point_circular.glb']) {
 const requests = [];
 const model = {scene: {name: file}};
 const loader = {load(path, success, progress, failure) {
  requests.push(path);
  path.startsWith('https:') ? failure(new Error('CDN unavailable')) : success(model);
 }};
 assert.equal(await load(loader, file), model);
 assert.deepEqual(requests, [`https://unavailable.example/${file}`, `./assets/models/${file}`]);
 const failed = {load(path, success, progress, failure) {failure(new Error('All sources failed'));}};
 await assert.rejects(load(failed, file), /All sources failed/);
}
console.log('Fever overlay models fall back to packaged GLBs; total failure still propagates.');
