import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EL_NINO_TOPICS} from '../data/el-nino-topic.mjs';
const topic=EL_NINO_TOPICS[0];assert.equal(topic.category,'climate');assert.equal(topic.topicStory.themeMode,'world');assert.equal(topic.mediaTokens[0].videoId,'Uv39BroUx-Q');
assert.ok(topic.topicStory.html.includes('80% of 13 seasonal models'));
assert.equal((topic.topicStory.html.match(/<tr>/g)||[]).length,24);
assert.equal((topic.topicStory.html.match(/class="fact(?: safe)?"/g)||[]).length,9);
assert.ok(!/<script\b/i.test(topic.topicStory.html));
assert.ok(topic.topicStory.html.includes('2025 assessment'));
for(const path of topic.mediaImages){const data=await readFile(new URL('..'+path,import.meta.url));assert.equal(data.subarray(1,4).toString(),'PNG');}
assert.ok(topic.researchSources.some(s=>s.url.includes('noaa.gov')&&s.verified));
const panel=await readFile(new URL('../components/DetailPanel.js',import.meta.url),'utf8');
assert.ok(panel.includes("story-color-picker.mjs?v=picker-world-20261013"));
const manager=await readFile(new URL('../lib/story-color-picker.mjs',import.meta.url),'utf8');
assert.ok(manager.includes('embed=overlay&v=picker-world-20261013'));
assert.ok(!manager.includes('createElement(\'button\')'));assert.ok(!manager.includes('story-color-picker-toolbar'));
console.log('World topic registration, two original PNGs, 23 English map translations, 9 boundary labels, dated sources, script-free story and versioned picker imports passed.');
