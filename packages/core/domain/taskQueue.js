/**
 * What is on today, and in what order.
 *
 * Home shows the tasks due today; the tasks page manages them. That division is
 * the Home canvas's rule — Home is where you watch, every other page is where
 * you work — and it means this file answers exactly one question: which tasks
 * belong in the "Tasks today" section, and in what order (MOB-074).
 *
 * The order is one rule, named rather than re-derived: overdue first, then
 * flagged, then by deadline (PRD-items D12). What the web did NOT do
 * is narrow to today — its card sorts every open task and takes five, so a task
 * due in November sits under a heading that says "today". The heading is the
 * contract, so the filter matches it.
 */

/**
 * Flagged first (ADR-046: a priority is a flag). The legacy `priority` level
 * defaults to "medium" on every task, so it ranks nothing and is not read.
 */
const rankOf = (task) => (task?.is_priority ? 0 : 1)

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
/** A server list's id (PLAN-021). Unmatched, it is a deleted list: still an id, never a name. */
const OBJECT_ID = /^[a-f0-9]{24}$/i

/**
 * A task's list by name, from the learner's lists (PLAN-021, PRD-items D13):
 * the list's name when `category` is one of their ids, a real category word
 * ("study") as itself, and nothing for an id with no list behind it.
 */
export const listNameOf = (task, lists = []) => {
  const category = String(task?.category ?? '').trim()
  // "general" is what the web filed unlisted tasks under: General is no list.
  if (!category || category.toLowerCase() === 'general') return null
  const list = (lists ?? []).find((entry) => entry?.id === category)
  if (list) return list.name
  if (GENERATED_ID.test(category) || OBJECT_ID.test(category)) return null
  return category
}

export const taskCategory = (task) => listNameOf(task, [])

/** How many are open today — the Today object's readout. */
export const dueTodayCount = (tasks, now = new Date()) => tasksDueToday(tasks, { now }).length

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * An instant from the API. Its datetimes are UTC written without a zone
 * ("2026-10-17T20:00:00"), which a JavaScript engine reads as local time; one
 * without a zone is read as UTC here.
 */
const instantOf = (value) => {
  if (!value) return null
  const text = String(value)
  const zoned = /[zZ]|[+-]\d{2}:?\d{2}$/.test(text) || !text.includes('T') ? text : `${text}Z`
  const date = new Date(zoned)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Open tasks not due by today: dated soonest first, undated last, flagged first
 * within a day (PRD-items D12: the Upcoming disclosure).
 */
export const upcomingTasks = (tasks, now = new Date()) =>
  (tasks ?? [])
    .filter((task) => task && !task.is_completed && !isDueBy(task, now))
    .sort((a, b) => {
      const dayA = a.deadline ? startOfDay(a.deadline) : Infinity
      const dayB = b.deadline ? startOfDay(b.deadline) : Infinity
      if (dayA !== dayB) return dayA - dayB
      return rankOf(a) - rankOf(b)
    })

/** Tasks ticked today: completed, and last written today (the Completed disclosure). */
export const doneToday = (tasks, now = new Date()) =>
  (tasks ?? []).filter((task) => {
    if (!task?.is_completed) return false
    const touched = instantOf(task.updated_at)
    return touched !== null && startOfDay(touched) === startOfDay(now)
  })

/**
 * The day panel's three task lists, and the edge's ratio: today's open rows
 * (the count), what is later, and what was ticked today.
 */
export const dayTasks = (tasks, now = new Date()) => {
  const open = tasksDueToday(tasks, { now })
  const done = doneToday(tasks, now)
  const total = open.length + done.length
  return { open, upcoming: upcomingTasks(tasks, now), done, rate: total === 0 ? 0 : done.length / total }
}

/**
 * When a task is, for the row's When column (ADR-021 amendment 2026-10-17):
 * `late`, `today`, `soon` (inside a week), `later`, or `none` (no date).
 */
export const whenOf = (task, now = new Date()) => {
  if (!task?.deadline) return { kind: 'none', date: null }
  const due = startOfDay(task.deadline)
  const today = startOfDay(now)
  if (due === null) return { kind: 'none', date: null }
  const date = new Date(due)
  if (due < today) return { kind: task.is_completed ? 'later' : 'late', date }
  if (due === today) return { kind: 'today', date }
  return { kind: Math.round((due - today) / DAY_MS) < 7 ? 'soon' : 'later', date }
}

/**
 * The When column's words: "Late", nothing for today or no date, a short
 * weekday inside a week, a short date beyond it (the year only when it is not
 * this one).
 */
export const whenText = (task, { now = new Date(), language = 'en', t } = {}) => {
  const { kind, date } = whenOf(task, now)
  if (kind === 'late') return t ? t('tasks.row.late') : 'Late'
  if (kind === 'soon') return new Intl.DateTimeFormat(language, { weekday: 'short' }).format(date)
  if (kind === 'later') {
    const sameYear = date.getFullYear() === now.getFullYear()
    const options = sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: '2-digit' }
    return new Intl.DateTimeFormat(language, options).format(date)
  }
  return ''
}
