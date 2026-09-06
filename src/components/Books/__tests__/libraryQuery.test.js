import {
  coverage,
  filterDocuments,
  kindCounts,
  pickContinue,
  readingPage,
  resumeHref,
  sectionsWithoutCards,
  sortDocuments,
  tagCounts
} from '../libraryQuery'

const written = {
  _id: 'w',
  title: 'N3 Grammar',
  updated_at: '2026-09-05T10:00:00Z',
  section_count: 6,
  sections_with_cards: 4,
  last_section: 'Particles',
  cards: 18,
  tags: ['jp', 'grammar']
}
const imported = {
  _id: 'i',
  title: 'Deep Work',
  author: 'Cal Newport',
  source: 'imported',
  updated_at: '2026-09-01T10:00:00Z',
  page_count: 296,
  reading_position: 139,
  cards: 12,
  tags: ['jp']
}
const fresh = { _id: 'f', title: 'JPNS', updated_at: '2026-09-06T10:00:00Z', cards: 0 }

describe('libraryQuery (BOOK-007)', () => {
  it('opens on the most recently edited document', () => {
    expect(pickContinue([written, imported, fresh])._id).toBe('f')
    expect(pickContinue([])).toBeNull()
  })

  it('draws coverage only when the section count is known, and names the gap', () => {
    expect(coverage(written)).toEqual({ covered: 4, total: 6, pct: 67 })
    expect(sectionsWithoutCards(written)).toBe(2)
    expect(coverage(fresh)).toBeNull()
    expect(sectionsWithoutCards(fresh)).toBe(0)
  })

  it('reads the page of an import, 1-based and clamped', () => {
    expect(readingPage(imported)).toEqual({ page: 140, total: 296, pct: 47, done: false })
    expect(readingPage({ ...imported, reading_position: 999 }).done).toBe(true)
    expect(readingPage({ ...imported, reading_position: null }).page).toBe(1)
    expect(readingPage(written)).toBeNull()
  })

  it('resumes at the section or the page, and carries an extra action', () => {
    expect(resumeHref(written)).toBe('/book/w?section=Particles')
    expect(resumeHref(imported)).toBe('/book/i?page=140')
    expect(resumeHref(fresh)).toBe('/book/f')
    expect(resumeHref(imported, { listen: 1 })).toBe('/book/i?page=140&listen=1')
  })

  it('counts kinds and tags', () => {
    expect(kindCounts([written, imported, fresh])).toEqual({ all: 3, written: 2, imported: 1 })
    expect(tagCounts([written, imported])).toEqual([
      { tag: 'jp', count: 2 },
      { tag: 'grammar', count: 1 }
    ])
  })

  it('filters by kind, tag and text — the author only on imports', () => {
    const all = [written, imported, fresh]
    expect(filterDocuments(all, { kind: 'imported' }).map((b) => b._id)).toEqual(['i'])
    expect(filterDocuments(all, { tags: ['grammar'] }).map((b) => b._id)).toEqual(['w'])
    expect(filterDocuments(all, { search: 'newport' }).map((b) => b._id)).toEqual(['i'])
    expect(filterDocuments(all, { search: 'jp' }).map((b) => b._id)).toEqual(['f'])
  })

  it('sorts last-edited first by default, by title, or by most cards', () => {
    const all = [written, imported, fresh]
    expect(sortDocuments(all).map((b) => b._id)).toEqual(['f', 'w', 'i'])
    expect(sortDocuments(all, 'title').map((b) => b._id)).toEqual(['i', 'f', 'w'])
    expect(sortDocuments(all, 'cards').map((b) => b._id)).toEqual(['w', 'i', 'f'])
  })
})
