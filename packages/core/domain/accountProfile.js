/**
 * The account, as a profile page reads it (MOB-092).
 *
 * Two small calculations the web writes inline and the phone would otherwise
 * write again: how far through its limits an account is, and how long it has
 * had one. Neither is complicated and that is exactly why they drift — the
 * web's own usage bar divides by a limit of `-1` for an unlimited plan and
 * clamps the result, which is a percentage of infinity computed and then hidden
 * behind a clamp rather than never computed.
 *
 * **`-1` means no limit**, and it is the server's spelling. A meter with no
 * limit has no percentage and no bar: a full bar would say "you have used
 * everything" and an empty one "you have used nothing", and both are wrong
 * about infinity.
 */

/** The three the subscription carries, in the order a profile lists them. */
export const PLAN_METERS = ['books', 'flashcards', 'decks']

/** The server's spelling for "no limit". */
const UNLIMITED = -1

/**
 * Each meter the account actually has a limit recorded for.
 *
 * @param {{limits?: object, usage?: object}|null} subscription
 * @returns {Array<{name: string, used: number, limit: number, unlimited: boolean, percent: number}>}
 */
export function planMeters(subscription) {
  const limits = subscription?.limits
  if (!limits) return []

  return PLAN_METERS.filter((name) => limits[name] !== undefined && limits[name] !== null).map((name) => {
    const limit = limits[name]
    const used = subscription?.usage?.[name] ?? 0
    const unlimited = limit === UNLIMITED
    return {
      name,
      used,
      limit,
      unlimited,
      percent: unlimited || limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
    }
  })
}

/**
 * The three counts a profile shows, under names a screen can read.
 *
 * The field names are the server's and they are named HERE rather than at the
 * screen, which is the rule `apiFields.test.js` enforces and the reason it
 * exists: a misspelled field is `undefined`, `undefined` falls through `?? 0`,
 * and a confident zero renders. Five bugs of exactly that shape reached a
 * device in this project and not one of them failed anything.
 *
 * @param {{stats?: object}|null} profile
 * @returns {{cards: number, books: number, streak: number}}
 */
export function profileStats(profile) {
  const stats = profile?.stats
  return {
    cards: stats?.total_cards ?? 0,
    books: stats?.books_created ?? 0,
    streak: stats?.study_streak ?? 0
  }
}

/**
 * How many whole days the account has existed, or null if it does not say.
 *
 * Floored, so the day it was created reads as zero rather than as one — "member
 * for 1 day" on the day you signed up is a small lie that a profile page has no
 * reason to tell.
 */
export function membershipDays(createdAt, now = Date.now()) {
  if (!createdAt) return null
  const started = new Date(createdAt).getTime()
  if (!Number.isFinite(started)) return null
  return Math.max(0, Math.floor((now - started) / 86400000))
}

export default planMeters
