/**
 * The type table and the counts, which two clients now read.
 *
 * `deckCounts` exists because the mobile client read `due_count` and
 * `card_count` — names the API does not send — and drew every deck as empty
 * with nothing failing. A reader that names the fields once cannot do that
 * twice.
 */
import { DECK_TYPES, deckCounts, deckType } from './deckTypes'

describe('deckType', () => {
  it('gives each type its own colour and label', () => {
    expect(deckType('flashcard').color).toBe('primary.solidBg')
    expect(deckType('quiz').color).toBe('warning.solidBg')
    expect(deckType('visual').color).toBe('success.solidBg')
    expect(new Set(Object.values(DECK_TYPES).map((entry) => entry.color)).size).toBe(3)
  })

  it('reads an unknown or missing type as a flashcard', () => {
    expect(deckType('mystery')).toBe(DECK_TYPES.flashcard)
    expect(deckType(undefined)).toBe(DECK_TYPES.flashcard)
  })

  it('names a glyph rather than carrying one, so each client draws its own', () => {
    Object.values(DECK_TYPES).forEach((entry) => {
      expect(typeof entry.iconKey).toBe('string')
      expect(typeof entry.labelKey).toBe('string')
    })
  })
})

describe('deckCounts', () => {
  it("reads the API's own field names", () => {
    expect(deckCounts({ due_cards: 9, new_cards: 2, total_cards: 41, mastery: 41 })).toEqual({
      due: 9,
      fresh: 2,
      total: 41,
      mastery: 41,
      asked: 11,
      allNew: false
    })
  })

  it('is all zeroes for a deck that is missing them, not NaN', () => {
    expect(deckCounts({})).toEqual({ due: 0, fresh: 0, total: 0, mastery: 0, asked: 0, allNew: false })
    expect(deckCounts(null).asked).toBe(0)
  })

  it('calls a deck all-new only when every card is new', () => {
    expect(deckCounts({ total_cards: 4, new_cards: 4 }).allNew).toBe(true)
    expect(deckCounts({ total_cards: 4, new_cards: 3 }).allNew).toBe(false)
    // An empty deck is not "all new"; it has nothing at all.
    expect(deckCounts({ total_cards: 0, new_cards: 0 }).allNew).toBe(false)
  })

  it('asked is what the deck wants today, so up to date is zero', () => {
    expect(deckCounts({ due_cards: 0, new_cards: 0, total_cards: 20 }).asked).toBe(0)
  })
})
