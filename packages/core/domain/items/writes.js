import { readingOf, repeats, scheduledDate } from './facts'

/**
 * Which documents a sheet's facts become (PRD D7): a task document, a
 * milestone in its goal, a block whose source is the item. Nothing merges;
 * the sheet reads and writes whichever the facts call for.
 *
 * A task document exists when the item is due, is a priority, or has nothing
 * else to live in. A milestone exists when the item is part of a goal. A
 * block exists when the item is scheduled, and its source says what it is
 * for: the task it belongs to, the goal its milestone belongs to, the study
 * time, a routine item, or a free one-off.
 */

/** The block's source for these facts. `taskId` is known once the task exists. */
export const sourceFor = (facts, { taskId = null } = {}) => {
  const reading = readingOf(facts)
  if (reading === 'milestone') return { type: 'goal', id: facts.goalId }
  if (reading === 'study') return { type: 'study', id: null }
  if (taskId) return { type: 'task', id: taskId }
  return reading === 'routine' ? { type: 'routine', id: null } : { type: 'free', id: null }
}

export const needsTask = (facts) => {
  const reading = readingOf(facts)
  if (reading === 'milestone' || reading === 'study') return false
  return Boolean(facts.due) || Boolean(facts.priority) || !facts.scheduled
}

/** The plan: which documents to write, in the shape each client service takes. */
export const writesFor = (facts, { taskId = null, areaId = null } = {}) => {
  const reading = readingOf(facts)
  const title = facts.title.trim()
  const task = needsTask(facts) ? { title, deadline: facts.due, is_priority: Boolean(facts.priority), category: facts.list ?? null } : null
  const milestone = reading === 'milestone' ? { title, due_date: facts.due, is_priority: Boolean(facts.priority) } : null
  const block = facts.scheduled
    ? {
        title,
        source: sourceFor(facts, { taskId }),
        start: facts.scheduled.start,
        lengthMin: facts.scheduled.lengthMin,
        daysOfWeek: repeats(facts.scheduled) ? [...facts.scheduled.daysOfWeek].sort() : [],
        date: scheduledDate(facts),
        reminderMin: facts.scheduled.reminderMin ?? null,
        afterBlockId: facts.scheduled.afterBlockId ?? null,
        areaId: reading === 'milestone' ? areaId : null
      }
    : null
  return { reading, task, milestone, block }
}
