import fs from 'fs'
import path from 'path'
import { AUTH_ERROR_CODES, FALLBACK_KEY, authErrorKey } from '../authErrors'

const en = JSON.parse(fs.readFileSync(path.join(__dirname, '../../locales/en/translation.json'), 'utf8'))
const lookup = (key) => key.split('.').reduce((node, part) => node?.[part], en)

describe('authErrorKey', () => {
  it('always returns a key, even for a code it has never seen', () => {
    expect(authErrorKey({ code: 'auth/some-future-code' })).toBe(FALLBACK_KEY)
    expect(authErrorKey({})).toBe(FALLBACK_KEY)
    expect(authErrorKey(null)).toBe(FALLBACK_KEY)
    expect(authErrorKey(undefined)).toBe(FALLBACK_KEY)
  })

  it('gives a wrong password and an unknown account the same message', () => {
    // Distinguishing them tells an attacker which addresses have accounts.
    const wrong = authErrorKey({ code: 'auth/wrong-password' })
    expect(authErrorKey({ code: 'auth/user-not-found' })).toBe(wrong)
    expect(authErrorKey({ code: 'auth/invalid-credential' })).toBe(wrong)
  })

  it('maps every code to a key that actually exists in the bundle', () => {
    // A key with no translation renders as the key itself, on screen, to a user.
    const missing = [...AUTH_ERROR_CODES.map(authErrorKey), FALLBACK_KEY].filter((key) => typeof lookup(key) !== 'string')
    expect(missing).toEqual([])
  })

  it('covers the codes the web screens already handled', () => {
    // Extracted from Login.js and Register.js; nothing regressed in the move.
    ;[
      'auth/invalid-credential',
      'auth/invalid-email',
      'auth/user-disabled',
      'auth/too-many-requests',
      'auth/network-request-failed',
      'auth/popup-closed-by-user',
      'auth/popup-blocked',
      'auth/account-exists-with-different-credential'
    ].forEach((code) => expect(authErrorKey({ code })).not.toBe(FALLBACK_KEY))
  })
})
