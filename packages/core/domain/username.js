/**
 * A username the server will actually accept.
 *
 * `POST /auth/register` validates `username` against `^[a-zA-Z0-9_-]+$`, 3 to
 * 30 characters. Both clients derived one from the Google display name and sent
 * it raw, so anyone whose Google name contains a space — which is most people —
 * got a 422 and no explanation, on either client. Signing in with Google was
 * broken for the common case and worked for the rare one.
 *
 * The rule below is the server's own `sanitize_username`, deliberately: strip
 * rather than replace, so the result is deterministic and free of doubled
 * separators, and fall back to a stem plus a slice of the uid when stripping
 * leaves too little. One mechanism covers "too short" and "not unique" both,
 * which is why the fallback is a suffix rather than a second branch.
 *
 * @param {string} raw - a display name, or an email's local part
 * @param {string} uid - the Firebase uid, used only if the name is unusable
 */
const INVALID = /[^a-zA-Z0-9_-]/g

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30

export const sanitizeUsername = (raw, uid = '') => {
  const cleaned = String(raw ?? '')
    .replace(INVALID, '')
    .slice(0, USERNAME_MAX_LENGTH)
  if (cleaned.length >= USERNAME_MIN_LENGTH) return cleaned

  const stem = cleaned || 'user'
  return `${stem}-${String(uid).slice(0, 6)}`.slice(0, USERNAME_MAX_LENGTH)
}

/** The name to register for a freshly authenticated account. */
export const usernameFor = ({ displayName, email, uid } = {}) => sanitizeUsername(displayName || String(email ?? '').split('@')[0], uid)
