/**
 * Browser storage adapters.
 *
 * Centralize direct Web Storage access so application and API logic do not
 * depend on browser globals. Native clients can provide different adapters
 * (for example Firebase-supported persistence and SecureStore for secrets)
 * behind equivalent boundaries later.
 */
const getLocalStorage = () => (typeof window !== 'undefined' ? window.localStorage : null)
const getSessionStorage = () => (typeof window !== 'undefined' ? window.sessionStorage : null)

const createStorageAdapter = (getStorage) => ({
  getItem(key) {
    return getStorage()?.getItem(key) ?? null
  },

  setItem(key, value) {
    const storage = getStorage()
    if (!storage) return

    if (value === null || value === undefined) {
      storage.removeItem(key)
      return
    }

    storage.setItem(key, String(value))
  },

  removeItem(key) {
    getStorage()?.removeItem(key)
  }
})

export const browserStorage = createStorageAdapter(getLocalStorage)
export const browserSessionStorage = createStorageAdapter(getSessionStorage)

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
