/**
 * The phone's display lockup obeys the shared fit, and nothing else (BRAND-009).
 *
 * The point of putting `WORDMARK_FIT` in `@nowry/core` is that the two clients
 * cannot drift into wearing the name differently. A second copy of 0.72 or −100
 * anywhere in this file would be that drift, so the numbers are asserted absent
 * rather than assumed absent.
 *
 * Read as source, like `screenChrome.test.js`: the mobile suite runs in node
 * with no React Native renderer, and what matters here is which module owns the
 * numbers, not what the tree renders.
 */
const fs = require('fs')
const path = require('path')

const { WORDMARK_FIT, wordmarkCoil } = require('@nowry/core/tokens/brandMark')

const source = fs.readFileSync(path.resolve(__dirname, '../BrandMark.js'), 'utf8')

describe('the phone reads the fit from core', () => {
  it('imports it rather than restating it', () => {
    expect(source).toMatch(/import \{[^}]*wordmarkCoil[^}]*\} from '@nowry\/core\/tokens\/brandMark'/)
  })

  it.each([
    ['the coil box', String(WORDMARK_FIT.em)],
    ['the head angle', String(WORDMARK_FIT.headDeg)],
    ['the baseline drop', String(WORDMARK_FIT.drop)],
    ['the floor', String(WORDMARK_FIT.MIN_PX)]
  ])('does not carry its own copy of %s', (_label, value) => {
    expect(source).not.toContain(value)
  })
})

describe('the floor is honoured on the phone too', () => {
  const { TYPE_LEVELS } = require('../../typeLevels')

  it('has both display levels above it, so the lockup is drawable where it is offered', () => {
    for (const level of ['display-lg', 'display-md']) {
      expect(wordmarkCoil(TYPE_LEVELS[level].fontSize)).not.toBeNull()
    }
  })

  it('leaves every product level below it, where the standard lockup is the only one', () => {
    for (const level of ['h1', 'h2', 'h3', 'h4', 'title-lg', 'body-md']) {
      expect(wordmarkCoil(TYPE_LEVELS[level].fontSize)).toBeNull()
    }
  })

  it('falls back instead of rendering, for a level that is not drawable', () => {
    expect(source).toMatch(/if \(!fit\) return <BrandLockup/)
  })
})

describe('two coils on one screen', () => {
  it('no longer share a hard-coded mask id', () => {
    expect(source).not.toMatch(/id='nowry-mark-eye'/)
    expect(source).toMatch(/useId\(\)/)
  })
})
