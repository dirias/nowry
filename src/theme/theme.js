import { STICKY_PALETTE } from './colorSchemeGenerator'
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LETTER_SPACING, LINE_HEIGHT, RADIUS, SPACING_BASE } from './tokens'

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
  // ---------------------------------------------------------------------
  // Scales. Every value comes from tokens.js — nothing is spelled out here.
  // ---------------------------------------------------------------------
  fontFamily: FONT_FAMILY,
  fontSize: FONT_SIZE,
  fontWeight: FONT_WEIGHT,
  lineHeight: LINE_HEIGHT,
  radius: RADIUS,

  // Explicit, and identical to Joy's default — that is the point. Written
  // down, a future move to a 4px base is a visible edit; left implicit, it
  // silently halves every gap across ~600 uses with nothing to catch it.
  spacing: SPACING_BASE,

  /**
   * The typography block does exactly three things. Joy deep-merges levels, so
   * every property not named here (fontSize, fontWeight, lineHeight, color)
   * keeps its existing value and no current call site changes behaviour.
   *
   * 1. Letter spacing per level. Joy applies a blanket -0.025em to h1–h4,
   *    tuned for its default stack; Inter's narrower sidebearings make that
   *    look cramped, so headings take -0.02em / -0.01em and everything else is
   *    explicitly 0.
   *
   * 2. `fontVariantNumeric: 'tabular-nums'` on h1–h4 and display-* ONLY.
   *    Headline numerals are where digit jitter is visible; proportional
   *    figures read better in prose, so this is not applied globally. Counters
   *    and timers inside components opt in via the `tabularNums` fragment in
   *    formStyles.js.
   *
   *    It is `fontVariantNumeric` and NOT `font-feature-settings: 'tnum'` on
   *    purpose: the standard property degrades correctly across the font-load
   *    window, whereas font-feature-settings does not and would make numbers
   *    reflow the moment Inter swaps in — precisely the jitter being fixed.
   *
   * 3. Declares `display-lg` and `display-md`. Joy resolves `level` against
   *    `theme.typography[key]`, so arbitrary keys work in JS with no TS
   *    augmentation needed.
   */
  typography: {
    h1: { letterSpacing: LETTER_SPACING.display, fontVariantNumeric: 'tabular-nums' },
    h2: { letterSpacing: LETTER_SPACING.display, fontVariantNumeric: 'tabular-nums' },
    h3: { letterSpacing: LETTER_SPACING.heading, fontVariantNumeric: 'tabular-nums' },
    h4: { letterSpacing: LETTER_SPACING.heading, fontVariantNumeric: 'tabular-nums' },

    'title-lg': { letterSpacing: LETTER_SPACING.normal },
    'title-md': { letterSpacing: LETTER_SPACING.normal },
    'title-sm': { letterSpacing: LETTER_SPACING.normal },
    'body-lg': { letterSpacing: LETTER_SPACING.normal },
    'body-md': { letterSpacing: LETTER_SPACING.normal },
    'body-sm': { letterSpacing: LETTER_SPACING.normal },
    'body-xs': { letterSpacing: LETTER_SPACING.normal },

    // New levels — above h1, for hero and marketing surfaces only.
    'display-lg': {
      fontFamily: 'var(--joy-fontFamily-display)',
      fontSize: 'var(--joy-fontSize-xl6)',
      fontWeight: 'var(--joy-fontWeight-xl)',
      lineHeight: 'var(--joy-lineHeight-xs)',
      letterSpacing: LETTER_SPACING.display,
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--joy-palette-text-primary)'
    },
    'display-md': {
      fontFamily: 'var(--joy-fontFamily-display)',
      fontSize: 'var(--joy-fontSize-xl5)',
      fontWeight: 'var(--joy-fontWeight-xl)',
      lineHeight: 'var(--joy-lineHeight-xs)',
      letterSpacing: LETTER_SPACING.display,
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--joy-palette-text-primary)'
    }
  },

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
