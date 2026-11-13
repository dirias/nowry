/**
 * The dev end-to-end suite (E2E-002, ADR-090, FR-042): the deployed
 * dev.nowry.app and the development API, through Vercel's automation bypass.
 *
 *   npm run e2e:dev            # everything, then the report
 *   npm run e2e:dev -- smoke   # the smoke run only
 *
 * Tracing and video are off so no request header can be recorded; a failure
 * keeps a screenshot only.
 */
const path = require('path')
const { defineConfig, devices } = require('@playwright/test')
const { secrets } = require('./lib/secrets')
const { SITE } = require('./lib/env')

secrets() // fails here, before any browser starts, when a secret is missing

module.exports = defineConfig({
  testDir: path.join(__dirname, 'specs'),
  outputDir: path.join(__dirname, 'out/results'),
  timeout: 4 * 60 * 1000,
  expect: { timeout: 20 * 1000 },
  fullyParallel: false,
  workers: 3,
  retries: 0,
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  reporter: [['list'], ['json', { outputFile: path.join(__dirname, 'out/results.json') }]],
  use: {
    baseURL: SITE,
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    actionTimeout: 20 * 1000,
    navigationTimeout: 45 * 1000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } }]
})
