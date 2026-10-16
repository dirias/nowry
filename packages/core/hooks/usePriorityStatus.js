import { useCallback } from 'react'
import { annualPlanningService } from '../api/services'

/**
 * usePriorityStatus — what a priority row can do (ADR-015, ADR-046 §5).
 *
 * A priority is a flag on a task or a milestone, so a row offers two things:
 * done, and the flag off. Both are optimistic: the local list is patched
 * first, the request follows, and a rejection restores the original values.
 * The caller owns the list; this hook only needs its setter, so it works over
 * outlet context (AllPrioritiesPage, OverviewTabView) and over local state
 * (FocusAreaView) alike.
 *
 * `toggleComplete` writes the item's own done flag through
 * `annualPlanningService.completePriority`. `unflag` removes the row — the
 * item stays where it lives; it just stops being a priority. Pausing
 * (`is_active`) is gone with the object it belonged to.
 */
const usePriorityStatus = (setPriorities) => {
  const patchById = useCallback(
    (id, patch) => setPriorities((prev) => prev.map((p) => (p._id === id ? { ...p, ...patch } : p))),
    [setPriorities]
  )

  const toggleComplete = useCallback(
    async (priority) => {
      const next = !priority.is_completed
      patchById(priority._id, { is_completed: next, completed_at: next ? new Date().toISOString() : null })
      try {
        await annualPlanningService.completePriority(priority, next)
      } catch (error) {
        console.error('Failed to update priority status:', error)
        patchById(priority._id, { is_completed: !!priority.is_completed, completed_at: priority.completed_at ?? null })
      }
    },
    [patchById]
  )

  const unflag = useCallback(
    async (priority) => {
      setPriorities((prev) => prev.filter((p) => p._id !== priority._id))
      try {
        await annualPlanningService.unflagPriority(priority)
      } catch (error) {
        console.error('Failed to unflag priority:', error)
        setPriorities((prev) => [...prev, priority])
      }
    },
    [setPriorities]
  )

  return { toggleComplete, unflag }
}

export default usePriorityStatus
