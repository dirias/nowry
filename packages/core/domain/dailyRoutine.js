/**
 * The daily routine, as both clients read it (MOB-075).
 *
 * The API's shape is not the shape a screen wants and is easy to guess wrong:
 * the items live under `morning_routine`, `afternoon_routine` and
 * `evening_routine`, and what is ticked today is a flat array of item ids under
 * `daily_completions[<YYYY-MM-DD>]` — not a flag on the item. A first pass at
 * this on the phone assumed `routine.morning.items[].completed`, which is a
 * shape the server has never sent: the readout it fed simply never appeared,
 * which is the quietest way for a field name to be wrong.
 *
 * So the names are read here and nowhere else, and the two rules that travel
 * with them are here too: the period a screen opens on is the one the clock is
 * in, and a routine with no items at all is an absence rather than a zero
 * (ADR-012).
 */

export const ROUTINE_PERIODS = ['morning', 'afternoon', 'evening']

/** Today, as `daily_completions` keys it. */
export const todayKey = (now = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * The period the clock is in.
 *
 * The web's own boundaries: morning until noon, afternoon until six. A user can
 * still look at tonight at two in the afternoon — this only decides where the
 * segment opens.
 */
export const currentPeriod = (now = new Date()) => {
  const hour = now.getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

/** One period's items, in order. */
export const routineItems = (routine, period) => routine?.[`${period}_routine`] ?? []

/** The ids ticked today. A Set, because every row asks. */
export const completedToday = (routine, now = new Date()) => new Set(routine?.daily_completions?.[todayKey(now)] ?? [])

/**
 * How much of the whole day's routine is behind you, as `{ done, total }`.
 *
 * `null` when there is no routine at all, which is different from a routine
 * with nothing ticked: one is an absence and the other is a zero.
 */
export const routineProgress = (routine, now = new Date()) => {
  const items = ROUTINE_PERIODS.flatMap((period) => routineItems(routine, period))
  if (items.length === 0) return null
  const done = completedToday(routine, now)
  return { done: items.filter((item) => done.has(item?.id)).length, total: items.length }
}

/**
 * The next completion array to send, with one id flipped.
 *
 * The endpoint takes the whole set for the day rather than a delta, so the
 * caller needs the array and not the change.
 */
export const toggledCompletions = (routine, itemId, now = new Date()) => {
  const done = completedToday(routine, now)
  if (done.has(itemId)) done.delete(itemId)
  else done.add(itemId)
  return [...done]
}
