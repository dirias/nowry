/**
 * The house button's numbers, checked against BUTTONS.md.
 *
 * Every value in the spec is from the standard's geometry table. A test that
 * only asserted "the object has a height" would pass on any number; these
 * assert the actual standard, so drifting from it fails here rather than
 * shipping a button that is subtly not the house button.
 */
import {
  BUTTON_RADIUS,
  BUTTON_SIZES,
  BUTTON_SIZE_NAMES,
  BUTTON_VARIANTS,
  BUTTON_VARIANT_NAMES,
  DISABLED_OPACITY,
  EDGE,
  MIN_TOUCH_TARGET,
  SEGMENT_HEIGHT
} from '../buttonSpec'

describe('geometry (BUTTONS.md §2)', () => {
  it('has the three heights the standard names', () => {
    expect(BUTTON_SIZE_NAMES).toEqual(['sm', 'md', 'lg'])
    expect(BUTTON_SIZES.sm.height).toBe(32)
    expect(BUTTON_SIZES.md.height).toBe(40)
    expect(BUTTON_SIZES.lg.height).toBe(48)
  })

  it('takes its horizontal padding from the table, which is what the standard actually fixes', () => {
    // §2 gives "sides = 40% of height" as the RATIONALE and the numbers as the
    // rule. They do not agree exactly — 32 x 0.4 is 12.8, and the table says 12
    // — so the table wins and the proportion is only checked as intent.
    expect([BUTTON_SIZES.sm.paddingX, BUTTON_SIZES.md.paddingX, BUTTON_SIZES.lg.paddingX]).toEqual([12, 16, 20])
    Object.values(BUTTON_SIZES).forEach((s) => {
      expect(Math.abs(s.paddingX - s.height * 0.4)).toBeLessThanOrEqual(1)
    })
  })

  it('uses one radius for every size, and never `full`', () => {
    expect(BUTTON_RADIUS).toBe('md')
  })

  it('carries the glyph sizes and gaps from the table', () => {
    expect([BUTTON_SIZES.sm.glyph, BUTTON_SIZES.md.glyph, BUTTON_SIZES.lg.glyph]).toEqual([16, 18, 20])
    expect([BUTTON_SIZES.sm.glyphGap, BUTTON_SIZES.md.glyphGap, BUTTON_SIZES.lg.glyphGap]).toEqual([6, 8, 8])
  })

  it('travels exactly as far as the edge promises', () => {
    // "the button moves exactly the distance the edge promised" (§1)
    expect(EDGE).toBe(2)
  })

  it('reaches 44 even at the smallest size', () => {
    expect(MIN_TOUCH_TARGET).toBe(44)
    expect(MIN_TOUCH_TARGET).toBeGreaterThan(BUTTON_SIZES.sm.height)
    expect(SEGMENT_HEIGHT).toBe(44)
  })
})

describe('variants (BUTTONS.md §3)', () => {
  it('has the four the standard names', () => {
    expect(BUTTON_VARIANT_NAMES).toEqual(['primary', 'secondary', 'tertiary', 'danger'])
  })

  it('names every colour semantically, so no preset is assumed', () => {
    // "nothing in the standard may assume teal" (§7)
    const literal = /#|rgb/
    Object.values(BUTTON_VARIANTS).forEach((v) => {
      Object.values(v).forEach((token) => {
        if (typeof token === 'string' && token !== 'transparent') expect(token).not.toMatch(literal)
      })
    })
  })

  it('gives the tertiary no edge at all, and everything else one', () => {
    expect(BUTTON_VARIANTS.tertiary.edge).toBeNull()
    expect(BUTTON_VARIANTS.primary.edge).toBe('primary.solidActiveBg')
    expect(BUTTON_VARIANTS.secondary.edge).toBe('neutral.outlinedBorder')
  })

  it('keeps danger soft, never solid', () => {
    // "a solid danger button competes with the primary" (§3)
    expect(BUTTON_VARIANTS.danger.ground).toBe('danger.softBg')
    expect(BUTTON_VARIANTS.danger.ground).not.toContain('solid')
  })

  it('presses to a ground, never to a hue', () => {
    // State is a ground, never a hue (§15.5).
    expect(BUTTON_VARIANTS.secondary.groundPressed).toBe('background.level2')
    expect(BUTTON_VARIANTS.tertiary.groundPressed).toBe('background.level2')
  })

  it('dims a disabled control to the standard opacity', () => {
    expect(DISABLED_OPACITY).toBe(0.45)
  })
})
