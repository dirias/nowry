import React, { createContext, useState, useEffect, useContext, useMemo } from 'react'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles'
import CssBaseline from '@mui/joy/CssBaseline'
import GlobalStyles from '@mui/joy/GlobalStyles'

import { generateColorScheme, STICKY_PALETTE } from './colorSchemeGenerator'
import themeConfig from './theme'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

// Context to allow other components to update theme settings
export const ThemePreferencesContext = createContext({
  themeColor: '#2a6971', // Match base theme teal
  setThemeColor: () => {}
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
 * lightens it further, and dark mode on #0d1117 is where thin text degrades
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
export const buildDynamicTheme = (themeColor) => {
  const colorScheme = generateColorScheme(themeColor)

  return extendTheme({
    ...themeConfig,
    colorSchemes: {
      light: {
        ...themeConfig.colorSchemes.light,
        palette: {
          ...themeConfig.colorSchemes.light.palette,
          primary: colorScheme.light.primary,
          success: colorScheme.light.success,
          warning: colorScheme.light.warning,
          danger: colorScheme.light.danger,
          neutral: colorScheme.light.neutral,
          background: colorScheme.light.background,
          text: colorScheme.light.text,
          stickyNote: STICKY_PALETTE.light
        }
      },
      dark: {
        ...themeConfig.colorSchemes.dark,
        palette: {
          ...themeConfig.colorSchemes.dark.palette,
          primary: colorScheme.dark.primary,
          success: colorScheme.dark.success,
          warning: colorScheme.dark.warning,
          danger: colorScheme.dark.danger,
          background: colorScheme.dark.background,
          text: colorScheme.dark.text,
          stickyNote: STICKY_PALETTE.dark
        }
      }
    }
  })
}

export const DynamicThemeProvider = ({ children }) => {
  const [themeColor, setThemeColor] = useState('#2a6971')
  const { user } = useAuth()
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
  const dynamicTheme = useMemo(() => buildDynamicTheme(themeColor), [themeColor])

  // Context value
  const contextValue = useMemo(
    () => ({
      themeColor,
      setThemeColor
    }),
    [themeColor]
  )

  return (
    <ThemePreferencesContext.Provider value={contextValue}>
      <CssVarsProvider theme={dynamicTheme} defaultMode='system' disableNestedContext>
        <CssBaseline />
        <GlobalStyles
          styles={{
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
            }
          }}
        />
        {children}
      </CssVarsProvider>
    </ThemePreferencesContext.Provider>
  )
}
