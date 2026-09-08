/**
 * The semantic type levels, resolved for a phone (DESIGN_GUIDELINES §4).
 *
 * Named `typeLevels`, not `typography`, on purpose: macOS is case-insensitive,
 * so a `typography.js` beside `Typography.js` is the same file, and the second
 * one written silently destroys the first.
 *
 * Every value here was resolved from what the web actually renders, the same way
 * the palette was: Joy defines each level as a reference into the shared scales,
 * and `theme.js` only adds letter-spacing on top.
 *
 * Two translations were needed, and both are decisions rather than transcription:
 *
 *   1. **The fluid sizes are pinned to their minimum.** `FONT_SIZE.xl2..xl4` are
 *      `clamp()` expressions that grow with the viewport from 360px up. A phone
 *      sits at or below that floor, so the clamp resolves to its minimum there —
 *      which is exactly what the web renders at phone width. This is parity, not
 *      a separate mobile scale.
 *
 *   2. **Line height is a ratio here, not a length.** React Native's `lineHeight`
 *      is absolute pixels and does NOT grow when the OS font size does, so
 *      hard-coding one clips text at large accessibility sizes. The component
 *      multiplies this ratio by the scaled font size instead.
 *
 * Note, and it is a real finding rather than a mistake: at phone width `h3` and
 * `h4` are the SAME size, because `xl2`'s clamp bottoms out at `xl`'s fixed
 * value. They differ only in line height. That collapse already exists on the
 * web at 375px; it is reproduced here rather than quietly papered over, and it
 * is a question for the design system, not for this file.
 */

/** 1rem = 16px. The web's root size, unchanged. */
const REM = 16

export const TYPE_LEVELS = {
  h1: { fontSize: 1.75 * REM, fontWeight: '700', lineHeightRatio: 1.33334, letterSpacing: -0.5 },
  h2: { fontSize: 1.5 * REM, fontWeight: '700', lineHeightRatio: 1.33334, letterSpacing: -0.5 },
  h3: { fontSize: 1.25 * REM, fontWeight: '600', lineHeightRatio: 1.33334, letterSpacing: -0.25 },
  h4: { fontSize: 1.25 * REM, fontWeight: '600', lineHeightRatio: 1.5, letterSpacing: -0.25 },

  'title-lg': { fontSize: 1.125 * REM, fontWeight: '600', lineHeightRatio: 1.33334, letterSpacing: 0 },
  'title-md': { fontSize: 1 * REM, fontWeight: '500', lineHeightRatio: 1.5, letterSpacing: 0 },
  'title-sm': { fontSize: 0.875 * REM, fontWeight: '500', lineHeightRatio: 1.42858, letterSpacing: 0 },

  'body-lg': { fontSize: 1.125 * REM, fontWeight: '400', lineHeightRatio: 1.5, letterSpacing: 0 },
  'body-md': { fontSize: 1 * REM, fontWeight: '400', lineHeightRatio: 1.5, letterSpacing: 0 },
  'body-sm': { fontSize: 0.875 * REM, fontWeight: '400', lineHeightRatio: 1.5, letterSpacing: 0 },
  'body-xs': { fontSize: 0.75 * REM, fontWeight: '500', lineHeightRatio: 1.5, letterSpacing: 0 }
}

export const TYPE_LEVEL_NAMES = Object.keys(TYPE_LEVELS)

/** The legibility floor (tokens.MIN_FONT_SIZE). Nothing renders below it. */
export const MIN_FONT_SIZE = 0.75 * REM

export default TYPE_LEVELS
