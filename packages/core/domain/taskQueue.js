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
 * Today's open tasks, overdue first.
 *
 * @param {Array} tasks
 * @param {{ now?: Date, limit?: number }} options
 */
export const tasksDueToday = (tasks, { now = new Date(), limit = null } = {}) => {
  const due = (tasks ?? []).filter((task) => !task?.is_completed && isDueBy(task, now))
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

/**
 * How much of the day's routine is behind you, as `{ done, total }`.
 *
 * `null` when there is no routine at all, which is different from a routine
 * with nothing ticked: one is an absence and the other is a zero (ADR-012).
 */
export const routineProgress = (routine) => {
  const items = ['morning', 'afternoon', 'evening'].flatMap((period) => routine?.[period]?.items ?? routine?.[period] ?? [])
  if (!Array.isArray(items) || items.length === 0) return null
  return { done: items.filter((item) => item?.completed || item?.is_completed).length, total: items.length }
}
