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
TopicTranslations.saveSelection(topic, { originalText: 'Rain today', translatedText: 'Pluie aujourd’hui', language: 'fr', provider: 'browser' });
TopicTranslations.saveSelection(topic, { originalText: 'Rain today', translatedText: 'Pluie mise à jour', language: 'fr', provider: 'browser' });
assert.equal(TopicTranslations.selectionsForExport(topic).length, 1, 'Saving an excerpt twice should update its record');
assert.equal(topic.summary, 'Rain today', 'Saving an excerpt must preserve complete topic prose');
const exporterContext = vm.createContext({ Blob, TextEncoder, Uint8Array, DataView, TopicTranslations, topicSourceRevision });
vm.runInContext(strip(await read('lib/topic-exporter.js')) + '\nglobalThis.packageTopics = buildTopicPackage;', exporterContext);
const packaged = await exporterContext.packageTopics([topic]);
assert.ok(packaged.files.some(file => /-fr-v001\.json$/.test(file.path)));
assert.ok(packaged.files.some(file => /-en-v001\.json$/.test(file.path)));
const imported = await readTopicZip(packaged.blob);
assert.equal(imported[0].translations.fr.summary, 'FR Rain today');
assert.ok(TopicTranslations.get(imported[0], 'fr'));
assert.equal(imported[0].readingSelections[0].translatedText, 'Pluie mise à jour', 'Admin ZIP import must retain saved selection JSON');
const secondPackage = await exporterContext.packageTopics(imported);
assert.equal((await readTopicZip(secondPackage.blob))[0].readingSelections[0].originalText, 'Rain today', 'Admin re-export must retain saved selections');

let speechRequests = 0;
const voiceContext = vm.createContext({ Blob, AbortSignal, console, fetch: async (url, options) => {
  speechRequests++;
  assert.equal(url, 'https://speech.example.test');
  assert.equal(JSON.parse(options.body).response_format, 'mp3');
  return { ok: true, blob: async () => new Blob(['mp3-test'], { type: 'audio/mpeg' }) };
} });
vm.runInContext(strip(await read('lib/tts.js')) + '\nglobalThis.Voice = TTSManager;', voiceContext);
const voice = Object.create(voiceContext.Voice.prototype);
voice.settings = { aiVoiceEnabled: false };
voice.getAIVoiceConfig = () => ({ endpoint: 'https://speech.example.test', apiKey: 'test', model: 'tts-1', voice: 'alloy' });
voice.prepareTextForSpeech = text => text;
assert.equal(voice.canSaveMP3(), false, 'Browser voice must not offer MP3');
voice.settings.aiVoiceEnabled = true;
assert.equal(voice.canSaveMP3(), true);
assert.equal(speechRequests, 0, 'Checking MP3 availability must not generate or bill audio');
assert.equal((await voice.createMP3('Hello')).type, 'audio/mpeg');
const appContext = vm.createContext({ TopicTranslations, Blob });
vm.runInContext(strip((await read('app.main.js')).split('// Initialize application when DOM is ready')[0]) + '\nglobalThis.App = TopicEarthApp;', appContext);
const app = Object.create(appContext.App.prototype);
app.ttsManager = voice;
app.ttsVignetteState = { id: 1, translatedText: 'Bonjour', originalText: 'Hello', speechLang: 'fr', topic };
app.updateTTSVignette = update => Object.assign(app.ttsVignetteState, update);
let downloads = 0;
app.downloadVignetteFile = () => downloads++;
await app.saveVignetteMP3();
await app.saveVignetteMP3();
assert.equal(speechRequests, 2, 'Repeated MP3 download should reuse the audio generated by the first click');
assert.equal(downloads, 2);
app.saveVignetteJSON();
assert.equal(downloads, 3);
app.ttsVignetteState.audioBlob = null;
voice.createMP3 = async () => {
  app.ttsVignetteState = { id: 2, translatedText: 'New popup' };
  return new Blob(['old-popup-audio']);
};
await app.saveVignetteMP3();
assert.equal(downloads, 3, 'Audio from a replaced popup must not download or update the new popup');
voice.getAIVoiceConfig = () => { throw new Error('No API key'); };
assert.equal(voice.canSaveMP3(), false);

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

const globeContext = vm.createContext({ THREE: { MOUSE: { ROTATE: 0, PAN: 2 }, TOUCH: { ROTATE: 0, PAN: 1 } }, DRACOLoader: class { setDecoderPath() {} } });
vm.runInContext(strip(await read('lib/globe.js')) + '\nglobalThis.Globe = GlobeRenderer;', globeContext);
const globe = Object.create(globeContext.Globe.prototype);
globe.options = { autoRotate: true, rotationSpeed: 1 };
globe.isFocused = true;
globe.controls = { mouseButtons: { LEFT: 0, RIGHT: 2 }, touches: { ONE: 0 } };
globe.setInteractionMode('interaction');
assert.equal(globe.controls.mouseButtons.LEFT, 2);
assert.equal(globe.controls.mouseButtons.RIGHT, 0);
assert.equal(globe.controls.touches.ONE, 1, 'One-finger Drag pans the scene');
assert.equal(globe.options.autoRotate, false, 'Drag mode pauses auto-rotation');
globe.setInteractionMode('rotate');
assert.equal(globe.controls.mouseButtons.LEFT, 0);
assert.equal(globe.controls.touches.ONE, 0, 'One-finger Rotate rotates the scene');
assert.equal(globe.options.autoRotate, true, 'Rotate mode resumes auto-rotation');
assert.equal(globe.isFocused, false, 'Rotate mode releases the topic focus pause');
globe.globePointerDragged = true;
globe.onMouseClick({ button: 0 }); // Must return before any raycasting.
console.log('Translation routes, selection JSON and Admin ZIP round-trip, MP3 gating/reuse/cancellation, Fever profiles and mouse swap passed.');

const settingsContext = vm.createContext({ console });
vm.runInContext(strip(await read('lib/settings.js')) + '\nglobalThis.Settings = Settings;', settingsContext);
assert.equal(settingsContext.Settings.sanitize({ rotationSpeed: 0 }).rotationSpeed, 0);
assert.equal(settingsContext.Settings.sanitize({ rotationSpeed: 99 }).rotationSpeed, 3);
assert.equal(settingsContext.Settings.sanitize({ rotationSpeed: 'bad' }).rotationSpeed, 1);
