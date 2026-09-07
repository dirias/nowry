import { useQuery } from '@tanstack/react-query'
import { cardsService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

// Matches the old apiCache TTL for this resource (see api/queryClient.js's
// query-key convention doc — 60000ms was this hook's CACHE_TTL under the old
// apiCache-backed implementation).
const STATISTICS_STALE_TIME = 60000 // 60 seconds

/**
 * useStatistics — React Query-backed cardsService.getStatistics() (ADR-008 / CACHE-005).
 *
 * Problem it solves:
 *   WeeklyProgress and StudyCalendar both call getStatistics() independently
 *   on the same Home page → 2 identical API calls for the same data.
 *
 * Solution:
 *   Every useStatistics() instance subscribes to the same `queryClient`
 *   cache entry for a given key, so the second component to mount gets the
 *   cached value immediately without a round-trip, and invalidating that key
 *   from ANY component (via `reload()` here, or directly via
 *   `queryClient.invalidateQueries`) re-renders every other mounted
 *   component reading it too — unlike the old apiCache-backed version, whose
 *   invalidation was silent to already-mounted subscribers.
 *
 * Invalidate after a mutation (e.g. a study session completes, a deck is
 * imported):
 *   import { queryClient } from '../api/queryClient'
 *   queryClient.invalidateQueries({ queryKey: ['statistics', userId] })
 */
export function useStatistics() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error } = useQuery({
    queryKey: ['statistics', userId],
    queryFn: () => cardsService.getStatistics(),
    enabled: !!userId,
    staleTime: STATISTICS_STALE_TIME
  })

  const reload = async () => {
    if (!userId) return
    await queryClient.invalidateQueries({ queryKey: ['statistics', userId] })
  }

  return { statistics: data ?? null, loading: isLoading, error: error ?? null, reload }
}

export default useStatistics
