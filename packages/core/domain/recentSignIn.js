/**
 * Deleting an account needs a recent sign-in (ADR-089, FR-038).
 *
 * The API refuses `DELETE /users/account` when the token's `auth_time` is more
 * than five minutes old; the clients check first so the person is asked for
 * their sign-in inside the dialog instead of after a failed call. Platform-free.
 */

/** How old a sign-in may be when the account is deleted, in seconds. */
export const RECENT_SIGN_IN_SECONDS = 300

/** The API's refusal code for an old sign-in. */
export const REAUTH_REQUIRED_CODE = 'reauth_required'

/**
 * Whether a sign-in at `authTimeSeconds` (seconds since the epoch) is recent
 * enough. A small margin under the API's limit leaves room for the call itself.
 */
export const signedInRecently = (authTimeSeconds, nowMs = Date.now(), marginSeconds = 15) => {
  const authTime = Number(authTimeSeconds)
  if (!Number.isFinite(authTime) || authTime <= 0) return false
  return nowMs / 1000 - authTime <= RECENT_SIGN_IN_SECONDS - marginSeconds
}

/** Whether an API error is the refusal for an old sign-in. */
export const isReauthRequired = (error) => error?.response?.status === 401 && error?.response?.data?.detail?.code === REAUTH_REQUIRED_CODE

/**
 * How this account signs in again: 'password' when it has a password, else
 * 'google' when it has Google, else null. `providerIds` are Firebase's
 * `providerData[].providerId` values.
 */
export const reauthMethod = (providerIds = []) => {
  if (providerIds.includes('password')) return 'password'
  if (providerIds.includes('google.com')) return 'google'
  return null
}
