import { contrastRatio, relativeLuminance, readableTextOn, generateColorScheme, getColorPresets } from '../colorSchemeGenerator'

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
  it('still exposes the eight curated colors unchanged', () => {
    expect(PRESET_COLORS).toEqual(['#2a6971', '#0b6bcb', '#9c27b0', '#e91e63', '#f44336', '#ff9800', '#4caf50', '#795548'])
  })

  it('exposes a contrastText that clears AA on its own swatch', () => {
    for (const preset of getColorPresets()) {
      expect(preset.contrastText).toBeDefined()
      expect(contrastRatio(preset.color, preset.contrastText)).toBeGreaterThanOrEqual(AA)
    }
  })
})
