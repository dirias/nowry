/**
 * Browser storage adapter.
 *
 * Centralizes direct Web Storage access so application and API logic do not
 * depend on browser globals. Native clients can provide a different adapter
 * (for example SecureStore for secrets) behind the same call sites later.
 */
const getLocalStorage = () => (typeof window !== 'undefined' ? window.localStorage : null)

export const browserStorage = {
  getItem(key) {
    return getLocalStorage()?.getItem(key) ?? null
  },

  setItem(key, value) {
    const storage = getLocalStorage()
    if (!storage) return

    if (value === null || value === undefined) {
      storage.removeItem(key)
      return
    }

    storage.setItem(key, String(value))
  },

  removeItem(key) {
    getLocalStorage()?.removeItem(key)
  }
}

export const AUTH_STORAGE_KEYS = Object.freeze({
  firebaseToken: 'firebase_token',
  firebaseUser: 'firebase_user'
})

export const authStorage = {
  getToken() {
    return browserStorage.getItem(AUTH_STORAGE_KEYS.firebaseToken)
  },

  setToken(token) {
    browserStorage.setItem(AUTH_STORAGE_KEYS.firebaseToken, token)
  },

  clear() {
    browserStorage.removeItem(AUTH_STORAGE_KEYS.firebaseToken)
    browserStorage.removeItem(AUTH_STORAGE_KEYS.firebaseUser)
  }
}
