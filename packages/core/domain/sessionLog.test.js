/**
 * The API's words, translated into the screen's, once.
 *
 * `systemGroup` exists because the mobile library indexed `groups.system` as an
 * object keyed by name when it arrives as a list, so Marked and Struggling read
 * zero on every account and nothing failed.
 */
import { daysUntilReview, groupSummary, sessionLine, systemGroup, tagGroups } from './sessionLog'

describe('sessionLine', () => {
  it('reads the API\'s names and hands back the screen\'s', () => {
    expect(
      sessionLine({
        _id: 's1',
        deck_name: 'Spanish verbs',
        session_type: 'srs_review',
        total_cards: 18,
        duration_seconds: 372,
        score_percentage: 92,
        completed_at: '2026-09-10T08:00:00Z'
      })
    ).toEqual({
      id: 's1',
      title: 'Spanish verbs',
      kindKey: 'sessions.srsReview',
      cards: 18,
      minutes: 6,
      score: 92,
      completedAt: '2026-09-10T08:00:00Z'
    })
  })

  it('names an AI quiz by its topic, since it has no deck', () => {
    expect(sessionLine({ session_type: 'ai_quiz', topic: 'Mitosis' }).title).toBe('Mitosis')
  })

  it('rounds up to a minute, because nothing took zero minutes', () => {
    expect(sessionLine({ duration_seconds: 8 }).minutes).toBe(1)
    expect(sessionLine({ duration_seconds: 0 }).minutes).toBe(1)
  })

  it('falls back to a deck quiz for a kind it does not know', () => {
    expect(sessionLine({ session_type: 'something_new' }).kindKey).toBe('sessions.deckQuiz')
    expect(sessionLine({}).kindKey).toBe('sessions.deckQuiz')
  })

  it('keeps a missing score null rather than calling it zero', () => {
    // Zero percent is a real, bad result; no score at all is not.
    expect(sessionLine({}).score).toBeNull()
  })
})

describe('daysUntilReview', () => {
  const now = new Date('2026-09-10T12:00:00Z').getTime()

  it('is null for a card nobody has seen', () => {
    expect(daysUntilReview({}, now)).toBeNull()
    expect(daysUntilReview({ next_review: null }, now)).toBeNull()
  })

  it('is zero for a card due now, and for one long overdue', () => {
    expect(daysUntilReview({ next_review: '2026-09-10T09:00:00Z' }, now)).toBe(0)
    // Three days late is due now, never "minus three".
    expect(daysUntilReview({ next_review: '2026-09-07T09:00:00Z' }, now)).toBe(0)
  })

  it('counts whole days ahead', () => {
    expect(daysUntilReview({ next_review: '2026-09-11T12:00:00Z' }, now)).toBe(1)
    expect(daysUntilReview({ next_review: '2026-09-15T12:00:00Z' }, now)).toBe(5)
  })
})

describe('groupSummary', () => {
  it('renames `new`, which cannot be a property name a caller reaches for safely', () => {
    const summary = groupSummary({ cards: 46, decks: 3, due: 9, new: 2, deck_ids: ['d1'] })
    expect(summary).toEqual({ cards: 46, decks: 3, deckIds: ['d1'], due: 9, fresh: 2, asked: 11, windowDays: 14 })
  })

  it('is all zeroes for a group that is missing, not NaN', () => {
    expect(groupSummary(undefined).asked).toBe(0)
    expect(groupSummary(undefined).deckIds).toEqual([])
  })
})

describe('systemGroup', () => {
  it('finds a row in the LIST the API sends, not a key on an object', () => {
    const groups = {
      system: [
        { key: 'struggling', cards: 12, due: 4, new: 0, window_days: 21 },
        { key: 'marked', cards: 7, due: 1, new: 2 }
      ]
    }

    expect(systemGroup(groups, 'marked').cards).toBe(7)
    expect(systemGroup(groups, 'marked').asked).toBe(3)
    // The window is the server's, and the label quotes it.
    expect(systemGroup(groups, 'struggling').windowDays).toBe(21)
  })

  it('is empty rather than undefined for a group the server did not send', () => {
    expect(systemGroup({ system: [] }, 'marked').cards).toBe(0)
    expect(systemGroup(undefined, 'marked').cards).toBe(0)
  })
})

describe('tagGroups', () => {
  it('keeps the tag beside its numbers', () => {
    expect(tagGroups({ tags: [{ tag: 'verbs', cards: 46, due: 9, new: 2 }] })).toEqual([
      { tag: 'verbs', cards: 46, decks: 0, deckIds: [], due: 9, fresh: 2, asked: 11, windowDays: 14 }
    ])
  })

  it('is an empty list when there are no tags', () => {
    expect(tagGroups(undefined)).toEqual([])
  })
})
