import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CONFERENCES,OBSERVATIONS,progressComparison} from '../assets/topics/planetary-boundaries/data/cop-conferences.mjs';
import {PLANETARY_BOUNDARIES_TOPICS} from '../data/planetary-boundaries-topic.mjs';
import {topicSourceRevision} from '../lib/topic-translations.mjs';

test('COP21–COP31 use an explicit map with no 2020 conference and pending COP31',()=>{
  assert.deepEqual(CONFERENCES.map(c=>[c.number,c.year]),[[21,2015],[22,2016],[23,2017],[24,2018],[25,2019],[26,2021],[27,2022],[28,2023],[29,2024],[30,2025],[31,2026]]);
  assert.equal(CONFERENCES.at(-1).status,'pending');assert.equal(CONFERENCES.at(-1).adoptedOn,undefined);
  for(const c of CONFERENCES){assert.ok(c.start<c.end);for(const k of ['location','agreements','commitments','implementation','gaps','checkedAt'])assert.ok(c[k]);assert.ok(c.sources.every(s=>s.url.startsWith('https://')&&s.checkedAt));assert.equal(c.normalizedValue,undefined);}
});
test('only a comparable observation can indicate improvement; regional ozone is not a global PB claim',()=>{
  const ozone=OBSERVATIONS[0];assert.deepEqual(progressComparison(ozone),{comparable:true,improved:true,difference:-.9});assert.equal(ozone.globalBoundaryMeasurement,false);assert.equal(ozone.attributableToCop,false);
  for(const changed of [{kind:'policy'},{kind:'projection'},{comparable:false},{latest:{...ozone.latest,unit:'DU'}},{previous:null}])assert.equal(progressComparison({...ozone,...changed}).improved,false);
  assert.equal(progressComparison(OBSERVATIONS[1]).improved,false);
});
test('topics are independent and share the single SVG/controller and scientific registries',()=>{
  assert.equal(PLANETARY_BOUNDARIES_TOPICS.length,2);const [monitor,cop]=PLANETARY_BOUNDARIES_TOPICS;
  assert.equal(monitor.id,'planetary-boundaries-monitor');assert.equal(cop.id,'planetary-boundaries-cop');
  assert.equal(cop.category,monitor.category);assert.deepEqual(cop.mediaImages,monitor.mediaImages);
  assert.equal(cop.scientificVisualization.assessmentRegistryUrl,monitor.scientificVisualization.assessmentRegistryUrl);
  assert.equal(new URL(cop.mediaTokens[0].embedUrl,'https://example.invalid').searchParams.get('topic'),'cop');
  assert.equal(new URL(monitor.mediaTokens[0].embedUrl,'https://example.invalid').search,'');
});
test('COP translation JSON follows the existing topic translation contract',async()=>{
  const topic=PLANETARY_BOUNDARIES_TOPICS[1];let keys;
  for(const language of ['en','fr','nl','de']){const record=JSON.parse(await readFile(new URL(`../assets/topics/planetary-boundaries/translations/cop-${language}.json`,import.meta.url),'utf8'));
    assert.equal(record.sourceRevision,topicSourceRevision(topic));assert.equal(record.language,language);assert.equal(record.cop.conferenceProseLanguage,language==='fr'?'fr':'en');
    if(keys)assert.deepEqual(Object.keys(record.cop.ui),keys);else keys=Object.keys(record.cop.ui);
  }
});
