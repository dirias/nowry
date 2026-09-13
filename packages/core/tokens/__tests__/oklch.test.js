import { contrastRatio, deltaE, hexToOklch, oklchToHex } from '../oklch'

describe('oklch', () => {
  it.each(['#2a6971', '#ffcc00', '#000000', '#ffffff', '#924968', '#7f7f7f'])('round-trips %s within one step per channel', (hex) => {
    const { L, C, h } = hexToOklch(hex)
    const back = oklchToHex(L, C, h)
    for (const i of [1, 3, 5]) {
      expect(Math.abs(parseInt(back.slice(i, i + 2), 16) - parseInt(hex.slice(i, i + 2), 16))).toBeLessThanOrEqual(1)
    }
  })

  it('clamps an out-of-gamut colour by chroma, keeping lightness', () => {
    const hex = oklchToHex(0.9, 0.4, 150)
    expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    expect(hexToOklch(hex).L).toBeCloseTo(0.9, 2)
  })

  it('measures identical colours as zero apart and black from white as one', () => {
    expect(deltaE('#2a6971', '#2a6971')).toBeCloseTo(0, 5)
    expect(deltaE('#000000', '#ffffff')).toBeCloseTo(1, 2)
    expect(contrastRatio('#000000', '#ffffff')).toBe(21)
  })
})
