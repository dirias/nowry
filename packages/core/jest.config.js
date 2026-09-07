/**
 * `core` is tested with no DOM in scope on purpose: a browser global that sneaks
 * into a shared module fails here rather than at the mobile client's first launch.
 */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  // Both shapes: colocated `x.service.test.js` (as the api suites are written)
  // and `__tests__/x.test.js`. Matching only the latter would have silently
  // stopped running the four api suites the moment they moved here.
  testMatch: ['<rootDir>/**/*.test.js'],
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: [['babel-preset-react-app', { runtime: 'automatic' }]] }]
  }
}
