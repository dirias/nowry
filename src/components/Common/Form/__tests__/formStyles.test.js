import { focusRing, formLabel, oneLine, sheetInlinePadding, touchTarget } from '../formStyles'
import { focusRing as goalFocusRing, oneLine as goalOneLine } from '../../../AnnualPlanning/goal/goalStyles'

describe('formStyles', () => {
  it('defines a focus ring rather than leaving the browser default Joy resets', () => {
    expect(focusRing['&:focus-visible']).toEqual({
      outline: '2px solid',
      outlineColor: 'primary.outlinedBorder',
      outlineOffset: '2px'
    })
  })

  it('uses a semantic token for the ring colour, never a hex or a numeric shade', () => {
    const colour = focusRing['&:focus-visible'].outlineColor
    expect(colour).not.toMatch(/#|rgb/)
    expect(colour).not.toMatch(/\.\d{2,3}$/)
  })

  it('clamps one-line contracts so a 30%-longer German string cannot add a row', () => {
    expect(oneLine).toMatchObject({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' })
  })

  it('meets the 44px touch target at xs and relaxes for pointer devices', () => {
    expect(touchTarget.minHeight.xs).toBeGreaterThanOrEqual(44)
    expect(touchTarget.minHeight.sm).toBeLessThan(44)
  })

  it('shares one inline padding scale across every sheet region', () => {
    expect(sheetInlinePadding).toEqual({ xs: 2, sm: 3, md: 4 })
  })

  it('owns the label weight the goal pass repeated at six call sites', () => {
    expect(formLabel).toEqual({ fontWeight: 600 })
  })
})

describe('goalStyles re-export (§7.4)', () => {
  it('resolves to the same objects, so there is exactly one definition', () => {
    expect(goalFocusRing).toBe(focusRing)
    expect(goalOneLine).toBe(oneLine)
  })
})
