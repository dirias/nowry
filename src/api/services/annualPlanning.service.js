import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'
import { apiCache } from '../utils/cache'
import { queryClient } from '../queryClient'
import { userService } from './user.service'
import { auth } from '../../config/firebase.config'

// Matches useAnnualPlan's old apiCache-backed PROFILE_TTL (CACHE-005), now used as
// the React Query staleTime for the 'profile' key (CACHE-007).
const PROFILE_TTL = 60000 // 60s

/** Bust all caches that depend on the annual plan or calendar after any mutation */
const _bustPlanCache = () => {
  const year = new Date().getFullYear()
  apiCache.invalidate(`annualPlanFull:${year}`)
  apiCache.invalidatePrefix('calendar:')
  apiCache.invalidatePrefix('activities:')
  // React Query side (ADR-008 / CACHE-005): useAnnualPlan reads the primary +
  // fallback plan data through the ['annualPlan', userId, year] query key.
  // Invalidate the whole 'annualPlan' resource (all users/years) rather than
  // just the current year, matching the broad same-resource invalidation
  // useDeckData/useBooks/useStatistics already use for their reload() — the
  // service layer has no userId to scope to, and every current caller of
  // useAnnualPlan only ever queries the current year anyway.
  queryClient.invalidateQueries({ queryKey: ['annualPlan'] })
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
