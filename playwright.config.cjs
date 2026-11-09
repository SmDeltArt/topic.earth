const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser',
  timeout: 90000,
  expect: { timeout: 20000 },
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5501',
    locale: 'en-US',
    actionTimeout: 10000,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5501',
    reuseExistingServer: false,
    timeout: 30000
  },
  projects: [
    { name: 'chromium-touch', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, hasTouch: true,
      launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } } },
    { name: 'firefox-touch', use: { browserName: 'firefox', viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', viewport: { width: 1440, height: 900 } } }
  ]
});
