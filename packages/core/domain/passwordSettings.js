/**
 * Settings → Security, the password part (ADR-092, FR-044..046). Platform-free.
 */
import { reauthMethod } from './recentSignIn'

export const MIN_PASSWORD_LENGTH = 8

/** What the section offers: 'change' with a password, 'set' for a Google-only account, null otherwise. */
export const passwordMode = (providerIds = []) => {
  if (providerIds.includes('password')) return 'change'
  return reauthMethod(providerIds) === 'google' ? 'set' : null
}

/** Whether Google sign-in is also connected to an account that has a password. */
export const googleAlsoConnected = (providerIds = []) => providerIds.includes('password') && providerIds.includes('google.com')

/** The form's own refusal before anything is sent, as a translation key, or null. */
export const newPasswordProblem = (password, confirmation) => {
  if (String(password ?? '').length < MIN_PASSWORD_LENGTH) return 'settings.security.passwordTooShort'
  if (password !== confirmation) return 'settings.security.passwordMismatch'
  return null
}

/** An API refusal as `{ key, values }` for the screen. */
export const passwordRefusal = (error) => {
  const detail = error?.response?.data?.detail
  const code = typeof detail === 'object' ? detail?.code : null
  if (code === 'wrong_password') return { key: 'settings.security.wrongPassword' }
  if (code === 'too_many_attempts')
    return { key: 'settings.security.tooManyAttempts', values: { minutes: Math.max(1, Math.ceil((detail.retry_after || 60) / 60)) } }
  if (code === 'reauth_required') return { key: 'settings.security.reauthGoogle' }
  if (code === 'has_password' || code === 'no_password') return { key: 'settings.security.reload' }
  return { key: 'settings.security.passwordChangeFailed' }
}
