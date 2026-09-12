/**
 * The type table and the counts, which two clients now read.
 *
 * `deckCounts` exists because the mobile client read `due_count` and
 * `card_count` — names the API does not send — and drew every deck as empty
 * with nothing failing. A reader that names the fields once cannot do that
 * twice.
 */
import { DECK_TYPES, deckCounts, deckCountsFrom, deckType } from './deckTypes'

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

describe('deckCountsFrom', () => {
  // `GET /decks/{id}` returns the stored document and computes no counts; only
  // the list route does. A detail screen reading the single-deck payload alone
  // showed the card total and two permanent zeroes (MOB-065).
  const detail = { _id: 'd1', name: 'JPN', deck_type: 'flashcard', total_cards: 26 }
  const listEntry = { _id: 'd1', total_cards: 26, due_cards: 20, new_cards: 3, mastery: 92 }

  it('takes the counts from the list entry when there is one', () => {
    expect(deckCountsFrom(detail, listEntry)).toMatchObject({ total: 26, due: 20, fresh: 3, mastery: 92, asked: 23 })
  })

  it('falls back to the detail payload, which is all zeroes but never NaN', () => {
    expect(deckCountsFrom(detail)).toMatchObject({ total: 26, due: 0, fresh: 0, mastery: 0, asked: 0 })
  })

  it('keeps the detail payload as the authority on the stored total', () => {
    expect(deckCountsFrom({ ...detail, total_cards: 27 }, listEntry).total).toBe(27)
  })

  it('survives either side being absent', () => {
    expect(deckCountsFrom(undefined, undefined)).toMatchObject({ total: 0, due: 0, fresh: 0 })
    expect(deckCountsFrom(undefined, listEntry)).toMatchObject({ due: 20, fresh: 3 })
  })
})
