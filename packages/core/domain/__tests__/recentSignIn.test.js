/** ADR-089, FR-038: a deletion needs a sign-in less than five minutes old. */
import {
  isReauthCancelled,
  isReauthRequired,
  reauthCancelled,
  reauthErrorKey,
  reauthMethod,
  reauthMethods,
  signedInRecently,
  RECENT_SIGN_IN_SECONDS
} from '../recentSignIn'

const NOW = Date.UTC(2026, 10, 14, 12, 0, 0)
const secondsAgo = (s) => NOW / 1000 - s

test('a sign-in a minute ago is recent; one past the limit (less the margin) is not', () => {
  expect(signedInRecently(secondsAgo(60), NOW)).toBe(true)
  expect(signedInRecently(secondsAgo(RECENT_SIGN_IN_SECONDS - 16), NOW)).toBe(true)
  expect(signedInRecently(secondsAgo(RECENT_SIGN_IN_SECONDS - 10), NOW)).toBe(false)
  expect(signedInRecently(secondsAgo(3600), NOW)).toBe(false)
})

test('no sign-in time is never recent', () => {
  for (const value of [null, undefined, 0, 'x', NaN]) expect(signedInRecently(value, NOW)).toBe(false)
})

test('the API refusal is recognised and nothing else is', () => {
  expect(isReauthRequired({ response: { status: 401, data: { detail: { code: 'reauth_required' } } } })).toBe(true)
  expect(isReauthRequired({ response: { status: 401, data: { detail: 'Invalid token' } } })).toBe(false)
  expect(isReauthRequired({ response: { status: 409, data: { detail: { code: 'reauth_required' } } } })).toBe(false)
  expect(isReauthRequired(undefined)).toBe(false)
})

test('a password account proves it with its password, a Google-only one with Google', () => {
  expect(reauthMethod(['google.com', 'password'])).toBe('password')
  expect(reauthMethod(['google.com'])).toBe('google')
  expect(reauthMethod([])).toBe(null)
})

test('the shared dialog offers every way the account signs in, Google first (ADMIN-008b, board J)', () => {
  expect(reauthMethods(['password', 'google.com'])).toEqual(['google', 'password'])
  expect(reauthMethods(['google.com'])).toEqual(['google'])
  expect(reauthMethods(['password'])).toEqual(['password'])
  expect(reauthMethods(['github.com'])).toEqual([])
  expect(reauthMethods()).toEqual([])
})

test('a cancelled sign-in is an answer of its own, never an API error', () => {
  const error = reauthCancelled()
  expect(isReauthCancelled(error)).toBe(true)
  expect(isReauthRequired(error)).toBe(false)
  expect(isReauthCancelled(new Error('boom'))).toBe(false)
  expect(isReauthCancelled(undefined)).toBe(false)
})

test('a wrong password says so; any other failure is general', () => {
  expect(reauthErrorKey({ code: 'auth/wrong-password' })).toBe('reauth.wrongPassword')
  expect(reauthErrorKey({ code: 'auth/invalid-credential' })).toBe('reauth.wrongPassword')
  expect(reauthErrorKey({ code: 'auth/popup-closed-by-user' })).toBe('reauth.failed')
  expect(reauthErrorKey(undefined)).toBe('reauth.failed')
})
