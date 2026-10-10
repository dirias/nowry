import { REST_PRESETS, cardRest, deckRest, isIndefinite, isResting, restOf, restingTotal, spreadOf, untilFromPreset } from './cardRest'

const now = new Date('2026-10-10T12:00:00Z')

describe('restOf', () => {
  it('is awake for a missing, null or past until', () => {
    expect(restOf({}, now)).toEqual({ resting: false, until: null, indefinite: false })
    expect(restOf({ rest_until: null }, now).resting).toBe(false)
    expect(restOf({ rest_until: '2026-10-10T10:00:00Z' }, now).resting).toBe(false)
    expect(restOf(null, now).resting).toBe(false)
  })

  it('is resting until a future date', () => {
    const rest = restOf({ rest_until: '2026-11-02T00:00:00Z' }, now)
    expect(rest.resting).toBe(true)
    expect(rest.until.toISOString()).toBe('2026-11-02T00:00:00.000Z')
    expect(rest.indefinite).toBe(false)
  })

  it('reads the far date as until woken', () => {
    const rest = restOf({ rest_until: '9999-12-31T00:00:00Z' }, now)
    expect(rest.resting).toBe(true)
    expect(rest.indefinite).toBe(true)
    expect(isIndefinite('9999-12-31T00:00:00Z')).toBe(true)
    expect(isIndefinite('2026-12-31T00:00:00Z')).toBe(false)
  })

  it('survives garbage', () => {
    expect(restOf({ rest_until: 'not a date' }, now).resting).toBe(false)
  })
})

describe('cardRest and deckRest', () => {
  it('names the sources holding a card and when it first rested', () => {
    const card = {
      rest_until: '9999-12-31T00:00:00Z',
      rests: [{ source: 'card' }, { source: 'tag:kanji' }],
      rested_at: '2026-10-01T00:00:00Z'
    }
    const rest = cardRest(card, now)
    expect(rest.sources).toEqual(['card', 'tag:kanji'])
    expect(rest.restedAt.toISOString()).toBe('2026-10-01T00:00:00.000Z')
    expect(isResting(card, now)).toBe(true)
    expect(cardRest({}, now).sources).toEqual([])
  })

  it("reads a deck's own rest and its resting count", () => {
    expect(deckRest({ rest_until: null, resting_cards: 12 }, now)).toEqual({
      resting: false,
      until: null,
      indefinite: false,
      restingCards: 12
    })
    expect(deckRest({}, now).restingCards).toBe(0)
  })
})

describe('the groups total and the landing', () => {
  it('reads the resting total and nothing when absent', () => {
    expect(restingTotal({ resting: { cards: 142 } })).toBe(142)
    expect(restingTotal({})).toBe(0)
  })

  it('reads a spread only when cards moved', () => {
    expect(spreadOf({ spread: { cards: 226, days: 6, decks: 2 } })).toEqual({ cards: 226, days: 6, decks: 2 })
    expect(spreadOf({ spread: null })).toBeNull()
    expect(spreadOf({ spread: { cards: 0, days: 0, decks: 0 } })).toBeNull()
    expect(spreadOf({})).toBeNull()
  })
})

describe('the presets', () => {
  it('offer until woken and three lengths', () => {
    expect(REST_PRESETS.map((row) => row.key)).toEqual(['untilWoken', 'week', 'twoWeeks', 'month'])
    expect(untilFromPreset('untilWoken', now)).toBeNull()
    expect(untilFromPreset('week', now).toISOString()).toBe('2026-10-17T12:00:00.000Z')
    expect(untilFromPreset('month', now).toISOString()).toBe('2026-11-09T12:00:00.000Z')
    expect(untilFromPreset('nonsense', now)).toBeNull()
  })
})
