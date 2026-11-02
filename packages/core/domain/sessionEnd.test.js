/**
 * The ending's model (ADR-060 §1): the same object in four states, the keys
 * each state earns, and the state line read from the grants.
 */
import { END_KEY, END_STATE, endKeyLabel, FAMILY_CAP, scoreRole, sessionEnd, sessionEndTitle } from './sessionEnd'

const t = (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key)

const answer = (cardId, grade, cardTitle = cardId) => ({
  cardId,
  cardTitle,
  grade,
  evaluation: grade === 'again' ? 'incorrect' : grade === 'hard' ? 'partial' : 'correct'
})

const mixed = [answer('a', 'good', '受験'), answer('b', 'again', '実験'), answer('c', 'again', '経験'), answer('d', 'easy', '果物')]

describe('sessionEnd · state', () => {
  it('is nothing when no card was graded, with the deck sentence and no score', () => {
    const end = sessionEnd({ answers: [], kind: 'deck', deckName: 'Kanji' })
    expect(end.state).toBe(END_STATE.nothing)
    expect(end.score).toBeNull()
    expect(end.reading).toEqual({ key: 'sessions.end.nothing' })
    expect(end.readouts).toEqual([])
    expect(end.minutes).toBe(0)
  })

  it('says nothing was due today for a daily review with nothing graded', () => {
    expect(sessionEnd({ answers: [], kind: 'daily' }).reading).toEqual({ key: 'sessions.end.nothingDaily' })
  })

  it('is perfect when every card held, with the score at 100 and no slipped rows', () => {
    const end = sessionEnd({ answers: [answer('a', 'good'), answer('b', 'easy')] })
    expect(end.state).toBe(END_STATE.perfect)
    expect(end.score).toBe(100)
    expect(end.scoreRole).toBe('success')
    expect(end.slippedCount).toBe(0)
    expect(end.reading).toEqual({ key: 'sessions.reading.allHeld', params: { count: 2 } })
  })

  it('is ordinary when something slipped, scored on what held, with the families grouped', () => {
    const end = sessionEnd({ answers: mixed })
    expect(end.state).toBe(END_STATE.ordinary)
    expect(end.score).toBe(50)
    expect(end.scoreRole).toBe('danger')
    expect(end.slippedCount).toBe(2)
    expect(end.slipped[0]).toMatchObject({ kind: 'character', label: '験' })
    expect(end.held.count).toBe(2)
    expect(end.fromLedger).toBe(false)
  })

  it('is a drill when the session was one: no state line, the drill note, no tomorrow', () => {
    const end = sessionEnd({ answers: mixed, kind: 'drill', deckName: 'Kanji', grants: [{ xp_awarded: 10 }], streak: 4, dueTomorrow: 9 })
    expect(end.state).toBe(END_STATE.drill)
    expect(end.readouts).toEqual([])
    expect(end.note).toEqual({ key: 'sessions.end.drillNote' })
    expect(end.tomorrow).toBeNull()
  })
})

describe('sessionEnd · keys', () => {
  it('ordinary: drill the misses, then what is left today', () => {
    const { keys } = sessionEnd({ answers: mixed, dueLeft: 22 })
    expect(keys.primary).toEqual({ kind: END_KEY.drill, cardIds: ['b', 'c'] })
    expect(keys.secondary).toEqual({ kind: END_KEY.dueToday, count: 22 })
  })

  it('ordinary with nothing left: the secondary goes to Study', () => {
    expect(sessionEnd({ answers: mixed, dueLeft: 0 }).keys.secondary).toEqual({ kind: END_KEY.study, done: false })
    expect(sessionEnd({ answers: mixed }).keys.secondary).toEqual({ kind: END_KEY.study, done: false })
  })

  it('perfect: what is left today, or "Done for today" when nothing is; never a drill', () => {
    const perfect = [answer('a', 'good'), answer('b', 'good')]
    expect(sessionEnd({ answers: perfect, dueLeft: 5 }).keys).toEqual({ primary: { kind: END_KEY.dueToday, count: 5 }, secondary: null })
    expect(sessionEnd({ answers: perfect, dueLeft: 0 }).keys).toEqual({ primary: { kind: END_KEY.study, done: true }, secondary: null })
  })

  it('drill: the slipped again with Study beside it, or Study alone when all held', () => {
    expect(sessionEnd({ answers: mixed, kind: 'drill' }).keys).toEqual({
      primary: { kind: END_KEY.drill, cardIds: ['b', 'c'] },
      secondary: { kind: END_KEY.study, done: false }
    })
    expect(sessionEnd({ answers: [answer('a', 'good')], kind: 'drill' }).keys).toEqual({
      primary: { kind: END_KEY.study, done: false },
      secondary: null
    })
  })

  it('nothing: one door, to what is left or to Study', () => {
    expect(sessionEnd({ answers: [], dueLeft: 3 }).keys).toEqual({ primary: { kind: END_KEY.dueToday, count: 3 }, secondary: null })
    expect(sessionEnd({ answers: [] }).keys).toEqual({ primary: { kind: END_KEY.study, done: false }, secondary: null })
  })

  it('labels each key from its kind and count', () => {
    expect(endKeyLabel(t, { kind: END_KEY.drill, cardIds: ['b', 'c'] })).toBe('sessions.breakdown.drill:{"count":2}')
    expect(endKeyLabel(t, { kind: END_KEY.dueToday, count: 22 })).toBe('sessions.end.dueToday:{"count":22}')
    expect(endKeyLabel(t, { kind: END_KEY.study, done: true })).toBe('sessions.end.done')
    expect(endKeyLabel(t, { kind: END_KEY.study, done: false })).toBe('sessions.end.study')
    expect(endKeyLabel(t, null)).toBeNull()
  })
})

describe('sessionEnd · the state line', () => {
  it('reads the streak day, the XP earned and the XP to the next level from the grants', () => {
    const grants = [
      { xp_awarded: 15, new_level: 6, xp_for_next_level: 200 },
      { xp_awarded: 25, new_level: 6, xp_for_next_level: 180 }
    ]
    const { readouts } = sessionEnd({ answers: mixed, grants, streak: 12 })
    expect(readouts).toEqual([
      { key: 'sessions.end.streakDay', params: { days: 12 } },
      { key: 'sessions.end.xpEarned', params: { xp: 40 } },
      { key: 'sessions.end.toLevel', params: { xp: 180, level: 7 } }
    ])
  })

  it('invites a streak when there is none, and says nothing about XP before the grants land', () => {
    expect(sessionEnd({ answers: mixed, streak: 0 }).readouts).toEqual([{ key: 'sessions.end.startStreak' }])
    expect(sessionEnd({ answers: mixed, grants: [null, { xp_awarded: 0 }] }).readouts).toEqual([{ key: 'sessions.end.startStreak' }])
  })
})

describe('sessionEnd · the ledger and the forecast', () => {
  it('upgrades to the ledger when rows are present, keeping the device answers out of it', () => {
    const attempts = [
      { card_id: 'a', card_title: '受験', evaluation: 'correct', grade: 'good', think_ms: 900, showing: 'scheduled' },
      { card_id: 'b', card_title: '実験', evaluation: 'incorrect', grade: 'again', think_ms: 800, showing: 'scheduled' },
      { card_id: 'b', card_title: '実験', evaluation: 'correct', grade: 'good', think_ms: 700, showing: 'practice' }
    ]
    const end = sessionEnd({ answers: mixed, attempts, medianThinkMs: 2000, daysSincePrevious: 19 })
    expect(end.fromLedger).toBe(true)
    expect(end.cards).toBe(4)
    expect(end.reading).toEqual({ key: 'sessions.reading.afterBreak', params: { days: 19, held: 1, total: 2 } })
    expect(end.slipped[0].cards[0].signals.speed).toBe('misconception')
  })

  it("says tomorrow is lighter only when fewer are due than today's cards, and none when nothing is", () => {
    expect(sessionEnd({ answers: mixed, dueTomorrow: 2 }).tomorrow).toEqual({ key: 'sessions.end.tomorrowLighter', params: { count: 2 } })
    expect(sessionEnd({ answers: mixed, dueTomorrow: 9 }).tomorrow).toEqual({ key: 'sessions.end.tomorrow', params: { count: 9 } })
    expect(sessionEnd({ answers: mixed, dueTomorrow: 0 }).tomorrow).toEqual({ key: 'sessions.end.tomorrowNone' })
    expect(sessionEnd({ answers: mixed }).tomorrow).toBeNull()
  })

  it('measures the minutes from start to end, never under one', () => {
    expect(sessionEnd({ answers: mixed, startedAt: '2026-11-02T10:00:00Z', endedAt: '2026-11-02T10:06:20Z' }).minutes).toBe(6)
    expect(sessionEnd({ answers: mixed, startedAt: '2026-11-02T10:00:00Z', endedAt: '2026-11-02T10:00:05Z' }).minutes).toBe(1)
  })
})

describe('sessionEndTitle and scoreRole', () => {
  it('names the deck, the review across decks, the fallback, and a drill after what it drills', () => {
    expect(sessionEndTitle(t, sessionEnd({ answers: mixed, deckName: 'Kanji' }))).toBe('Kanji')
    expect(sessionEndTitle(t, sessionEnd({ answers: mixed, kind: 'daily', deckCount: 3 }))).toBe('sessions.dailyReview:{"count":3}')
    expect(sessionEndTitle(t, sessionEnd({ answers: mixed }))).toBe('sessions.unknownTopic')
    expect(sessionEndTitle(t, sessionEnd({ answers: mixed, kind: 'drill', deckName: 'Kanji' }))).toBe(
      'sessions.end.drillTitle:{"name":"Kanji"}'
    )
  })

  it('colours a score on one threshold for both clients', () => {
    expect(scoreRole(100)).toBe('success')
    expect(scoreRole(80)).toBe('success')
    expect(scoreRole(79)).toBe('warning')
    expect(scoreRole(54)).toBe('danger')
    expect(scoreRole(null)).toBe('neutral')
    expect(FAMILY_CAP).toBe(3)
  })
})
