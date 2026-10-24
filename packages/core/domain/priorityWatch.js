/**
 * Which priorities Home is watching, and in what order.
 *
 * The annual plan is edited in Planning and WATCHED on Home — that is the rule
 * the Home canvas settles on. Since ADR-046 a priority is a flag on a task or
 * a milestone, so flagging IS the choice: the picker that chose four of them
 * (`homepage_priority_ids`) is gone, and the band shows the first four flagged
 * items by three rules (MOB-074):
 *
 *   1. **A priority linked to a goal borrows the goal's area.** A flagged
 *      milestone arrives with its goal's area already; an old goal-linked row
 *      still reads it off the goal.
 *   2. **A completed priority is not watched.** It is finished; the point of
 *      the section is what is still open.
 *   3. **Deadlines first, by date; then the ones with none.** A date is the
 *      reason a priority is urgent, so the ones that have one lead.
 */

import { dateOf } from './blocks/dates'

/** How many the section shows when the user has never chosen. */
export const WATCHED_DEFAULT = 4

/** The goal's area, for a priority that points at one. */
const withArea = (priority, goals) => {
  if (priority?.linked_entity_type !== 'goal' || !priority?.linked_entity_id) return priority
  const goal = (goals ?? []).find((candidate) => (candidate._id || candidate.id) === priority.linked_entity_id)
  return goal?.focus_area_id ? { ...priority, focus_area_id: goal.focus_area_id } : priority
}

/**
 * Every open priority, deadline-first. The pool the picker chooses from.
 * @returns {Array}
 */
export const watchablePriorities = (priorities, goals) => {
  const open = (priorities ?? []).map((priority) => withArea(priority, goals)).filter((priority) => !priority?.is_completed)
  const dated = open.filter((priority) => priority.deadline).sort((a, b) => dateOf(a.deadline) - dateOf(b.deadline))
  return [...dated, ...open.filter((priority) => !priority.deadline)]
}

/** The ones Home shows: the first four of the pool. */
export const watchedPriorities = (priorities, goals) => watchablePriorities(priorities, goals).slice(0, WATCHED_DEFAULT)

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
  const due = dateOf(priority.deadline)
  if (Number.isNaN(due.getTime())) return null

  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86400000)

  if (days < 0) return { key: 'focusBar.overdue', params: {} }
  if (days === 0) return { key: 'study.dates.today', params: {} }
  if (days === 1) return { key: 'focusBar.daysLeft', params: { count: 1 } }
  if (days <= 7) return { key: 'focusBar.daysLeft', params: { count: days } }
  return { key: null, params: { date: priority.deadline } }
}
