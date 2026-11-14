/**
 * The production check (E2E-008): `npm run e2e:prod`, after every release.
 * nowry.app as a visitor sees it; no secret is needed and none is sent.
 */
const path = require('path')
const { defineConfig, devices } = require('@playwright/test')

module.exports = defineConfig({
  testDir: path.join(__dirname, 'prod-specs'),
  outputDir: path.join(__dirname, 'out/prod-results'),
  timeout: 60 * 1000,
  workers: 2,
  retries: 0,
  globalSetup: require.resolve('./prod-setup'),
  reporter: [['list'], ['json', { outputFile: path.join(__dirname, 'out/prod-results.json') }]],
  use: { baseURL: 'https://www.nowry.app', trace: 'off', video: 'off', screenshot: 'only-on-failure', locale: 'en-US' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } }]
})
