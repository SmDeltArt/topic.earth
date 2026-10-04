import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import { readTopicZip, readZipEntries, scanTopicZip } from '../lib/topic-importer.mjs';
const exporter = (await readFile(new URL('../lib/topic-exporter.js', import.meta.url), 'utf8')).replace(/^import[^;]+;\r?\n/gm, '').replace(/^export /gm, '');
const context = vm.createContext({ Blob, TextEncoder, Uint8Array, DataView });
vm.runInContext(exporter + '\nglobalThis.zip = createStoredZip;', context);
const topic = { id: 'sample', title: 'Review sample', category: 'regional-news', lat: 51, lon: 4, regionalScope: 'city', media: ['assets/test.png'] };
const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
const archive = context.zip([{path:'data/custom-topics.json',data:JSON.stringify([topic])},{path:'assets/test.png',data:png}]);
const topics = await readTopicZip(archive);
assert.equal(topics[0].review.stage, 'admin-review');
assert.equal(topics[0].topicStatus, 'browser-draft');
assert.match(topics[0].media[0], /^data:image\/png;base64,/);
assert.equal((await readTopicZip(archive))[0].id, topics[0].id);
const namedArchive = new File([archive], 'topics-260104.zip', { type: 'application/zip' });
const namedTopic = (await readTopicZip(namedArchive))[0];
assert.equal(namedTopic.storage.sourceZipName, 'topics-260104.zip');
assert.match(namedTopic.storage.sourceZipDateYYMMDD, /^\d{6}$/);
assert.ok(Number.isFinite(Date.parse(namedTopic.storage.sourceZipImportedAt)));
const storageSource = (await readFile(new URL('../lib/storage.js', import.meta.url), 'utf8')).replace(/^export /gm, '');
const storageContext = vm.createContext({ Date, URL, Blob, console });
vm.runInContext(storageSource + '\nglobalThis.Storage = LocalStorage;', storageContext);
assert.equal(storageContext.Storage.compactTopicStorage(namedTopic.storage).sourceZipName, 'topics-260104.zip', 'Browser storage must retain the ZIP name');
assert.equal(storageContext.Storage.compactTopicStorage(namedTopic.storage).sourceZipDateYYMMDD, namedTopic.storage.sourceZipDateYYMMDD);
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

const topicFile = { path: 'topic.json', data: JSON.stringify(topic) };
for (const [path, data] of [['attack.js', 'alert(1)'], ['nested.zip', 'PK'], ['malware.exe', 'MZ'], ['fake.png', '<script>alert(1)</script>']]) {
  const scan = await scanTopicZip(context.zip([topicFile, { path, data }]));
  assert.equal(scan.report.passed, false, path);
  assert.equal(scan.topics.length, 0);
  assert.equal(scan.report.files.find(file => file.path === path).status, 'blocked');
}
for (const insight of ['<img src=x onerror="alert(1)">', '<script>alert(1)</script>', '<a href="jav&#x61;script:alert(1)">link</a>', '<style>@import "evil";</style>']) {
  await assert.rejects(readTopicZip(context.zip([{path:'topic.json',data:JSON.stringify({...topic, insight})}])), /Active|Unsafe/);
}
const legacy = await scanTopicZip(context.zip([topicFile, {path:'data/custom-topics.js',data:'export default [];'}]));
assert.equal(legacy.report.passed, true);
assert.equal(legacy.report.files[1].status, 'ignored');
assert.equal(legacy.report.expandedBytes, new TextEncoder().encode(topicFile.data).length + 18);
const oversized = await scanTopicZip(context.zip([topicFile, {path:'notes.txt',data:'x'.repeat(2*1024*1024+1)}]));
assert.equal(oversized.report.passed, false);
const invalidJson = await scanTopicZip(context.zip([topicFile, {path:'bad.json',data:'{nope'}]));
assert.equal(invalidJson.report.passed, false);
const unsafeProperty = await scanTopicZip(context.zip([topicFile, {path:'bad.json',data:'{"__proto__":{}}'}]));
assert.equal(unsafeProperty.report.passed, false);
const passive = await readTopicZip(context.zip([{path:'topic.json',data:JSON.stringify({...topic, insight:'<p class="x" style="position:fixed">Safe <strong>prose</strong></p>'})}]));
assert.equal(passive[0].insight, '<p>Safe <strong>prose</strong></p>');
console.log('Local ZIP report, code exclusion, active HTML/URL rejection, media signatures, per-file limits and passive prose checks passed.');

const panelSource = (await readFile(new URL('../components/DetailPanel.js', import.meta.url), 'utf8')).replace(/^import[\s\S]*?;\r?\n/gm, '').replace(/^export /gm, '');
let imports = 0;
const panelContext = vm.createContext({ scanTopicZip, CustomEvent: class { constructor(type, options) { this.detail = options.detail; } },
  window: { dispatchEvent: () => imports++ }, LocalStorage: {} });
vm.runInContext(panelSource + '\nglobalThis.Panel = DetailPanel;', panelContext);
const panel = Object.create(panelContext.Panel.prototype);
const scanStatus = { textContent: '' }, reportNode = { innerHTML: '', isConnected: true }, importButton = { hidden: true };
panel.isAdminMode = () => true;
panel.container = { querySelector: selector => selector === '#admin-topic-export-status' ? scanStatus : selector === '#topic-zip-scan-report' ? reportNode : importButton };
const input = { files: [context.zip([{path:'topic.json',data:JSON.stringify({...topic,media:[]})}])], isConnected: true };
await panel.importTopicZip(input);
assert.equal(imports, 0, 'Passing a scan must not import before the review action');
assert.equal(importButton.hidden, false);
assert.match(reportNode.innerHTML, /Local checks passed/);
await panel.importScannedTopicZip(importButton);
assert.equal(imports, 1);
input.files = [context.zip([topicFile, {path:'evil.js',data:'alert(1)'}])];
await panel.importTopicZip(input);
assert.equal(importButton.hidden, true);
assert.equal(panel.pendingTopicZip, null);
assert.match(reportNode.innerHTML, /Import blocked/);
await panel.importScannedTopicZip(importButton);
assert.equal(imports, 1, 'Blocked archives cannot reach import');
console.log('Admin scan-before-import flow and blocked-archive gating passed.');

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
