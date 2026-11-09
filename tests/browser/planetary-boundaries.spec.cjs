const { test, expect } = require('@playwright/test');
const { prepare, start } = require('./helpers.cjs');
const controller = '/assets/topics/planetary-boundaries/index.html';
const topicTitle = 'Planetary Boundaries · Earth Health Monitor';

test('SVG preview controls restore all channels without changing assessment data', async ({ page }) => {
  await page.goto(controller);
  await expect(page.locator('#message')).toHaveText('SVG loaded: 13 / 13 indicators addressable.');
  await page.locator('#illustration-tools').evaluate(n=>n.open=true);
  await expect(page.locator('#indicator-list button')).toHaveCount(13);
  const assessmentUrl = '/assets/topics/planetary-boundaries/data/assessment-2026.json';
  const original = await (await page.request.get(assessmentUrl)).json();
  expect(original.indicators.every(i => i.ratio === null && i.verified === false)).toBe(true);
  const originalRects = await page.locator('#chart').evaluate(object =>
    Array.from(object.contentDocument.querySelectorAll('[data-role="live-source-rect"]'), rect => rect.outerHTML));
  const originalStyles = await page.locator('#chart').evaluate(object =>
    Array.from(object.contentDocument.querySelectorAll('[data-role="live-source-rect"]'), rect => [rect.getAttribute('style'), rect.getAttribute('transform')]));
  await page.getByRole('button', { name: 'Test all 13', exact: true }).click();
  expect(await page.locator('#chart').evaluate(object => object.contentDocument.querySelectorAll('[data-preview-ratio]').length)).toBe(13);
  expect(await page.locator('#chart').evaluate(object =>
    Array.from(object.contentDocument.querySelectorAll('[data-role="live-source-rect"]'), rect => [rect.getAttribute('style'), rect.getAttribute('transform')]))).toEqual(originalStyles);
  await page.getByRole('slider').press('End');
  await expect(page.locator('#preview-value')).toHaveText(`Illustrative preview: ${await page.getByRole('slider').getAttribute('max')}%`);
  await expect(page.locator('#preview-notice')).toBeVisible();
  await page.getByRole('button', { name: 'View original artwork', exact: true }).click();
  await expect(page.locator('#preview-notice')).toBeVisible();
  expect(await page.locator('#chart').evaluate(object => object.contentDocument.querySelectorAll('[data-preview-ratio]').length)).toBe(0);
  expect(await page.locator('#chart').evaluate(object => object.contentDocument.querySelectorAll('[data-preview-geometry][clip-path]').length)).toBe(0);
  expect(await page.locator('#chart').evaluate(object =>
    Array.from(object.contentDocument.querySelectorAll('[data-role="live-source-rect"]'), rect => rect.outerHTML))).toEqual(originalRects);
  expect(await (await page.request.get(assessmentUrl)).json()).toEqual(original);
});

test.describe('Mobile controller', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('controller fits the viewport and retains its controls', async ({ page }) => {
    await page.goto(controller);
    await expect(page.locator('#message')).toHaveText('SVG loaded: 13 / 13 indicators addressable.');
  await page.locator('#illustration-tools').evaluate(n=>n.open=true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Test all 13', exact: true }).click();
    await expect(page.locator('#preview-notice')).toBeVisible();
  });
});

test('gradient preserves the green core and distinguishes the boundary from the display maximum', async ({ page }) => {
  await page.goto(controller);
  await expect(page.locator('#message')).toHaveText('SVG loaded: 13 / 13 indicators addressable.');
  await page.locator('#illustration-tools').evaluate(n=>n.open=true);
  for(let index=0;index<13;index++){
    await page.locator('#indicator-list button').nth(index).click();
    await page.getByRole('spinbutton',{name:'Preview ratio percent'}).fill('100');
  }
  const state=await page.locator('#chart').evaluate(object=>{
    const doc=object.contentDocument,circle=doc.getElementById('preview-limit-circle'),boundary=doc.getElementById('preview-boundary-circle');
    const gradient=doc.getElementById('preview-shared-gradient'),source=doc.getElementById('D\u00e9grad\u00e9_sans_nom_36');
    const stops=node=>Array.from(node.querySelectorAll('stop'),s=>({offset:Number(s.getAttribute('offset')),color:s.getAttribute('stop-color'),opacity:s.getAttribute('stop-opacity')}));
    const current=stops(gradient),original=stops(source),r=Number(circle.getAttribute('r')),reference=Number(boundary.getAttribute('r'));
    return {core:current.filter(s=>s.offset<=.232),originalCore:original.filter(s=>s.offset<=.232),
      outer:current.filter(s=>s.offset*Number(gradient.getAttribute('r'))>=r*.8-1e-7),
      sameCenter:circle.cx.baseVal.value===boundary.cx.baseVal.value && circle.cy.baseVal.value===boundary.cy.baseVal.value,
      reference,display:r,gradientRadius:Number(gradient.getAttribute('r')),
      radii:Array.from(doc.querySelectorAll('[data-preview-geometry]'),s=>Number(s.dataset.previewRadius)),
      maxLabel:doc.querySelector('#preview-limit-guide text').textContent};
  });
  expect(state.core).toEqual(state.originalCore);
  expect(state.sameCenter).toBe(true);expect(state.reference).toBeLessThan(state.display/2);
  expect(state.reference).toBeCloseTo(.212*state.gradientRadius,5);
  state.radii.forEach(radius=>expect(radius).toBeCloseTo(state.reference,5));
  expect(state.outer.map(s=>s.color)).toEqual(['#6d225d','#49194f','#2c1038']);
  expect(state.maxLabel).toBe('Display max');
  expect(await page.locator('.chart-wrap').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
});

test('all 13 channels independently support 0, 0.5, 1, 1.5 and 2 with overflow beyond the green edge', async ({ page }) => {
  await page.goto(controller);
  await expect(page.locator('#message')).toHaveText('SVG loaded: 13 / 13 indicators addressable.');
  await page.locator('#illustration-tools').evaluate(n=>n.open=true);
  const read=()=>page.locator('#chart').evaluate(object=>{
    const doc=object.contentDocument,reference=doc.getElementById('preview-boundary-circle').r.baseVal.value;
    return {reference,display:doc.getElementById('preview-limit-circle').r.baseVal.value,
      viewBox:doc.documentElement.getAttribute('viewBox'),
      radii:Array.from(doc.querySelectorAll('[data-preview-geometry]'),s=>Number(s.dataset.previewRadius)),
      overflow:Array.from(doc.querySelectorAll('[data-role="live-value-group"]'),s=>Number(s.dataset.previewOverflow || 0))};
  });
  const initial=await read();
  for(let index=0;index<13;index++) {
    const before=await read();
    await page.locator('#indicator-list button').nth(index).click();
    for(const ratio of [0,.5,1,1.5,2]) {
      await page.getByRole('spinbutton',{name:'Preview ratio percent'}).fill(String(ratio*100));
      await expect(page.locator('#preview-value')).toHaveText(`Illustrative preview: ${ratio*100}%`);
      const state=await read();
      expect(state.radii[index]).toBeCloseTo(ratio*state.reference,5);
      expect(state.overflow[index]).toBeCloseTo(Math.max(0,ratio-1),6);
      state.radii.forEach((radius,other)=>{if(other!==index)expect(radius).toBe(before.radii[other]);});
      expect(state.viewBox).toBe(initial.viewBox);
    }
  }
  await page.getByRole('spinbutton',{name:'Preview ratio percent'}).fill('999');
  const capped=await read();
  expect(capped.radii[12]).toBeLessThanOrEqual(capped.display);
  expect(capped.radii[12]).toBeGreaterThan(capped.reference*2);
});

test('World topic embeds the controller and returns from full view', async ({ page }) => {
  const errors = await prepare(page);
  await start(page);
  await expect(page.getByRole('tab', { name: 'World', exact: true }),
    'World topic integration requires a browser session with working WebGL2.').toBeEnabled();
  await page.getByRole('button', { name: topicTitle, exact: true }).click();
  await expect(page.getByRole('heading', { name: topicTitle, exact: true })).toBeVisible();
  const frame = page.frameLocator('iframe.media-token-iframe');
  await expect(frame.locator('#message')).toHaveText('SVG loaded: 13 / 13 indicators addressable.');
  await page.getByRole('button', { name: '⛶ Full view', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Planetary Boundaries · interactive SVG controller' });
  await expect(dialog).toBeVisible();
  const full = page.frameLocator('dialog.topic-embed-full-dialog iframe');
  await expect(full.locator('#message')).toHaveText('SVG loaded: 13 / 13 indicators addressable.');
  await full.getByRole('button', { name: 'Test all 13', exact: true }).click();
  await expect(full.locator('#preview-notice')).toBeVisible();
  await page.getByRole('button', { name: '← Back / Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#detail-panel iframe.media-token-iframe')).toBeVisible();
  expect(errors).toEqual([]);
});
