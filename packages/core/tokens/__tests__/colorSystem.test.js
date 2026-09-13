import { BRAND, CATEGORY_COLORS, CATEGORY_SPEC, categoryColors, categoryDot } from '../colorSystem'
import { FOCUS_AREA_COLORS, nextFocusAreaColor } from '../../domain/focusAreas'
import { contrastRatio } from '../oklch'

describe('the category family (ADR-034)', () => {
  // Focus areas and book covers STORE these hex values. Pinned so a moved
  // constant shows up as a failing test, not as every learner's tags repainted.
  it('keeps the stored swatches exactly', () => {
    expect(CATEGORY_COLORS).toEqual(['#ca6e5d', '#bc7d2f', '#97902a', '#54a061', '#00a0a1', '#4493d0', '#8c7ed0', '#b86fa9'])
    expect(categoryDot('graphite')).toBe('#7f9094')
  })

  it.each(['light', 'dark'])('keeps every category label readable on its tint in %s', (mode) => {
    for (const spec of CATEGORY_SPEC) {
      const { ink, tint } = categoryColors(spec, mode)
      expect(contrastRatio(ink, tint)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('is what focus areas offer, and a new area skips a taken colour whatever its case', () => {
    expect(FOCUS_AREA_COLORS).toBe(CATEGORY_COLORS)
    expect(nextFocusAreaColor([{ color: CATEGORY_COLORS[0].toUpperCase() }])).toBe(CATEGORY_COLORS[1])
  })

  it('keeps the brand fixed: gold on ink teal is legible', () => {
    expect(contrastRatio(BRAND.coilGold, BRAND.inkTeal)).toBeGreaterThanOrEqual(4.5)
  })
})
