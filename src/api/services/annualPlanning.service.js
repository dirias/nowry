import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'
import { queryClient } from '../queryClient'
import { userService } from './user.service'
import { auth } from '../../config/firebase.config'

// Matches useAnnualPlan's old apiCache-backed PROFILE_TTL (CACHE-005), now used as
// the React Query staleTime for the 'profile' key (CACHE-007).
const PROFILE_TTL = 60000 // 60s

/** Bust all caches that depend on the annual plan or calendar after any mutation */
const _bustPlanCache = () => {
  // React Query side (ADR-008 / CACHE-005 / CACHE-008): useAnnualPlan reads the
  // primary + fallback plan data through the ['annualPlan', userId, year] query
  // key, and calendarService.getAllEvents() reads both ['calendarEvents', userId,
  // year] (its own aggregated result) and ['annualPlan', userId, year] itself (the
  // shared nested read — see fetchAnnualPlanData below). Invalidate both whole
  // resources (all users/years) rather than just the current year, matching the
  // broad same-resource invalidation useDeckData/useBooks/useStatistics already
  // use for their reload() — the service layer has no userId to scope to, and
  // every current caller only ever queries the current year anyway. A plan/goal/
  // activity change can add/move/remove calendar events (e.g. a goal's
  // target_date changing), which is why 'calendarEvents' is invalidated here too.
  queryClient.invalidateQueries({ queryKey: ['annualPlan'] })
  queryClient.invalidateQueries({ queryKey: ['calendarEvents'] })
}

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

export const EMPTY_PLAN_DATA = {
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

/**
 * Fetch + normalize a year's full annual plan.
 *
 * Shared by useAnnualPlan.js (queryKey ['annualPlan', userId, year]) and
 * calendarService.getAllEvents() (CACHE-008 / ADR-008), which reads through the
 * SAME query key so a calendar open after visiting the planning page is a real
 * cache hit, not a duplicate fetch. Both must use this exact function as their
 * queryFn — a re-implementation would silently drift and break that sharing.
 *
 * Primary path: single GET /annual-plan/full request returns plan + focus_areas +
 * priorities + all goals in one round-trip. Falls back to a 3-level waterfall
 * (fetchLegacyPlanData) if /full returns 405 (endpoint not yet deployed). A 404
 * from either path means "no plan exists for this year" — a clean empty state.
 */
export async function fetchAnnualPlanData(year) {
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

export const annualPlanningService = {
  // Annual Plan
  async getAnnualPlan(year) {
    const { data } = await apiClient.get(ENDPOINTS.annualPlan.get, { params: { year } })
    return data
  },
  /** Single-request aggregation: returns { plan, focus_areas, priorities, goals } */
  async getFullAnnualPlan(year) {
    const { data } = await apiClient.get(ENDPOINTS.annualPlan.full, { params: { year } })
    return data
  },
  /**
   * Cached wrapper around userService.getProfile(), used by useAnnualPlan to derive
   * preferredPriorityIds without a duplicate /users/profile round-trip.
   *
   * Migrated to React Query (CACHE-007 / ADR-008) via `queryClient.fetchQuery` rather
   * than `useQuery`: this is a plain, non-component function invoked imperatively from
   * useAnnualPlan.js's effect, not a hook itself — same pattern as useSegmentedSpeech's
   * migration to `queryClient.fetchQuery` (CACHE-005).
   *
   * Query key is `['profile', firebaseUid]`, using `auth.currentUser?.uid` rather than
   * the backend `user.id` the other 7 migrated hooks key off of: this function has no
   * reliable access to the backend user object, since most `useAnnualPlan()` call sites
   * (FocusBar.js, WeeklyStatsCard.js, DailyRoutinePlanner.js, etc.) don't pass
   * `preloadedUser`. `auth.currentUser` is a synchronous Firebase SDK global available
   * outside React, unlike AuthContext's `user`. `useUserProfile.js` (PomodoroContext.js)
   * and FocusBar.js's invalidation both key off this same `auth.currentUser?.uid` so all
   * three stay in sync under one query key.
   *
   * @param {object|null} [preloadedUser] - Optional user object from AuthContext. When
   *   provided, seeds the cache so the real /users/profile request is skipped.
   */
  async getCachedProfile(preloadedUser = null) {
    const userId = auth.currentUser?.uid ?? null
    if (preloadedUser) {
      queryClient.setQueryData(['profile', userId], preloadedUser)
    }
    return queryClient.fetchQuery({
      queryKey: ['profile', userId],
      queryFn: () => userService.getProfile().catch(() => null),
      staleTime: PROFILE_TTL
    })
  },
  async createAnnualPlan(planData) {
    const { data } = await apiClient.post(ENDPOINTS.annualPlan.create, planData)
    return data
  },
  async updateAnnualPlan(id, planUpdate) {
    const { data } = await apiClient.put(ENDPOINTS.annualPlan.update(id), planUpdate)
    _bustPlanCache()
    return data
  },
  /** Soft-deletes the plan; the backend cascades to focus areas, goals and reports. */
  async deleteAnnualPlan(id) {
    const { data } = await apiClient.delete(ENDPOINTS.annualPlan.delete(id))
    _bustPlanCache()
    return data
  },
  async closeQuarter(payload) {
    // payload: { year, quarter, annual_plan_id, migrated_goals }
    const { data } = await apiClient.post(`${ENDPOINTS.annualPlan.base}/close-quarter`, payload)
    _bustPlanCache()
    return data
  },
  async getQuarterReports(annualPlanId) {
    const { data } = await apiClient.get(`${ENDPOINTS.annualPlan.base}/quarter-reports/${annualPlanId}`)
    return data
  },

  // Focus Areas
  async getFocusAreas(annualPlanId) {
    const { data } = await apiClient.get(ENDPOINTS.focusAreas.all(annualPlanId))
    return data
  },
  async createFocusArea(focusArea) {
    const { data } = await apiClient.post(ENDPOINTS.focusAreas.create, focusArea)
    _bustPlanCache()
    return data
  },
  async updateFocusArea(id, update) {
    const { data } = await apiClient.put(ENDPOINTS.focusAreas.update(id), update)
    _bustPlanCache()
    return data
  },
  async deleteFocusArea(id) {
    const { data } = await apiClient.delete(ENDPOINTS.focusAreas.delete(id))
    _bustPlanCache()
    return data
  },

  // Priorities
  async getPriorities(annualPlanId) {
    const { data } = await apiClient.get(ENDPOINTS.priorities.all(annualPlanId))
    return data
  },
  async createPriority(priority) {
    const { data } = await apiClient.post(ENDPOINTS.priorities.create, priority)
    _bustPlanCache()
    return data
  },
  async updatePriority(id, update) {
    const { data } = await apiClient.put(ENDPOINTS.priorities.update(id), update)
    _bustPlanCache()
    return data
  },
  async deletePriority(id) {
    const { data } = await apiClient.delete(ENDPOINTS.priorities.delete(id))
    _bustPlanCache()
    return data
  },
  async reorderPriorities(annualPlanId, priorityIds) {
    const { data } = await apiClient.patch(ENDPOINTS.priorities.reorder, { annual_plan_id: annualPlanId, priority_ids: priorityIds })
    _bustPlanCache()
    return data
  },

  // Goals
  async getGoals(focusAreaId) {
    const { data } = await apiClient.get(ENDPOINTS.goals.all(focusAreaId))
    return data
  },
  async createGoal(goal) {
    const { data } = await apiClient.post(ENDPOINTS.goals.create, goal)
    _bustPlanCache()
    return data
  },
  async updateGoal(id, update) {
    const { data } = await apiClient.put(ENDPOINTS.goals.update(id), update)
    _bustPlanCache()
    return data
  },
  async deleteGoal(id) {
    const { data } = await apiClient.delete(ENDPOINTS.goals.delete(id))
    _bustPlanCache()
    return data
  },

  // Activities
  async getActivities(goalId) {
    const { data } = await apiClient.get(ENDPOINTS.activities.byGoal(goalId))
    return data
  },
  async createActivity(goalId, activity) {
    const { data } = await apiClient.post(ENDPOINTS.activities.create(goalId), activity)
    _bustPlanCache()
    return data
  },

  // Milestones
  async createMilestone(goalId, milestone) {
    const { data } = await apiClient.post(ENDPOINTS.milestones.create(goalId), milestone)
    _bustPlanCache()
    return data
  },
  async updateActivity(id, update) {
    const { data } = await apiClient.put(ENDPOINTS.activities.update(id), update)
    return data
  },
  async deleteActivity(id) {
    const { data } = await apiClient.delete(ENDPOINTS.activities.delete(id))
    return data
  },

  // Daily Routine
  async getDailyRoutine() {
    const { data } = await apiClient.get(ENDPOINTS.dailyRoutine.get)
    return data
  },
  async updateDailyRoutine(routine) {
    const { data } = await apiClient.put(ENDPOINTS.dailyRoutine.update, routine)
    return data
  },
  async updateRoutineCompletions(date, items) {
    const { data } = await apiClient.patch(ENDPOINTS.dailyRoutine.completions, { date, items })
    return data
  }
}
