/**
 * The two parts of push that are ours rather than the OS's: which screen a tap
 * opens, and the rule that registration never asks for permission.
 *
 * A notification's `data` is input from outside the app. If it could name a
 * path, whatever reaches the send path could choose a screen — so the payload
 * names a kind and an id, and a closed table decides what that means. That is
 * the whole of the security posture here, so it is what is tested.
 */
const mockGetPermissions = jest.fn()
const mockRequestPermissions = jest.fn()
const mockGetToken = jest.fn()
const mockRegisterDevice = jest.fn()
const mockDeregisterDevice = jest.fn()
const mockStore = new Map()

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: (...args) => mockGetPermissions(...args),
  requestPermissionsAsync: (...args) => mockRequestPermissions(...args),
  getExpoPushTokenAsync: (...args) => mockGetToken(...args),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() }))
}))
jest.mock('expo-constants', () => ({ expoConfig: { extra: { eas: { projectId: 'project-1' } } } }))
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }))
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }))
jest.mock('@nowry/core/api/services', () => ({
  userService: {
    registerDevice: (...args) => mockRegisterDevice(...args),
    deregisterDevice: (...args) => mockDeregisterDevice(...args)
  }
}))
jest.mock('@nowry/core', () => ({
  storage: {
    get: (key) => (mockStore.has(key) ? mockStore.get(key) : null),
    set: (key, value) => mockStore.set(key, value),
    remove: (key) => mockStore.delete(key)
  }
}))

const { registerForPush, routeFor, unregisterFromPush } = require('../push')

beforeEach(() => {
  mockStore.clear()
  mockGetPermissions.mockReset().mockResolvedValue({ granted: true })
  mockRequestPermissions.mockReset()
  mockGetToken.mockReset().mockResolvedValue({ data: 'ExponentPushToken[abc]' })
  mockRegisterDevice.mockReset().mockResolvedValue(undefined)
  mockDeregisterDevice.mockReset().mockResolvedValue(undefined)
})

describe('routeFor', () => {
  it('maps the kinds this version knows', () => {
    expect(routeFor({ kind: 'study' })).toBe('/study')
    expect(routeFor({ kind: 'focus' })).toBe('/pomodoro')
    expect(routeFor({ kind: 'deck', id: 'd1' })).toBe('/study/deck/d1')
    expect(routeFor({ kind: 'session', id: 'd1' })).toBe('/study/d1')
  })

  it('refuses a kind it does not know, rather than guessing', () => {
    expect(routeFor({ kind: 'settings' })).toBeNull()
    expect(routeFor({})).toBeNull()
    expect(routeFor(null)).toBeNull()
    expect(routeFor(undefined)).toBeNull()
  })

  it('never lets the payload supply a path', () => {
    // The obvious attempt: an id that is really a route.
    expect(routeFor({ kind: 'deck', id: '../../settings' })).toBeNull()
    expect(routeFor({ kind: 'deck', id: '/settings' })).toBeNull()
    expect(routeFor({ kind: 'session', id: 'a/b' })).toBeNull()
    // And a payload that names a path directly is simply not a kind.
    expect(routeFor({ url: '/settings' })).toBeNull()
    expect(routeFor({ kind: '/settings' })).toBeNull()
  })

  it('escapes an id rather than trusting it to be path-safe', () => {
    expect(routeFor({ kind: 'deck', id: 'a b?c' })).toBe('/study/deck/a%20b%3Fc')
  })

  it('falls back to the list when an id is missing', () => {
    expect(routeFor({ kind: 'deck' })).toBe('/study')
    expect(routeFor({ kind: 'session', id: null })).toBe('/study')
  })

  it('treats a non-string id as no id at all', () => {
    expect(routeFor({ kind: 'deck', id: 42 })).toBeNull()
    expect(routeFor({ kind: 'deck', id: { toString: () => '/settings' } })).toBeNull()
  })
})

describe('registerForPush', () => {
  it('registers with the token, the platform and the DEVICE locale', async () => {
    const token = await registerForPush()

    expect(token).toBe('ExponentPushToken[abc]')
    expect(mockGetToken).toHaveBeenCalledWith({ projectId: 'project-1' })
    expect(mockRegisterDevice).toHaveBeenCalledWith({
      token: 'ExponentPushToken[abc]',
      platform: 'android',
      locale: 'es-ES'
    })
  })

  it('never asks for permission — it only checks', async () => {
    mockGetPermissions.mockResolvedValue({ granted: false })

    expect(await registerForPush()).toBeNull()
    expect(mockRequestPermissions).not.toHaveBeenCalled()
    expect(mockRegisterDevice).not.toHaveBeenCalled()
  })

  it('is silent about every way it can fail, because push is an extra', async () => {
    mockGetToken.mockRejectedValue(new Error('no push service on this simulator'))
    await expect(registerForPush()).resolves.toBeNull()

    mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[abc]' })
    mockRegisterDevice.mockRejectedValue(new Error('offline'))
    await expect(registerForPush()).resolves.toBeNull()
  })
})

describe('unregisterFromPush', () => {
  it('withdraws the token it last registered, then forgets it', async () => {
    await registerForPush()
    await unregisterFromPush()

    expect(mockDeregisterDevice).toHaveBeenCalledWith('ExponentPushToken[abc]')
    // A second sign-out must not withdraw a token that is already gone.
    await unregisterFromPush()
    expect(mockDeregisterDevice).toHaveBeenCalledTimes(1)
  })

  it('forgets the token even when the request fails', async () => {
    await registerForPush()
    mockDeregisterDevice.mockRejectedValue(new Error('offline'))

    await unregisterFromPush()

    await unregisterFromPush()
    expect(mockDeregisterDevice).toHaveBeenCalledTimes(1)
  })
})
