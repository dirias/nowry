/**
 * The remembered accent (ADR-074 §3): a member's reload starts in their own
 * colours, and signing out leaves nothing behind.
 */
import React from 'react'
import { act, render } from '@testing-library/react'
import { clearStoredAccent, readStoredAccent, storeAccent, wearsBrand } from '../accentStore'

let mockAuth = { user: null, loading: true }
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => mockAuth }))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en', changeLanguage: jest.fn() } }) }))

import { DynamicThemeProvider, useThemePreferences } from '../DynamicThemeProvider'

const KEY = 'nowry-accent'
const ROSE = '#924968'

beforeEach(() => {
  window.localStorage.clear()
  mockAuth = { user: null, loading: true }
})

describe('the store', () => {
  it('keeps a hex and nothing else', () => {
    storeAccent(ROSE)
    expect(readStoredAccent()).toBe(ROSE)
    storeAccent('javascript:alert(1)')
    expect(readStoredAccent()).toBe(ROSE)
    window.localStorage.setItem(KEY, 'not-a-colour')
    expect(readStoredAccent()).toBeNull()
    clearStoredAccent()
    expect(window.localStorage.getItem(KEY)).toBeNull()
  })

  it('reads as empty when storage throws', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readStoredAccent()).toBeNull()
    getItem.mockRestore()
  })
})

describe('who wears the brand', () => {
  it('is a guest, once the session is known to be empty', () => {
    expect(wearsBrand({ user: null, loading: false, storedAccent: null })).toBe(true)
    expect(wearsBrand({ user: null, loading: false, storedAccent: ROSE })).toBe(true)
  })

  it('is not a member, nor a device that remembers one while the session is read', () => {
    expect(wearsBrand({ user: { id: 1 }, loading: false, storedAccent: null })).toBe(false)
    expect(wearsBrand({ user: null, loading: true, storedAccent: ROSE })).toBe(false)
    expect(wearsBrand({ user: null, loading: true, storedAccent: null })).toBe(true)
  })
})

describe('the provider', () => {
  let seen
  const Probe = () => {
    seen = useThemePreferences().themeColor
    return null
  }
  const mount = () =>
    render(
      <DynamicThemeProvider>
        <Probe />
      </DynamicThemeProvider>
    )

  it('starts in the remembered accent, before the session is read', () => {
    window.localStorage.setItem(KEY, ROSE)
    mount()
    expect(seen).toBe(ROSE)
    expect(window.localStorage.getItem(KEY)).toBe(ROSE)
  })

  it("remembers the member's accent once the account arrives", async () => {
    mockAuth = { user: { preferences: { general: { theme_color: ROSE } } }, loading: false }
    await act(async () => {
      mount()
    })
    expect(seen).toBe(ROSE)
    expect(window.localStorage.getItem(KEY)).toBe(ROSE)
  })

  it('forgets it when the session turns out to be empty, as after signing out', async () => {
    window.localStorage.setItem(KEY, ROSE)
    mockAuth = { user: null, loading: false }
    await act(async () => {
      mount()
    })
    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(seen).not.toBe(ROSE)
  })
})
