import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildFeverAudioText, getFeverSpeedProfile } from '../lib/fever-audio-manifest.mjs';
const source = (await readFile(new URL('../lib/tts.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/m, '').replace('export class TTSManager', 'class TTSManager');
const context = { window: { fetch: true, Audio: true }, console, setTimeout, clearTimeout };
vm.runInNewContext(source + '\nthis.TTSManager = TTSManager;', context);
const tts = Object.create(context.TTSManager.prototype);
const manifest = JSON.parse(await readFile(new URL('../assets/audio/read-messages/manifest.json', import.meta.url), 'utf8'));
tts.loadReadAudioManifest = async () => ({ messages: [
  { id: 'normal-en', lang: 'en-US', text: 'Recorded text with values.', webm: 'normal.webm' },
  ...manifest.messages
] });
tts.findFirstReadableUrl = async urls => urls[0];
// Exact recording IDs must not wait for unrelated remote CSV translations.
tts.resolveManifestMessageText = async () => { throw Error('Exact recording lookup fetched unrelated text'); };
const normal = await tts.findCachedAudio('Different live warning copy.', 'en-US', { cacheId: 'normal-en' });
assert.equal(normal.id, 'normal-en');
assert.equal(normal.format, 'webm');
const short = await tts.findCachedAudio('Title.', 'fr-FR', {
  cacheId: 'fever-loop-objective-2025-message-fr', audioFormats: ['mp3']
});
assert.equal(short.format, 'mp3');
assert.ok(short.urls[0].startsWith('./assets/audio/'));
assert.equal(getFeverSpeedProfile(2 / 3), 'normal');
assert.equal(getFeverSpeedProfile(5 / 6), 'short');
assert.equal(buildFeverAudioText({title:'Message only',text:'Long warning.',milestone:{temperatureDeltaC:2,tippingRiskPct:40},speed:5/6}), 'Message only.');
assert.equal(manifest.messages.filter(m => m.tags?.includes('fever-message-only')).length, 168);
// Missing fast recordings must never fall through to browser or paid speech.
Object.assign(tts, {settings:{ttsEnabled:true,aiVoiceEnabled:true},speakRequestId:0,
  isManualSpeechHoldActive:()=>false, stop(){this.speakRequestId++;},
  speakWithCachedAudio:async()=>false,
  speakWithBrowser(){throw Error('Unexpected live browser speech');},
  speakWithAIVoice(){throw Error('Unexpected paid speech');}
});
await tts.speak('Missing clip.', 'en-US', {channel:'fever',recordedOnly:true});
// Milestone changes must not interrupt a recording already playing.
tts.currentAudio={ended:false};
tts.speakWithCachedAudio=async()=>{throw Error('Recording interrupted');};
assert.equal(await tts.speak('Next clip.', 'en-US',{channel:'fever',preserveFeverPlayback:true}), false);
console.log('Fever recording selection, speed profiles, MP3 routing and speech guards passed.');
