const {test,expect}=require('@playwright/test');
const {prepare,start}=require('./helpers.cjs');
const path='/assets/topics/planetary-boundaries/index.html';
const readChart=async page=>page.locator('#chart').evaluate(o=>[...o.contentDocument.querySelectorAll('[data-preview-geometry]')].map(n=>[n.id,n.getAttribute('d'),n.dataset.scientificRatio]));
async function ready(page,suffix=''){await page.goto(path+suffix);await expect(page.locator('#message')).toContainText('SVG loaded: 13 / 13');}

test('both topics share the SVG; conference changes never change scientific measurements or geometry',async({page})=>{
  await ready(page);await expect(page.locator('#assessment-year')).toBeVisible();await expect(page.locator('#cop-conference')).toHaveCount(0);
  for(const year of ['2023','2024','2025','2026']){await page.locator('#assessment-year').selectOption(year);await expect(page.locator('#headline')).toContainText(year);}
  const baseline=await readChart(page);
  await ready(page,'?topic=cop');await expect(page.locator('#assessment-year')).toBeHidden();await expect(page.locator('#cop-conference option')).toHaveCount(11);
  await expect(page.locator('#cop-status')).toContainText('Pending official adoption');
  for(let n=21;n<=31;n++){await page.locator('#cop-conference').selectOption(`cop${n}`);await expect(page.locator('#cop-content h2')).toContainText(`COP${n}`);expect(await readChart(page)).toEqual(baseline);await expect(page.locator('#cop-backdrop')).toContainText('2026');}
  expect(await page.locator('#cop-conference').textContent()).not.toContain('2020');
  await page.locator('#cop-progress').check();await expect(page.locator('#cop-values-antarctic-ozone-seasonal-area')).toContainText('-0.9 million km²');
  expect(await readChart(page)).toEqual(baseline);
  await expect.poll(()=>page.locator('#chart').evaluate(o=>o.contentDocument.querySelectorAll('[data-progress-indicator]').length)).toBe(1);
  await page.locator('#cop-monitoring').getByRole('button',{name:'Select corresponding indicator'}).first().click();await expect(page.locator('#selected-name')).toContainText('ozone');
  await page.locator('#cop-progress').uncheck();expect(await page.locator('#chart').evaluate(o=>o.contentDocument.querySelectorAll('[data-progress-indicator]').length)).toBe(0);
});
test('SVG and indicator sidebar share embedded and full contexts without modifying coordinates',async({page})=>{
  for(const suffix of ['', '?topic=cop']){
    await ready(page,suffix);const geometry=await readChart(page);
    for(const full of [false,true]){
      await page.evaluate(value=>document.documentElement.classList.toggle('topic-full-view',value),full);
      const chart=await page.locator('#chart-stage').boundingBox(),rail=await page.locator('#panel-status').boundingBox();
      if(page.viewportSize().width>520)expect(rail.x).toBeGreaterThanOrEqual(chart.x+chart.width);
      else expect(rail.y).toBeGreaterThanOrEqual(chart.y+chart.height);
      await expect(page.locator('#indicator-list')).toBeVisible();
      expect(await readChart(page)).toEqual(geometry);
    }
  }
});
test('COP exports preserve assessment, conference, observation scope and progress annotations',async({page})=>{
  await ready(page,'?topic=cop&cop=cop26');await page.locator('#cop-progress').check();await page.locator('#export-options').evaluate(n=>n.open=true);
  const pending=page.waitForEvent('download');await page.locator('#export-download').click();const download=await pending;
  const fs=require('node:fs/promises'),bundle=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  expect(bundle.topic.id).toBe('planetary-boundaries-cop');expect(bundle.copContext.conference.year).toBe(2021);expect(bundle.assessment.assessmentYear).toBe(2026);
  expect(bundle.assessment.indicators).toHaveLength(13);expect(bundle.copContext.observations[0].globalBoundaryMeasurement).toBe(false);
  expect(bundle.artwork.sanitizedSvg).toContain('cop-progress-markers');expect(bundle.artwork.sanitizedSvg).not.toContain('preview-interaction-layer');
  await page.locator('#topic-language').selectOption('fr');await expect(page.locator('h1')).toHaveText('COP21 → COP31 — Engagements et réalisations');await expect(page.locator('#cop-status')).toContainText('Vérifié');
  await page.locator('#cop-conference').selectOption('cop31');await expect(page.locator('#cop-status')).toContainText('En attente');
});
test('both World layer topics are visible and independently navigable',async({page})=>{
  await prepare(page);await start(page);
  test.skip(!await page.getByRole('tablist',{name:'Primary modes'}).getByRole('tab').nth(1).isEnabled(),'The full World scene requires WebGL2; the standalone shared SVG is tested separately.');
  await expect(page.getByRole('button',{name:'Planetary Boundaries · Earth Health Monitor',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'COP21 → COP31 — Commitments & Achievements',exact:true})).toBeVisible();
  for(const [id,cop] of [['planetary-boundaries-cop',true],['planetary-boundaries-monitor',false]]){
    await page.locator(`.news-item[data-point-id="${id}"]`).press('Enter');
    const frame=page.frameLocator('iframe.media-token-iframe');await expect(frame.locator('#message')).toContainText('SVG loaded: 13 / 13');
    await expect(frame.locator('#cop-conference')).toHaveCount(cop?1:0);
    await page.getByRole('button',{name:'⛶ Full view',exact:true}).click();
    const full=page.frameLocator('dialog.topic-embed-full-dialog iframe');await expect(full.locator('#message')).toContainText('SVG loaded: 13 / 13');
    await expect(full.locator('#cop-conference')).toHaveCount(cop?1:0);
    await page.getByRole('button',{name:'← Back / Close',exact:true}).click();
  }
});
