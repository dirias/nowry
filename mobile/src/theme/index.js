/**
 * The mobile theme runtime (MOB-009).
 *
 * What the web gets from Joy's CssVarsProvider, assembled by hand: the semantic
 * palette for the current scheme, the token scales, elevation by layer name and
 * motion. A screen reads `useTheme()` and never sees a hex value or a numeric
 * shade — the same rule the web enforces through `no-restricted-syntax`.
 *
 * The merging itself is in `buildTheme.js`, which is pure and therefore
 * testable; this file is only the React around it.
 *
 * Dark mode is `useColorScheme()`, which React Native re-reports when the OS
 * setting changes, so the tree restyles in place rather than remounting.
 */
import { createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { buildTheme, DEFAULT_THEME_COLOR } from './buildTheme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children, themeColor = DEFAULT_THEME_COLOR, scheme: forced }) {
  // `forced` overrides the OS. The harness passes it to show both schemes at
  // once; `AppearanceProvider` passes it for a user who has chosen light or
  // dark explicitly. `undefined` means "follow the OS", and keeps following it.
  const os = useColorScheme() === 'dark' ? 'dark' : 'light'
  const scheme = forced ?? os
  const theme = useMemo(() => buildTheme(scheme, themeColor), [scheme, themeColor])
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const theme = useContext(ThemeContext)
  if (!theme) throw new Error('useTheme must be used within a ThemeProvider')
  return theme
}

export { buildTheme, DEFAULT_THEME_COLOR } from './buildTheme'
export { ELEVATION } from './elevation'
export { useMotion, useReduceMotion } from './motion'
export { DURATION, EASING } from './motionTokens'

export { AppearanceProvider, useAppearance, MODES } from './AppearanceProvider'
