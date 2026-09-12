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
 *
 * The write side is here for the same reason (MOB-080). The phone's editor has
 * to hand the whole routine back to a PUT, and assembling that object out of
 * the same three names inside a screen would be the field names living in two
 * places again.
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
/**
 * The label on an item.
 *
 * The web's editor writes `title`; the phone found rows carrying `text` and
 * read both. The API stores each item as a free dictionary, so neither key is
 * guaranteed and nothing would fail if a screen picked the wrong one — it would
 * simply draw a row with no words in it. Read here, once, like the rest.
 */
export const routineItemTitle = (item) => item?.title ?? item?.text ?? ''

/** One item as this product writes it. The id is the caller's: core has no randomness. */
export const routineItem = (id, title) => ({ id, title, type: 'custom' })

/**
 * One period replaced, as a whole routine.
 *
 * Every write below returns the WHOLE routine rather than the period, because
 * the endpoint behind them is a PUT of the whole document — the caller has to
 * send back what it was given, including the fields no screen reads.
 */
const withItems = (routine, period, items) => ({ ...routine, [`${period}_routine`]: items })

/**
 * The same routine with an id on every item, or `null` when every item already
 * had one — so a caller writes only when there was something to write.
 *
 * An item's id is what a rename and a delete address it by, and an item without
 * one is addressed by `undefined`, which matches every other item without one.
 * The web's planner assigns the missing ids the first time it opens a routine
 * (its "lazy migration"), so a routine that has been through that editor is
 * safe; one written before it and only ever ticked since is not. This is that
 * same migration, so the phone heals a routine rather than depending on a
 * browser having opened it.
 *
 * `makeId` is the caller's: core has no randomness of its own, and the two
 * clients reach for it differently (`crypto` on the web, `expo-crypto` here).
 */
export const withRoutineIds = (routine, makeId) => {
  let changed = false
  const next = { ...routine }
  for (const period of ROUTINE_PERIODS) {
    next[`${period}_routine`] = routineItems(routine, period).map((item) => {
      if (item?.id) return item
      changed = true
      return { ...item, id: makeId() }
    })
  }
  return changed ? next : null
}

/** One item appended to a period. */
export const withRoutineItem = (routine, period, item) => withItems(routine, period, [...routineItems(routine, period), item])

/**
 * One item's label rewritten.
 *
 * It writes `title` and drops `text`, so an item that arrived with the older
 * key leaves with one label rather than two that can disagree.
 */
export const withRenamedRoutineItem = (routine, period, itemId, title) =>
  withItems(
    routine,
    period,
    routineItems(routine, period).map((item) => {
      // An id of `undefined` addresses nothing, never everything.
      if (!itemId || item?.id !== itemId) return item
      const next = { ...item, title }
      delete next.text
      return next
    })
  )

/** One item removed from a period. */
export const withoutRoutineItem = (routine, period, itemId) =>
  withItems(
    routine,
    period,
    // As above: nothing is removed by an id that is not one.
    routineItems(routine, period).filter((item) => !itemId || item?.id !== itemId)
  )

/**
 * The goal activities that belong to a period.
 *
 * An activity's slot is `time_of_day`, and the default the web assigns to one
 * that has none is `anytime` — which is not a period, so an unslotted activity
 * appears under none of the three. That is deliberate on the web and kept here:
 * a routine screen shows what has a time, and the rest is managed on the goal.
 */
export const activitiesForPeriod = (activities, period) =>
  (activities ?? []).filter((activity) => (activity?.time_of_day || 'anytime') === period)

/**
 * A period's goal activities, each with the goal it serves and that goal's
 * colour — which is what a row needs and what three separate lookups in a
 * screen would otherwise assemble out of four API field names.
 *
 * A reference on `goal_id` or `focus_area_id` arrives either as an id or as the
 * populated document, depending on the endpoint, so both are unwrapped here.
 *
 * An activity whose goal is gone is dropped rather than drawn without one, as
 * the web's planner drops it: a soft-deleted goal leaves its activities behind,
 * and a step toward a goal that no longer exists is not part of anyone's day.
 */
export const slottedActivities = (activities, goals, areas, period) =>
  activitiesForPeriod(activities, period)
    .map((activity) => {
      const goal = (goals ?? []).find((candidate) => candidate?._id === reference(activity?.goal_id))
      if (!goal) return null
      const area = (areas ?? []).find((candidate) => candidate?._id === reference(goal.focus_area_id))
      return { id: activity?._id ?? activity?.id, title: activity?.title ?? '', goalTitle: goal.title ?? null, color: area?.color ?? null }
    })
    .filter(Boolean)

/** An id, whether it arrived as one or as the document it points at. */
const reference = (value) => (value && typeof value === 'object' ? value._id : value)
