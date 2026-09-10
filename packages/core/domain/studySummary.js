/**
 * What "today" is, derived once for both clients.
 *
 * Five screens have wanted these five numbers and each read the API's field
 * names at its own call site. Four of those call sites were wrong and none of
 * them failed: `card_count` and `due_count` for a deck, `decks` on the
 * statistics summary, `reviewed_today` on it as well. Every one rendered a
 * confident zero.
 *
 * So the names are read here and nowhere else, and the derivations are the
 * web's own, which matter as much as the names:
 *
 *   - **Due and new come from the DECKS**, not from the statistics summary. The
 *     web's comment calls this the single source of truth, and the reason is
 *     visible on the phone: the Today object and the "Due now" list are the
 *     same question asked twice, and two sources would let them disagree.
 *   - **Reviewed today is the last cell of the weekly strip.** The summary has
 *     no field for it — it carries `reviewed_cards`, which is the lifetime
 *     count, and reading that as today's would report thousands.
 *   - **The streak is the summary's**, which is the one thing only it knows.
 */
import { deckCounts } from './deckTypes'

/**
 * @param {{ decks?: Array, statistics?: Object }} sources
 * @returns {{ due: number, fresh: number, asked: number, total: number, reviewedToday: number, streak: number, progress: number }}
 */
export const studySummary = ({ decks, statistics } = {}) => {
  let due = 0
  let fresh = 0
  let total = 0
  for (const deck of decks ?? []) {
    const counts = deckCounts(deck)
    due += counts.due
    fresh += counts.fresh
    total += counts.total
  }

  const weekly = statistics?.weekly_progress ?? []
  const today = weekly[weekly.length - 1]
  const reviewedToday = today?.cards ?? 0
  const asked = due + fresh

  const done = reviewedToday + asked
  return {
    due,
    fresh,
    asked,
    total,
    reviewedToday,
    streak: statistics?.summary?.current_streak ?? 0,
    /**
     * How much of today is behind you, 0–100. Zero when there is nothing to do
     * and nothing done — an empty ring, rather than a full one claiming a day
     * that never started.
     */
    progress: done > 0 ? Math.round((reviewedToday / done) * 100) : 0
  }
}

/** The seven days behind today, which is the strip's own last cell. */
export const reviewedThisWeek = (statistics) =>
  (statistics?.weekly_progress ?? []).slice(0, -1).reduce((sum, day) => sum + (day?.cards ?? 0), 0)
