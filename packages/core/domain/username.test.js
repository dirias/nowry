/**
 * The rule the server enforces, applied before the request is sent.
 *
 * Written after Google sign-in returned 422 with no explanation for any account
 * whose display name contains a space — which is most accounts. The client sent
 * the name raw; the server's pattern is `^[a-zA-Z0-9_-]+$`.
 */
import { sanitizeUsername, usernameFor } from './username'

describe('sanitizeUsername', () => {
  it('strips a space, which is the case that broke Google sign-in', () => {
    expect(sanitizeUsername('Didier Irias', 'abc123xyz')).toBe('DidierIrias')
  })

  it('strips rather than replaces, so nothing gains a separator it never had', () => {
    // Replacing with '-' would give "rikydier-nu1" and quietly invent a name.
    expect(sanitizeUsername('rikydier+nu1', 'abc123')).toBe('rikydiernu1')
    expect(sanitizeUsername('a.b.c', 'abc123')).toBe('abc')
  })

  it('keeps what the pattern already allows', () => {
    expect(sanitizeUsername('didier_irias-1', 'abc123')).toBe('didier_irias-1')
  })

  it('falls back to a uid suffix when stripping leaves too little', () => {
    expect(sanitizeUsername('李', 'abc123def')).toBe('user-abc123')
    expect(sanitizeUsername('', 'abc123def')).toBe('user-abc123')
    // Two characters is under the floor, so it is padded rather than sent.
    expect(sanitizeUsername('Jo', 'abc123def')).toBe('Jo-abc123')
  })

  it("never exceeds the server's maximum", () => {
    const long = 'x'.repeat(80)
    expect(sanitizeUsername(long, 'abc123').length).toBe(30)
    expect(sanitizeUsername('!'.repeat(80), 'abcdefghijklmnop').length).toBeLessThanOrEqual(30)
  })

  it('always returns something the server pattern accepts', () => {
    const pattern = /^[a-zA-Z0-9_-]+$/
    for (const raw of ['Didier Irias', 'a b', '', '???', '李雷', 'ok', 'x'.repeat(99)]) {
      const name = sanitizeUsername(raw, 'abc123def')
      expect(name).toMatch(pattern)
      expect(name.length).toBeGreaterThanOrEqual(3)
      expect(name.length).toBeLessThanOrEqual(30)
    }
  })
})

describe('usernameFor', () => {
  it('prefers the display name', () => {
    expect(usernameFor({ displayName: 'Didier Irias', email: 'a@b.com', uid: 'u1' })).toBe('DidierIrias')
  })

  it('falls back to the email local part when there is no display name', () => {
    expect(usernameFor({ displayName: null, email: 'didier.irias@gmail.com', uid: 'u1' })).toBe('didieririas')
  })

  it('survives an account with neither', () => {
    expect(usernameFor({ uid: 'abc123def' })).toBe('user-abc123')
    expect(usernameFor()).toMatch(/^[a-zA-Z0-9_-]+$/)
  })
})
