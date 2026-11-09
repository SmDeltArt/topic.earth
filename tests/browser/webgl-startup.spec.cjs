const { test, expect } = require('@playwright/test');
const { prepare, start, activate, reopenPanel } = require('./helpers.cjs');

for (const requestedMode of ['main', 'space', 'fever', 'regional']) {
  test(`renderer failure retains Regional 2D for ?mode=${requestedMode}`, async ({ page }) => {
    const errors = await prepare(page, { failWebGL: true });
    await start(page, requestedMode);
    await expect(page.locator('#webgl-fallback-notice')).toBeVisible();
    await expect(page.locator('#regional-map-view')).toBeVisible();
    await expect(page.locator('[data-filter="regional"]')).toHaveAttribute('aria-selected', 'true');
    for (const mode of ['main', 'space', 'fever']) {
      await expect(page.locator(`[data-filter="${mode}"]`)).toBeDisabled();
    }
    expect(await page.evaluate(() => ({ unavailable: window.app.webglUnavailable,
      global: window.topicEarthWebglUnavailable, globe: window.app.globe,
      mode: window.app.currentLayerFilter }))).toEqual({ unavailable: true, global: true, globe: null, mode: 'regional' });
    // Actual renderer tried to initialize: this is not a shortcut setting an app flag.
    expect(await page.evaluate(() => window.__webglAttempts.some(a => /three/i.test(a.stack)))).toBe(true);
    await reopenPanel(page);
    expect(errors).toEqual([]);
  });
}

test('real renderer starts and UI selects World → Space → Fever → Regional → World', async ({ page }) => {
  const errors = await prepare(page);
  await start(page);
  expect(await page.evaluate(() => window.app.webglUnavailable),
    'This browser environment must provide WebGL2. Failure here is not proof of a Firefox app regression.').toBe(false);
  await expect(page.locator('#webgl-fallback-notice')).toHaveCount(0);
  expect(await page.evaluate(() => window.app.globe.renderer.getContext() instanceof WebGL2RenderingContext)).toBe(true);
  await expect(page.locator('#globe-container canvas').first()).toBeVisible();
  for (const mode of ['space', 'fever', 'regional', 'main']) {
    const tab = page.locator(`[data-filter="${mode}"]`);
    await activate(tab, page);
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => page.evaluate(() => window.app.currentLayerFilter)).toBe(mode);
    if (mode === 'space') await expect.poll(() => page.evaluate(() => window.app.globe.inSolarSystemView), { timeout: 60000 }).toBe(true);
    if (mode === 'fever') await expect.poll(() => page.evaluate(() => window.app.globe.inFeverMode), { timeout: 60000 }).toBe(true);
    if (mode === 'regional') await expect(page.locator('#regional-map-view')).toBeVisible();
    if (mode === 'main') {
      await expect.poll(() => page.evaluate(() => !window.app.globe.inFeverMode && !window.app.globe.inSolarSystemView)).toBe(true);
      await expect(page.locator('#regional-map-view')).toBeHidden();
    }
    // Mobile Fever intentionally closes Layers on entry; reopen through its real control.
    if (mode === 'fever' && test.info().project.use.viewport.width <= 768) {
      await expect(page.locator('#layer-panel')).toHaveClass(/closed/);
      await activate(page.locator('body > [data-action="reopen-panel"]'), page);
    }
    await reopenPanel(page);
  }
  expect(errors).toEqual([]);
});

test('startup creates no throwaway WebGL2 probe context @gap', async ({ page }) => {
  await prepare(page);
  await start(page);
  expect(await page.evaluate(() => window.__webglAttempts
    .filter(a => a.type === 'webgl2' && !/three/i.test(a.stack))
    .map(a => a.stack)), 'PWA capability detection must reuse the actual renderer result.').toEqual([]);
});
