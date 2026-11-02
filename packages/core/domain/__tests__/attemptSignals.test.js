/** LOG-004 — reading the ledger like a tutor (ADR-059 §3). */
import { LAPSE, SPEED, attemptLine, familySignal, lapseClass, missFamilies, sessionBreakdown, speedClass } from '../attemptSignals'

const MEDIAN = 2000

describe('speedClass', () => {
  it('reads speed × outcome against the learner’s own median', () => {
    expect(speedClass({ evaluation: 'correct', thinkMs: 900 }, MEDIAN)).toBe(SPEED.fluent)
    expect(speedClass({ evaluation: 'incorrect', thinkMs: 900 }, MEDIAN)).toBe(SPEED.misconception)
    expect(speedClass({ evaluation: 'correct', thinkMs: 4000 }, MEDIAN)).toBe(SPEED.fragile)
    expect(speedClass({ evaluation: 'incorrect', thinkMs: 4000 }, MEDIAN)).toBe(SPEED.unlearned)
    expect(speedClass({ evaluation: 'partial', thinkMs: 4000 }, MEDIAN)).toBe(SPEED.unlearned)
  })

  it('says nothing in the middle, without a timing, or before the deck has a median', () => {
    expect(speedClass({ evaluation: 'correct', thinkMs: 2000 }, MEDIAN)).toBeNull()
    expect(speedClass({ evaluation: 'correct', thinkMs: null }, MEDIAN)).toBeNull()
    expect(speedClass({ evaluation: 'correct', thinkMs: 500 }, null)).toBeNull()
  })
})

describe('lapseClass', () => {
  it('tells a lapse, relearning, learning and new apart by the state before', () => {
    expect(lapseClass({ repetitions: 0 }, 'incorrect')).toBe(LAPSE.fresh)
    expect(lapseClass({ repetitions: 2, interval: 1 }, 'incorrect')).toBe(LAPSE.learning)
    expect(lapseClass({ repetitions: 6, interval: 21, lapses: 0 }, 'incorrect')).toBe(LAPSE.lapse)
    expect(lapseClass({ repetitions: 4, interval: 3, lapses: 1 }, 'incorrect')).toBe(LAPSE.relearning)
    expect(lapseClass({ repetitions: 6, interval: 21, lapses: 1 }, 'correct')).toBe(LAPSE.mature)
  })
})

describe('missFamilies', () => {
  const miss = (cardId, title, tags = []) => ({ cardId, title, tags })

  it('groups misses by a shared character first, the biggest family first', () => {
    const families = missFamilies([
      miss('a', '験'),
      miss('b', '受験する'),
      miss('c', '実験する'),
      miss('d', '試験'),
      miss('e', '説明する'),
      miss('f', '伝説'),
      miss('g', '果物')
    ])
    expect(families.map((f) => [f.kind, f.label, f.cards.length])).toEqual([
      ['character', '験', 4],
      ['character', '説', 2],
      ['single', null, 1]
    ])
  })

  it('then by a shared tag, and never puts a card in two families', () => {
    const families = missFamilies([
      miss('a', 'aspirin', ['NSAID', 'pain']),
      miss('b', 'ibuprofen', ['NSAID']),
      miss('c', 'morphine', ['pain']),
      miss('d', 'insulin', ['hormone'])
    ])
    expect(families.map((f) => [f.kind, f.label, f.cards.map((c) => c.cardId)])).toEqual([
      ['tag', 'NSAID', ['a', 'b']],
      ['single', null, ['c']],
      ['single', null, ['d']]
    ])
  })

  it('is empty for no misses', () => {
    expect(missFamilies([])).toEqual([])
  })
})

describe('attemptLine', () => {
  it('reads a ledger row into the clients’ words, and counts asking as help', () => {
    const line = attemptLine({
      id: 'r1',
      card_id: 'c1',
      card_title: '果物',
      tags: ['N3'],
      grade: 'again',
      evaluation: 'incorrect',
      showing: 'scheduled',
      think_ms: 1800,
      judge_ms: 900,
      help: { companion: 'chat', audio: 2, hint: false, source: false },
      before: { interval: 21, repetitions: 6, lapses: 1 },
      position: 3
    })
    expect(line).toMatchObject({
      cardId: 'c1',
      title: '果物',
      thinkMs: 1800,
      helped: true,
      audio: 2,
      before: { interval: 21, repetitions: 6, lapses: 1 }
    })
  })
})

describe('sessionBreakdown', () => {
  const row = (card_id, card_title, evaluation, think_ms, extra = {}) => ({
    card_id,
    card_title,
    evaluation,
    think_ms,
    grade: evaluation === 'correct' ? 'good' : 'again',
    showing: 'scheduled',
    before: { interval: 21, repetitions: 6, lapses: 0 },
    help: {},
    tags: [],
    ...extra
  })
  const rows = [
    row('a', '験', 'incorrect', 900),
    row('b', '受験する', 'incorrect', 800),
    row('c', '実験する', 'incorrect', 1000),
    row('d', '説明する', 'incorrect', 4000, { help: { companion: 'chat' } }),
    row('e', '伝説', 'incorrect', 3500),
    row('f', '果物', 'incorrect', 1000),
    row('g', '面', 'correct', 900),
    row('h', '成果', 'correct', 4500),
    row('i', '結果', 'correct', 2000),
    row('p', '験', 'correct', 700, { showing: 'practice' })
  ]

  it('groups what slipped, folds what held, and ends in moves', () => {
    const b = sessionBreakdown({ session: {}, attempts: rows, medianThinkMs: MEDIAN, daysSincePrevious: 2 })
    expect(b.fromLedger).toBe(true)
    expect(b.slippedCount).toBe(6) // the practice showing is not counted
    expect(b.slipped.map((f) => [f.kind, f.label, f.cards.length])).toEqual([
      ['character', '験', 3],
      ['character', '説', 2],
      ['single', null, 1]
    ])
    expect(b.held).toMatchObject({ count: 3, fluent: 1, fragile: 1 })
    expect(b.reading).toEqual({ key: 'sessions.reading.families', params: { held: 3, total: 9, count: 2 } })
    expect(b.moves).toEqual([
      { kind: 'drill', cardIds: ['a', 'b', 'c', 'd', 'e', 'f'] },
      { kind: 'askFamily', label: '験', cardIds: ['a', 'b', 'c'], titles: ['験', '受験する', '実験する'] }
    ])
  })

  it('leads with the break when the learner has been away', () => {
    const b = sessionBreakdown({ session: {}, attempts: rows, medianThinkMs: MEDIAN, daysSincePrevious: 19 })
    expect(b.reading).toEqual({ key: 'sessions.reading.afterBreak', params: { days: 19, held: 3, total: 9 } })
  })

  it('says all held when nothing slipped, and offers no drill', () => {
    const b = sessionBreakdown({ session: {}, attempts: rows.filter((r) => r.evaluation === 'correct'), medianThinkMs: MEDIAN })
    expect(b.reading).toEqual({ key: 'sessions.reading.allHeld', params: { count: 3 } })
    expect(b.moves).toEqual([])
  })

  it('falls back to the session’s own cards for a session logged before the ledger', () => {
    const session = {
      cards: [
        { card_id: 'x', card_title: '験', grade: 'hard', evaluation: 'partial' },
        { card_id: 'y', card_title: '面', grade: 'good', evaluation: 'correct' }
      ]
    }
    const b = sessionBreakdown({ session, attempts: [] })
    expect(b.fromLedger).toBe(false)
    expect(b.slippedCount).toBe(1)
    expect(b.held.count).toBe(1)
    expect(b.reading).toEqual({ key: 'sessions.reading.plain', params: { held: 1, total: 2, missed: 1 } })
    expect(b.moves).toEqual([{ kind: 'drill', cardIds: ['x'] }])
  })

  it('has no reading for an empty session', () => {
    expect(sessionBreakdown({ session: { cards: [] }, attempts: [] }).reading).toBeNull()
  })
})

describe('familySignal', () => {
  it('is the signal most of the family shares, else none', () => {
    const fam = (...speeds) => ({ cards: speeds.map((speed) => ({ signals: { speed } })) })
    expect(familySignal(fam('misconception', 'misconception', 'fragile'))).toBe('misconception')
    expect(familySignal(fam('misconception', 'fragile', 'unlearned', null))).toBeNull()
    expect(familySignal(fam(null, null))).toBeNull()
  })
})
