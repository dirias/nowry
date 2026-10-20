import { sheetFooter, sheetTitle } from '../queueSheet'

const t = (key, values) => `${key}|${JSON.stringify(values)}`

describe('sheetTitle (MOB-117)', () => {
  it('names the day for the daily review', () => {
    expect(sheetTitle(t, { daily: true, scope: 'due', deckName: 'JPN', count: 29 })).toBe('cards.session.queue.titleDaily|{"count":29}')
  })

  it('names the deck and what the scope counts', () => {
    expect(sheetTitle(t, { daily: false, scope: 'due', deckName: 'JPN', count: 25 })).toBe(
      'cards.session.queue.titleDue|{"deck":"JPN","count":25}'
    )
    expect(sheetTitle(t, { daily: false, scope: 'all', deckName: 'JPN', count: 40 })).toBe(
      'cards.session.queue.titleAll|{"deck":"JPN","count":40}'
    )
  })

  it('falls back to the day sentence before the deck name is known', () => {
    expect(sheetTitle(t, { daily: false, scope: 'due', deckName: null, count: 3 })).toBe('cards.session.queue.titleDaily|{"count":3}')
  })
})

describe('sheetFooter (MOB-117)', () => {
  it('returns to the cards while a list is open', () => {
    expect(sheetFooter({ menu: 'tags', narrowed: false, scope: 'due', count: 29 })).toBe('show')
    expect(sheetFooter({ menu: 'decks', narrowed: true, scope: 'due', count: 2 })).toBe('show')
  })

  it('says what will be studied when the due queue is narrowed', () => {
    expect(sheetFooter({ menu: null, narrowed: true, scope: 'due', count: 12 })).toBe('study')
  })

  it('closes otherwise, including a narrowed browse and an empty result', () => {
    expect(sheetFooter({ menu: null, narrowed: false, scope: 'due', count: 29 })).toBe('close')
    expect(sheetFooter({ menu: null, narrowed: true, scope: 'all', count: 5 })).toBe('close')
    expect(sheetFooter({ menu: null, narrowed: true, scope: 'due', count: 0 })).toBe('close')
  })
})
