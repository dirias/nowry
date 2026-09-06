import { buildDynamicTheme } from '../DynamicThemeProvider'
import { FONT_SIZE, MIN_FONT_SIZE } from '../tokens'

/**
 * These assertions are deliberately made against the BUILT theme — the object
 * `buildDynamicTheme` returns after `extendTheme` has merged tokens.js,
 * theme.js and the generated palette together.
 *
 * Restating tokens.js back at itself would prove nothing. The failure this
 * guards is a scale surviving tokens.js and theme.js but being dropped,
 * flattened or overwritten during that merge — which looks completely fine
 * until someone changes their theme colour, and is precisely the regression
 * this ticket exists to make impossible.
 */

// The default teal, and a deliberately unrelated accent. Every assertion runs
// against both: the merge must not be sensitive to the palette being generated.
const DEFAULT_COLOR = '#2a6971'
const ALTERNATE_COLOR = '#b3541e'
const THEME_COLORS = [DEFAULT_COLOR, ALTERNATE_COLOR]

// Static values are a bare rem string; fluid values are
// `clamp(<min>, <preferred>, <max>)` and their FIRST argument is the floor that
// actually has to clear the minimum.
const remFloor = (value) => {
  const clamp = /^clamp\(\s*([\d.]+)rem\s*,/.exec(value)
  if (clamp) return parseFloat(clamp[1])

  const rem = /^([\d.]+)rem$/.exec(value)
  if (rem) return parseFloat(rem[1])

  throw new Error(`Unrecognised font size format: ${value}`)
}

describe.each(THEME_COLORS)('theme built with %s', (themeColor) => {
  const theme = buildDynamicTheme(themeColor)

  it('keeps the fluid font sizes as clamp() rather than collapsing them to their maximum', () => {
    expect(theme.fontSize.xl4).toBe(FONT_SIZE.xl4)
    expect(theme.fontSize.xl4).toMatch(/^clamp\(/)
    expect(theme.fontSize.xl4).not.toBe('2.25rem')

    expect(theme.fontSize.xl5).toBe(FONT_SIZE.xl5)
    expect(theme.fontSize.xl6).toBe(FONT_SIZE.xl6)
  })

  it('leaves the static sizes static, so control geometry stays on the grid', () => {
    expect(theme.fontSize.md).toBe('1rem')
    expect(theme.fontSize.xs).toBe('0.75rem')
    expect(theme.fontSize.xl).toBe('1.25rem')
  })

  it('carries the custom display levels through extendTheme', () => {
    expect(theme.typography['display-lg']).toBeDefined()
    expect(theme.typography['display-md']).toBeDefined()
    expect(theme.typography['display-lg'].fontSize).toBe('var(--joy-fontSize-xl6)')
    expect(theme.typography['display-md'].fontSize).toBe('var(--joy-fontSize-xl5)')
  })

  it('does not lose the levels Joy ships while adding its own', () => {
    expect(theme.typography.h1).toBeDefined()
    expect(theme.typography['body-md']).toBeDefined()
  })

  it('puts Inter at the head of the body stack', () => {
    expect(theme.fontFamily.body.startsWith(`'Inter Variable'`)).toBe(true)
  })

  it('defines the pill radius that four call sites already assume exists', () => {
    expect(theme.radius.full).toBe('9999px')
  })

  it('keeps the five original radius steps unchanged', () => {
    expect(theme.radius.xs).toBe('2px')
    expect(theme.radius.sm).toBe('6px')
    expect(theme.radius.md).toBe('8px')
    expect(theme.radius.lg).toBe('12px')
    expect(theme.radius.xl).toBe('16px')
  })

  it('holds every font size at or above the 12px handheld floor', () => {
    const floor = remFloor(MIN_FONT_SIZE)

    Object.entries(theme.fontSize)
      .filter(([key]) => key in FONT_SIZE)
      .forEach(([key, value]) => {
        // For a fluid value this checks the clamp MINIMUM — the size a 360px
        // phone actually renders — not the comfortable desktop maximum.
        expect({ key, rem: remFloor(value) }).toEqual({ key, rem: expect.any(Number) })
        expect(remFloor(value)).toBeGreaterThanOrEqual(floor)
      })
  })

  it('applies tabular numerals to headline levels only', () => {
    expect(theme.typography.h1.fontVariantNumeric).toBe('tabular-nums')
    expect(theme.typography['display-lg'].fontVariantNumeric).toBe('tabular-nums')
    expect(theme.typography['body-md'].fontVariantNumeric).toBeUndefined()
  })

  it('replaces Joy blanket -0.025em heading tracking', () => {
    expect(theme.typography.h1.letterSpacing).toBe('-0.02em')
    expect(theme.typography.h3.letterSpacing).toBe('-0.01em')
  })

  it('sets the spacing base explicitly at 8px', () => {
    expect(theme.spacing(1)).toBe('8px')
  })
})

describe('theme colour independence', () => {
  it('produces identical non-palette scales for two unrelated accents', () => {
    const teal = buildDynamicTheme(DEFAULT_COLOR)
    const rust = buildDynamicTheme(ALTERNATE_COLOR)

    expect(rust.fontSize).toEqual(teal.fontSize)
    expect(rust.fontFamily).toEqual(teal.fontFamily)
    expect(rust.fontWeight).toEqual(teal.fontWeight)
    expect(rust.lineHeight).toEqual(teal.lineHeight)
    expect(rust.radius).toEqual(teal.radius)
  })

  it('still differentiates the palette, so the comparison above is not vacuous', () => {
    const teal = buildDynamicTheme(DEFAULT_COLOR)
    const rust = buildDynamicTheme(ALTERNATE_COLOR)

    expect(rust.colorSchemes.light.palette.primary.solidBg).not.toBe(teal.colorSchemes.light.palette.primary.solidBg)
  })
})

// ─── DS-001: motion and layering ─────────────────────────────────────────────

describe('MOTION (docs/design/MOTION.md)', () => {
  const { MOTION } = require('../tokens')

  it('has exactly three durations, in milliseconds, strictly ordered', () => {
    const steps = Object.values(MOTION.duration)
    expect(Object.keys(MOTION.duration)).toEqual(['quick', 'base', 'slow'])
    steps.forEach((ms) => expect(typeof ms).toBe('number'))
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
    expect(steps[0]).toBeGreaterThanOrEqual(80)
    expect(steps[2]).toBeLessThanOrEqual(240)
  })

  it('has two easings, both cubic-bezier curves', () => {
    expect(Object.keys(MOTION.easing)).toEqual(['standard', 'exit'])
    Object.values(MOTION.easing).forEach((curve) => expect(curve).toMatch(/^cubic-bezier\(/))
  })
})

describe('Z_INDEX (docs/design/ELEVATION.md)', () => {
  const { Z_INDEX } = require('../tokens')

  it("keeps Joy's six layers at Joy's values, so its Menu, Modal, Snackbar and Tooltip keep their order untold", () => {
    expect(Z_INDEX).toMatchObject({ badge: 1, table: 10, popup: 1000, modal: 1300, snackbar: 1400, tooltip: 1500 })
  })

  it('adds floating — the widgets over the page — above sticky chrome and below any popup', () => {
    expect(Z_INDEX.floating).toBeGreaterThan(Z_INDEX.table)
    expect(Z_INDEX.floating).toBeLessThan(Z_INDEX.popup)
  })

  it('is strictly ordered as listed', () => {
    const values = Object.values(Z_INDEX)
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('the built theme carries the layer scale', () => {
  it("resolves zIndex: 'floating' between table and popup, on Joy's own scale", () => {
    const theme = buildDynamicTheme('#2a6971')
    expect(theme.zIndex.floating).toBe(100)
    expect(theme.zIndex.table).toBeLessThan(theme.zIndex.floating)
    expect(theme.zIndex.floating).toBeLessThan(theme.zIndex.popup)
    expect(theme.zIndex.tooltip).toBe(1500)
  })
})
