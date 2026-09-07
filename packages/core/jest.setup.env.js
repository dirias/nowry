/*
 * Runs BEFORE the test framework and before any module is imported.
 *
 * jsdom provides no `fetch`, and the Firebase Auth build resolved under this
 * environment reads the global at IMPORT time, so a suite that imports a service
 * dies before it asserts anything. This has to be `setupFiles`, not
 * `setupFilesAfterEnv`: the latter runs too late to help an import.
 *
 * Nothing in these tests should reach the network — the API client is mocked —
 * so a call that lands here is a bug in the test, and it says so.
 */
const unavailable = (name) => () => {
  throw new Error(`${name} was used in a core test; mock the API client instead`)
}

if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = () => Promise.reject(new Error('fetch was called in a core test; mock the API client instead'))
}

// Firebase's Node platform module reads all four at import time.
for (const name of ['Headers', 'Request', 'Response', 'FormData']) {
  if (typeof globalThis[name] === 'undefined') {
    globalThis[name] = unavailable(name)
  }
}
