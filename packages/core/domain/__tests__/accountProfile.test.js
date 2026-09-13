import { PLAN_METERS, membershipDays, planMeters, profileStats } from '../accountProfile'

describe('planMeters', () => {
  it('is empty when the account carries no limits', () => {
    expect(planMeters(null)).toEqual([])
    expect(planMeters({})).toEqual([])
    expect(planMeters({ usage: { books: 3 } })).toEqual([])
  })

  it('reports use against a real limit as a percentage', () => {
    const [books] = planMeters({ limits: { books: 10 }, usage: { books: 3 } })
    expect(books).toEqual({ name: 'books', used: 3, limit: 10, unlimited: false, percent: 30 })
  })

  it('treats -1 as no limit and refuses to compute a percentage of infinity', () => {
    const [books] = planMeters({ limits: { books: -1 }, usage: { books: 4000 } })
    expect(books.unlimited).toBe(true)
    expect(books.percent).toBe(0)
  })

  it('never reports more than full', () => {
    expect(planMeters({ limits: { books: 10 }, usage: { books: 25 } })[0].percent).toBe(100)
  })

  it('reads nought used rather than nothing', () => {
    expect(planMeters({ limits: { books: 10 } })[0].used).toBe(0)
  })

  it('does not divide by a limit of zero', () => {
    expect(planMeters({ limits: { books: 0 }, usage: { books: 0 } })[0].percent).toBe(0)
  })

  it('lists only the meters the account has, in the declared order', () => {
    const meters = planMeters({ limits: { decks: 5, books: 10 }, usage: {} })
    expect(meters.map((meter) => meter.name)).toEqual(['books', 'decks'])
    expect(PLAN_METERS).toEqual(['books', 'flashcards', 'decks'])
  })
})

describe('membershipDays', () => {
  const DAY = 86400000

  it('does not say a day on the day you signed up', () => {
    const now = Date.UTC(2026, 0, 10)
    expect(membershipDays(new Date(now - 1000).toISOString(), now)).toBe(0)
  })

  it('counts whole days', () => {
    const now = Date.UTC(2026, 0, 10)
    expect(membershipDays(new Date(now - 5 * DAY - 1000).toISOString(), now)).toBe(5)
  })

  it('is nothing when the account does not say', () => {
    expect(membershipDays(null)).toBeNull()
    expect(membershipDays('not a date')).toBeNull()
  })

  it('never reports a negative membership', () => {
    const now = Date.UTC(2026, 0, 10)
    expect(membershipDays(new Date(now + 5 * DAY).toISOString(), now)).toBe(0)
  })
})

describe('profileStats', () => {
  it('reads the three the server sends', () => {
    expect(profileStats({ stats: { total_cards: 412, books_created: 3, study_streak: 9 } })).toEqual({
      cards: 412,
      books: 3,
      streak: 9
    })
  })

  it('is nought rather than nothing when the account is new', () => {
    expect(profileStats(null)).toEqual({ cards: 0, books: 0, streak: 0 })
    expect(profileStats({})).toEqual({ cards: 0, books: 0, streak: 0 })
  })

  it('keeps a real zero', () => {
    expect(profileStats({ stats: { total_cards: 0, books_created: 0, study_streak: 0 } }).cards).toBe(0)
  })
})
