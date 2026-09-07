/**
 * Two projects, deliberately.
 *
 * Most of this package is plain modules, and those are tested with NO DOM in
 * scope: a browser global that sneaks into a shared module fails here rather
 * than at the mobile client's first launch. That guarantee is the point, so it
 * is not weakened to accommodate the exceptions.
 *
 * The exceptions are the hooks and contexts. They are React, and rendering one
 * needs a document, so they run under jsdom. The ESLint boundary rule is what
 * guards those files instead — it fails on a browser global whatever the test
 * environment happens to provide.
 */
/**
 * The same axios mapping the web app carries in its own jest config. Axios's
 * default entry is the browser build, which reaches for `fetch` at import time;
 * jsdom does not provide one, so every suite that touches the API client dies on
 * import rather than on anything it asserts.
 */
const moduleNameMapper = { '^axios$': 'axios/dist/node/axios.cjs' }

/*
 * `resetMocks` is CRA's default and therefore the behaviour every suite in this
 * repository was written against: each test starts with its mocks cleared, and
 * a `beforeEach` re-arms the return values. Omitting it here let calls
 * accumulate across tests in a file, so a suite passed or failed on the order
 * its cases ran in.
 */
const resetMocks = true

const transform = {
  '^.+\\.js$': ['babel-jest', { presets: [['babel-preset-react-app', { runtime: 'automatic' }]] }]
}

module.exports = {
  rootDir: __dirname,
  projects: [
    {
      displayName: 'core (no DOM)',
      rootDir: __dirname,
      testEnvironment: 'node',
      testMatch: ['<rootDir>/**/*.test.js'],
      testPathIgnorePatterns: ['/node_modules/', '<rootDir>/hooks/', '<rootDir>/context/'],
      moduleNameMapper,
      resetMocks,
      transform
    },
    {
      displayName: 'core react (jsdom)',
      rootDir: __dirname,
      testEnvironment: 'jsdom',
      /*
       * jest-environment-jsdom resolves package `exports` with the "node"
       * condition by default, which hands Firebase its Node build — and that
       * build wants a global `fetch` jsdom does not provide. Asking for the
       * browser condition gives the same build the web app ships, which uses
       * XHR and works here.
       */
      testEnvironmentOptions: { customExportConditions: ['browser'] },
      testMatch: ['<rootDir>/hooks/**/*.test.js', '<rootDir>/context/**/*.test.js'],
      setupFiles: ['<rootDir>/jest.setup.env.js'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.react.js'],
      moduleNameMapper,
      resetMocks,
      transform
    }
  ]
}
