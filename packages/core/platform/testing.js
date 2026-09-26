/**
 * A configured platform for tests, so a shared module can be exercised with no
 * environment at all.
 *
 * Every capability defaults to something inert and inspectable: storage is a
 * Map, the rest are jest mocks. Pass overrides for the one capability a test
 * actually cares about. Call `resetPlatform()` afterwards.
 *
 *   const { storage } = configureTestPlatform()
 *   storage.failOn('get', new Error('site data blocked'))
 */
import { configurePlatform, resetPlatform } from './index'

/** A synchronous, inspectable storage adapter (ADR-027). */
export const createMemoryStorage = () => {
  const map = new Map()
  const failures = { get: null, set: null, remove: null }
  const guard = (op) => {
    if (failures[op]) throw failures[op]
  }
  return {
    get: (key) => {
      guard('get')
      return map.has(key) ? map.get(key) : null
    },
    set: (key, value) => {
      guard('set')
      map.set(key, String(value))
    },
    remove: (key) => {
      guard('remove')
      map.delete(key)
    },
    /** Test-only handles, ignored by the port. */
    failOn: (op, error) => {
      failures[op] = error
    },
    clearFailures: () => {
      failures.get = failures.set = failures.remove = null
    },
    clear: () => map.clear(),
    raw: map
  }
}

export const configureTestPlatform = (overrides = {}) => {
  const storage = overrides.storage || createMemoryStorage()
  const adapters = {
    notify: jest.fn(),
    auth: {
      instance: jest.fn(() => ({})),
      currentUser: jest.fn(() => null),
      getIdToken: jest.fn(async () => null),
      signInWithGoogle: jest.fn(async () => ({}))
    },
    env: { apiUrl: 'http://api.test', apiTimeout: 10000, sentryDsn: undefined },
    telemetry: { captureException: jest.fn(), captureMessage: jest.fn(), addBreadcrumb: jest.fn() },
    session: { onUnauthorized: jest.fn(), onUnauthorizedSubscribe: jest.fn(() => () => {}), onSignedOut: jest.fn() },
    alerts: { play: jest.fn(() => true), stop: jest.fn(), announce: jest.fn(), requestPermission: jest.fn(async () => 'granted') },
    ...overrides,
    // last, so a caller's partial override cannot leave the port without one
    storage
  }
  configurePlatform(adapters)
  return adapters
}

export { resetPlatform }
