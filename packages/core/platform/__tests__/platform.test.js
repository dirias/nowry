import {
  configurePlatform,
  resetPlatform,
  isPlatformConfigured,
  storage,
  notify,
  auth,
  env,
  telemetry,
  session,
  alerts,
  PlatformNotConfiguredError,
  PlatformAlreadyConfiguredError,
  PlatformAdapterError
} from '../index'

const makeAdapters = (overrides = {}) => ({
  storage: { get: jest.fn(() => 'stored'), set: jest.fn(), remove: jest.fn() },
  notify: jest.fn(),
  auth: {
    instance: jest.fn(() => ({ name: 'firebase' })),
    currentUser: jest.fn(() => ({ uid: 'u1' })),
    getIdToken: jest.fn(async () => 'token'),
    signInWithGoogle: jest.fn(async () => ({ user: { uid: 'u1' } }))
  },
  env: { apiUrl: 'http://api.test', apiTimeout: 10000, sentryDsn: undefined },
  telemetry: { captureException: jest.fn(), captureMessage: jest.fn(), addBreadcrumb: jest.fn() },
  session: { onUnauthorized: jest.fn(), onUnauthorizedSubscribe: jest.fn(() => () => {}), onSignedOut: jest.fn() },
  alerts: { play: jest.fn(() => true), stop: jest.fn(), announce: jest.fn(), requestPermission: jest.fn(async () => 'granted') },
  ...overrides
})

afterEach(() => resetPlatform())

describe('before configuration', () => {
  it.each([
    ['storage', () => storage.get('k')],
    ['notify', () => notify('hi')],
    ['auth', () => auth.currentUser()],
    ['env', () => env.apiUrl],
    ['telemetry', () => telemetry.captureMessage('x')],
    ['session', () => session.onSignedOut()],
    ['alerts', () => alerts.play()]
  ])('using %s raises PlatformNotConfiguredError naming the capability', (capability, use) => {
    expect(use).toThrow(PlatformNotConfiguredError)
    try {
      use()
    } catch (error) {
      expect(error.capability).toBe(capability)
      expect(error.message).toContain(capability)
    }
  })

  it('reports itself as unconfigured', () => {
    expect(isPlatformConfigured()).toBe(false)
  })
})

describe('configuration', () => {
  it('refuses a second call rather than leaving two adapters live', () => {
    configurePlatform(makeAdapters())
    expect(() => configurePlatform(makeAdapters())).toThrow(PlatformAlreadyConfiguredError)
  })

  it.each([
    ['storage', { storage: { get: () => null } }, 'get(key), set(key, value) and remove(key)'],
    ['notify', { notify: 'not a function' }, 'must be a function'],
    ['auth', { auth: { currentUser: () => null } }, 'instance(), currentUser(), getIdToken(forceRefresh) and signInWithGoogle()'],
    [
      'telemetry',
      { telemetry: { captureException: () => {} } },
      'captureException(error, options), captureMessage(message, options) and addBreadcrumb'
    ],
    ['session', { session: { onUnauthorized: () => {} } }, 'onUnauthorized(options), onUnauthorizedSubscribe(handler) and onSignedOut()'],
    ['alerts', { alerts: { play: () => {} } }, 'play(), stop(), announce(title, body, options) and requestPermission()'],
    ['env', { env: { apiUrl: '', apiTimeout: 1 } }, 'apiUrl must be a non-empty string'],
    ['env', { env: { apiUrl: 'http://a', apiTimeout: 'soon' } }, 'apiTimeout must be a finite number']
  ])('rejects a malformed %s adapter at configure time', (capability, override, detail) => {
    expect(() => configurePlatform(makeAdapters(override))).toThrow(PlatformAdapterError)
    try {
      configurePlatform(makeAdapters(override))
    } catch (error) {
      expect(error.capability).toBe(capability)
      expect(error.message).toContain(detail)
    }
  })

  it('rejects a non-object', () => {
    expect(() => configurePlatform(null)).toThrow(PlatformAdapterError)
  })
})

describe('after configuration', () => {
  let adapters

  beforeEach(() => {
    adapters = makeAdapters()
    configurePlatform(adapters)
  })

  it('delegates storage synchronously, returning a value on the same tick', () => {
    const value = storage.get('firebase_token')
    expect(value).toBe('stored')
    expect(value).not.toBeInstanceOf(Promise)
    storage.set('k', 'v')
    storage.remove('k')
    expect(adapters.storage.set).toHaveBeenCalledWith('k', 'v')
    expect(adapters.storage.remove).toHaveBeenCalledWith('k')
  })

  it('defaults notify severity to error, matching the web client today', () => {
    notify('boom')
    expect(adapters.notify).toHaveBeenCalledWith('boom', 'error')
    notify('quiet', 'info')
    expect(adapters.notify).toHaveBeenCalledWith('quiet', 'info')
  })

  it('delegates auth and defaults forceRefresh to false', async () => {
    expect(auth.currentUser()).toEqual({ uid: 'u1' })
    await expect(auth.getIdToken()).resolves.toBe('token')
    expect(adapters.auth.getIdToken).toHaveBeenCalledWith(false)
    await auth.getIdToken(true)
    expect(adapters.auth.getIdToken).toHaveBeenCalledWith(true)
  })

  it('delegates telemetry', () => {
    const error = new Error('boom')
    telemetry.captureException(error, { tags: { a: 1 } })
    telemetry.captureMessage('note', { tags: { b: 2 } })
    expect(adapters.telemetry.captureException).toHaveBeenCalledWith(error, { tags: { a: 1 } })
    expect(adapters.telemetry.captureMessage).toHaveBeenCalledWith('note', { tags: { b: 2 } })
    telemetry.addBreadcrumb({ category: 'sse' })
    expect(adapters.telemetry.addBreadcrumb).toHaveBeenCalledWith({ category: 'sse' })
  })

  it('delegates session lifecycle, defaulting to no redirect', () => {
    session.onUnauthorized()
    expect(adapters.session.onUnauthorized).toHaveBeenCalledWith({})
    session.onUnauthorized({ redirect: true })
    expect(adapters.session.onUnauthorized).toHaveBeenCalledWith({ redirect: true })
    session.onSignedOut()
    expect(adapters.session.onSignedOut).toHaveBeenCalled()
  })

  it('exposes the client-built Firebase instance and its Google path', async () => {
    expect(auth.instance()).toEqual({ name: 'firebase' })
    await expect(auth.signInWithGoogle()).resolves.toEqual({ user: { uid: 'u1' } })
  })

  it('delegates alerts, which are sound and OS notifications, not in-app messages', async () => {
    expect(alerts.play()).toBe(true)
    alerts.stop()
    alerts.announce('Break over', 'Back to it')
    alerts.announce('Break over', 'Back to it', { silent: true })
    await alerts.requestPermission()
    expect(adapters.alerts.play).toHaveBeenCalled()
    expect(adapters.alerts.stop).toHaveBeenCalled()
    expect(adapters.alerts.announce).toHaveBeenNthCalledWith(1, 'Break over', 'Back to it', {})
    expect(adapters.alerts.announce).toHaveBeenNthCalledWith(2, 'Break over', 'Back to it', { silent: true })
    expect(adapters.alerts.requestPermission).toHaveBeenCalled()
  })

  it('reads env through getters', () => {
    expect(env.apiUrl).toBe('http://api.test')
    expect(env.apiTimeout).toBe(10000)
    expect(env.sentryDsn).toBeUndefined()
  })

  it('still has no DOM in scope', () => {
    expect(typeof globalThis.window).toBe('undefined')
    expect(typeof globalThis.localStorage).toBe('undefined')
  })
})
