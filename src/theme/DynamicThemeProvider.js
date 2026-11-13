import React, { createContext, useState, useEffect, useContext, useMemo } from 'react'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles'
import CssBaseline from '@mui/joy/CssBaseline'
import GlobalStyles from '@mui/joy/GlobalStyles'
import { MOTION } from '@nowry/core/tokens/tokens'

import { DEFAULT_ACCENT, generateBrandScheme, generateColorScheme } from '@nowry/core/tokens/colorSchemeGenerator'
import themeConfig from './theme'
import { components } from './components'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'
import { clearStoredAccent, readStoredAccent, storeAccent, wearsBrand } from './accentStore'
import { readDarkPreview } from './darkPreview'

// Context to allow other components to update theme settings
export const ThemePreferencesContext = createContext({
  themeColor: DEFAULT_ACCENT,
  setThemeColor: () => {},
  memberDark: false
})

export const useThemePreferences = () => useContext(ThemePreferencesContext)

/**
 * Font smoothing — a single switch, deliberately not buried in the styles object.
 *
 * Joy's CssBaseline sets `WebkitFontSmoothing: 'antialiased'` and
 * `MozOsxFontSmoothing: 'grayscale'` on `html` unconditionally. Both are a
 * 2010s workaround: they force greyscale antialiasing and, on macOS, render
 * text noticeably lighter than the browser default. Current guidance is that
 * they degrade rendering rather than improve it.
 *
 * That mattered here because three effects were stacking in the same
 * direction — Inter renders lighter and wider than SF Pro, `antialiased`
 * lightens it further, and dark mode on a near-black page is where thin text degrades
 * worst. Nobody had seen them separated.
 *
 * 'auto' restores the browser default (subpixel antialiasing on macOS/Windows).
 * Set this to 'antialiased' to restore Joy's behaviour — that one edit is the
 * whole revert, and the MozOsx value follows from it.
 */
const FONT_SMOOTHING = 'auto'

/**
 * Build the finished Joy theme for one theme colour.
 *
 * Exported and pure so the merge can be asserted on directly. The specific
 * regression this guards is a token scale — fontSize, radius, a custom
 * typography level — surviving `theme.js` but being dropped or flattened here,
 * which renders identically until someone changes the theme colour.
 *
 * This is the app's ONLY `extendTheme` call site; `theme.js` exports a plain
 * object precisely so that nothing is extended twice.
 *
 * Each colorScheme spreads its own base entry before overriding `palette`.
 * Today only `palette` exists there, so this is behaviourally identical — the
 * point is that a future `shadowRing` / `shadowChannel` / `shadowOpacity` added
 * to `theme.js` would otherwise be dropped on the floor here without a single
 * error to show for it.
 */
/** `#rrggbb` → Joy's channel form, `r g b`. */
const channelOf = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)).join(' ')

const TEXT_TONES = ['primary', 'success', 'warning', 'danger']

/**
 * Joy draws a Link, a `<Typography color='warning'>` and the page's two glows
 * from a tone's `mainChannel`, which it takes from the 500 step — a mid step
 * no test holds to text contrast (3.4:1 on paper). Pointing it at the plain
 * colour makes them the colour the ladder already guarantees at 4.5:1
 * (ADR-074 §6).
 */
const withLinkChannel = (palette) => ({
  ...palette,
  ...Object.fromEntries(TEXT_TONES.map((tone) => [tone, { ...palette[tone], mainChannel: channelOf(palette[tone].plainColor) }]))
})

/**
 * `brand: true` is the guest's palette (ADR-074 §3): the brand's tone as the
 * primary. Signed in, the primary is the learner's accent. `memberDark` is the
 * near-black dark ladder behind the preview flag (ADR-082); it never applies
 * to a guest.
 */
export const buildDynamicTheme = (themeColor, { brand = false, memberDark = false } = {}) => {
  const generated = brand ? generateBrandScheme() : generateColorScheme(themeColor, { memberDark })
  const colorScheme = { light: withLinkChannel(generated.light), dark: withLinkChannel(generated.dark) }

  return extendTheme({
    ...themeConfig,
    // CAL-009: the house button, theme-wide. See ./components.js.
    components,
    colorSchemes: {
      light: {
        ...themeConfig.colorSchemes.light,
        palette: { ...themeConfig.colorSchemes.light.palette, ...colorScheme.light }
      },
      dark: {
        ...themeConfig.colorSchemes.dark,
        palette: { ...themeConfig.colorSchemes.dark.palette, ...colorScheme.dark }
      }
    }
  })
}

export const DynamicThemeProvider = ({ children }) => {
  // The accent this device remembers, read once and before the first render,
  // so a member's reload does not start in the guest's colours (ADR-074 §3).
  const [storedAccent] = useState(readStoredAccent)
  const [darkPreview] = useState(readDarkPreview)
  const [themeColor, setThemeColor] = useState(storedAccent ?? DEFAULT_ACCENT)
  const { user, loading } = useAuth()
  const { i18n } = useTranslation()

  // Update theme when user changes.
  // Preferences are stored under preferences.general.* in the backend.
  useEffect(() => {
    const general = user?.preferences?.general
    if (!general) return

    if (general.theme_color) {
      setThemeColor(general.theme_color)
    }

    if (general.language && i18n.language !== general.language) {
      i18n.changeLanguage(general.language)
    }
  }, [user, i18n])

  // Generate dynamic theme based on color
  // Remember the accent while someone is signed in; forget it when the session
  // is known to be empty, which is what signing out leaves.
  useEffect(() => {
    if (user) storeAccent(themeColor)
    else if (!loading) {
      clearStoredAccent()
      setThemeColor(DEFAULT_ACCENT)
    }
  }, [user, loading, themeColor])

  // A guest wears the brand; a member wears their accent (ADR-074 §3).
  const isGuest = wearsBrand({ user, loading, storedAccent })
  const memberDark = darkPreview && !isGuest
  const dynamicTheme = useMemo(() => buildDynamicTheme(themeColor, { brand: isGuest, memberDark }), [themeColor, isGuest, memberDark])

  // Context value
  const contextValue = useMemo(
    () => ({
      themeColor,
      setThemeColor,
      memberDark
    }),
    [themeColor, memberDark]
  )

  return (
    <ThemePreferencesContext.Provider value={contextValue}>
      <CssVarsProvider theme={dynamicTheme} defaultMode='system' disableNestedContext>
        <CssBaseline />
        <GlobalStyles
          styles={{
            // DS-001: the motion scale as CSS variables, so a transition reads
            // the token by name and never repeats the number (MOTION.md §3).
            ':root': {
              '--nowry-motion-quick': `${MOTION.duration.quick}ms`,
              '--nowry-motion-base': `${MOTION.duration.base}ms`,
              '--nowry-motion-slow': `${MOTION.duration.slow}ms`,
              '--nowry-motion-standard': MOTION.easing.standard,
              '--nowry-motion-exit': MOTION.easing.exit
            },
            // Overrides Joy's CssBaseline, which sets these on `html`
            // unconditionally. This GlobalStyles renders after <CssBaseline />,
            // so at equal specificity it is injected later and wins.
            html: {
              WebkitFontSmoothing: FONT_SMOOTHING,
              MozOsxFontSmoothing: FONT_SMOOTHING === 'antialiased' ? 'grayscale' : 'auto'
            },
            // Safety net for the iOS auto-zoom bug class, scoped to phone
            // widths. Any text field rendered below 16px makes iOS Safari zoom
            // the whole page on focus and never zoom back out. One `size='sm'`
            // Input slipping through a review is all it takes, so rather than
            // policing every call site forever, the minimum is enforced here.
            // Costs nothing on desktop, and makes the bug unreachable.
            //
            // `!important` is load-bearing, not laziness. Joy renders the inner
            // <input> with `font-size: inherit` from a single-class rule
            // (.css-…-JoyInput-input), which outranks a bare `input` element
            // selector — so without it this rule silently loses the cascade on
            // exactly the Joy fields it exists to protect, and the net is a
            // placebo. Measured: a plain <input> picked it up while a Joy Input
            // ignored it entirely.
            //
            // The trade is that every mobile text field normalises to 16px,
            // including ones deliberately set larger. That is the intended
            // behaviour for a floor: below 600px, field text is 16px.
            '@media (max-width: 599.95px)': {
              'input, textarea': { fontSize: '1rem !important' }
            },
            body: {
              backgroundColor: 'var(--joy-palette-background-body)',
              backgroundImage: `radial-gradient(circle at 10% 20%, rgba(var(--joy-palette-primary-mainChannel) / 0.06), transparent 30%), 
                                radial-gradient(circle at 90% 80%, rgba(var(--joy-palette-primary-mainChannel) / 0.06), transparent 30%)`,
              backgroundAttachment: 'fixed',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover'
            },
            // ADR-082 §7: no accent glows on a member's near-black dark mode.
            ...(memberDark ? { 'html[data-joy-color-scheme="dark"] body': { backgroundImage: 'none' } } : {})
          }}
        />
        {children}
      </CssVarsProvider>
    </ThemePreferencesContext.Provider>
  )
}
