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

describe('the key (ADR-020)', () => {
  const { keyButton, keySegment } = require('../formStyles')

  it('gives the primary an edge in the accent’s active shade, and a neutral one in the neutral border — never a hue of its own', () => {
    expect(keyButton('primary').boxShadow).toBe('0 2px 0 0 var(--joy-palette-primary-solidActiveBg)')
    expect(keyButton('neutral').boxShadow).toBe('0 2px 0 0 var(--joy-palette-neutral-outlinedBorder)')
    expect(JSON.stringify(keyButton())).not.toMatch(/#[0-9a-f]{3,6}/i)
  })

  it('lifts 1px on hover and travels the 2px the edge promised on press, in 80ms', () => {
    const key = keyButton()
    expect(key['&:hover'].transform).toBe('translateY(-1px)')
    expect(key['&:active']).toEqual({ transform: 'translateY(2px)', boxShadow: 'none' })
    expect(key.transition).toMatch(/80ms/)
    expect(key.borderRadius).toBe('md')
  })

  it('underlines an engaged segment with the accent and leaves a resting one alone', () => {
    expect(keySegment(true)).toEqual({ boxShadow: 'inset 0 -2px 0 0 var(--joy-palette-primary-solidBg)' })
    expect(keySegment(false)).toEqual({})
  })
})

describe('goalStyles re-export (§7.4)', () => {
  it('resolves to the same objects, so there is exactly one definition', () => {
    expect(goalFocusRing).toBe(focusRing)
    expect(goalOneLine).toBe(oneLine)
  })
})
