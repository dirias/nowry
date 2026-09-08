/**
 * Mobile unit tests: the design system's numbers and the pure glue.
 *
 * There is no rendered-component project, and that is a deliberate stop rather
 * than an oversight. `jest-expo@57` mocks `expo-modules-core`, which SDK 57 no
 * longer ships as a separate package and which cannot be installed — its own
 * source carries a "this is an invalid dependency chain" comment at the line
 * that fails. Rendering React Native components in Jest is therefore blocked
 * upstream, and the alternative was hand-building a React Native module mock,
 * which tests the mock.
 *
 * What that costs, precisely: assertions about what a component DRAWS. What it
 * does not cost is the design system's correctness, because every number and
 * every rule lives in a plain module beside its component — buttonSpec.js,
 * typeLevels.js, formMessage.js — and those are tested here.
 *
 * Revisit when jest-expo fixes the chain; the seam is already the right shape.
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
