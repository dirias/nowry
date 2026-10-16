import { factsFrom } from './facts'

/**
 * Facts from what already exists, for edit mode: a task, a milestone in its
 * goal, or a block — and the other documents the item spans, when the caller
 * has them, so an item due Friday and scheduled Thursday opens with both.
 */

/** A deadline (ISO datetime or date) as a local "YYYY-MM-DD", or null. */
export const dateKeyOf = (value) => {
  if (!value) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const scheduledOf = (block) =>
  block
    ? {
        start: block.start,
        lengthMin: block.lengthMin,
        daysOfWeek: block.daysOfWeek ?? [],
        date: block.date ?? null,
        reminderMin: block.reminderMin ?? null,
        afterBlockId: block.afterBlockId ?? null
      }
    : null

const idOf = (doc) => String(doc?._id ?? doc?.id ?? '')

/** The block whose source is this task, if any. */
export const blockForTask = (task, blocks) => (blocks ?? []).find((b) => b.source?.type === 'task' && b.source.id === idOf(task)) ?? null

/** The block for this milestone: sourced to its goal, with its title. */
export const blockForMilestone = (milestone, goalId, blocks) =>
  (blocks ?? []).find((b) => b.source?.type === 'goal' && b.source.id === goalId && b.title === milestone?.title) ?? null

/**
 * @param {object} sources
 * @param {object} [sources.task]      a task document (API shape)
 * @param {object} [sources.milestone] a milestone (API shape) with its `goalId`
 * @param {object} [sources.block]     a client block (camelCase, from `readBlock`)
 * @param {object[]} [sources.blocks]  every block, to find the one the item spans
 * @param {object[]} [sources.tasks]   every task, for a block sourced to one
 */
export const itemFromSources = ({ task = null, milestone = null, goalId = null, block = null, blocks = [], tasks = [] }) => {
  if (milestone) {
    return factsFrom({
      title: milestone.title ?? '',
      due: dateKeyOf(milestone.due_date),
      scheduled: scheduledOf(block ?? blockForMilestone(milestone, goalId, blocks)),
      priority: Boolean(milestone.is_priority),
      goalId
    })
  }
  if (task) {
    return factsFrom({
      title: task.title ?? '',
      due: dateKeyOf(task.deadline),
      scheduled: scheduledOf(block ?? blockForTask(task, blocks)),
      priority: Boolean(task.is_priority)
    })
  }
  if (block) {
    const source = block.source ?? { type: 'free', id: null }
    const linkedTask = source.type === 'task' ? (tasks ?? []).find((t) => idOf(t) === source.id) : null
    if (linkedTask) return itemFromSources({ task: linkedTask, block })
    return factsFrom({
      title: block.title ?? '',
      scheduled: scheduledOf(block),
      goalId: source.type === 'goal' ? source.id : null,
      origin: source.type === 'study' ? 'study' : null
    })
  }
  return factsFrom()
}

/**
 * The documents a calendar event stands for, in the shape `useItemWriter`
 * takes as `existing` and `itemFromSources` reads. The event is the
 * client's normalised one (`calendar.service.js`): `id` is `<type>-<id>`, a
 * milestone carries `goalId` and `milestoneId`, a flagged item (`priority`)
 * carries `linkedType` and `linkedId`. A goal or a habit is not an item and
 * returns null.
 */
export const sourceFromEvent = (event) => {
  if (!event) return null
  const rawId = String(event.id ?? '').replace(/^(task|priority|milestone|goal|activity)-/, '')
  const due = event.date ? dateKeyOf(event.date) : null
  const done = event.status === 'completed'
  const task = (id) => ({
    task: { _id: id, title: event.title ?? '', deadline: due, is_completed: done, is_priority: Boolean(event.isPriority) }
  })
  const milestone = (id, goalId) => ({
    milestone: { id, title: event.title ?? '', due_date: due, completed: done, is_priority: Boolean(event.isPriority) },
    goalId
  })
  if (event.type === 'task') return task(rawId)
  if (event.type === 'milestone') return milestone(event.milestoneId ?? rawId, event.goalId)
  if (event.type === 'priority') {
    if (event.linkedType === 'milestone')
      return { ...milestone(rawId, event.linkedId), milestone: { ...milestone(rawId, event.linkedId).milestone, is_priority: true } }
    return { task: { ...task(event.linkedId ?? rawId).task, is_priority: true } }
  }
  return null
}
