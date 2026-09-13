import { BOOK, COVER_RATIO, PAGE, RULED_LINES, coverLines, coverOf, coverShape } from '../books/coverSpec'

const written = (over = {}) => ({ source: 'written', word_count: 1082, section_count: 10, sections_with_cards: 0, ...over })
const imported = (over = {}) => ({ source: 'imported', page_count: 296, ...over })

describe('coverShape', () => {
  it('draws a written document as a page', () => {
    expect(coverShape(written())).toBe('page')
  })

  it('draws an import as a book', () => {
    expect(coverShape(imported())).toBe('book')
  })

  it('treats a document with no source as written, as the library does', () => {
    expect(coverShape({})).toBe('page')
  })
})

describe('coverLines', () => {
  it('rules a page that has something written on it', () => {
    expect(coverLines(written()).lines).toBe(RULED_LINES)
  })

  it('leaves an empty page blank, rather than claiming content', () => {
    expect(coverLines(written({ word_count: 0, section_count: 0 }))).toEqual({ lines: 0, filled: 0 })
  })

  it('never rules a book', () => {
    expect(coverLines(imported())).toEqual({ lines: 0, filled: 0 })
  })

  it('fills lines by coverage, and none for nothing covered', () => {
    expect(coverLines(written({ sections_with_cards: 0 })).filled).toBe(0)
    expect(coverLines(written({ sections_with_cards: 5 })).filled).toBe(2)
    expect(coverLines(written({ sections_with_cards: 10 })).filled).toBe(RULED_LINES)
  })

  it('never fills more lines than the page has', () => {
    expect(coverLines(written({ sections_with_cards: 99 })).filled).toBe(RULED_LINES)
  })

  it('fills nothing on a public document, whose coverage is its owner´s', () => {
    expect(coverLines(written({ sections_with_cards: 10 }), { public: true })).toEqual({ lines: RULED_LINES, filled: 0 })
  })
})

describe('coverOf', () => {
  it('carries the user´s colour and image, and nothing invented for them', () => {
    expect(coverOf(written({ cover_color: '#0B6BCB', cover_image: 'https://x/y.png' }))).toMatchObject({
      color: '#0B6BCB',
      image: 'https://x/y.png'
    })
    expect(coverOf(written())).toMatchObject({ color: null, image: null })
  })

  it('wears a ribbon only when the caller says so', () => {
    expect(coverOf(written()).ribbon).toBe(false)
    expect(coverOf(written(), { ribbon: true }).ribbon).toBe(true)
  })

  it('never puts a ribbon on someone else´s document', () => {
    expect(coverOf(written(), { ribbon: true, public: true }).ribbon).toBe(false)
  })
})

describe('the proportions both clients draw', () => {
  it('keeps a cover taller than wide', () => {
    expect(COVER_RATIO).toBeGreaterThan(1)
  })

  it('leaves room for every ruled line on the page', () => {
    expect(PAGE.firstLine + PAGE.lineGap * (RULED_LINES - 1)).toBeLessThan(1)
  })

  it('makes the tab and the fold span the page exactly', () => {
    expect(PAGE.tabWidth + PAGE.foldWidth).toBeCloseTo(1)
  })

  it('shades the spine rather than ramping it (D5: no gradient)', () => {
    expect(BOOK.spineShade).toBeGreaterThan(0)
    expect(BOOK.spineShade).toBeLessThan(1)
  })
})
