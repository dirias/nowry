import { COVER_PRESETS, isPresetCover } from '../bookCovers'

describe('COVER_PRESETS', () => {
  // Stored on every document, so pinned by literal: a moved constant must fail
  // here rather than quietly turn everyone's presets into custom colours.
  it('offers the eight ADR-034 colours, exactly', () => {
    expect(COVER_PRESETS.map((preset) => preset.hex)).toEqual([
      '#4493d0',
      '#ca6e5d',
      '#54a061',
      '#bc7d2f',
      '#8c7ed0',
      '#b86fa9',
      '#142023',
      '#7f9094'
    ])
  })

  it('names every swatch, because a colour alone is eight identical buttons to a screen reader', () => {
    expect(COVER_PRESETS.every((preset) => preset.nameKey.startsWith('books.coverColors.'))).toBe(true)
  })

  it('stores each colour as a six-digit hex the API accepts', () => {
    expect(COVER_PRESETS.every((preset) => /^#[0-9a-f]{6}$/i.test(preset.hex))).toBe(true)
  })

  it('never offers the same colour twice', () => {
    expect(new Set(COVER_PRESETS.map((preset) => preset.hex.toLowerCase())).size).toBe(COVER_PRESETS.length)
  })
})

describe('isPresetCover', () => {
  it('recognises a preset whatever case the API stored it in', () => {
    expect(isPresetCover('#4493D0')).toBe(true)
    expect(isPresetCover('#4493d0')).toBe(true)
  })

  it('does not recognise a custom colour or nothing', () => {
    expect(isPresetCover('#2a6971')).toBe(false)
    expect(isPresetCover(null)).toBe(false)
    expect(isPresetCover(undefined)).toBe(false)
  })
})
