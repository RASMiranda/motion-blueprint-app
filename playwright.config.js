// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/* ============================================================
   Playwright config for the E2E layer of the test/quality-gate
   strategy. This app has no build step, so "serving" it for tests
   is just `python3 -m http.server` against the repo root — the
   same command DEVELOPMENT.md already tells contributors to run
   locally.
   ============================================================ */
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Pin to a pre-installed browser when this project's
        // @playwright/test version doesn't line up with a locally
        // cached browser revision (avoids a network fetch just to run
        // tests). CI installs its own matching browser instead — see
        // the "Install Playwright browsers" step in deploy.yml — so
        // this only takes effect when the env var is set.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],

  webServer: {
    command: 'python3 -m http.server 8000',
    url: 'http://127.0.0.1:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
