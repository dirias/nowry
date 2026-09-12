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

/**
 * The forbidden keys, checked at every call site rather than only when one
 * renders.
 *
 * `Typography` throws on `fontSize`, `fontWeight`, `lineHeight` and
 * `fontFamily`, and that check is real — but it fires when the component
 * renders, and there is no rendered-component test project here
 * (`jest.config.js` records why). So the reader shipped a raw `fontWeight` for
 * a bold run, every suite passed, and the first thing that ran it was a phone.
 *
 * The fix was to give the type system a name for emphasis; this is what stops
 * the next call site reaching for the raw key while it waits.
 */
describe('no call site sets what the level owns', () => {
  const fs = require('fs')
  const path = require('path')

  const SRC = path.join(__dirname, '..', '..')
  const FORBIDDEN = ['fontSize', 'fontWeight', 'lineHeight', 'fontFamily']

  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '__tests__') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.js')) files.push(full)
    }
  }
  walk(SRC)

  /** The opening tag of every `<Typography …>` in a file. */
  const openingTags = (source) => {
    const tags = []
    let at = source.indexOf('<Typography')
    while (at !== -1) {
      let depth = 0
      let i = at
      for (; i < source.length; i++) {
        const ch = source[i]
        if (ch === '{') depth++
        else if (ch === '}') depth--
        else if (ch === '>' && depth === 0) break
      }
      tags.push(source.slice(at, i))
      at = source.indexOf('<Typography', i)
    }
    return tags
  }

  it('found the call sites, so the rule is not passing on an empty set', () => {
    const total = files.reduce((count, file) => count + openingTags(fs.readFileSync(file, 'utf8')).length, 0)
    expect(total).toBeGreaterThan(30)
  })

  it.each(FORBIDDEN)('never passes %s to Typography', (key) => {
    const offenders = []
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')
      // The component itself is where these are set; everywhere else is a call.
      if (path.basename(file) === 'Typography.js') continue
      openingTags(source).forEach((tag) => {
        if (new RegExp(`\\b${key}\\s*:`).test(tag)) offenders.push(path.relative(SRC, file))
      })
    }
    expect([...new Set(offenders)]).toEqual([])
  })
})
