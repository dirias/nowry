import { useQuery } from '@tanstack/react-query'
import { tasksService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

// Matches the old apiCache TTL for this resource (see api/queryClient.js's
// query-key convention doc — 30000ms was this hook's CACHE_TTL under the old
// apiCache-backed implementation).
const TASKS_STALE_TIME = 30000 // 30 seconds

/**
 * useTaskData — React Query-backed tasksService.getAll() (ADR-008 / CACHE-005).
 *
 * Replaces the old hand-rolled `apiCache`-backed version. Because every
 * `useTaskData()` instance subscribes to the same `queryClient` cache entry
 * for a given key, invalidating that key from ANY component (via `reload()`
 * here, or directly via `queryClient.invalidateQueries`) re-renders every
 * other mounted component reading it too — unlike the old apiCache-backed
 * version, whose invalidation was silent to already-mounted subscribers.
 *
 * Invalidate after a mutation (create/update/delete/toggle a task):
 *   import { queryClient } from '../api/queryClient'
 *   queryClient.invalidateQueries({ queryKey: ['tasks', userId] })
 */
export function useTaskData() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', userId],
    queryFn: () => tasksService.getAll(),
    enabled: !!userId,
    staleTime: TASKS_STALE_TIME
  })

  const reload = async () => {
    if (!userId) return
    await queryClient.invalidateQueries({ queryKey: ['tasks', userId] })
  }

  return { tasks: data ?? [], loading: isLoading, error: error ?? null, reload }
}

export default useTaskData
