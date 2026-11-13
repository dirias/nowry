import { isSignInProblem, signInProblem, signInProblemKey } from '../signInProblem'

const refused = (status, code) => ({ response: { status, data: code === undefined ? {} : { detail: { code } } } })

describe('signInProblem (ADR-083)', () => {
  it.each([
    [403, 'beta_invite_required', 'invite'],
    [403, 'invite_verify_email', 'verifyEmail'],
    [409, 'email_unverified', 'verifyEmail'],
    [409, 'account_conflict', 'account'],
    [404, undefined, 'account'],
    [404, 'anything', 'account']
  ])('%s %s reads as %s', (status, code, reason) => {
    expect(signInProblem(refused(status, code))).toBe(reason)
  })

  it.each([
    ['a 401', refused(401)],
    ['another 403', refused(403, 'upgrades_closed')],
    ['a 403 with a string detail', { response: { status: 403, data: { detail: 'Forbidden' } } }],
    ['another 409', refused(409, 'username_taken')],
    ['a 500', refused(500)],
    ['no response', new Error('Network Error')],
    ['nothing', null],
    ['an invite code on the wrong status', refused(409, 'beta_invite_required')]
  ])('%s is none of them', (_label, error) => {
    expect(signInProblem(error)).toBeNull()
  })

  it('knows its three reasons and their keys, and nothing else', () => {
    expect(isSignInProblem('account')).toBe(true)
    expect(isSignInProblem('other')).toBe(false)
    expect(isSignInProblem(null)).toBe(false)
    expect(signInProblemKey('invite')).toBe('auth.signInProblem.invite')
    expect(signInProblemKey('verifyEmail')).toBe('auth.signInProblem.verifyEmail')
    expect(signInProblemKey('account')).toBe('auth.signInProblem.account')
    expect(signInProblemKey('bogus')).toBeNull()
  })
})

it('isEmailUnverifiedRefusal reads only the 409', () => {
  const { isEmailUnverifiedRefusal } = require('../signInProblem')
  expect(isEmailUnverifiedRefusal(refused(409, 'email_unverified'))).toBe(true)
  expect(isEmailUnverifiedRefusal(refused(403, 'email_unverified'))).toBe(false)
  expect(isEmailUnverifiedRefusal(refused(409, 'account_conflict'))).toBe(false)
})
