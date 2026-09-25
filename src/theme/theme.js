import { DEFAULT_ACCENT, STICKY_PALETTE, generateColorScheme } from '@nowry/core/tokens/colorSchemeGenerator'
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LETTER_SPACING, LINE_HEIGHT, RADIUS, SPACING_BASE, Z_INDEX } from '@nowry/core/tokens/tokens'

/**
 * The palette before a learner's accent has loaded: the default accent on the
 * shared ladder (ADR-034). No colour is spelled out in this file — every value,
 * including the neutral 50–900 scale Joy's own components resolve through,
 * comes from `@nowry/core/tokens/colorSystem`, the same source the phone reads.
 */
const defaultScheme = generateColorScheme(DEFAULT_ACCENT)

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

  // Joy's six layers at Joy's values plus `floating`; `sx={{ zIndex: 'floating' }}`
  // resolves through this scale (docs/design/ELEVATION.md).
  zIndex: Z_INDEX,

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
    // Nothing here names a font family on purpose. Joy already points h1–h4 at
    // `fontFamily-display` and title-*/body-* at `fontFamily-body`
    // (extendTheme.js), so pointing the token at the display face in
    // `tokens.js` moves exactly the four heading levels and nothing else
    // (DS-007B). Restating it per level would be a second place to forget.
    //
    // The boundary lands at h4/title-lg rather than h3/h4, which is what keeps
    // the header wordmark in the display face: `BrandLockup` sets the word at
    // h4, and BRAND.md requires the name to wear that face wherever it appears.
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
      palette: { ...defaultScheme.light, stickyNote: STICKY_PALETTE.light }
    },
    dark: {
      palette: { ...defaultScheme.dark, stickyNote: STICKY_PALETTE.dark }
    }
  }
}

export default themeConfig
