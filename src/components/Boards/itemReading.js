/**
 * Live items (BOARD-005, PRD D6, ADR-046): what a tile on the board reads
 * through its reference, and what the `I` picker finds. Pure: the records
 * come in from the task list and the plan the page already holds.
 */
import { dateKeyOf } from '@nowry/core/domain/items'
import { isGoalCompleted } from '@nowry/core/domain/goalDerivation'

export const idOf = (doc) => String(doc?._id ?? doc?.id ?? '')

const goalOfMilestone = (goals, ref) =>
  (ref.goalId ? goals.find((g) => idOf(g) === ref.goalId) : null) ??
  goals.find((g) => (g.milestones ?? []).some((m) => String(m.id) === ref.id)) ??
  null

/**
 * One item, read from the records.
 *
 * @returns {{ status: 'loading'|'error'|'missing'|'ready', kind, title?, due?, done?, priority?, areaId?, goalId?, record? }}
 *   `error` when the records could not be read (the item may well exist), `missing` when they were read and it is not there.
 */
export const readItem = (ref, { tasks = [], goals = [], loading = false, error = null } = {}) => {
  const kind = ref?.kind ?? 'task'
  if (!ref?.id) return { status: 'missing', kind }
  if (loading) return { status: 'loading', kind }
  if (kind === 'task') {
    const task = tasks.find((candidate) => idOf(candidate) === ref.id)
    if (!task) return { status: error ? 'error' : 'missing', kind }
    return {
      status: 'ready',
      kind,
      title: task.title ?? '',
      due: dateKeyOf(task.deadline),
      done: Boolean(task.is_completed),
      priority: Boolean(task.is_priority),
      areaId: null,
      goalId: null,
      record: task
    }
  }
  if (kind === 'milestone') {
    const goal = goalOfMilestone(goals, ref)
    const milestone = goal?.milestones?.find((m) => String(m.id) === ref.id)
    if (!milestone) return { status: error ? 'error' : 'missing', kind }
    return {
      status: 'ready',
      kind,
      title: milestone.title ?? '',
      due: dateKeyOf(milestone.due_date),
      done: Boolean(milestone.completed),
      priority: Boolean(milestone.is_priority),
      areaId: goal.focus_area_id ?? null,
      goalId: idOf(goal),
      record: milestone
    }
  }
  const goal = goals.find((candidate) => idOf(candidate) === ref.id)
  if (!goal) return { status: error ? 'error' : 'missing', kind }
  return {
    status: 'ready',
    kind: 'goal',
    title: goal.title ?? '',
    due: dateKeyOf(goal.target_date),
    done: isGoalCompleted(goal),
    priority: false,
    areaId: goal.focus_area_id ?? null,
    goalId: idOf(goal),
    record: goal
  }
}

const fold = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Open ones first, the order otherwise kept. */
const openFirst = (rows) => [...rows.filter((r) => !r.done), ...rows.filter((r) => r.done)]

/** At most this many rows a group, so a long plan stays a short list. */
export const PICKER_GROUP_LIMIT = 30

/**
 * What the `I` picker offers for a query: tasks (open first), milestones and
 * goals, each a group of `{ key, ref, title, done, areaId, goalTitle }`.
 * Empty groups are left out.
 */
export const searchItems = (query, { tasks = [], goals = [] } = {}) => {
  const words = fold(query).split(/\s+/).filter(Boolean)
  const matches = (title, extra = '') => {
    const hay = fold(`${title} ${extra}`)
    return words.every((word) => hay.includes(word))
  }
  const taskRows = openFirst(
    tasks
      .filter((task) => matches(task.title))
      .map((task) => ({
        key: `task-${idOf(task)}`,
        ref: { kind: 'task', id: idOf(task), goalId: null },
        title: task.title ?? '',
        done: Boolean(task.is_completed),
        areaId: null,
        goalTitle: null
      }))
  )
  const milestoneRows = openFirst(
    goals.flatMap((goal) =>
      (goal.milestones ?? [])
        .filter((m) => matches(m.title, goal.title))
        .map((m) => ({
          key: `milestone-${m.id}`,
          ref: { kind: 'milestone', id: String(m.id), goalId: idOf(goal) },
          title: m.title ?? '',
          done: Boolean(m.completed),
          areaId: goal.focus_area_id ?? null,
          goalTitle: goal.title ?? ''
        }))
    )
  )
  const goalRows = openFirst(
    goals
      .filter((goal) => matches(goal.title))
      .map((goal) => ({
        key: `goal-${idOf(goal)}`,
        ref: { kind: 'goal', id: idOf(goal), goalId: null },
        title: goal.title ?? '',
        done: isGoalCompleted(goal),
        areaId: goal.focus_area_id ?? null,
        goalTitle: null
      }))
  )
  return [
    { kind: 'task', rows: taskRows.slice(0, PICKER_GROUP_LIMIT) },
    { kind: 'milestone', rows: milestoneRows.slice(0, PICKER_GROUP_LIMIT) },
    { kind: 'goal', rows: goalRows.slice(0, PICKER_GROUP_LIMIT) }
  ].filter((group) => group.rows.length > 0)
}
