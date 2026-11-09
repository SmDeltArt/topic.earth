const { test, expect } = require('@playwright/test');

async function prepare(page, { failWebGL = false } = {}) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && message.text().includes('[App Init] Startup failed')) errors.push(message.text());
  });
  // Keep app modules/assets real, but exclude live feeds, geolocation and account services.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:5501') return route.abort();
    if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/src/')
      && !url.pathname.startsWith('/api/shared/') && !url.pathname.startsWith('/api/brand/')) {
      if (url.pathname === '/api/identity') return route.fulfill({ json: { user: null } });
      return route.fulfill({ status: 503, json: { error: 'Live service disabled in browser regression' } });
    }
    return route.continue();
  });
  await page.addInitScript(({ failWebGL }) => {
    localStorage.setItem('euroearth_settings', JSON.stringify({
      autoDetectLanguage: false, uiLanguage: 'en', tutorialModeEnabled: false,
      regionalAutoLocate: false
    }));
    localStorage.setItem('euroearth_fever_sound', 'false');
    window.__webglAttempts = [];
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (!['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return original.call(this, type, ...args);
      const context = failWebGL ? null : original.call(this, type, ...args);
      window.__webglAttempts.push({ canvas: this, type, success: !!context, stack: new Error().stack });
      return context;
    };
  }, { failWebGL });
  return errors;
}

async function start(page, mode = 'main') {
  await page.goto(`/?mode=${mode}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#loading')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => !!window.app?.layerPanel && !!window.app?.regionalMap)).toBe(true);
}

async function activate(locator, page) {
  if (test.info().project.use.hasTouch) await locator.tap();
  else await locator.click();
}

async function reopenPanel(page) {
  const notice = page.locator('#webgl-fallback-notice');
  if (await notice.isVisible()) await activate(notice.getByRole('button'), page);
  const panel = page.locator('#layer-panel');
  await activate(panel.locator('[data-action="close-panel"]'), page);
  await expect(panel).toHaveClass(/closed/);
  const button = page.locator('body > [data-action="reopen-panel"]');
  await expect(button).toHaveCount(1);
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('aria-controls', 'layer-panel');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  const geometry = await button.evaluate(button => {
    const r = button.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { width: r.width, height: r.height, x: r.x, y: r.y,
      center: r.y + r.height / 2, viewportHeight: innerHeight,
      viewportWidth: innerWidth, hittable: hit === button || button.contains(hit) };
  });
  expect(geometry.width).toBeGreaterThanOrEqual(44);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.x).toBeGreaterThanOrEqual(0);
  expect(geometry.x + geometry.width).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(Math.abs(geometry.center - geometry.viewportHeight / 2)).toBeLessThan(3);
  expect(geometry.hittable).toBe(true);
  await activate(button, page);
  await expect(panel).not.toHaveClass(/closed/);
  await expect(button).toBeHidden();
  await expect(panel.locator('[data-action="close-panel"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.app.layerPanel.isClosed)).toBe(false);
}
module.exports = { prepare, start, activate, reopenPanel };
