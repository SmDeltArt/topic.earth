const { test, expect } = require('@playwright/test');
const { prepare, start, activate, reopenPanel } = require('./helpers.cjs');

for (const viewport of [{ width: 360, height: 740 }, { width: 768, height: 1024 }, { width: 844, height: 390 }]) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });
    test(`Layers reopens repeatedly at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      const errors = await prepare(page, { failWebGL: true });
      await start(page, 'regional');
      await reopenPanel(page);
      await reopenPanel(page);
      // Exercise the separate collapsed rail control as well as full close.
      const panel = page.locator('#layer-panel');
      await activate(panel.locator('.panel-collapse-btn'), page);
      await expect(panel).toHaveClass(/collapsed/);
      await activate(panel.locator('.panel-collapse-btn'), page);
      await expect(panel).not.toHaveClass(/collapsed/);
      expect(errors).toEqual([]);
    });
  });
}

test('closed Layers stays reachable after viewport rotation', async ({ page }) => {
  const errors = await prepare(page, { failWebGL: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page, 'regional');
  await activate(page.locator('#webgl-fallback-notice').getByRole('button'), page);
  await activate(page.locator('#layer-panel [data-action="close-panel"]'), page);
  await page.setViewportSize({ width: 844, height: 390 });
  const button = page.locator('body > [data-action="reopen-panel"]');
  await activate(button, page);
  await expect(page.locator('#layer-panel')).not.toHaveClass(/closed/);
  await reopenPanel(page);
  expect(errors).toEqual([]);
});

test('automatic collapse clears a previously closed reopen button @gap', async ({ page }) => {
  await prepare(page, { failWebGL: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page, 'regional');
  await activate(page.locator('#webgl-fallback-notice').getByRole('button'), page);
  await activate(page.locator('#layer-panel [data-action="close-panel"]'), page);
  // The real app listens for this event when a mobile topic expands.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('expandMobileTopic')));
  await expect(page.locator('#layer-panel')).toHaveClass(/collapsed/);
  await expect(page.locator('body > [data-action="reopen-panel"]')).toBeHidden();
  expect(await page.evaluate(() => window.app.layerPanel.isClosed)).toBe(false);
});

// Keep this separate from panel tests, which explicitly dismiss the notice.
test('fallback notice leaves narrow-screen panel controls reachable @gap', async ({ page }) => {
  await prepare(page, { failWebGL: true });
  await page.setViewportSize({ width: 360, height: 740 });
  await start(page, 'regional');
  await expect(page.locator('#webgl-fallback-notice')).toBeVisible();
  await page.locator('#layer-panel [data-action="close-panel"]').click({ trial: true });
});
