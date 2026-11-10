const {test,expect}=require('@playwright/test');
const path='/assets/topics/planetary-boundaries/index.html';
async function ready(page,suffix=''){await page.goto(path+suffix);await expect(page.locator('#message')).toContainText('SVG loaded: 13 / 13');}
test('chart and indicator rail persist outside all explanation tabs',async({page})=>{
  await ready(page);
  expect(await page.locator('#chart-stage').evaluate(n=>!!(n.compareDocumentPosition(document.querySelector('.tabs'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  for(const tab of await page.getByRole('tab').all()){await tab.click();await expect(page.locator('#chart')).toBeVisible();}
  await expect(page.locator('#panel-status')).toBeVisible();
  await expect(page.locator('#tab-status')).toHaveCount(0);
  expect(await page.locator('#indicator-list button').first().evaluate(button=>{const row=button.getBoundingClientRect(),name=button.querySelector('.indicator-name').getBoundingClientRect();return name.top>=row.top&&name.bottom<=row.bottom;})).toBe(true);
  await expect(page.locator('#chart-explanation')).not.toHaveAttribute('open','');await expect(page.locator('.chart-caption')).toBeHidden();
  await expect(page.locator('#export-download')).toHaveCount(1);await expect(page.locator('#export-science,#export-preview,#import-preview')).toHaveCount(0);
});
test('real SVG sector clicks and keyboard rows synchronize selection without leaving the chart tab',async({page})=>{
  await ready(page);await page.locator('#tab-data').click();
  await page.locator('#chart').scrollIntoViewIfNeeded();
  const point=await page.locator('#chart').evaluate(object=>{
    const d=object.contentDocument,hit=d.getElementById('indicator-hit-climate_change__radiative_forcing'),center=d.getElementById('preview-boundary-circle'),p=hit.getPointAtLength(hit.getTotalLength()/2);
    const c={x:Number(center.getAttribute('cx')),y:Number(center.getAttribute('cy'))};
    const screen=new DOMPoint(c.x+.7*(p.x-c.x),c.y+.7*(p.y-c.y)).matrixTransform(d.documentElement.getScreenCTM());
    const r=object.getBoundingClientRect();return{x:r.x+screen.x,y:r.y+screen.y};
  });if(test.info().project.use.hasTouch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
  await expect(page.locator('#panel-status')).toBeVisible();await expect(page.locator('#selected-name')).toHaveText('Radiative forcing');
  const row=page.locator('#indicator-list [data-indicator-id="climate_change__radiative_forcing"]');await expect(row).toHaveAttribute('aria-pressed','true');expect(await page.locator('#indicator-list').evaluate(n=>n.scrollTop)).toBeGreaterThan(0);
  const first=page.locator('#indicator-list button').first();await first.focus();await page.keyboard.press('Enter');await expect(first).toBeFocused();await expect(first).toHaveAttribute('aria-pressed','true');
  expect(await page.locator('#chart').evaluate(o=>o.contentDocument.getElementById('indicator-hit-biosphere_integrity__genetic_diversity').dataset.selected)).toBe('true');
});
test('one dated export preserves source data, descriptions, manual state, and a standalone sanitized SVG',async({page})=>{
  await ready(page);await page.locator('#illustration-tools').evaluate(n=>n.open=true);await page.locator('#ratio-number').fill('50');
  await page.locator('#export-options').evaluate(n=>n.open=true);const fs=require('node:fs/promises');
  const pending=page.waitForEvent('download');await page.locator('#export-download').click();const file=await pending,data=JSON.parse(await fs.readFile(await file.path(),'utf8'));
  expect(file.suggestedFilename()).toMatch(/2026-en-\d{4}-\d{2}-\d{2}T.*\.json$/);
  expect(data.assessment.indicators).toHaveLength(13);expect(data.visualization.indicators).toHaveLength(13);
  expect(data.visualization.mode).toBe('illustrative');expect(data.assessment.indicators[0].normalizedValue).toEqual({kind:'range',min:11,max:111});
  expect(data.visualization.indicators[0]).toMatchObject({representation:'illustrative_override',displayedDistanceRelativeToGreenRadius:.5});
  expect(data.visualization.indicators[1].representation).toBe('scientific_display');expect(data.visualization.indicators.every(i=>i.description)).toBe(true);
  await page.locator('#export-format').selectOption('svg');const svgPending=page.waitForEvent('download');await page.locator('#export-download').click();const svgFile=await svgPending,svg=await fs.readFile(await svgFile.path(),'utf8');
  const audit=await page.evaluate(async text=>{
    const {validateSvgDocument}=await import('/assets/topics/planetary-boundaries/src/svg-safety.mjs'),d=new DOMParser().parseFromString(text,'image/svg+xml');
    return{...validateSvgDocument(d),metadata:JSON.parse(d.getElementById('topic-earth-export-metadata').textContent),hits:d.querySelectorAll('.indicator-hit').length,scripts:d.querySelectorAll('script,[onclick],foreignObject').length};
  },svg);
  expect(audit.ids).toBeGreaterThan(1090);expect(audit.hits).toBe(0);expect(audit.scripts).toBe(0);expect(audit.metadata.assessment.assessmentYear).toBe(2026);
  await page.locator('#clear-preview').click();await expect(page.locator('#message')).toContainText('Original artwork view');await page.locator('#ratio-number').fill('75');await expect(page.locator('#message')).toContainText('Manual illustration active');await expect(page.locator('#message')).not.toContainText('historical shapes');
});
test('French, Dutch and German share one page and translate semantic SVG labels without changing geometry',async({page})=>{
  await ready(page);
  const geometry=()=>page.locator('#chart').evaluate(o=>[...o.contentDocument.querySelectorAll('[data-preview-geometry]')].map(n=>n.getAttribute('d')));
  const before=await geometry();
  for(const [language,title,label] of [['fr','Limites planétaires','Changement'],['nl','Planetaire grenzen','Klimaat'],['de','Planetare Grenzen','Klima']]){
    await page.locator('#topic-language').selectOption(language);await expect(page.locator('h1')).toHaveText(title);await expect(page.locator('html')).toHaveAttribute('lang',language);
    expect(await page.locator('#chart').evaluate(o=>o.contentDocument.getElementById('translation-g722').textContent)).toContain(label);
    expect(await page.locator('#chart').evaluate(o=>o.contentDocument.getElementById('g722').style.visibility)).toBe('hidden');expect(await geometry()).toEqual(before);
    await expect(page.locator('#translation-note')).toBeVisible();
  }
  await page.locator('#topic-language').selectOption('en');await expect(page.locator('h1')).toHaveText('Planetary Boundaries');expect(await page.locator('#chart').evaluate(o=>o.contentDocument.getElementById('g722').style.visibility)).toBe('');
});
test('embedded topic follows existing translation settings; explicit language URLs take priority',async({page})=>{
  await ready(page);
  await page.evaluate(path=>{
    localStorage.setItem('euroearth_settings',JSON.stringify({translationLanguage:'nl',uiLanguage:'fr'}));
    const frame=document.createElement('iframe');frame.id='topic-probe';frame.src=path;document.body.append(frame);
  },path);
  const child=page.frameLocator('#topic-probe');await expect(child.locator('h1')).toHaveText('Planetaire grenzen');
  await page.evaluate(()=>{localStorage.setItem('euroearth_settings',JSON.stringify({translationLanguage:'de'}));dispatchEvent(new CustomEvent('settingsChanged'));});
  await expect(child.locator('h1')).toHaveText('Planetare Grenzen');
  await page.goto(path+'?lang=fr');await expect(page.locator('h1')).toHaveText('Limites planétaires');
});
