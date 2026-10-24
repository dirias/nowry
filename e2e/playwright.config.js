/**
 * The golden path, end to end (QA-010): the real web client and the real API
 * over a throwaway MongoDB, signing in against the Firebase Auth emulator under
 * a `demo-` project, so nothing here can reach a real Firebase project, a real
 * database, Sentry, Stripe or a model provider.
 *
 *   npm run e2e            # starts everything, runs, stops it again
 *
 * Locally the API is the sibling checkout (../Nowry-API) and MongoDB is a
 * mongo:6.0 container on 27018; CI sets E2E_API_DIR, E2E_PYTHON and
 * E2E_EXTERNAL_MONGO and runs Mongo as a service.
 */
const path = require('path')
const { defineConfig, devices } = require('@playwright/test')

const ROOT = path.resolve(__dirname, '..')
const API_DIR = process.env.E2E_API_DIR || path.resolve(ROOT, '../Nowry-API')
const PYTHON = process.env.E2E_PYTHON || path.join(API_DIR, '.venv/bin/python')
const PROJECT = 'demo-nowry'
const PORTS = { mongo: 27018, auth: 9099, api: 8011, web: 3100 }
const WEB_URL = `http://localhost:${PORTS.web}`
const API_URL = `http://127.0.0.1:${PORTS.api}`

/** Every live key a developer's .env may hold, blanked: dotenv never overrides a set variable. */
const NO_LIVE_SERVICES = {
  SENTRY_DSN: '',
  GROQ_API_KEY: '',
  GEMINI_API_KEY: '',
  STRIPE_SECRET_KEY: '',
  LANGFUSE_SECRET_KEY: '',
  LANGFUSE_PUBLIC_KEY: '',
  LANGFUSE_HOST: '',
  RESEND_API_KEY: '',
  GOOGLE_APPLICATION_CREDENTIALS: '',
  FIREBASE_SERVICE_ACCOUNT_JSON: '',
  FIREBASE_SERVICE_ACCOUNT_PATH: '',
  BETA_ACTIVE: '',
  BETA_INVITE_REQUIRED: '',
  BETA_UPGRADES_OPEN: ''
}

const servers = [
  {
    name: 'auth emulator',
    command: `npx --yes firebase-tools@15.33.0 emulators:start --only auth --project ${PROJECT} --config e2e/firebase.json`,
    cwd: ROOT,
    url: `http://127.0.0.1:${PORTS.auth}/`,
    timeout: 120_000
  },
  {
    name: 'api',
    command: `${PYTHON} -m uvicorn app.main:app --host 127.0.0.1 --port ${PORTS.api}`,
    cwd: API_DIR,
    url: `${API_URL}/health`,
    timeout: 120_000,
    env: {
      ...NO_LIVE_SERVICES,
      ENV: 'e2e',
      MONGO_URI: process.env.E2E_MONGO_URI || `mongodb://127.0.0.1:${PORTS.mongo}/`,
      MONGO_DB: 'nowry-e2e',
      FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${PORTS.auth}`,
      GOOGLE_CLOUD_PROJECT: PROJECT,
      ALLOWED_ORIGINS: WEB_URL,
      SECRET_KEY: 'e2e-only'
    }
  },
  {
    name: 'web',
    command: 'npm start',
    cwd: ROOT,
    url: WEB_URL,
    timeout: 240_000,
    env: {
      PORT: String(PORTS.web),
      BROWSER: 'none',
      REACT_APP_API_URL: API_URL,
      REACT_APP_API_TIMEOUT: '20000',
      REACT_APP_FB_API_KEY: 'demo-api-key',
      REACT_APP_FB_AUTH_DOMAIN: 'localhost',
      REACT_APP_FB_PROJECT_ID: PROJECT,
      REACT_APP_FB_APP_ID: 'demo-app',
      REACT_APP_FB_STORAGE_BUCKET: '',
      REACT_APP_FB_MSG_SENDER_ID: '',
      REACT_APP_FB_AUTH_EMULATOR_URL: `http://127.0.0.1:${PORTS.auth}`,
      REACT_APP_SENTRY_DSN: '',
      REACT_APP_ENVIRONMENT: 'e2e'
    }
  }
]

if (!process.env.E2E_EXTERNAL_MONGO) {
  servers.unshift({
    name: 'mongo',
    command: `docker rm -f nowry-e2e-mongo >/dev/null 2>&1; docker run --rm --name nowry-e2e-mongo -p ${PORTS.mongo}:27017 mongo:6.0`,
    port: PORTS.mongo,
    timeout: 120_000
  })
}

module.exports = defineConfig({
  testDir: __dirname,
  globalTeardown: require.resolve('./global-teardown'),
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: path.join(ROOT, 'playwright-report') }]] : 'list',
  outputDir: path.join(ROOT, 'test-results'),
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome']
  },
  webServer: servers.map((server) => ({ reuseExistingServer: !process.env.CI, stdout: 'ignore', stderr: 'pipe', ...server }))
})
