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

  it('stops moving under prefers-reduced-motion and keeps the edge as the signal', () => {
    const reduced = keyButton()['@media (prefers-reduced-motion: reduce)']
    expect(reduced.transition).toBe('none')
    expect(reduced['&:hover, &:active'].transform).toBe('none')
  })

  it('underlines an engaged segment with the accent and leaves a resting one alone', () => {
    expect(keySegment(true)).toEqual({ boxShadow: 'inset 0 -2px 0 0 var(--joy-palette-primary-solidBg)' })
    expect(keySegment(false)).toEqual({})
  })

  it('carries the underline in segment() itself since CAL-009, so no call site needs keySegment', () => {
    const { segment } = require('../formStyles')
    expect(segment(true, true).boxShadow).toBe(keySegment(true).boxShadow)
    expect(segment(false, true).boxShadow).toBeUndefined()
  })
})

describe('rows, readouts and measures (§15.11, DS-011)', () => {
  const { identityTile, listRow, readout, measureTrack, measureFill } = require('../formStyles')
  const { LIST_ROW_HEIGHT } = require('../../../../theme/tokens')

  it('draws identity on a 16px tile at radius sm that never shrinks, in whatever colour it is handed', () => {
    expect(identityTile('primary.solidBg')).toEqual({
      width: 16,
      height: 16,
      borderRadius: 'sm',
      flexShrink: 0,
      bgcolor: 'primary.solidBg'
    })
    expect(identityTile('#b45309', 28)).toMatchObject({ width: 28, height: 28, bgcolor: '#b45309' })
  })

  it('makes the row the target — 44px or more at xs — and pulls the hover ground out by exactly its own padding', () => {
    expect(listRow.minHeight).toEqual({ xs: LIST_ROW_HEIGHT.xs, sm: LIST_ROW_HEIGHT.sm })
    expect(LIST_ROW_HEIGHT.xs).toBeGreaterThanOrEqual(44)
    expect(listRow.mx).toBe(-listRow.px)
  })

  it('hovers a row with a ground and nothing else — no lift, no shadow, and only the quick duration', () => {
    expect(listRow['&:hover']).toEqual({ bgcolor: 'background.level1' })
    expect(JSON.stringify(listRow)).not.toMatch(/boxShadow|transform|translate/)
    expect(listRow.transition).toMatch(/^background-color 80ms/)
  })

  it('sets a readout in tabular figures on a tertiary, with no semantic colour', () => {
    expect(readout).toEqual({ fontSize: 'sm', color: 'text.tertiary', fontVariantNumeric: 'tabular-nums' })
    expect(readout.color).not.toMatch(/danger|warning|success/)
  })

  it('keeps a measure 3px thin at the progress radius and clamps its fill to the track', () => {
    expect(measureTrack).toMatchObject({ width: 64, height: 3, borderRadius: 'full', overflow: 'hidden' })
    expect(measureFill(62).width).toBe('62%')
    expect(measureFill(104).width).toBe('100%')
    expect(measureFill(-1).width).toBe('0%')
    expect(measureFill(undefined).width).toBe('0%')
    expect(measureFill(40, 'warning.solidBg').bgcolor).toBe('warning.solidBg')
  })
})

describe('goalStyles re-export (§7.4)', () => {
  it('resolves to the same objects, so there is exactly one definition', () => {
    expect(goalFocusRing).toBe(focusRing)
    expect(goalOneLine).toBe(oneLine)
  })
})
