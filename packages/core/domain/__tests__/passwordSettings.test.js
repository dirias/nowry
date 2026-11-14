/** ADR-092: which password form an account sees, and how the API's refusals read. */
import { googleAlsoConnected, newPasswordProblem, passwordMode, passwordRefusal } from '../passwordSettings'

test('a password account changes it, a Google-only one sets one, anything else sees nothing', () => {
  expect(passwordMode(['password'])).toBe('change')
  expect(passwordMode(['google.com', 'password'])).toBe('change')
  expect(passwordMode(['google.com'])).toBe('set')
  expect(passwordMode([])).toBe(null)
  expect(googleAlsoConnected(['google.com', 'password'])).toBe(true)
  expect(googleAlsoConnected(['password'])).toBe(false)
})

test('the new password is 8 characters or more and matches its confirmation', () => {
  expect(newPasswordProblem('short', 'short')).toBe('settings.security.passwordTooShort')
  expect(newPasswordProblem('long-enough-1', 'long-enough-2')).toBe('settings.security.passwordMismatch')
  expect(newPasswordProblem('long-enough-1', 'long-enough-1')).toBe(null)
})

test("the API's refusals become plain messages", () => {
  const refusal = (status, detail) => ({ response: { status, data: { detail } } })
  expect(passwordRefusal(refusal(400, { code: 'wrong_password' }))).toEqual({ key: 'settings.security.wrongPassword' })
  expect(passwordRefusal(refusal(429, { code: 'too_many_attempts', retry_after: 1500 }))).toEqual({
    key: 'settings.security.tooManyAttempts',
    values: { minutes: 25 }
  })
  expect(passwordRefusal(refusal(401, { code: 'reauth_required' })).key).toBe('settings.security.reauthGoogle')
  expect(passwordRefusal(new Error('network')).key).toBe('settings.security.passwordChangeFailed')
})
