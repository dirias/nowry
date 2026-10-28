import { measureBody, recolorArt } from '../recolorArt'
import { hexToOklch, hexToRgb } from '../oklch'
import { getColorPresets } from '../colorSchemeGenerator'
import { EARNED_GOLD } from '../colorSystem'

// A small stand-in for a form: a shaded teal body, a cream belly, gold, an eye and the transparent ground.
const BODY = ['#3a9aa0', '#2f8a92', '#4fb3b5', '#2a6f7f', '#3a8fb0']
const CREAM = '#f3e6c8'
const EYE = '#1d1a24'
const GROUND = [255, 255, 255, 0]
const px = (hex) => {
  const { r, g, b } = hexToRgb(hex)
  return [r, g, b, 255]
}

function art() {
  const pixels = []
  for (let i = 0; i < 40; i++) pixels.push(px(BODY[i % BODY.length]))
  for (let i = 0; i < 8; i++) pixels.push(px(CREAM), px(EARNED_GOLD), px(EYE))
  for (let i = 0; i < 6; i++) pixels.push(GROUND)
  return Uint8ClampedArray.from(pixels.flat())
}

const BODY_PIXELS = 40
const pixelAt = (data, i) => Array.from(data.slice(i * 4, i * 4 + 4))
const hexOf = ([r, g, b]) => `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`

/** The recoloured body's median, read off the pixels that were body. */
function bodyMedian(data) {
  const lch = Array.from({ length: BODY_PIXELS }, (_, i) => hexToOklch(hexOf(pixelAt(data, i))))
  const mid = (key) => lch.map((c) => c[key]).sort((a, b) => a - b)[BODY_PIXELS >> 1]
  return { L: mid('L'), C: mid('C'), h: mid('h') }
}

const hueGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180)

describe('recolorArt (ADR-051)', () => {
  const accents = [...getColorPresets().map((p) => p.color), '#c0392b']

  it.each(accents)('puts the body median on the accent %s', (accent) => {
    const target = hexToOklch(accent)
    const got = bodyMedian(recolorArt(art(), accent))
    expect(Math.abs(got.L - target.L)).toBeLessThan(0.03)
    expect(Math.abs(got.C - target.C)).toBeLessThan(0.03)
    if (target.C > 0.04) expect(hueGap(got.h, target.h)).toBeLessThan(8)
  })

  it('takes a neon custom accent hue and lightness but caps how far it saturates the paint', () => {
    const target = hexToOklch('#7a3cff')
    const got = bodyMedian(recolorArt(art(), '#7a3cff'))
    expect(Math.abs(got.L - target.L)).toBeLessThan(0.03)
    expect(hueGap(got.h, target.h)).toBeLessThan(8)
    expect(got.C).toBeLessThan(target.C)
  })

  it('keeps the shading: the body pixels stay as different from each other as they were', () => {
    const out = recolorArt(art(), '#825080')
    const Ls = Array.from({ length: BODY.length }, (_, i) => hexToOklch(hexOf(pixelAt(out, i))).L)
    expect(Math.max(...Ls) - Math.min(...Ls)).toBeGreaterThan(0.08)
  })

  it('leaves the cream, the gold, the eye and the ground exactly as painted', () => {
    const before = art()
    const out = recolorArt(before, '#924968')
    for (let i = BODY_PIXELS; i < before.length / 4; i++) {
      expect(pixelAt(out, i)).toEqual(pixelAt(before, i))
    }
  })

  it('returns a copy and never writes to the array it was given', () => {
    const before = art()
    const snapshot = Array.from(before)
    const out = recolorArt(before, '#6e6634')
    expect(out).not.toBe(before)
    expect(Array.from(before)).toEqual(snapshot)
  })

  it('leaves art with almost no body unchanged: the egg stays cream', () => {
    const egg = Uint8ClampedArray.from([...Array(60).fill(px(CREAM)).flat(), ...px(BODY[0])])
    expect(measureBody(egg)).toBeNull()
    expect(Array.from(recolorArt(egg, '#924968'))).toEqual(Array.from(egg))
  })

  it('reads an unparseable accent as black rather than throwing', () => {
    expect(() => recolorArt(art(), 'not-a-colour')).not.toThrow()
  })
})
