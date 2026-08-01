import { AUTH_STORAGE_KEYS, authStorage, browserSessionStorage, browserStorage } from './storage'

describe('browser storage adapters', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('reads and writes local values', () => {
    browserStorage.setItem('example', 'value')
    expect(browserStorage.getItem('example')).toBe('value')
  })

  it('reads and writes session values independently', () => {
    browserSessionStorage.setItem('example', 'session-value')

    expect(browserSessionStorage.getItem('example')).toBe('session-value')
    expect(browserStorage.getItem('example')).toBeNull()
  })

  it('removes values when null or undefined is assigned', () => {
    browserStorage.setItem('example', 'value')
    browserStorage.setItem('example', null)
    expect(browserStorage.getItem('example')).toBeNull()
  })

  it('stores and clears authentication values', () => {
    authStorage.setToken('token')
    window.localStorage.setItem(AUTH_STORAGE_KEYS.firebaseUser, '{"id":"1"}')

    expect(authStorage.getToken()).toBe('token')

    authStorage.clear()

    expect(window.localStorage.getItem(AUTH_STORAGE_KEYS.firebaseToken)).toBeNull()
    expect(window.localStorage.getItem(AUTH_STORAGE_KEYS.firebaseUser)).toBeNull()
  })
})
