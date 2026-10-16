import { useCallback } from 'react'
import { tasksService } from '../api/services/tasks.service'
import { annualPlanningService } from '../api/services/annualPlanning.service'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'
import { useBlocks } from './useBlocks'
import { needsTask, writesFor } from '../domain/items'

/**
 * useItemWriter — the item sheet's writes (PLAN-012, ADR-046 §6).
 *
 * A sheet hands over its facts; this turns them into the documents the facts
 * call for (`writesFor`) and writes each through its own service: a task
 * through `tasksService`, a milestone through its goal, a block through
 * `useBlocks` so the grid refetches. Nothing merges underneath; the item is
 * the set of documents it spans, and `existing` names the ones it already
 * has so an edit patches rather than duplicates.
 *
 * Rules an edit keeps:
 *   - A task document is never deleted by a save. An item that loses its due
 *     date and its flag stays a task without a date (PRD D1).
 *   - The goal an item is part of does not change in an edit; the sheet shows
 *     it as a readout. Moving a step between goals is a delete and a create.
 *   - The block follows the facts: made when Scheduled is set, patched when it
 *     changes, removed when it is cleared.
 */
export function useItemWriter() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { create: createBlock, update: updateBlock, remove: removeBlock } = useBlocks({ enabled: false })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] })
    queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId] })
  }, [userId])

  /**
   * @param {import('../domain/items').Facts} facts
   * @param {object} [existing]  `{ task, milestone, goalId, block }` the item already spans (API shapes; block camelCase)
   * @param {object} [options]   `{ areaId, done }` — the goal's area for a milestone's block; done for the task or milestone
   */
  const saveItem = useCallback(
    async (facts, existing = null, { areaId = null, done = null } = {}) => {
      const goalId = existing?.goalId ?? facts.goalId ?? null
      const effective = { ...facts, goalId }
      const first = writesFor(effective, { areaId })
      // The task the item already has: handed over, or named by its block's source.
      let taskId = existing?.task
        ? String(existing.task._id ?? existing.task.id)
        : existing?.block?.source?.type === 'task'
          ? (existing.block.source.id ?? null)
          : null

      if (taskId) {
        const patch = first.task ?? { title: facts.title.trim(), deadline: facts.due, is_priority: false }
        await tasksService.update(taskId, done === null ? patch : { ...patch, is_completed: done })
      } else if (first.task || (needsTask(effective) && !existing?.milestone)) {
        const created = await tasksService.create({ ...first.task, is_completed: Boolean(done) })
        taskId = String(created?._id ?? created?.id ?? '')
      }

      if (existing?.milestone) {
        const patch = first.milestone ?? { title: facts.title.trim(), due_date: facts.due }
        await annualPlanningService.updateMilestone(goalId, existing.milestone.id, done === null ? patch : { ...patch, completed: done })
      } else if (first.milestone) {
        await annualPlanningService.createMilestone(goalId, { ...first.milestone, completed: Boolean(done) })
      }

      const { block } = writesFor(effective, { taskId, areaId })
      if (block && existing?.block) await updateBlock({ id: existing.block.id, changes: block })
      else if (block) await createBlock(block)
      else if (existing?.block) await removeBlock(existing.block.id)

      invalidate()
      return { taskId, reading: first.reading }
    },
    [createBlock, updateBlock, removeBlock, invalidate]
  )

  /** Everything the item spans goes: its block, its task, its milestone. */
  const deleteItem = useCallback(
    async (existing) => {
      if (existing?.block) await removeBlock(existing.block.id)
      if (existing?.task) await tasksService.delete(String(existing.task._id ?? existing.task.id))
      if (existing?.milestone) await annualPlanningService.deleteMilestone(existing.goalId, existing.milestone.id)
      invalidate()
    },
    [removeBlock, invalidate]
  )

  return { saveItem, deleteItem }
}

export default useItemWriter
