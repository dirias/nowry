/**
 * Mobile-only unit tests.
 *
 * Deliberately narrow. Most of this client's platform adapter is native —
 * MMKV, Firebase's React Native build, Sentry — and mocking those would test
 * the mocks. What IS testable here is the pure glue, and that is what runs.
 *
 * The device-level guarantees (a session surviving a cold start, the API
 * reachable with a real token) are checked on hardware, which is why MOB-006
 * lists them as device criteria rather than assertions.
 */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.js'],
  resetMocks: true,
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: [['babel-preset-react-app', { runtime: 'automatic' }]] }]
  }
}
