/**
 * What is on today, and in what order.
 *
 * Home shows the tasks due today; the tasks page manages them. That division is
 * the Home canvas's rule — Home is where you watch, every other page is where
 * you work — and it means this file answers exactly one question: which tasks
 * belong in the "Tasks today" section, and in what order (MOB-074).
 *
 * The order is the web's own, named rather than re-derived: overdue first,
 * then by the task's own priority, then by deadline. What the web did NOT do
 * is narrow to today — its card sorts every open task and takes five, so a task
 * due in November sits under a heading that says "today". The heading is the
 * contract, so the filter matches it.
 */

/** How the three levels rank. A task with no level sits with the middle. */
const RANK = { high: 0, medium: 1, low: 2 }
const rankOf = (task) => RANK[task?.priority] ?? RANK.medium

const startOfDay = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Whether a task is due today or was due before it. */
export const isDueBy = (task, now = new Date()) => {
  if (!task?.deadline) return false
  const due = startOfDay(task.deadline)
  return due !== null && due <= startOfDay(now)
}

/**
 * Whether a task that is due is LATE, or due today. `null` when it is neither.
 *
 * The one fact a list of today's tasks exists to carry, and the list did not
 * carry it: two of three rows on Home were overdue and every row looked the
 * same (MOB-081). It is a rule rather than a component's local ternary because
 * the sort above already draws the same line, and two readings of "late" that
 * drift is how a list orders itself one way and labels itself another.
 */
export const taskDueState = (task, now = new Date()) => {
  if (!isDueBy(task, now)) return null
  return startOfDay(task.deadline) < startOfDay(now) ? 'overdue' : 'today'
}

/**
 * The web's three, in the web's order. `pending` is the default everywhere
 * because a list of today's tasks means the ones still to do — but a tick has
 * to be reversible, and a filter that cannot show a completed task is a tick
 * with no way back (MOB-079).
 */
export const TASK_FILTERS = ['all', 'pending', 'completed']

const matchesStatus = (task, status) => {
  if (status === 'all') return true
  if (status === 'completed') return Boolean(task?.is_completed)
  return !task?.is_completed
}

/**
 * Today's tasks, overdue first.
 *
 * @param {Array} tasks
 * @param {{ now?: Date, limit?: number, status?: 'all'|'pending'|'completed' }} options
 */
export const tasksDueToday = (tasks, { now = new Date(), limit = null, status = 'pending' } = {}) => {
  const due = (tasks ?? []).filter((task) => matchesStatus(task, status) && isDueBy(task, now))
  const today = startOfDay(now)

  due.sort((a, b) => {
    const overdue = (task) => (startOfDay(task.deadline) < today ? 0 : 1)
    if (overdue(a) !== overdue(b)) return overdue(a) - overdue(b)
    if (rankOf(a) !== rankOf(b)) return rankOf(a) - rankOf(b)
    return startOfDay(a.deadline) - startOfDay(b.deadline)
  })

  return limit === null ? due : due.slice(0, limit)
}

/**
 * A task's list, or nothing.
 *
 * Task lists live only in the web client's `localStorage` while the tasks
 * assigned to them sync, so `category` can hold a generated id — `list_1788…` —
 * that no other device has ever seen a name for. The web renders it raw, which
 * the Home canvas names as a fault in its own words: a database identifier on
 * screen.
 *
 * A row says nothing rather than saying an id. Absence is the default and a
 * meaningless string is worse than none (ADR-012, MOB-074). A real category —
 * "study", "Home" — is a name and is kept. When lists become server objects
 * with names, this stops matching anything and the names come through.
 */
const GENERATED_ID = /^list[_-]\d{6,}$/i

export const taskCategory = (task) => {
  const category = String(task?.category ?? '').trim()
  if (!category || GENERATED_ID.test(category)) return null
  return category
}

/** How many are open today — the Today object's readout. */
export const dueTodayCount = (tasks, now = new Date()) => tasksDueToday(tasks, { now }).length
