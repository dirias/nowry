import { contrastRatio, deltaE, hexToOklch, oklchToHex } from '../oklch'
import { generateBrandScheme, generateColorScheme, getColorPresets } from '../colorSchemeGenerator'
import { GOLD_SPEC, STATUS_SPEC } from '../colorSystem'
import { FILL_MAX_CHROMA, MEANING_DISTANCE, groundTint, memberDarkScheme, memberDarkSolid } from '../darkLadder'

// The eight presets plus colours only the free picker can store: a yellow that
// would read as gold, a pink, a red that would read as Delete, an orange.
const CUSTOM = { yellow: '#f5c518', pink: '#f472b6', red: '#e53935', orange: '#f97316' }
const ACCENTS = [...getColorPresets().map((p) => p.color), ...Object.values(CUSTOM), '#000000', '#ffffff']
const GROUNDS = ['body', 'surface', 'level1']

const gold = oklchToHex(GOLD_SPEC.darkSolidL, GOLD_SPEC.C, GOLD_SPEC.h)
const danger = oklchToHex(STATUS_SPEC.danger.darkSolidL, STATUS_SPEC.danger.C, STATUS_SPEC.danger.h)

describe.each(ACCENTS)('a member’s near-black dark mode with %s (ADR-082)', (accent) => {
  const p = memberDarkScheme(accent)

  it('keeps text at 4.5:1 on every ground, captions on pressed surfaces too', () => {
    for (const g of GROUNDS) {
      for (const tone of ['primary', 'secondary', 'tertiary'])
        expect(contrastRatio(p.text[tone], p.background[g])).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrastRatio(p.text.tertiary, p.background.level2)).toBeGreaterThanOrEqual(4.5)
  })

  it('draws a field border at 3:1 on a card (WCAG 1.4.11)', () => {
    expect(contrastRatio(p.fieldBorder, p.background.surface)).toBeGreaterThanOrEqual(3)
  })

  it('stands the accent button 3:1 off every ground, with ink text at 4.5:1', () => {
    for (const g of GROUNDS) expect(contrastRatio(p.primary.solidBg, p.background[g])).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(p.primary.solidColor, p.primary.solidBg)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps links and chip text at 4.5:1', () => {
    for (const g of GROUNDS) expect(contrastRatio(p.primary.plainColor, p.background[g])).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(p.primary.softColor, p.primary.softBg)).toBeGreaterThanOrEqual(4.5)
  })

  it('draws the focus ring at 3:1 on every ground', () => {
    for (const g of [...GROUNDS, 'level2']) expect(contrastRatio(p.focusVisible, p.background[g])).toBeGreaterThanOrEqual(3)
  })

  it('never lets the button read as earned gold or as Delete', () => {
    expect(deltaE(p.primary.solidBg, gold)).toBeGreaterThanOrEqual(MEANING_DISTANCE)
    expect(deltaE(p.primary.solidBg, danger)).toBeGreaterThanOrEqual(MEANING_DISTANCE)
  })

  it('caps the chroma of a large fill', () => {
    expect(hexToOklch(p.primary.solidBg).C).toBeLessThanOrEqual(FILL_MAX_CHROMA + 0.005)
  })

  it('keeps status and gold tints above the card', () => {
    for (const tone of ['success', 'warning', 'danger', 'gold']) {
      expect(hexToOklch(p[tone].softBg).L).toBeGreaterThan(hexToOklch(p.background.surface).L)
      expect(contrastRatio(p[tone].softColor, p[tone].softBg)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('the ground’s tint', () => {
  it('carries the accent’s hue at 0.025, warm hues at 0.012, near-greys none', () => {
    expect(groundTint('#2a6971').C).toBe(0.025)
    expect(groundTint(CUSTOM.pink).C).toBe(0.025)
    expect(groundTint(CUSTOM.yellow).C).toBe(0.012)
    expect(groundTint('#805c43').C).toBe(0.012) // Umber
    expect(groundTint('#5c666f').C).toBe(0.004) // Graphite
  })

  it('keeps every page near-black', () => {
    for (const accent of ACCENTS) expect(hexToOklch(memberDarkScheme(accent).background.body).L).toBeCloseTo(0.165, 2)
  })
})

describe('the guard', () => {
  it('moves a yellow off gold and a red off danger, keeping their hue', () => {
    expect(memberDarkSolid(CUSTOM.yellow).guarded).toBe('gold')
    expect(memberDarkSolid(CUSTOM.red).guarded).toBe('danger')
    expect(memberDarkSolid('#2a6971').guarded).toBeNull()
  })

  it('keeps a light pick at its own lightness and lifts a dark one to 0.72', () => {
    expect(memberDarkSolid(CUSTOM.pink).L).toBeCloseTo(hexToOklch(CUSTOM.pink).L, 3)
    expect(memberDarkSolid('#2a6971').L).toBe(0.72)
  })
})

describe('without the flag', () => {
  it('leaves every dark palette on ADR-074’s teal grounds', () => {
    for (const accent of ACCENTS) expect(generateColorScheme(accent).dark.background.body).toBe('#023135')
  })

  it('leaves light mode identical with and without it', () => {
    for (const accent of ACCENTS) expect(generateColorScheme(accent, { memberDark: true }).light).toEqual(generateColorScheme(accent).light)
  })

  it('draws the focus ring at 3:1 on every ground in both modes, guests included (ADR-082 §8c)', () => {
    const schemes = [...ACCENTS.map((a) => generateColorScheme(a)), generateBrandScheme()]
    for (const scheme of schemes) {
      for (const mode of ['light', 'dark']) {
        for (const g of GROUNDS) expect(contrastRatio(scheme[mode].focusVisible, scheme[mode].background[g])).toBeGreaterThanOrEqual(3)
      }
    }
  })
})
