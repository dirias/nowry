import { MAX_PRACTICE, PRACTICE_GAP, localDay, practiceFor, resumeIndex, sessionKeyOf, withPractice } from '../sessionOrder'

const queue = (n) => Array.from({ length: n }, (_, i) => ({ _id: `c${i + 1}` }))
const keys = (cards) => cards.map(sessionKeyOf)

describe('practiceFor (STUDY-009, ADR-057 §2)', () => {
  it('places a missed card after the next five', () => {
    const cards = queue(10)
    const entry = practiceFor(cards, 0, cards[0])
    expect(entry.after).toBe('c6')
    expect(entry.card).toMatchObject({ _id: 'c1', practice: 1, practiceKey: 'c1#1' })
    expect(keys(withPractice(cards, [entry]))).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c1#1', 'c7', 'c8', 'c9', 'c10'])
  })

  it('places it at the end when fewer than five remain', () => {
    const cards = queue(4)
    const entry = practiceFor(cards, 1, cards[1])
    expect(keys(withPractice(cards, [entry]))).toEqual(['c1', 'c2', 'c3', 'c4', 'c2#1'])
  })

  it('gives a card at most two practice showings', () => {
    const cards = queue(3)
    const first = practiceFor(cards, 0, cards[0]).card
    const second = practiceFor(cards, 0, first).card
    expect(second.practice).toBe(MAX_PRACTICE)
    expect(practiceFor(cards, 0, second)).toBeNull()
  })

  it('keeps the gap a constant others can read', () => {
    expect(PRACTICE_GAP).toBe(5)
  })
})

describe('withPractice', () => {
  it('returns the same array with nothing to add', () => {
    const cards = queue(2)
    expect(withPractice(cards, [])).toBe(cards)
    expect(withPractice(null, [{ card: {}, after: 'x' }])).toBeNull()
  })

  it('appends a showing whose anchor has left the queue', () => {
    expect(keys(withPractice(queue(2), [{ card: { _id: 'c1', practiceKey: 'c1#1' }, after: 'gone' }]))).toEqual(['c1', 'c2', 'c1#1'])
  })

  it('places one copy of a showing earned twice', () => {
    const cards = queue(2)
    const entry = practiceFor(cards, 0, cards[0])
    expect(keys(withPractice(cards, [entry, practiceFor(cards, 0, cards[0])]))).toEqual(['c1', 'c2', 'c1#1'])
  })

  it('drops a showing whose own card has left the queue', () => {
    expect(keys(withPractice(queue(2), [{ card: { _id: 'c9', practiceKey: 'c9#1' }, after: 'c1' }]))).toEqual(['c1', 'c2'])
  })
})

describe('resumeIndex (ADR-057 §3)', () => {
  const today = '2026-11-01'

  it('lands on the first card not graded, whatever the queue lost since', () => {
    // The server dropped c1..c3 once they were graded; the queue starts at c4.
    const shrunk = queue(10).slice(3)
    const record = { day: today, graded: { c1: {}, c2: {}, c3: {} } }
    expect(resumeIndex(shrunk, record, today)).toBe(0)
  })

  it('skips graded cards a cached queue still holds', () => {
    expect(resumeIndex(queue(10), { day: today, graded: { c1: {}, c2: {} } }, today)).toBe(2)
  })

  it('drops a record from another day', () => {
    expect(resumeIndex(queue(5), { day: '2026-10-31', graded: { c1: {} } }, today)).toBeNull()
  })

  it('has nothing to resume without grades', () => {
    expect(resumeIndex(queue(5), { day: today, graded: {} }, today)).toBeNull()
    expect(resumeIndex(queue(5), null, today)).toBeNull()
  })

  it('lands past the end when every card was graded', () => {
    expect(resumeIndex(queue(2), { day: today, graded: { c1: {}, c2: {} } }, today)).toBe(2)
  })
})

describe('localDay', () => {
  it('is the local calendar day', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
