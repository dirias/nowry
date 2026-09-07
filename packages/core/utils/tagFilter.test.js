import { countTags, filterCardsByTags } from './tagFilter'

const card = (id, tags) => ({ _id: id, id, title: id, ...(tags === undefined ? {} : { tags }) })

describe('countTags', () => {
  it('tallies tags across cards and sorts by count desc, then tag asc', () => {
    const cards = [card('c1', ['verbs', 'nouns']), card('c2', ['verbs']), card('c3', ['adjectives', 'nouns']), card('c4', ['verbs'])]

    expect(countTags(cards)).toEqual([
      { tag: 'verbs', count: 3 },
      { tag: 'nouns', count: 2 },
      { tag: 'adjectives', count: 1 }
    ])
  })

  it('breaks count ties alphabetically, deterministically, regardless of input order', () => {
    const forward = countTags([card('c1', ['zulu']), card('c2', ['alpha']), card('c3', ['mike'])])
    const reversed = countTags([card('c1', ['mike']), card('c2', ['zulu']), card('c3', ['alpha'])])

    expect(forward.map((entry) => entry.tag)).toEqual(['alpha', 'mike', 'zulu'])
    expect(reversed.map((entry) => entry.tag)).toEqual(['alpha', 'mike', 'zulu'])
  })

  it('tolerates undefined, null and non-array tags without throwing', () => {
    const cards = [card('c1'), card('c2', null), card('c3', 'verbs'), card('c4', { verbs: true }), card('c5', ['verbs'])]

    expect(countTags(cards)).toEqual([{ tag: 'verbs', count: 1 }])
  })

  it('ignores non-string and blank tag entries', () => {
    expect(countTags([card('c1', ['  ', '', 7, null, ' verbs '])])).toEqual([{ tag: 'verbs', count: 1 }])
  })

  it('returns an empty list for an empty or non-array card set', () => {
    expect(countTags([])).toEqual([])
    expect(countTags(undefined)).toEqual([])
    expect(countTags(null)).toEqual([])
  })
})

describe('filterCardsByTags', () => {
  const cards = [card('c1', ['verbs']), card('c2', ['nouns']), card('c3', ['verbs', 'nouns']), card('c4')]

  it('returns the IDENTICAL array reference when no tags are selected', () => {
    // toBe, not toEqual — StudySession's memo identity depends on this.
    expect(filterCardsByTags(cards, [])).toBe(cards)
    expect(filterCardsByTags(cards, undefined)).toBe(cards)
    expect(filterCardsByTags(cards, null)).toBe(cards)
  })

  it('matches cards carrying ANY selected tag (OR semantics), never only ALL of them', () => {
    const result = filterCardsByTags(cards, ['verbs', 'nouns'])
    expect(result.map((entry) => entry.id)).toEqual(['c1', 'c2', 'c3'])
  })

  it('narrows to a single tag', () => {
    expect(filterCardsByTags(cards, ['nouns']).map((entry) => entry.id)).toEqual(['c2', 'c3'])
  })

  it('excludes untagged cards whenever a filter is active', () => {
    expect(filterCardsByTags(cards, ['verbs']).some((entry) => entry.id === 'c4')).toBe(false)
  })

  it('returns an empty array — not the source — when nothing matches', () => {
    const result = filterCardsByTags(cards, ['does-not-exist'])
    expect(result).toEqual([])
    expect(result).not.toBe(cards)
  })

  it('tolerates cards with malformed tags under an active filter', () => {
    const messy = [card('m1', null), card('m2', 'verbs'), card('m3', ['verbs'])]
    expect(filterCardsByTags(messy, ['verbs']).map((entry) => entry.id)).toEqual(['m3'])
  })
})
