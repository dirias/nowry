import { MIN_PASSWORD_LENGTH, passwordLongEnough } from '../authRules'
import en from '../../locales/en/translation.json'

describe('the password floor', () => {
  it('is eight, and the error message names the same number', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
    expect(en.auth.errors.passwordLength).toContain(String(MIN_PASSWORD_LENGTH))
  })

  it('accepts exactly the floor and refuses one short', () => {
    expect(passwordLongEnough('a'.repeat(MIN_PASSWORD_LENGTH))).toBe(true)
    expect(passwordLongEnough('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe(false)
    expect(passwordLongEnough(undefined)).toBe(false)
  })
})
