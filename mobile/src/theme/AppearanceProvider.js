/**
 * What the app looks like, and who decides (MOB-025).
 *
 * Two settings meet here and they are stored in different places, on purpose:
 *
 *   - **Light or dark is a device preference.** It belongs to the phone in your
 *     hand, not to the account, so it lives in MMKV and never leaves. `system`
 *     is the default and means "whatever the OS says", which is the only value
 *     that keeps following the OS when the OS changes.
 *   - **The accent colour belongs to the account.** The web writes it to
 *     `preferences.theme_color` and both clients feed the same hex to the same
 *     `generateColorScheme`, so a colour chosen on either one produces the same
 *     palette on the other.
 *
 * The accent is held here as well as on the server so a tap repaints the app at
 * once. The settings screen writes the server copy through
 * `useProgressivePreferences` and this copy through `setAccent`; waiting for a
 * profile refetch to see your own colour change would feel broken.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { storage } from '@nowry/core'
import { useUserProfile } from '@nowry/core/hooks/useUserProfile'
import { ThemeProvider } from './index'
import { DEFAULT_THEME_COLOR } from './buildTheme'

const MODE_KEY = 'NOWRY_APPEARANCE_MODE'

export const MODES = ['system', 'light', 'dark']

const AppearanceContext = createContext(null)

/** The web reads both shapes, because older documents carry the flat one. */
const accentFromProfile = (profile) => profile?.preferences?.general?.theme_color ?? profile?.preferences?.theme_color ?? null

const readMode = () => {
  const saved = storage.get(MODE_KEY)
  return MODES.includes(saved) ? saved : 'system'
}

export function AppearanceProvider({ children }) {
  const { profile } = useUserProfile()
  const [mode, setModeState] = useState(readMode)
  const [accent, setAccent] = useState(null)

  // The account's colour, once it arrives. A colour already chosen locally in
  // this session is not overwritten by a later refetch of the same value.
  useEffect(() => {
    const saved = accentFromProfile(profile)
    if (saved) setAccent(saved)
  }, [profile])

  const setMode = useCallback((next) => {
    if (!MODES.includes(next)) return
    setModeState(next)
    storage.set(MODE_KEY, next)
  }, [])

  return (
    <AppearanceContext.Provider value={{ mode, setMode, accent: accent ?? DEFAULT_THEME_COLOR, setAccent }}>
      {/* `scheme: undefined` hands the decision back to the OS. */}
      <ThemeProvider themeColor={accent ?? DEFAULT_THEME_COLOR} scheme={mode === 'system' ? undefined : mode}>
        {children}
      </ThemeProvider>
    </AppearanceContext.Provider>
  )
}

export function useAppearance() {
  const value = useContext(AppearanceContext)
  if (!value) throw new Error('useAppearance must be used within an AppearanceProvider')
  return value
}

export default AppearanceProvider
