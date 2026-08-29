import { resolveColor, suggestFromInterests, PET_COLOR_MAP } from './petColor'

const HEX_6 = /^#[0-9a-f]{6}$/
const SLUGS = Object.keys(PET_COLOR_MAP)
const STAGES = [1, 2, 3, 4, 5, 6]

/**
 * Independent hex → HSL, deliberately not the module's own implementation so
 * these assertions verify the output rather than restate the source.
 */
const toHsl = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const delta = max - min
  const s = delta === 0 ? 0 : l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  return { s, l }
}

describe('resolveColor', () => {
  // This is the contract that matters most: every consumer builds translucent
  // glows by appending a two-digit hex alpha (`${color}55`), which silently
  // produces invalid CSS if this ever returns rgba() again.
  it('always returns a 6-digit hex, for every slug and stage', () => {
    for (const slug of [...SLUGS, null, undefined, 'not-a-real-slug']) {
      for (const stage of STAGES) {
        expect(resolveColor(slug, stage)).toMatch(HEX_6)
      }
    }
  })

  it('produces a distinct colour for each of the six stages', () => {
    for (const slug of SLUGS) {
      const perStage = STAGES.map((stage) => resolveColor(slug, stage))
      expect(new Set(perStage).size).toBe(6)
    }
  })

  // Regression guard: the previous scale-and-clamp ramp collapsed three or
  // four stages onto one value for the already-saturated colours (gold,
  // coral, rose), so evolution was invisible on exactly those palettes.
  it('deepens saturation at every step, for every colour in the palette', () => {
    for (const slug of SLUGS) {
      const sats = STAGES.map((stage) => toHsl(resolveColor(slug, stage)).s)
      for (let i = 1; i < sats.length; i++) {
        expect(sats[i]).toBeGreaterThan(sats[i - 1])
      }
    }
  })

  it('darkens at every step, for every colour in the palette', () => {
    for (const slug of SLUGS) {
      const lights = STAGES.map((stage) => toHsl(resolveColor(slug, stage)).l)
      for (let i = 1; i < lights.length; i++) {
        expect(lights[i]).toBeLessThan(lights[i - 1])
      }
    }
  })

  it('keeps every stage inside the readable lightness band for both themes', () => {
    for (const slug of [...SLUGS, null]) {
      for (const stage of STAGES) {
        const { l } = toHsl(resolveColor(slug, stage))
        expect(l).toBeGreaterThanOrEqual(0.28)
        expect(l).toBeLessThanOrEqual(0.8)
      }
    }
  })

  it('holds the hue steady across stages so the pet keeps its identity', () => {
    // Stage changes saturation and lightness only. Ordering of the RGB
    // channels is a cheap, rounding-tolerant stand-in for hue.
    for (const slug of SLUGS) {
      const rank = (hex) => {
        const channels = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
        return channels
          .map((value, index) => [value, index])
          .sort((a, b) => b[0] - a[0])
          .map(([, index]) => index)
          .join('')
      }
      const ranks = STAGES.map((stage) => rank(resolveColor(slug, stage)))
      expect(new Set(ranks).size).toBe(1)
    }
  })

  it('falls back to the per-stage default palette when no colour is chosen', () => {
    const defaults = STAGES.map((stage) => resolveColor(null, stage))
    expect(new Set(defaults).size).toBe(6)
    expect(resolveColor(null, 3)).toBe(resolveColor('not-a-real-slug', 3))
  })

  it('treats out-of-range and missing stages as stage 1 rather than throwing', () => {
    expect(resolveColor('violet', 0)).toBe(resolveColor('violet', 1))
    expect(resolveColor('violet', 99)).toBe(resolveColor('violet', 1))
    expect(resolveColor('violet', undefined)).toBe(resolveColor('violet', 1))
  })
})

describe('suggestFromInterests', () => {
  it('matches an interest to its species and colour', () => {
    expect(suggestFromInterests(['Programming'])).toEqual({ species: 'robot', color: 'sky' })
    expect(suggestFromInterests(['Astronomy'])).toEqual({ species: 'star', color: 'ocean' })
  })

  it('defaults to the owl when nothing matches or nothing is given', () => {
    expect(suggestFromInterests([])).toEqual({ species: 'owl', color: 'violet' })
    expect(suggestFromInterests()).toEqual({ species: 'owl', color: 'violet' })
    expect(suggestFromInterests(['underwater basket weaving'])).toEqual({ species: 'owl', color: 'violet' })
  })

  it('only ever suggests colours that resolveColor knows about', () => {
    const suggestions = [[], ['music'], ['history'], ['chemistry'], ['nature'], ['psychology']]
    for (const interests of suggestions) {
      expect(PET_COLOR_MAP[suggestFromInterests(interests).color]).toBeDefined()
    }
  })
})
