import {
  contrastRatio,
  relativeLuminance,
  readableTextOn,
  generateColorScheme,
  getColorPresets,
  getColorName,
  STICKY_PALETTE
} from '../colorSchemeGenerator'
import { deltaE, hexToOklch } from '../oklch'

const AA = 4.5
const MODES = ['light', 'dark']

// Accents that historically broke the palette: near-black (the reported bug),
// pure black, pure white and a mid-grey with no hue to lean on.
const EXTREME_ACCENTS = ['#000000', '#ffffff', '#020802', '#7f7f7f']
const PRESET_COLORS = getColorPresets().map((preset) => preset.color)

describe('relativeLuminance', () => {
  it('anchors the WCAG scale at black and white', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBe(1)
  })

  it('accepts shorthand hex and missing hash', () => {
    expect(relativeLuminance('#fff')).toBe(relativeLuminance('#ffffff'))
    expect(relativeLuminance('020802')).toBe(relativeLuminance('#020802'))
  })

  it('falls back to black instead of throwing on unparseable input', () => {
    expect(relativeLuminance('not-a-color')).toBe(0)
    expect(relativeLuminance(undefined)).toBe(0)
  })
})

describe('contrastRatio', () => {
  it('returns 21 for black against white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21)
  })

  it('is order-independent', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21)
  })

  it('returns 1 for a color against itself', () => {
    expect(contrastRatio('#2a6971', '#2a6971')).toBe(1)
  })
})

describe('readableTextOn', () => {
  it('picks white on a near-black accent', () => {
    expect(readableTextOn('#020802')).toBe('#ffffff')
  })

  it('picks black on a bright yellow accent', () => {
    expect(readableTextOn('#ffff00')).toBe('#000000')
  })

  it('always reaches AA when either extreme can', () => {
    for (const accent of [...PRESET_COLORS, ...EXTREME_ACCENTS]) {
      expect(contrastRatio(accent, readableTextOn(accent))).toBeGreaterThanOrEqual(AA)
    }
  })
})

describe('generateColorScheme — solid variant contrast', () => {
  const accents = [...PRESET_COLORS, ...EXTREME_ACCENTS]

  it.each(accents)('keeps solidColor readable on solidBg for %s', (accent) => {
    const scheme = generateColorScheme(accent)

    for (const mode of MODES) {
      const { solidBg, solidColor } = scheme[mode].primary
      expect(contrastRatio(solidBg, solidColor)).toBeGreaterThanOrEqual(AA)
    }
  })

  // Joy UI exposes one text color per variant while hover shifts the background,
  // so hover is held to the WCAG non-text threshold (3:1) rather than AA.
  // `solidActiveBg` is not asserted: in dark mode it reverts to the raw accent,
  // several stops lighter than solidBg, so a mid-luminance accent cannot clear
  // 3:1 on both — that is a background-ramp question, not a text-color one.
  it.each(accents)('keeps solidColor usable on the hover state for %s', (accent) => {
    const scheme = generateColorScheme(accent)

    for (const mode of MODES) {
      const { solidHoverBg, solidColor } = scheme[mode].primary
      expect(contrastRatio(solidHoverBg, solidColor)).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('generateColorScheme — soft variant contrast', () => {
  const accents = [...PRESET_COLORS, ...EXTREME_ACCENTS]

  // The reported bug: a selected chip is `variant='soft' color='primary'`,
  // so its label renders as softColor on softBg.
  it.each(accents)('keeps a selected soft chip legible for %s', (accent) => {
    const scheme = generateColorScheme(accent)

    for (const mode of MODES) {
      const { softBg, softColor } = scheme[mode].primary
      expect(contrastRatio(softBg, softColor)).toBeGreaterThanOrEqual(AA)
    }
  })

  it.each(accents)('keeps plainColor legible on the page surfaces for %s', (accent) => {
    const scheme = generateColorScheme(accent)

    for (const mode of MODES) {
      const { plainColor } = scheme[mode].primary
      const { body, surface } = scheme[mode].background
      expect(contrastRatio(plainColor, body)).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(plainColor, surface)).toBeGreaterThanOrEqual(AA)
    }
  })
})

describe('generateColorScheme — semantic groups', () => {
  it.each(['success', 'warning', 'danger'])('keeps %s solid and soft text readable', (group) => {
    const scheme = generateColorScheme('#2a6971')

    for (const mode of MODES) {
      const { solidBg, solidColor, softBg, softColor } = scheme[mode][group]
      expect(contrastRatio(solidBg, solidColor)).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(softBg, softColor)).toBeGreaterThanOrEqual(AA)
    }
  })
})

describe('getColorPresets', () => {
  it('exposes the eight ADR-034 presets, Teal first at the stored default', () => {
    expect(PRESET_COLORS).toEqual(['#2a6971', '#346898', '#5f5c99', '#825080', '#924968', '#805c43', '#6e6634', '#5c666f'])
    expect(getColorPresets().map((preset) => preset.key)).toEqual(['teal', 'lake', 'iris', 'plum', 'rose', 'umber', 'olive', 'graphite'])
  })

  it('sits every preset but the stored default on the ladder lightness', () => {
    for (const color of PRESET_COLORS.slice(1)) {
      expect(hexToOklch(color).L).toBeCloseTo(0.505, 2)
    }
  })

  // E3 of the PRD: Crimson Red was the danger colour, Forest Green the success
  // colour. A preset must look unlike every status solid in both modes.
  it.each(PRESET_COLORS)('keeps %s visibly apart from success, warning and danger', (color) => {
    const scheme = generateColorScheme(color)
    for (const mode of MODES) {
      for (const status of ['success', 'warning', 'danger']) {
        expect(deltaE(scheme[mode].primary.solidBg, scheme[mode][status].solidBg)).toBeGreaterThan(0.08)
      }
    }
  })

  it('exposes a contrastText that clears AA on its own swatch', () => {
    for (const preset of getColorPresets()) {
      expect(preset.contrastText).toBeDefined()
      expect(contrastRatio(preset.color, preset.contrastText)).toBeGreaterThanOrEqual(AA)
    }
  })
})

/**
 * A11Y-001 — thin accent lines must clear the non-text contrast floor.
 *
 * WCAG 2.2 §1.4.11 puts focus indicators, selected-state markers and control
 * boundaries at 3:1 against what they sit on. This codebase draws its focus
 * rings with `primary.outlinedBorder`, and the dark scheme did not define it at
 * all — so Joy's default filled the gap with a blue at 1.97:1, and every focus
 * ring in the app was both off-brand and effectively unrenderable in dark mode.
 *
 * The guard is per-accent rather than on one colour: the palette is generated
 * from whatever the user picks, so a hue that fails is a hue away, not a
 * regression someone has to write.
 */
describe('thin accent lines clear the non-text contrast floor', () => {
  const NON_TEXT_FLOOR = 3

  const relativeLuminance = (hex) => {
    const n = parseInt(hex.replace('#', ''), 16)
    const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  }

  const contrast = (a, b) => {
    const [x, y] = [relativeLuminance(a), relativeLuminance(b)]
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
  }

  // Spread across the wheel, plus the app's own default, plus two colours whose
  // mid-lightness form is naturally weak against a dark ground.
  const ACCENTS = ['#2a6971', '#0b6bcb', '#c0392b', '#7a5cc4', '#1e8e5a', '#d8a24a', '#111111', '#f5f5f5']

  it.each(ACCENTS)('dark outlinedBorder is legible on both page grounds for %s', (accent) => {
    const { dark } = generateColorScheme(accent)
    const grounds = [dark.background.body, dark.background.surface]

    grounds.forEach((ground) => {
      expect(contrast(dark.primary.outlinedBorder, ground)).toBeGreaterThanOrEqual(NON_TEXT_FLOOR)
    })
  })

  it.each(ACCENTS)('dark outlinedBorder keeps the accent hue rather than falling back for %s', (accent) => {
    const { dark } = generateColorScheme(accent)

    // The bug was a MISSING key, so the shape of the fix is that it exists.
    expect(dark.primary.outlinedBorder).toMatch(/^#[0-9a-f]{6}$/i)
    expect(dark.primary.outlinedBorder).not.toBe('#12467B')
  })

  // The focus ring (formStyles.focusRing, components.js) — 2.06:1 before
  // ADR-034 and waived; cleared by the audit.
  it.each(ACCENTS)('light outlinedBorder is a legible focus ring on body, surface and level1 for %s', (accent) => {
    const { light } = generateColorScheme(accent)
    for (const ground of ['body', 'surface', 'level1']) {
      expect(contrast(light.primary.outlinedBorder, light.background[ground])).toBeGreaterThanOrEqual(NON_TEXT_FLOOR)
    }
  })
})

describe('generateColorScheme — every group and the neutrals (ADR-034)', () => {
  it.each(MODES)('text primary, secondary and tertiary clear AA on body, surface and level1 in %s', (mode) => {
    const { text, background } = generateColorScheme('#2a6971')[mode]
    for (const level of ['primary', 'secondary', 'tertiary']) {
      for (const ground of ['body', 'surface', 'level1']) {
        expect(contrastRatio(text[level], background[ground])).toBeGreaterThanOrEqual(AA)
      }
    }
  })

  it.each(MODES)('gold solid and soft text clear AA in %s', (mode) => {
    const { gold } = generateColorScheme('#2a6971')[mode]
    expect(contrastRatio(gold.solidBg, gold.solidColor)).toBeGreaterThanOrEqual(AA)
    expect(contrastRatio(gold.softBg, gold.softColor)).toBeGreaterThanOrEqual(AA)
  })

  it('normalises any accent onto the ladder, so a neon and a preset share a lightness', () => {
    const neon = hexToOklch(generateColorScheme('#ff00ff').light.primary.solidBg)
    const preset = hexToOklch(generateColorScheme('#346898').light.primary.solidBg)
    expect(neon.L).toBeCloseTo(preset.L, 2)
    expect(neon.C).toBeLessThanOrEqual(0.131)
  })

  it('keeps the accent hue', () => {
    const { h } = hexToOklch(generateColorScheme('#924968').light.primary.solidBg)
    expect(Math.abs(h - hexToOklch('#924968').h)).toBeLessThan(3)
  })

  it('carries a full 50–900 scale so no Joy default hue leaks in', () => {
    const { primary, neutral } = generateColorScheme('#2a6971').light
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
      expect(primary[step]).toMatch(/^#[0-9a-f]{6}$/)
      expect(neutral[step]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('STICKY_PALETTE', () => {
  it.each(MODES)('keeps the stored ids and readable note text in %s', (mode) => {
    expect(Object.keys(STICKY_PALETTE[mode])).toEqual(['yellow', 'green', 'blue', 'purple', 'pink', 'teal', 'red', 'slate'])
    for (const note of Object.values(STICKY_PALETTE[mode])) {
      expect(contrastRatio(note.text, note.bg)).toBeGreaterThanOrEqual(AA)
    }
  })
})

describe('getColorName', () => {
  it('names each preset after itself', () => {
    for (const preset of getColorPresets()) {
      expect(getColorName(preset.color)).toBe(preset.label)
    }
  })
})

// The audit's regression: a light dark-mode solid broke every screen built on
// light text over the accent. A solid is dark in both modes, with light text,
// and still reads as a shape on the dark page.
describe('solids stay dark with light text in both modes', () => {
  it.each(PRESET_COLORS)('keeps the %s solid dark, its text light, and the shape visible on the page', (color) => {
    for (const mode of MODES) {
      const { primary, background } = generateColorScheme(color)[mode]
      expect(relativeLuminance(primary.solidColor)).toBeGreaterThan(relativeLuminance(primary.solidBg))
      expect(contrastRatio('#ffffff', primary.solidBg)).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(primary.solidBg, background.body)).toBeGreaterThanOrEqual(3)
    }
  })

  it.each(['success', 'danger'])('keeps the %s solid dark with light text in dark mode', (group) => {
    const tone = generateColorScheme('#2a6971').dark[group]
    expect(contrastRatio('#ffffff', tone.solidBg)).toBeGreaterThanOrEqual(AA)
  })
})
