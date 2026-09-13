import { COVER_PRESETS, isPresetCover } from '../bookCovers'

describe('COVER_PRESETS', () => {
  it('offers the eight colours the web has always offered', () => {
    expect(COVER_PRESETS).toHaveLength(8)
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
    expect(isPresetCover('#0B6BCB')).toBe(true)
    expect(isPresetCover('#0b6bcb')).toBe(true)
  })

  it('does not recognise a custom colour or nothing', () => {
    expect(isPresetCover('#2a6971')).toBe(false)
    expect(isPresetCover(null)).toBe(false)
    expect(isPresetCover(undefined)).toBe(false)
  })
})
