/**
 * Building a theme is pure: a scheme name and a colour in, a theme out.
 *
 * Kept out of `index.js` on purpose. The provider needs `useColorScheme` from
 * React Native, and a module that imports React Native cannot be tested in a
 * plain Node environment. This one can, and it is where all the merging lives.
 */
import { BASE_PALETTE } from '@nowry/core/tokens/palette'
import { DEFAULT_ACCENT, generateColorScheme } from '@nowry/core/tokens/colorSchemeGenerator'
import {
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  LETTER_SPACING,
  LINE_HEIGHT,
  RADIUS,
  SPACING_SCALE,
  TOUCH_TARGET,
  Z_INDEX
} from '@nowry/core/tokens/tokens'
import { ELEVATION } from './elevation'

/**
 * The shared RADIUS scale is CSS ('8px'), because the web hands it to Joy.
 * React Native wants a number and silently ignores a string, which is how a
 * button ends up with square corners and nothing says why.
 */
const toNumbers = (scale) => Object.fromEntries(Object.entries(scale).map(([k, v]) => [k, typeof v === 'string' ? parseFloat(v) : v]))
import { DURATION, EASING } from './motionTokens'

/** The same default the web client starts from: the shared generator's. */
export const DEFAULT_THEME_COLOR = DEFAULT_ACCENT

/** Accent groups override the base; everything else is the base's. */
const mergeGroups = (base, generated) => {
  const out = { ...base }
  for (const [group, values] of Object.entries(generated || {})) {
    // `divider` is a single colour, not a group; spreading a string makes an
    // object of its characters.
    out[group] = typeof values === 'string' ? values : { ...(base[group] || {}), ...values }
  }
  return out
}

export const buildTheme = (scheme, themeColor) => {
  const base = BASE_PALETTE[scheme] || BASE_PALETTE.light
  const generated = generateColorScheme(themeColor)[scheme] || {}
  return {
    scheme,
    palette: mergeGroups(base, generated),
    // Colour lives in `palette`; these carry none.
    radius: toNumbers(RADIUS),
    spacing: SPACING_SCALE,
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE,
    fontWeight: FONT_WEIGHT,
    lineHeight: LINE_HEIGHT,
    letterSpacing: LETTER_SPACING,
    touchTarget: TOUCH_TARGET,
    layer: Z_INDEX,
    elevation: ELEVATION,
    motion: { duration: DURATION, easing: EASING }
  }
}
