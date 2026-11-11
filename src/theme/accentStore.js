/**
 * The member's accent, remembered on this device (ADR-074 §3).
 *
 * The session is read asynchronously, so on a reload the theme used to start
 * as a guest's and repaint when the account arrived. Keeping the last accent
 * here lets the first render wear it. It is written while someone is signed
 * in and removed when they sign out; a guest has none.
 *
 * Storage can be unavailable (private windows, blocked site data): every call
 * is guarded, and without it the theme behaves as it did before.
 */
const KEY = 'nowry-accent'
const HEX = /^#[0-9a-f]{6}$/i

export const readStoredAccent = () => {
  try {
    const value = window.localStorage.getItem(KEY)
    return value && HEX.test(value) ? value : null
  } catch (error) {
    return null
  }
}

export const storeAccent = (hex) => {
  try {
    if (HEX.test(hex)) window.localStorage.setItem(KEY, hex)
  } catch (error) {
    // Not remembered; the theme still works.
  }
}

export const clearStoredAccent = () => {
  try {
    window.localStorage.removeItem(KEY)
  } catch (error) {
    // Nothing to clear.
  }
}

/**
 * Who the theme is for. A guest wears the brand. While the session is still
 * being read, a device that remembers an accent is treated as its member's.
 */
export const wearsBrand = ({ user, loading, storedAccent }) => !user && !(loading && storedAccent)
