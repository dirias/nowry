/**
 * The type scale's contract.
 *
 * The component itself needs React Native to render, so what is tested here is
 * the level table — which is where the decisions live, and where a wrong number
 * would silently change every screen.
 */
import { MIN_FONT_SIZE, TYPE_LEVELS, TYPE_LEVEL_NAMES } from '../typeLevels'

describe('the type levels', () => {
  it('carries exactly the eleven levels the design system names', () => {
    expect(TYPE_LEVEL_NAMES).toEqual([
      'h1',
      'h2',
      'h3',
      'h4',
      'title-lg',
      'title-md',
      'title-sm',
      'body-lg',
      'body-md',
      'body-sm',
      'body-xs'
    ])
  })

  it('never goes below the legibility floor', () => {
    Object.entries(TYPE_LEVELS).forEach(([name, spec]) => {
      expect(spec.fontSize).toBeGreaterThanOrEqual(MIN_FONT_SIZE)
      expect(name).toBeTruthy()
    })
  })

  it('gives every level a ratio, not a fixed line height', () => {
    // A fixed lineHeight does not grow with the OS font setting, and text at
    // 200% then overflows a box measured at 100%.
    Object.values(TYPE_LEVELS).forEach((spec) => {
      expect(spec.lineHeightRatio).toBeGreaterThan(1)
      expect(spec).not.toHaveProperty('lineHeight')
    })
  })

  it('descends in size within each family', () => {
    expect(TYPE_LEVELS.h1.fontSize).toBeGreaterThan(TYPE_LEVELS.h2.fontSize)
    expect(TYPE_LEVELS.h2.fontSize).toBeGreaterThan(TYPE_LEVELS.h3.fontSize)
    expect(TYPE_LEVELS['title-lg'].fontSize).toBeGreaterThan(TYPE_LEVELS['title-md'].fontSize)
    expect(TYPE_LEVELS['body-lg'].fontSize).toBeGreaterThan(TYPE_LEVELS['body-md'].fontSize)
    expect(TYPE_LEVELS['body-md'].fontSize).toBeGreaterThan(TYPE_LEVELS['body-sm'].fontSize)
  })

  it('reproduces the web’s h3/h4 collapse at phone width rather than inventing a scale', () => {
    // xl2's clamp bottoms out at xl's fixed value, so at 375px the web renders
    // both at 20px too. Recorded as a finding, not fixed unilaterally.
    expect(TYPE_LEVELS.h3.fontSize).toBe(TYPE_LEVELS.h4.fontSize)
    expect(TYPE_LEVELS.h3.lineHeightRatio).not.toBe(TYPE_LEVELS.h4.lineHeightRatio)
  })

  it('weights headings heavier than body', () => {
    expect(Number(TYPE_LEVELS.h1.fontWeight)).toBeGreaterThan(Number(TYPE_LEVELS['body-md'].fontWeight))
    expect(Number(TYPE_LEVELS['title-md'].fontWeight)).toBeGreaterThan(Number(TYPE_LEVELS['body-md'].fontWeight))
  })
})
