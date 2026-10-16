/**
 * useAnnualPlan — React Query-backed shared hook for annual planning data (ADR-008 / CACHE-005).
 *
 * Replaces the old hand-rolled `apiCache`-backed version. Because every
 * `useAnnualPlan()` instance subscribes to the same `queryClient` cache entry
 * for a given key, invalidating that key from ANY component (via `reload()`
 * here, or directly via `queryClient.invalidateQueries`, which is what
 * `annualPlanning.service.js`'s `_bustPlanCache()` does after every
 * plan/focus-area/goal/priority mutation) re-renders every other mounted
 * component reading it too.
 *
 * Primary path: single GET /annual-plan/full request returns plan + focus_areas +
 * priorities + all goals in one round-trip, replacing a 3-level waterfall:
 *
 *   Before: /annual-plan → /focus-areas + /priorities → /goals × N  (3 sequential levels)
 *   After:  /annual-plan/full                                         (1 request)
 *
 * Fallback: if /full returns 405 (e.g. backend not yet deployed), the query
 * transparently falls back to the original multi-request path so nothing breaks.
 * A 404 from either path means "no plan exists for this year" — a clean empty
 * state, not an error.
 *
 * Since ADR-046 §5 a priority is a flag on a task or a milestone, and Home
 * shows the first four flagged items (`watchedPriorities`). The profile fetch
 * that once resolved a chosen list (`homepage_priority_ids`) is gone with the
 * picker, so this hook reads one query and nothing else.
 *
 * `fetchAnnualPlanData`/`EMPTY_PLAN_DATA` live in `annualPlanning.service.js`
 * (not here) so `calendarService.getAllEvents()` can share the exact same
 * queryFn under the exact same `['annualPlan', userId, year]` key (CACHE-008) —
 * a real cache hit when the planning page was visited first, not a duplicate
 * fetch. See that file's `fetchAnnualPlanData` docstring for details.
 */

import { useQuery } from '@tanstack/react-query'
import { fetchAnnualPlanData, EMPTY_PLAN_DATA } from '../api/services/annualPlanning.service'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

// Matches the old apiCache PLAN_TTL for this resource.
const PLAN_STALE_TIME = 5 * 60000 // 5 min

/**
 * @param {number} year - Year to fetch (defaults to current year)
 */
export const useAnnualPlan = (year = new Date().getFullYear()) => {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error } = useQuery({
    queryKey: ['annualPlan', userId, year],
    queryFn: () => fetchAnnualPlanData(year),
    enabled: !!userId,
    staleTime: PLAN_STALE_TIME
  })

  const reload = async () => {
    if (!userId) return
    await queryClient.invalidateQueries({ queryKey: ['annualPlan', userId, year] })
  }

  const planData = data ?? EMPTY_PLAN_DATA

  return {
    plan: planData.plan,
    focusAreas: planData.focusAreas,
    areas: planData.focusAreas,
    goals: planData.goals,
    activities: planData.activities,
    priorities: planData.priorities,
    quarterReports: planData.quarterReports,
    loading: isLoading,
    error: error ?? null,
    reload
  }
}

export default useAnnualPlan
