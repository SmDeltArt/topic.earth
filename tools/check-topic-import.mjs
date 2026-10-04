import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import { readTopicZip, readZipEntries } from '../lib/topic-importer.mjs';
const exporter = (await readFile(new URL('../lib/topic-exporter.js', import.meta.url), 'utf8')).replace(/^import[^;]+;\r?\n/gm, '').replace(/^export /gm, '');
const context = vm.createContext({ Blob, TextEncoder, Uint8Array, DataView });
vm.runInContext(exporter + '\nglobalThis.zip = createStoredZip;', context);
const topic = { id: 'sample', title: 'Review sample', category: 'regional-news', lat: 51, lon: 4, regionalScope: 'city', media: ['assets/test.png'] };
const archive = context.zip([{path:'data/custom-topics.json',data:JSON.stringify([topic])},{path:'assets/test.png',data:new Uint8Array([1,2,3])}]);
const topics = await readTopicZip(archive);
assert.equal(topics[0].review.stage, 'admin-review');
assert.equal(topics[0].topicStatus, 'browser-draft');
assert.match(topics[0].media[0], /^data:image\/png;base64,/);
assert.equal((await readTopicZip(archive))[0].id, topics[0].id);
await assert.rejects(readZipEntries(context.zip([{path:'../bad',data:'bad'}])), /Unsafe/);
await assert.rejects(readTopicZip(context.zip([{path:'data/custom-topics.json',data:JSON.stringify([{...topic,lat:999}])}])), /coordinates/);
const corrupt = new Uint8Array(await archive.arrayBuffer()); corrupt[60] ^= 1;
await assert.rejects(readZipEntries(new Blob([corrupt])), /checksum/);
// Replace a stored ZIP entry with a valid raw-deflate payload.
const stored = new Uint8Array(await context.zip([{path:'topic.json',data:JSON.stringify(topic)}]).arrayBuffer());
const v = new DataView(stored.buffer), start = 30 + v.getUint16(26,true), oldSize = v.getUint32(18,true);
const compressed = deflateRawSync(stored.slice(start,start+oldSize));
const packed = new Uint8Array(stored.length - oldSize + compressed.length);
packed.set(stored.slice(0,start)); packed.set(compressed,start); packed.set(stored.slice(start+oldSize),start+compressed.length);
const pv = new DataView(packed.buffer), central = start+compressed.length, end=packed.length-22;
pv.setUint16(8,8,true); pv.setUint32(18,compressed.length,true); pv.setUint16(central+10,8,true); pv.setUint32(central+20,compressed.length,true); pv.setUint32(end+16,central,true);
assert.equal((await readTopicZip(new Blob([packed])))[0].title,topic.title);
console.log('Stored/deflated ZIP, review status, media, stable IDs, unsafe paths, invalid coordinates and checksum checks passed.');

const appSource = await readFile(new URL('../app.main.js', import.meta.url), 'utf8');
const handlerStart = appSource.indexOf("    window.addEventListener('topicReviewPackageImported', event => {");
const handlerEnd = appSource.indexOf('    // Listen for admin mode changes', handlerStart);
let importHandler;
let canSave = true;
const status = { textContent: '' };
const app = { customPoints: [], customLayers: [],
  detailPanel: { container: { querySelector: () => status }, updateLayers() {} },
  layerPanel: { updateData() {} },
  rebuildAllLayers() { this.allLayers = this.customLayers; },
  rebuildAllPoints() { this.allPoints = this.customPoints; },
  updateMarkers() {}, updateMarkersByFilter() {}
};
const appContext = vm.createContext({
  AppAccess: { isAdminMode: () => true }, LAYERS: [],
  LocalStorage: { saveCustomPoints: () => canSave, saveCustomLayers: () => true },
  window: { addEventListener: (name, handler) => { importHandler = handler; } }
});
vm.runInContext(`globalThis.install = function() { ${appSource.slice(handlerStart, handlerEnd)} };`, appContext);
appContext.install.call(app);
importHandler({ detail: { topics } });
assert.equal(app.customPoints.length, 1);
assert.equal(app.customLayers[0].modeTabs[0], 'regional');
importHandler({ detail: { topics } });
assert.equal(app.customPoints.length, 1, 'Re-upload must not duplicate topics');
canSave = false;
importHandler({ detail: { topics: [{...topics[0], id:'another'}] } });
assert.equal(app.customPoints.length, 1, 'Storage failure must not add runtime topics');
assert.match(status.textContent, /full/);
console.log('Review import assigns Regional layers, skips re-uploads, and handles storage failure.');
