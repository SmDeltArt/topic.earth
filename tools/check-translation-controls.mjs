import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { TopicTranslations, topicSourceRevision, plainTopicText } from '../lib/topic-translations.mjs';
import { readTopicZip } from '../lib/topic-importer.mjs';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const strip = source => source.replace(/^import[\s\S]*?;\r?\n/gm, '').replace(/^export /gm, '');
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) };
const context = vm.createContext({ TextEncoder, URL, AbortSignal, console, setTimeout, clearTimeout,
  CustomEvent: class {}, LanguageManager: {
    normalizeLanguageCode: lang => lang.split('-')[0], getSpeechCode: lang => lang,
    getLanguageInfo: lang => ({ name: lang, nativeName: lang })
  } });
vm.runInContext(strip(await read('lib/read-translation.js')) + '\nglobalThis.Service = ReadTranslationService;', context);
const service = context.Service;
service.tryCsvTranslation = async () => '';
service.tryBrowserTranslation = async () => '';
let remote = 0;
context.fetch = async url => {
  remote++;
  assert.ok(new TextEncoder().encode(url.searchParams.get('q')).length <= 500);
  assert.equal(url.searchParams.get('langpair'), 'en|fr');
  return { ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText: 'Bonjour le monde' } }) };
};
assert.equal((await service.translateText('Hello world', 'fr', { allowFreeApi: true })).provider, 'mymemory');
assert.equal(remote, 1);
assert.equal((await service.translateText('Hello world', 'fr', { localOnly: true })).provider, 'original');
assert.equal(remote, 1, 'Local-only must not reuse external cache or make a request');
context.fetch = async () => ({ ok: true, json: async () => ({ responseStatus: 429, quotaFinished: true }) });
assert.equal((await service.translateText('Quota example', 'fr', { allowFreeApi: true })).provider, 'original');
const chunks = service.splitTranslationText('🌍'.repeat(300));
assert.equal(chunks.join(''), '🌍'.repeat(300));
assert.ok(chunks.every(chunk => new TextEncoder().encode(chunk).length <= 500));
context.LanguageDetector = { create: async () => ({ detect: async () => [{ detectedLanguage: 'fr', confidence: 1 }], destroy() {} }) };
service.tryBrowserTranslation = async () => 'Hello';
assert.equal((await service.translateText('Bonjour', 'en')).text, 'Hello', 'English must also be a translation target');
context.LanguageDetector = undefined;
service.tryBrowserTranslation = async () => '';
let linked = 0;
context.ourEarthAI = { getSummary: () => ({ textProvider: 'ollama' }), createChatCompletion: async () => { linked++; return { content: 'Bonjour depuis Ollama' }; } };
assert.equal((await service.translateText('Local model example', 'fr', { allowFreeApi: true })).provider, 'ai');
assert.equal(linked, 1);

const topic = { id: 'sample', title: 'Hello', summary: 'Rain today', insight: '', category: 'regional-news', lat: 51, lon: 4 };
let calls = 0;
const mockService = { translateText: async text => { calls++; return { text: `FR ${text}`, provider: 'browser' }; } };
await TopicTranslations.translate(topic, 'fr', mockService);
await TopicTranslations.translate(topic, 'fr', mockService);
assert.equal(calls, 2, 'Repeat topic translation should use saved fields');
assert.equal(TopicTranslations.get({ ...topic, summary: 'New rain values' }, 'fr'), null, 'Live updates must invalidate translation');
assert.equal(plainTopicText('<p>Rain</p><p>Wind</p>'), 'Rain Wind ');
const exporterContext = vm.createContext({ Blob, TextEncoder, Uint8Array, DataView, TopicTranslations, topicSourceRevision });
vm.runInContext(strip(await read('lib/topic-exporter.js')) + '\nglobalThis.packageTopics = buildTopicPackage;', exporterContext);
const packaged = await exporterContext.packageTopics([topic]);
assert.ok(packaged.files.some(file => /-fr-v001\.json$/.test(file.path)));
assert.ok(packaged.files.some(file => /-en-v001\.json$/.test(file.path)));
const imported = await readTopicZip(packaged.blob);
assert.equal(imported[0].translations.fr.summary, 'FR Rain today');
assert.ok(TopicTranslations.get(imported[0], 'fr'));

const panelContext = vm.createContext({ Settings: { get: () => ({ translationLanguage: 'fr' }) },
  LanguageManager: context.LanguageManager, TopicTranslations, plainTopicText,
  buildFeverAudioText: ({ text, milestone }) => `${text} metric ${milestone.temperatureDeltaC}` });
vm.runInContext(strip(await read('components/DetailPanel.js')) + '\nglobalThis.Panel = DetailPanel;', panelContext);
const panel = Object.create(panelContext.Panel.prototype);
panel.currentGlobe = { feverSpeed: 2 / 3 };
panel.getScenarioMilestoneData = () => ({ temperatureDeltaC: 3 });
assert.equal(panel.shouldAutoNarrateFeverMessages(), true);
assert.equal(panel.getFeverNarrationText({ text: 'Fever message', language: 'en' }), 'Fever message');
panel.currentGlobe.feverSpeed = 1 / 3;
assert.match(panel.getFeverNarrationText({ text: 'Fever message', language: 'en' }), /metric 3/);
panel.currentGlobe.feverSpeed = 1;
assert.equal(panel.shouldAutoNarrateFeverMessages(), false);

const globeContext = vm.createContext({ THREE: { MOUSE: { ROTATE: 0, PAN: 2 } }, DRACOLoader: class { setDecoderPath() {} } });
vm.runInContext(strip(await read('lib/globe.js')) + '\nglobalThis.Globe = GlobeRenderer;', globeContext);
const globe = Object.create(globeContext.Globe.prototype);
globe.controls = { mouseButtons: { LEFT: 0, RIGHT: 2 } };
globe.setInteractionMode('interaction');
assert.equal(globe.controls.mouseButtons.LEFT, 2);
assert.equal(globe.controls.mouseButtons.RIGHT, 0);
globe.setInteractionMode('rotate');
assert.equal(globe.controls.mouseButtons.LEFT, 0);
globe.globePointerDragged = true;
globe.onMouseClick({ button: 0 }); // Must return before any raycasting.
console.log('Translation routes, quota fallback, Unicode splitting, cache invalidation, language ZIP round-trip, Fever profiles and mouse swap passed.');
