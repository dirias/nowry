import { useCallback } from 'react'
import { annualPlanningService } from '../api/services'

/**
 * usePriorityStatus — the two status toggles a priority row offers (ADR-015).
 *
 * Both are optimistic: the local list is patched first, the request follows,
 * and a rejection restores the exact original values. The caller owns the
 * list; this hook only needs its setter, so it works over outlet context
 * (AllPrioritiesPage, OverviewTabView) and over local state (FocusAreaView)
 * alike, which is what lets the three surfaces share one implementation.
 *
 * `toggleComplete` sends only `is_completed`; the server stamps `completed_at`.
 * The optimistic patch mirrors that stamp so a row reads as done immediately.
 * It never writes `is_active` — completed and inactive are independent in the
 * data and only exclusive in the UI.
 */
const usePriorityStatus = (setPriorities) => {
  const patchById = useCallback(
    (id, patch) => setPriorities((prev) => prev.map((p) => (p._id === id ? { ...p, ...patch } : p))),
    [setPriorities]
  )

  const toggle = useCallback(
    async (priority, { payload, optimistic, revert }) => {
      patchById(priority._id, optimistic)
      try {
        await annualPlanningService.updatePriority(priority._id, payload)
      } catch (error) {
        console.error('Failed to update priority status:', error)
        patchById(priority._id, revert)
      }
    },
    [patchById]
  )

  const toggleActive = useCallback(
    (priority) => {
      const next = !priority.is_active
      return toggle(priority, {
        payload: { is_active: next },
        optimistic: { is_active: next },
        revert: { is_active: priority.is_active }
      })
    },
    [toggle]
  )

  const toggleComplete = useCallback(
    (priority) => {
      const next = !priority.is_completed
      return toggle(priority, {
        payload: { is_completed: next },
        optimistic: { is_completed: next, completed_at: next ? new Date().toISOString() : null },
        revert: { is_completed: !!priority.is_completed, completed_at: priority.completed_at ?? null }
      })
    },
    [toggle]
  )

  return { toggleActive, toggleComplete }
}

export default usePriorityStatus
