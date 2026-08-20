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
 * The profile fetch (for preferredPriorityIds) intentionally stays on the
 * `apiCache` singleton via `annualPlanningService.getCachedProfile()` — see
 * that function's docstring for why it's out of scope for this migration.
 * Accepts optional preloadedUser from AuthContext to skip its round-trip.
 */

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { annualPlanningService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

// Matches the old apiCache PLAN_TTL for this resource.
const PLAN_STALE_TIME = 5 * 60000 // 5 min

function calcAreaProgress(goals) {
  if (!goals || goals.length === 0) return 0
  const total = goals.reduce((sum, g) => {
    if (g.milestones?.length > 0) {
      const done = g.milestones.filter((m) => m.completed).length
      return sum + (done / g.milestones.length) * 100
    }
    return sum + (g.progress || 0)
  }, 0)
  return Math.round(total / goals.length)
}

const EMPTY_PLAN_DATA = {
  plan: null,
  focusAreas: [],
  goals: [],
  activities: [],
  priorities: [],
  quarterReports: []
}

/** Enrich focus areas with their goals + computed progress (primary /full path). */
function buildFullPlanData(full) {
  const areasArr = Array.isArray(full.focus_areas) ? full.focus_areas : []
  const allGoalsList = Array.isArray(full.goals) ? full.goals : []
  const activities = Array.isArray(full.activities) ? full.activities : []
  const priorities = Array.isArray(full.priorities) ? full.priorities : []
  const quarterReports = Array.isArray(full.quarter_reports) ? full.quarter_reports : []

  const allGoals = []
  const focusAreas = areasArr.map((area) => {
    const areaId = area._id || area.id
    const areaGoals = allGoalsList
      .filter((g) => g.focus_area_id === areaId || g.focus_area_id?._id === areaId)
      .map((g) => ({ ...g, focus_area_id: areaId }))
    areaGoals.forEach((g) => allGoals.push(g))
    return { ...area, progress: calcAreaProgress(areaGoals), goals: areaGoals }
  })

  return { plan: full.plan, focusAreas, goals: allGoals, activities, priorities, quarterReports }
}

/** Legacy 3-level waterfall, used when /annual-plan/full isn't deployed yet (405). */
async function fetchLegacyPlanData(year) {
  let fetchedPlan
  try {
    fetchedPlan = await annualPlanningService.getAnnualPlan(year)
  } catch (err) {
    // A 404 from the legacy getAnnualPlan means no plan exists — not an error.
    if (err?.response?.status === 404) return EMPTY_PLAN_DATA
    throw err
  }

  if (!fetchedPlan?._id) return EMPTY_PLAN_DATA

  const [fetchedAreas, fetchedPriorities] = await Promise.all([
    annualPlanningService.getFocusAreas(fetchedPlan._id),
    annualPlanningService.getPriorities(fetchedPlan._id)
  ])

  const areasArr = Array.isArray(fetchedAreas) ? fetchedAreas : []
  const priorities = Array.isArray(fetchedPriorities) ? fetchedPriorities : []

  const goalResults = await Promise.allSettled(areasArr.map((area) => annualPlanningService.getGoals(area._id)))

  const allGoals = []
  const focusAreas = areasArr.map((area, i) => {
    const areaGoals = goalResults[i].status === 'fulfilled' ? goalResults[i].value || [] : []
    areaGoals.forEach((g) => allGoals.push({ ...g, focus_area_id: area._id || area.id }))
    return { ...area, progress: calcAreaProgress(areaGoals), goals: areaGoals }
  })

  // The legacy path never fetched activities or quarter reports — matches the
  // old hook's behavior of leaving those at their initial empty state here.
  return { plan: fetchedPlan, focusAreas, goals: allGoals, activities: [], priorities, quarterReports: [] }
}

async function fetchAnnualPlanData(year) {
  try {
    const full = await annualPlanningService.getFullAnnualPlan(year)
    return buildFullPlanData(full)
  } catch (err) {
    // A 404 from /full means no plan exists for this year — clean empty state, not an error.
    if (err?.response?.status === 404) return EMPTY_PLAN_DATA
    // A 405 means /full endpoint not yet deployed — fall back to the legacy multi-request path.
    if (err?.response?.status === 405) return fetchLegacyPlanData(year)
    throw err
  }
}

/**
 * @param {number} year - Year to fetch (defaults to current year)
 * @param {object|null} [preloadedUser] - Optional user object from AuthContext.
 *   When provided, skips the /users/profile network request entirely.
 */
export const useAnnualPlan = (year = new Date().getFullYear(), preloadedUser = null) => {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [preferredPriorityIds, setPreferredPriorityIds] = useState([])

  const { data, isLoading, error } = useQuery({
    queryKey: ['annualPlan', userId, year],
    queryFn: () => fetchAnnualPlanData(year),
    enabled: !!userId,
    staleTime: PLAN_STALE_TIME
  })

  // Profile fetch stays independent of the plan query (see file header) — it
  // resolves preferredPriorityIds regardless of whether a plan exists.
  useEffect(() => {
    let cancelled = false
    annualPlanningService.getCachedProfile(preloadedUser).then((profile) => {
      if (!cancelled) setPreferredPriorityIds(profile?.preferences?.homepage_priority_ids || [])
    })
    return () => {
      cancelled = true
    }
  }, [preloadedUser])

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
    preferredPriorityIds,
    loading: isLoading,
    error: error ?? null,
    reload
  }
}

export default useAnnualPlan
