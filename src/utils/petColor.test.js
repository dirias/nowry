import { resolveColor, suggestFromInterests } from './petColor'

// The eight accent presets a user can actually pick (getColorPresets()).
// The companion's colour follows this, not the removed pet_color slug.
const ACCENTS = ['#2a6971', '#0b6bcb', '#9c27b0', '#e91e63', '#f44336', '#ff9800', '#4caf50', '#795548']

const HEX_6 = /^#[0-9a-f]{6}$/
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
  it('always returns a 6-digit hex, for every accent and stage', () => {
    for (const accent of [...ACCENTS, null, undefined, 'not-a-colour']) {
      for (const stage of STAGES) {
        expect(resolveColor(accent, stage)).toMatch(HEX_6)
      }
    }
  })

  it('produces a distinct colour for each of the six stages', () => {
    for (const accent of ACCENTS) {
      const perStage = STAGES.map((stage) => resolveColor(accent, stage))
      expect(new Set(perStage).size).toBe(6)
    }
  })

  // Regression guard: the previous scale-and-clamp ramp collapsed three or
  // four stages onto one value for the already-saturated colours (gold,
  // coral, rose), so evolution was invisible on exactly those palettes.
  it('deepens saturation at every step, for every accent preset', () => {
    for (const accent of ACCENTS) {
      const sats = STAGES.map((stage) => toHsl(resolveColor(accent, stage)).s)
      for (let i = 1; i < sats.length; i++) {
        expect(sats[i]).toBeGreaterThan(sats[i - 1])
      }
    }
  })

  it('darkens at every step, for every accent preset', () => {
    for (const accent of ACCENTS) {
      const lights = STAGES.map((stage) => toHsl(resolveColor(accent, stage)).l)
      for (let i = 1; i < lights.length; i++) {
        expect(lights[i]).toBeLessThan(lights[i - 1])
      }
    }
  })

  it('keeps every stage inside the readable lightness band for both themes', () => {
    for (const accent of [...ACCENTS, null]) {
      for (const stage of STAGES) {
        const { l } = toHsl(resolveColor(accent, stage))
        expect(l).toBeGreaterThanOrEqual(0.28)
        expect(l).toBeLessThanOrEqual(0.8)
      }
    }
  })

  it('holds the hue steady across stages so the pet keeps its identity', () => {
    // Stage changes saturation and lightness only. Ordering of the RGB
    // channels is a cheap, rounding-tolerant stand-in for hue.
    for (const accent of ACCENTS) {
      const rank = (hex) => {
        const channels = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
        return channels
          .map((value, index) => [value, index])
          .sort((a, b) => b[0] - a[0])
          .map(([, index]) => index)
          .join('')
      }
      const ranks = STAGES.map((stage) => rank(resolveColor(accent, stage)))
      expect(new Set(ranks).size).toBe(1)
    }
  })

  it('falls back to the per-stage default palette when no accent is set', () => {
    const defaults = STAGES.map((stage) => resolveColor(null, stage))
    expect(new Set(defaults).size).toBe(6)
    expect(resolveColor(null, 3)).toBe(resolveColor('not-a-colour', 3))
  })

  it('treats out-of-range and missing stages as stage 1 rather than throwing', () => {
    expect(resolveColor('#9c27b0', 0)).toBe(resolveColor('#9c27b0', 1))
    expect(resolveColor('#9c27b0', 99)).toBe(resolveColor('#9c27b0', 1))
    expect(resolveColor('#9c27b0', undefined)).toBe(resolveColor('#9c27b0', 1))
  })
})

describe('suggestFromInterests', () => {
  it('maps a taxonomy topic to its species', () => {
    expect(suggestFromInterests(['technology'])).toEqual({ species: 'robot' })
    expect(suggestFromInterests(['science'])).toEqual({ species: 'star' })
    expect(suggestFromInterests(['music'])).toEqual({ species: 'music' })
  })

  // Regression: the lookup used keyword substrings, so "art" matched inside
  // "artificial_intelligence" and every AI learner was quietly given a cat.
  it('does not confuse artificial_intelligence with art', () => {
    expect(suggestFromInterests(['artificial_intelligence'])).toEqual({ species: 'robot' })
    expect(suggestFromInterests(['art'])).toEqual({ species: 'cat' })
  })

  it('lets the highest-ranked topic decide', () => {
    expect(suggestFromInterests(['music', 'technology'])).toEqual({ species: 'music' })
    expect(suggestFromInterests(['technology', 'music'])).toEqual({ species: 'robot' })
  })

  it('skips an unrecognised topic rather than giving up on the rest', () => {
    expect(suggestFromInterests(['underwater_basket_weaving', 'music'])).toEqual({ species: 'music' })
  })

  it('defaults to the owl when nothing matches or nothing is given', () => {
    expect(suggestFromInterests([])).toEqual({ species: 'owl' })
    expect(suggestFromInterests()).toEqual({ species: 'owl' })
    expect(suggestFromInterests(['underwater basket weaving'])).toEqual({ species: 'owl' })
  })

  it("never suggests a colour — that follows the user's own theme accent now", () => {
    for (const interests of [[], ['music'], ['history'], ['chemistry'], ['psychology']]) {
      expect(suggestFromInterests(interests)).not.toHaveProperty('color')
    }
  })
})
