import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PLANETARY_BOUNDARIES_TOPICS} from '../data/planetary-boundaries-topic.mjs';
import {translationIsCurrent} from '../lib/topic-translations.mjs';
import {validateAssessment,normalized,freezeAssessment,displayValue,highRiskRatio,thresholdDisplayRatio,riskZone} from '../assets/topics/planetary-boundaries/src/scientific-assessments.mjs';
const root=new URL('../assets/topics/planetary-boundaries/data/',import.meta.url);
const registry=JSON.parse(await readFile(new URL('assessment-registry.json',root)));
const map=JSON.parse(await readFile(new URL('indicator-map.json',root)));
const snapshots=new Map();
for(const entry of registry.assessments){
  const bytes=await readFile(new URL(entry.file,root)),a=JSON.parse(bytes);
  snapshots.set(entry.year,a);
  test(`${entry.year} preserves its 13 indicators, nine classifications and pinned file digest`,()=>{
    validateAssessment(a,map.map(i=>i.id));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
    assert.equal(a.boundaries.filter(b=>b.status==='exceeded').length,entry.year<2025?6:7);
    assert.equal(a.indicators.find(i=>i.id==='novel_entities').normalizedValue,null);
  });
}
const latest=snapshots.get(2026),get=id=>latest.indicators.find(i=>i.id.includes(id));
test('normalization handles lower-is-worse, nonzero freshwater baselines and ranges without division by zero',()=>{
  assert.equal(get('co2').normalizedValue.value,(426-280)/(350-280));
  assert.equal(get('land_system').normalizedValue.value,(64-100)/(78-100));
  assert.equal(get('ocean_acidification').normalizedValue.value,(2.85-3.57)/(2.86-3.57));
  assert.equal(get('blue_water').normalizedValue.value,(22.6-10.3)/(12.9-10.3));
  assert.notEqual(get('blue_water').normalizedValue.value,22.6/12.9);
  assert.deepEqual(get('functional_diversity').normalizedValue,{kind:'range',min:2.1,max:3});
  assert.equal(displayValue(get('functional_diversity')),2.1);
  assert.equal(normalized(get('novel_entities')),null);
  for(const i of latest.indicators.filter(i=>i.normalizationMethod!=='unquantified')) {
    assert.equal(normalized({...i,observed:{kind:'point',value:i.referenceValue}}).value,0);
    assert.equal(normalized({...i,observed:{kind:'point',value:i.boundaryValue}}).value,1);
  }
});
test('historical method revisions stay separate and frozen',()=>{
  const old=snapshots.get(2023),water=a=>a.indicators.find(i=>i.id.includes('blue_water'));
  assert.equal(water(old).referenceValue,9.4);assert.equal(water(latest).referenceValue,10.3);
  assert.equal(old.indicators.find(i=>i.id.includes('radiative_forcing')).observed.value,2.91);
  const frozen=freezeAssessment(structuredClone(latest));
  assert.throws(()=>{frozen.indicators[0].observed.min=200;},TypeError);
});
test('HANPP keeps assessment, observation, source value and project-derived ratio distinct',()=>{
  const hanpp=year=>snapshots.get(year).indicators.find(i=>i.id==='biosphere_integrity__functional_diversity');
  assert.deepEqual([2023,2024,2025].map(year=>hanpp(year).observed),[
    {kind:'point',value:30},{kind:'point',value:30},{kind:'point',value:30}
  ]);
  assert.deepEqual([2023,2024,2025,2026].map(year=>hanpp(year).referenceValue),[1.9,1.9,0,0]);
  assert.deepEqual(hanpp(2026).observed,{kind:'range',min:21,max:30});
  assert.deepEqual(hanpp(2026).normalizedValue,{kind:'range',min:2.1,max:3});
  assert.equal(hanpp(2026).observationPeriod,'1910–2010');
  assert.equal(displayValue(hanpp(2026)),2.1);
});
test('each known high-risk threshold maps to the same visual ring using a different scientific ratio',()=>{
  const known=latest.indicators.filter(i=>i.upperRiskThreshold!==null);
  assert.ok(new Set(known.map(highRiskRatio)).size>6);
  for(const indicator of known){
    const h=highRiskRatio(indicator);assert.ok(h>1);
    assert.equal(thresholdDisplayRatio(indicator,0),0);
    assert.equal(thresholdDisplayRatio(indicator,.5),.5);
    assert.equal(thresholdDisplayRatio(indicator,1),1);
    assert.equal(thresholdDisplayRatio(indicator,h),2);
    assert.ok(thresholdDisplayRatio(indicator,h+.5)>2);
    assert.equal(riskZone({...indicator,normalizedValue:{kind:'point',value:h}}),'High-Risk Zone');
    assert.equal(riskZone({...indicator,normalizedValue:{kind:'point',value:(1+h)/2}}),'Zone of Increasing Risk');
  }
  const novel=get('novel_entities');assert.equal(highRiskRatio(novel),null);assert.match(riskZone(novel),/unknown/);
  const unknownOcean=snapshots.get(2023).indicators.find(i=>i.id==='ocean_acidification');
  assert.equal(thresholdDisplayRatio(unknownOcean,1.5),1.5);assert.match(riskZone({...unknownOcean,normalizedValue:{kind:'point',value:1.5}}),/unknown/);
});
test('validation rejects mixed years, tampered ratios, unsafe source URLs, missing channels and invalid values',()=>{
  for(const mutate of [a=>a.indicators.pop(),a=>a.indicators[0].assessmentYear=2024,a=>a.indicators[0].normalizedValue.min=5,a=>a.source.url='javascript:alert(1)',a=>a.indicators[0].observed.min=-2,a=>a.indicators[0].observed.max=1,a=>a.indicators[1].referenceValue=a.indicators[1].boundaryValue,a=>a.indicators[0].id='unknown']){
    const copy=structuredClone(latest);mutate(copy);assert.throws(()=>validateAssessment(copy,map.map(i=>i.id)));
  }
});
test('packaged language records use topic.earth source revisions and complete stable SVG/indicator keys',async()=>{
  const topic=PLANETARY_BOUNDARIES_TOPICS[0],catalogs=[];
  for(const language of ['en','fr','nl','de']){
    const record=JSON.parse(await readFile(new URL(`../assets/topics/planetary-boundaries/translations/${language}.json`,import.meta.url)));
    assert.ok(translationIsCurrent(record,topic,language));assert.ok(topic.translationFiles[language]);
    assert.equal(Object.keys(record.visualization.indicators).length,13);assert.equal(Object.keys(record.visualization.boundaries).length,9);
    assert.ok(record.visualization.svgLabels.g722.lines.length);assert.equal(Object.keys(record.visualization.assessmentText).length,4);catalogs.push(record);
  }
  for(const record of catalogs.slice(1))assert.deepEqual(Object.keys(record.visualization.ui),Object.keys(catalogs[0].visualization.ui));
});
