import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildCaptionEmbedUrl, normalizeVideoLanguage } from '../lib/video-captions.mjs';

const root = new URL('../', import.meta.url);
const load = async path => import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL(path, root), 'utf8')).toString('base64')}`);
const { Settings } = await load('lib/settings.js');
const media = await load('lib/media-utils.js');
const stored = new Map();
globalThis.localStorage = {
  getItem: key => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, value),
  removeItem: key => stored.delete(key)
};
assert.equal(Settings.get().videoCaptionsFollowUi, true);
Settings.set({ videoCaptionsFollowUi: false });
assert.equal(Settings.get().videoCaptionsFollowUi, false);
Settings.update('uiLanguage', 'fr');
assert.equal(Settings.get().videoCaptionsFollowUi, false);
Settings.reset();
assert.equal(Settings.get().videoCaptionsFollowUi, true);

const youtube = 'https://www.youtube-nocookie.com/embed/fsfq-OuB5sI?start=12';
let result = new URL(buildCaptionEmbedUrl(youtube, { uiLanguage: 'nl', videoLanguage: 'fr' }));
assert.equal(result.searchParams.get('cc_lang_pref'), 'nl');
assert.equal(result.searchParams.get('cc_load_policy'), '1');
assert.equal(result.searchParams.get('hl'), 'nl');
assert.equal(result.searchParams.get('start'), '12');
assert.equal(result.searchParams.has('tlang'), false);
result = new URL(buildCaptionEmbedUrl(youtube, { uiLanguage: 'fr-BE', videoLanguage: 'fr-FR' }));
assert.equal(result.searchParams.get('cc_lang_pref'), 'fr-fr');
assert.equal(result.searchParams.get('hl'), 'fr-be');
assert.equal(new URL(buildCaptionEmbedUrl(youtube, { uiLanguage: '' })).searchParams.get('cc_lang_pref'), 'en');
assert.equal(buildCaptionEmbedUrl(youtube, { enabled: false }), youtube);
const vimeo = 'https://player.vimeo.com/video/123456?h=privatehash&autoplay=0';
result = new URL(buildCaptionEmbedUrl(vimeo, { uiLanguage: 'nl' }));
assert.equal(result.searchParams.get('texttrack'), 'nl');
assert.equal(result.searchParams.get('h'), 'privatehash');
assert.equal(result.searchParams.get('autoplay'), '0');
assert.equal(new URL(buildCaptionEmbedUrl(vimeo, { uiLanguage: 'en-US', videoLanguage: 'en' })).searchParams.get('texttrack'), 'en');
for (const url of ['https://example.com/video', 'https://www.youtube.com.evil.test/embed/fsfq-OuB5sI', 'javascript:alert(1)', 'bad url']) {
  assert.equal(buildCaptionEmbedUrl(url), url);
}
assert.equal(normalizeVideoLanguage('en_US'), 'en-us');
assert.equal(normalizeVideoLanguage('<script>'), '');
assert.equal(media.normalizeMediaToken({ url: youtube, videoLanguage: 'fr' }).videoLanguage, 'fr');

// Exercise the real panel methods without constructing the globe or UI.
const panelSource = (await readFile(new URL('components/DetailPanel.js', root), 'utf8'))
  .replace(/^import[\s\S]*?;\n/gm, '')
  .replace('export class DetailPanel', 'class DetailPanel');
const context = vm.createContext({
  URL, Settings, buildCaptionEmbedUrl,
  window: { location: { href: 'https://topic.earth/?mode=main' } },
  LanguageManager: { detectBrowserLanguage: () => 'nl' },
  getTopicMediaTokensForPoint: media.getMediaTokensForPoint,
  normalizeTopicMediaToken: media.normalizeMediaToken
});
vm.runInContext(`${panelSource}\nglobalThis.Panel = DetailPanel;`, context);
const panel = Object.create(context.Panel.prototype);
panel.currentPoint = { researchSources: [{ url: 'https://www.youtube.com/watch?v=fsfq-OuB5sI', videoLanguage: 'fr' }] };
panel.topicSources = [];
Settings.set({ autoDetectLanguage: false, uiLanguage: 'fr-BE' });
assert.equal(new URL(panel.getCaptionEmbedUrl(youtube)).searchParams.get('cc_lang_pref'), 'fr');
Settings.set({ autoDetectLanguage: false, uiLanguage: 'nl', translationLanguage: 'de' });
assert.equal(new URL(panel.getCaptionEmbedUrl(youtube)).searchParams.get('cc_lang_pref'), 'nl');
Settings.set({ autoDetectLanguage: true, detectedBrowserLanguage: null });
assert.equal(new URL(panel.getCaptionEmbedUrl(vimeo)).searchParams.get('texttrack'), 'nl');
const frame = panel.renderMediaTokenImage({ url: youtube, embedUrl: youtube, mediaType: 'iframe', videoLanguage: 'fr' });
assert.ok(frame.includes('cc_lang_pref=nl'));
let zoomPanel;
const content = { querySelector: selector => selector === '#topic-media-zoom-panel' ? zoomPanel : null };
const section = { closest: () => section };
content.querySelector = selector => selector === '#topic-media-zoom-panel' ? zoomPanel : selector === '.topic-media-grid' ? section : null;
panel.container = { querySelector: () => content };
zoomPanel = { innerHTML: '', classList: { remove() {} }, scrollIntoView() {} };
panel.showTopicMediaZoom(youtube, 'Video');
assert.ok(zoomPanel.innerHTML.includes('cc_lang_pref=nl'));
Settings.set({ videoCaptionsFollowUi: false });
panel.showTopicMediaZoom(youtube, 'Video');
assert.ok(!zoomPanel.innerHTML.includes('cc_load_policy'));
console.log('PASS: settings persistence/reset, UI and browser language, original-language rule, YouTube/Vimeo preferences, private Vimeo hash, unsupported URLs, saved metadata, inline and zoom players.');
