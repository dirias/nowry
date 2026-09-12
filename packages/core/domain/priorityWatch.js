/**
 * Which priorities Home is watching, and in what order.
 *
 * The annual plan is edited in Planning and WATCHED on Home — that is the rule
 * the Home canvas settles on, and the four priorities a user has chosen are,
 * with the focus areas, the only content on that page no other page surfaces
 * daily. So the choice has to mean the same thing on both clients, and it is
 * four rules rather than one (MOB-074):
 *
 *   1. **A priority linked to a goal borrows the goal's area.** The priority
 *      itself carries no `focus_area_id` when it points at a goal, so a row
 *      that read the priority alone would show no area for exactly the
 *      priorities that have one.
 *   2. **A completed priority is not watched.** It is finished; the point of
 *      the section is what is still open.
 *   3. **Deadlines first, by date; then the ones with none.** A date is the
 *      reason a priority is urgent, so the ones that have one lead.
 *   4. **The user's chosen ids win; otherwise the first four.** A preference
 *      of none is not a preference for nothing, it is a user who has never
 *      opened the picker.
 */

/** How many the section shows when the user has never chosen. */
export const WATCHED_DEFAULT = 4

/** The goal's area, for a priority that points at one. */
const withArea = (priority, goals) => {
  if (priority?.linked_entity_type !== 'goal' || !priority?.linked_entity_id) return priority
  const goal = (goals ?? []).find((candidate) => (candidate._id || candidate.id) === priority.linked_entity_id)
  return goal?.focus_area_id ? { ...priority, focus_area_id: goal.focus_area_id } : priority
}

const idOf = (priority) => priority?._id || priority?.id

/**
 * Every open priority, deadline-first. The pool the picker chooses from.
 * @returns {Array}
 */
export const watchablePriorities = (priorities, goals) => {
  const open = (priorities ?? []).map((priority) => withArea(priority, goals)).filter((priority) => !priority?.is_completed)
  const dated = open.filter((priority) => priority.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
  return [...dated, ...open.filter((priority) => !priority.deadline)]
}

/**
 * The ones Home shows.
 * @param {Array<string>} chosen - the user's `homepage_priority_ids`
 */
export const watchedPriorities = (priorities, goals, chosen = []) => {
  const pool = watchablePriorities(priorities, goals)
  if ((chosen ?? []).length === 0) return pool.slice(0, WATCHED_DEFAULT)
  return pool.filter((priority) => chosen.includes(idOf(priority)))
}

/**
 * How a deadline reads, as a KEY and its parameters (ADR-031).
 *
 * Overdue, today, a count of days inside a week, and a date beyond it. Tomorrow
 * is "1 day left" rather than its own word, because the plural key already says
 * it and a fifth phrase to translate buys nothing. `null` for a priority with
 * no deadline — an absence, not a zero.
 */
export const deadlineReadout = (priority, now = new Date()) => {
  if (!priority?.deadline) return null
  const due = new Date(priority.deadline)
  if (Number.isNaN(due.getTime())) return null

  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86400000)

  if (days < 0) return { key: 'focusBar.overdue', params: {} }
  if (days === 0) return { key: 'study.dates.today', params: {} }
  if (days === 1) return { key: 'focusBar.daysLeft', params: { count: 1 } }
  if (days <= 7) return { key: 'focusBar.daysLeft', params: { count: days } }
  return { key: null, params: { date: priority.deadline } }
}
