/**
 * Firebase error code → translation key.
 *
 * Extracted in MOB-016. The web had this switch written out at each auth
 * screen, which is how `auth/network-request-failed` ended up handled on two of
 * three and how a fourth client would have got a fourth version of it.
 *
 * It returns a KEY, never a rendered string: this module has no `t()` and must
 * not. That is also what makes the mobile client's messages identical to the
 * web's by construction rather than by copying — both call this, and both
 * translate the answer with the same bundle.
 *
 * Every key below exists in all five locales; `localeCoverage.test.js` is what
 * keeps that true.
 */

/** The codes both clients meet, mapped to the keys the app already ships. */
const CODE_TO_KEY = {
  // A wrong password and an unknown account deliberately give the SAME message.
  // Distinguishing them tells an attacker which addresses have accounts.
  'auth/invalid-credential': 'auth.errors.invalidCredentials',
  'auth/wrong-password': 'auth.errors.invalidCredentials',
  'auth/user-not-found': 'auth.errors.invalidCredentials',

  'auth/invalid-email': 'auth.errors.emailInvalid',
  'auth/user-disabled': 'auth.errors.accountDisabled',
  'auth/too-many-requests': 'auth.errors.tooManyAttempts',
  'auth/network-request-failed': 'auth.errors.networkError',
  'auth/weak-password': 'auth.errors.passwordLength',
  'auth/email-already-in-use': 'auth.errors.accountExistsDifferent',

  // Web-only, kept here so the table is one table rather than two.
  'auth/popup-closed-by-user': 'auth.errors.googleCancelled',
  'auth/popup-blocked': 'auth.errors.popupBlocked',
  'auth/account-exists-with-different-credential': 'auth.errors.accountExistsDifferent'
}

/** What to say when the code is one we have never seen. */
export const FALLBACK_KEY = 'auth.errors.loginFailed'

/**
 * @param {{code?: string}} error - a rejected Firebase error
 * @returns {string} a translation key, always
 */
export const authErrorKey = (error) => CODE_TO_KEY[error?.code] ?? FALLBACK_KEY

/** Exposed for tests and for anything that needs to enumerate the table. */
export const AUTH_ERROR_CODES = Object.keys(CODE_TO_KEY)

export default authErrorKey
