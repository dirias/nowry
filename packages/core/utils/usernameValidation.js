/**
 * Client-side mirror of the constraint the backend enforces on username
 * (Nowry-API/app/routers/users.py, ProfilePatchRequest.username): 3–30
 * characters, letters/numbers/underscore/hyphen only.
 *
 * Shared by AccountSettings.js and UserProfile.js — the two surfaces that
 * both edit `username` via `userService.patchProfile` — so a malformed value
 * is caught before the round trip instead of drifting into a 422 the UI
 * doesn't explain, and so the rule can't quietly diverge between the two
 * screens.
 */
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/
const MIN_LENGTH = 3
const MAX_LENGTH = 30

/**
 * @param {string} username - raw (untrimmed) input value
 * @param {(key: string) => string} t - i18next translate function
 * @returns {string|null} translated error message, or null if valid
 */
export function getUsernameValidationError(username, t) {
  const trimmed = (username || '').trim()
  if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH || !USERNAME_PATTERN.test(trimmed)) {
    return t('settings.account.usernameInvalid')
  }
  return null
}
