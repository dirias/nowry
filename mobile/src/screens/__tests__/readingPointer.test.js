import { FOLD_FRACTION, activeHeading, inDocumentOrder, offsetForSection } from '../readingPointer'

const headings = [
  { y: 0, text: 'Introduction' },
  { y: 800, text: 'Grammar' },
  { y: 1600, text: 'Vocabulary' }
]

describe('activeHeading', () => {
  it('is the last heading whose top has passed the reading line', () => {
    expect(activeHeading(headings, 0, 0)).toBe('Introduction')
    expect(activeHeading(headings, 900, 0)).toBe('Grammar')
    expect(activeHeading(headings, 5000, 0)).toBe('Vocabulary')
  })

  it('counts a heading a little above the top edge as the one being read', () => {
    // The eye sits below the heading, not on it. At 800pt tall the line is
    // 200pt down, so "Grammar" at y=800 is active from a scroll of 600.
    expect(activeHeading(headings, 599, 800)).toBe('Introduction')
    expect(activeHeading(headings, 600, 800)).toBe('Grammar')
    expect(FOLD_FRACTION).toBe(0.25)
  })

  it('is null above the first heading, and on a document with none', () => {
    expect(activeHeading([{ y: 400, text: 'Later' }], 0, 0)).toBeNull()
    expect(activeHeading([], 900, 800)).toBeNull()
    expect(activeHeading(undefined, 900, 800)).toBeNull()
  })

  it('ignores a heading whose layout has not arrived, and stops at the first gap', () => {
    // `onLayout` fires per block and out of order; a heading with no `y` yet
    // must not make a later one look like the active one.
    expect(activeHeading([headings[0], { text: 'Pending' }, headings[2]], 5000, 0)).toBe('Introduction')
  })

  it('survives a NaN scroll offset', () => {
    expect(activeHeading(headings, NaN, NaN)).toBe('Introduction')
  })
})

describe('offsetForSection', () => {
  it('lands a little above the heading, never below zero', () => {
    expect(offsetForSection(headings, 'Grammar')).toBe(784)
    expect(offsetForSection(headings, 'Introduction')).toBe(0)
  })

  it('is null for a section this document does not have', () => {
    // A resume link to a heading since renamed scrolls nowhere rather than to
    // the top, which would read as the position having been lost.
    expect(offsetForSection(headings, 'Kanji')).toBeNull()
    expect(offsetForSection([], 'Grammar')).toBeNull()
    expect(offsetForSection(undefined, 'Grammar')).toBeNull()
  })
})

describe('inDocumentOrder', () => {
  it('sorts by block index, whatever order the layouts arrived in', () => {
    expect(inDocumentOrder({ 7: { text: 'c' }, 1: { text: 'a' }, 4: { text: 'b' } }).map((h) => h.text)).toEqual(['a', 'b', 'c'])
  })

  it('is empty for nothing', () => {
    expect(inDocumentOrder(undefined)).toEqual([])
    expect(inDocumentOrder({})).toEqual([])
  })
})
