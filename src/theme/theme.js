import { STICKY_PALETTE } from './colorSchemeGenerator'

const primaryMain = '#2a6971'
const primaryHover = '#245a63'
const primaryActive = '#1e4c54'

const yellowAccent = '#ffcc00'
const yellowHover = '#ffdb4d'

/**
 * The base theme CONFIG — a plain object, deliberately NOT passed through
 * `extendTheme` here.
 *
 * `DynamicThemeProvider` spreads this object and calls `extendTheme` on the
 * result. When this file also called `extendTheme`, an already-extended theme
 * (carrying generated `vars`, `getCssVar`, `cssVarPrefix`, `generateCssVars`
 * and `unstable_sx`) was fed straight back in and extended a second time. That
 * is survivable while the config is palette-only, but it is exactly how you get
 * doubled or stale `var(var(--joy-…))` references once typography scales land.
 *
 * There is one importer (`DynamicThemeProvider`), and it is now the only
 * `extendTheme` call site in the app.
 */
const themeConfig = {
  colorSchemes: {
    light: {
      palette: {
        primary: {
          plainColor: primaryMain,
          plainHoverBg: '#edf7f8',
          plainActiveBg: '#d9eff1',
          solidBg: primaryMain,
          solidHoverBg: primaryHover,
          solidActiveBg: primaryActive,
          solidColor: '#fff',
          softBg: '#e6f3f4',
          softHoverBg: '#d3ebed',
          softActiveBg: '#c0e3e6',
          softColor: primaryMain,
          outlinedBorder: '#a9d2d5',
          outlinedHoverBg: '#e1eff0'
        },
        success: {
          solidBg: yellowAccent,
          solidHoverBg: yellowHover,
          solidColor: '#000'
        },
        neutral: {
          plainHoverBg: yellowHover
        },
        background: {
          body: '#ffffff',
          surface: '#f9f9f9',
          popup: '#ffffff'
        },
        text: {
          primary: '#1c1c1c',
          secondary: '#444',
          tertiary: '#777'
        },
        stickyNote: STICKY_PALETTE.light
      }
    },
    dark: {
      palette: {
        primary: {
          plainColor: '#88c9d1',
          plainHoverBg: '#1c444a',
          solidBg: '#3a9dac',
          solidHoverBg: '#2d8a97',
          solidActiveBg: '#257d8a',
          solidColor: '#fff',
          softBg: '#17393d',
          softHoverBg: '#1c444a',
          softColor: '#bde4e9'
        },
        background: {
          body: '#0d1117',
          surface: '#161b22',
          popup: '#1e242c'
        },
        text: {
          primary: '#e6edf3',
          secondary: '#9ba9b4',
          tertiary: '#7d8590'
        },
        stickyNote: STICKY_PALETTE.dark
      }
    }
  }
}

export default themeConfig
