/**
 * useDailyRoutine — React Query-backed daily routine read (ADR-008 / CACHE-007).
 *
 * Replaces the hand-rolled `apiCache` entry that SideMenu.js, DailyRoutinePlanner.js,
 * and AnnualPlanningLayout.js all read/invalidated directly (see the former
 * `api/utils/routineCache.js` ROUTINE_CACHE_KEY/ROUTINE_TTL constants). All three
 * surfaces read the SAME resource so a completion toggle on any one of them must
 * keep the other two in sync — that's the whole reason this was a shared cache
 * entry in the first place. Because every `useDailyRoutine()` instance subscribes
 * to the same `queryClient` cache entry for a given key, invalidating it from ANY
 * component (via `invalidate()` here, or directly via `queryClient.invalidateQueries`,
 * which is what DailyRoutinePlanner.js's mutations do) re-renders every other
 * mounted component reading it too.
 *
 * The old apiCache key ('dailyRoutine') was not scoped by user — the same latent
 * cross-account gap `useBooks` had before CACHE-005 (see `hooks/useBooks.js`). The
 * query key here is scoped by userId to close it, following the convention
 * documented in `api/queryClient.js`.
 */
import { useQuery } from '@tanstack/react-query'
import { annualPlanningService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

// Matches the old apiCache ROUTINE_TTL (formerly api/utils/routineCache.js).
const ROUTINE_STALE_TIME = 2 * 60000 // 2 minutes

export function useDailyRoutine() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dailyRoutine', userId],
    queryFn: () => annualPlanningService.getDailyRoutine(),
    enabled: !!userId,
    staleTime: ROUTINE_STALE_TIME
  })

  const invalidate = async () => {
    if (!userId) return
    await queryClient.invalidateQueries({ queryKey: ['dailyRoutine', userId] })
  }

  return { routine: data ?? null, loading: isLoading, error: error ?? null, invalidate, refetch }
}

export default useDailyRoutine
