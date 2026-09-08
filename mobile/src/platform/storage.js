/**
 * The mobile storage adapter: MMKV.
 *
 * MMKV was chosen because it is SYNCHRONOUS (ADR-027). The shared layer reads
 * and writes storage in about thirty places that were written against
 * `localStorage`, and an async store would have turned a rename into a
 * migration that rippled into every caller.
 *
 * Every call is wrapped. A storage failure must never take down a screen: the
 * web adapter inherits `localStorage`'s throwing behaviour deliberately, but
 * there is no equivalent expectation here, and a device with no writable
 * storage should degrade rather than crash.
 */
import { createMMKV } from 'react-native-mmkv'

const mmkv = createMMKV({ id: 'nowry' })

export const mobileStorage = {
  get: (key) => {
    try {
      const value = mmkv.getString(key)
      // The port's contract is localStorage's: a missing key reads as null.
      return value === undefined ? null : value
    } catch {
      return null
    }
  },
  set: (key, value) => {
    try {
      mmkv.set(key, String(value))
    } catch {
      // Nothing the caller can do about a full or locked store.
    }
  },
  remove: (key) => {
    try {
      mmkv.remove(key)
    } catch {
      // As above.
    }
  }
}

/**
 * The same store, shaped as the AsyncStorage-like interface Firebase's React
 * Native persistence expects: three async methods. Firebase never needs it to
 * be synchronous, so this is a thin promise wrapper rather than a second store.
 */
export const firebasePersistenceStore = {
  getItem: async (key) => mobileStorage.get(key),
  setItem: async (key, value) => mobileStorage.set(key, value),
  removeItem: async (key) => mobileStorage.remove(key)
}

export default mobileStorage
