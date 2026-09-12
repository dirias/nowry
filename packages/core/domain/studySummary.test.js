/**
 * The five numbers "today" is made of.
 *
 * Written because four call sites read these from field names that do not
 * exist and every one rendered a confident zero. What is pinned here is both
 * halves of that: the names, and where each number is derived FROM.
 */
import { reviewedThisWeek, studySummary } from './studySummary'

const decks = [
  { due_cards: 9, new_cards: 2, total_cards: 41 },
  { due_cards: 3, new_cards: 5, total_cards: 60 },
  { due_cards: 0, new_cards: 0, total_cards: 20 }
]

const statistics = {
  weekly_progress: [{ cards: 4 }, { cards: 0 }, { cards: 11 }, { cards: 7 }],
  summary: { current_streak: 12, reviewed_cards: 1840, due_today: 999, total_cards: 999 }
}

describe('studySummary', () => {
  it('sums due and new from the decks, not from the statistics summary', () => {
    const { due, fresh, asked, total } = studySummary({ decks, statistics })

    expect(due).toBe(12)
    expect(fresh).toBe(7)
    expect(asked).toBe(19)
    expect(total).toBe(121)
    // The summary's own due_today is 999 here precisely so a regression that
    // reads it fails loudly rather than looking plausible.
  })

  it('reads today reviewed from the last cell of the weekly strip', () => {
    // `reviewed_cards` is the LIFETIME count. Reading it as today's reports
    // thousands, which is the shape of the bug this replaced.
    expect(studySummary({ decks, statistics }).reviewedToday).toBe(7)
  })

  it('takes the streak from the summary, which is the only thing that knows it', () => {
    expect(studySummary({ decks, statistics }).streak).toBe(12)
  })

  it('is all zeroes for an account with nothing, and never NaN', () => {
    expect(studySummary()).toEqual({
      due: 0,
      fresh: 0,
      asked: 0,
      total: 0,
      dayTotal: 0,
      reviewedToday: 0,
      streak: 0,
      progress: 0
    })
  })

  it("names the whole day, so the two clients' progress readouts agree", () => {
    // 7 answered plus 19 still asked. `total` is every card the learner owns,
    // which is a different number — "{{done}} of {{total}} done today" read the
    // wrong one until this was named (MOB-062).
    expect(studySummary({ decks, statistics }).dayTotal).toBe(26)
  })

  it('reports progress as what is behind you out of the whole day', () => {
    // 7 reviewed, 19 still asked: 7 of 26.
    expect(studySummary({ decks, statistics }).progress).toBe(27)
  })

  it('shows an empty day as empty, not as finished', () => {
    // Nothing done and nothing to do must not read as 100%.
    expect(studySummary({ decks: [], statistics: { weekly_progress: [{ cards: 0 }] } }).progress).toBe(0)
  })

  it('shows a finished day as finished', () => {
    const done = studySummary({ decks: [{ due_cards: 0, new_cards: 0, total_cards: 5 }], statistics })
    expect(done.asked).toBe(0)
    expect(done.progress).toBe(100)
  })
})

describe('reviewedThisWeek', () => {
  it('counts the days behind today, excluding today itself', () => {
    // The strip's last cell is today and the Today object reports it separately.
    expect(reviewedThisWeek(statistics)).toBe(15)
  })

  it('is zero when there is no history yet', () => {
    expect(reviewedThisWeek(undefined)).toBe(0)
    expect(reviewedThisWeek({ weekly_progress: [] })).toBe(0)
  })
})
