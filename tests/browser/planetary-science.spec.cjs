const {test,expect}=require('@playwright/test');
const controller='/assets/topics/planetary-boundaries/index.html';
async function ready(page){await page.goto(controller);await expect(page.locator('#message')).toHaveText('SVG loaded: 13 / 13 indicators addressable.');await page.locator('#illustration-tools').evaluate(n=>n.open=true);}
test('five keyboard tabs, verified data selection and four immutable assessment versions',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
  await expect(page.getByRole('tab')).toHaveCount(5);await expect(page.locator('#headline')).toContainText('7 of 9');
  await expect(page.locator('#view-mode')).toContainText('Scientific assessment');
  await page.getByRole('tab',{name:'Indicators & details',exact:true}).focus();
  await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Boundaries & Limits'})).toBeFocused();
  await expect(page.locator('#panel-limits')).toBeVisible();await page.keyboard.press('End');await expect(page.locator('#panel-method')).toBeVisible();
  await page.getByRole('tab',{name:'Scientific Data',exact:true}).click();await expect(page.locator('#data-content tbody tr')).toHaveCount(13);
  await expect(page.locator('#data-content')).toContainText('AOD difference (dimensionless)');
  await page.locator('#data-content [data-indicator-id="ocean_acidification"]').click();
  await expect(page.locator('#panel-status')).toBeVisible();await expect(page.locator('#scientific-detail')).toContainText('2.85');
  for(const year of [2023,2024,2025,2026]){
    await page.locator('#assessment-year').selectOption(String(year));await expect(page.locator('#headline')).toContainText(`${year<2025?6:7} of 9`);
    await expect(page.locator('#headline')).toContainText(String(year));
    const radius=await page.locator('#chart').evaluate(o=>Number(o.contentDocument.getElementById('preview-group-ocean_acidification').dataset.previewExtent));
    const q=year<2025?(2.8-3.44)/(2.75-3.44):((year===2025?2.84:2.85)-3.57)/(2.86-3.57);
    const h=(2.5-3.57)/(2.86-3.57);
    expect(radius).toBeCloseTo(year<2025?q:1+(q-1)/(h-1),5);
  }
  await page.getByRole('tab',{name:'Reports & History'}).click();await page.locator('[data-assessment-year="2023"]').click();await expect(page.locator('#history-note')).toContainText('2023.publisher');
  expect(errors).toEqual([]);
});
test('scientific export stays distinct from illustrative changes and preserves ranges and overflow',async({page})=>{
  await ready(page);await page.getByRole('spinbutton',{name:'Preview ratio percent'}).fill('50');await expect(page.locator('#view-mode')).toContainText('Manual illustration');
  const download=page.waitForEvent('download');await page.locator('#export-options').evaluate(n=>n.open=true);await page.locator('#export-download').click();const file=await download;
  const fs=require('node:fs/promises'),data=JSON.parse(await fs.readFile(await file.path(),'utf8'));
  expect(data.type).toBe('topic_earth_planetary_boundaries_export');expect(data.assessment.indicators[0].normalizedValue).toEqual({kind:'range',min:11,max:111});
  await page.locator('#return-science').click();await expect(page.locator('#view-mode')).toContainText('Scientific assessment');
  await expect(page.locator('#uncertainty')).toContainText('exceeds the visual display radius');
  const state=await page.locator('#chart').evaluate(o=>{
    const d=o.contentDocument;return {novel:d.getElementById('preview-group-novel_entities').getAttribute('fill'),core:!!d.getElementById('preview-safe-operating-space'),stroke:d.getElementById('preview-limit-circle').getAttribute('stroke-opacity')};
  });expect(state).toEqual({novel:'none',core:true,stroke:'0.05'});
});
test('SVG preflight rejects active content, duplicates, broken and external references',async({page})=>{
  await ready(page);
  const result=await page.evaluate(async()=>{
    const {validateSvgDocument}=await import('/assets/topics/planetary-boundaries/src/svg-safety.mjs');
    const parse=s=>new DOMParser().parseFromString(s,'image/svg+xml'),wrap=s=>`<svg xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
    const bad=['<script>alert(1)</script>','<foreignObject/>','<path onclick="x()"/>','<g id="a"/><g id="a"/>','<path fill="url(#missing)"/>','<use href="https://example.org/a.svg#x"/>','<image href="file:///C:/x"/>'];
    return {valid:validateSvgDocument(document.getElementById('chart').contentDocument),bad:bad.map(s=>{try{validateSvgDocument(parse(wrap(s)));return false;}catch{return true;}})};
  });expect(result.valid.ids).toBeGreaterThan(1090);expect(result.bad.every(Boolean)).toBe(true);
});
test.describe('mobile scientific panels',()=>{
test.use({viewport:{width:390,height:844},reducedMotion:'reduce'});
test('panels contain wide tables and support reduced motion and SVG keyboard selection',async({page})=>{
  await ready(page);
  for(const tab of await page.getByRole('tab').all()){
    await tab.click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole('tab',{name:'Indicators & details',exact:true}).click();
  await page.locator('#chart').evaluate(o=>{const p=o.contentDocument.getElementById('preview-group-ocean_acidification');p.focus();p.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));});
  await expect(page.locator('#selected-name')).toContainText('Ocean aragonite saturation');
});
});
test('high-risk ring is fixed, orange and aligned to per-indicator thresholds, not a universal raw ratio',async({page})=>{
  await ready(page);
  const inspect=()=>page.locator('#chart').evaluate(o=>{
    const d=o.contentDocument,pb=d.getElementById('preview-boundary-circle'),hr=d.getElementById('preview-high-risk-circle');
    return {pb:pb.getAttribute('r'),hr:hr.getAttribute('r'),cx:hr.getAttribute('cx'),pbCx:pb.getAttribute('cx'),label:d.getElementById('preview-boundary-label').textContent,stroke:hr.getAttribute('stroke'),opacity:hr.getAttribute('stroke-opacity')};
  });const before=await inspect();expect(Number(before.hr)).toBeCloseTo(2*Number(before.pb),5);expect(before.cx).toBe(before.pbCx);expect(before.label).toBe('100% PB');expect(before.stroke).toBe('#e86736');expect(Number(before.opacity)).toBeLessThan(1);
  const mapping=await page.locator('#chart').evaluate(async o=>{
    const {displayValue,thresholdDisplayRatio,highRiskRatio}=await import('/assets/topics/planetary-boundaries/src/scientific-assessments.mjs');
    const a=await(await fetch('/assets/topics/planetary-boundaries/data/assessments/assessment-2026-v1.json')).json();
    // SVGAnimatedLength exposes float32 values in Firefox; use serialized doubles.
    const d=o.contentDocument,ref=Number(d.getElementById('preview-boundary-circle').getAttribute('r')),max=Number(d.getElementById('preview-limit-circle').getAttribute('r'))/ref;
    return a.indicators.filter(i=>displayValue(i)!==null).map(i=>({id:i.id,h:highRiskRatio(i),expected:Math.min(max,thresholdDisplayRatio(i,displayValue(i)))*ref,radius:Number(d.getElementById(`preview-group-${i.id}`).dataset.previewRadius)}));
  });for(const value of mapping)expect(value.radius).toBeCloseTo(value.expected,5);
  await page.getByRole('spinbutton',{name:'Preview ratio percent'}).fill('150');expect(await inspect()).toEqual(before);
  await page.locator('#indicator-list button').filter({hasText:'Novel Entities'}).click();await expect(page.locator('#scientific-detail')).toContainText('high-risk threshold unknown');
});
