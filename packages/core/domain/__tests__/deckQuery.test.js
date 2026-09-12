import { deckTypeOf, filterDecks } from '../deckQuery'

const decks = [
  { _id: '1', name: 'Japanese N5', deck_type: 'flashcard', tags: ['kanji', 'n5'] },
  { _id: '2', name: 'Biology quiz', deck_type: 'quiz', tags: ['science'] },
  { _id: '3', name: 'Kanji drills', tags: ['kanji'] }
]

describe('filterDecks', () => {
  it('returns everything when nothing is asked', () => {
    expect(filterDecks(decks).map((d) => d._id)).toEqual(['1', '2', '3'])
  })

  it('matches a name or a tag', () => {
    expect(filterDecks(decks, { search: 'kanji' }).map((d) => d._id)).toEqual(['1', '3'])
  })

  it('reads a space as AND', () => {
    expect(filterDecks(decks, { search: 'kanji n5' }).map((d) => d._id)).toEqual(['1'])
  })

  it('reads a comma as OR', () => {
    expect(filterDecks(decks, { search: 'biology, n5' }).map((d) => d._id)).toEqual(['1', '2'])
  })

  it('ignores case and surrounding space', () => {
    expect(filterDecks(decks, { search: '  JAPANESE  ' }).map((d) => d._id)).toEqual(['1'])
  })

  it('filters by type, defaulting a deck with none to flashcard', () => {
    expect(filterDecks(decks, { type: 'flashcard' }).map((d) => d._id)).toEqual(['1', '3'])
    expect(filterDecks(decks, { type: 'quiz' }).map((d) => d._id)).toEqual(['2'])
  })

  it('filters by tag, where any chosen tag is enough', () => {
    expect(filterDecks(decks, { tags: ['science', 'n5'] }).map((d) => d._id)).toEqual(['1', '2'])
  })

  it('applies all three together', () => {
    expect(filterDecks(decks, { search: 'kanji', type: 'flashcard', tags: ['n5'] }).map((d) => d._id)).toEqual(['1'])
  })

  it('survives an absent list and a deck with no name or tags', () => {
    expect(filterDecks(undefined, { search: 'x' })).toEqual([])
    expect(filterDecks([{ _id: '9' }], { search: 'x' })).toEqual([])
    expect(filterDecks([{ _id: '9' }])).toEqual([{ _id: '9' }])
  })

  it('names a deck with no type as a flashcard deck', () => {
    expect(deckTypeOf({})).toBe('flashcard')
    expect(deckTypeOf({ deck_type: 'quiz' })).toBe('quiz')
  })
})
