import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'
import { apiCache } from '../utils/cache'

/** Bust all caches that depend on the annual plan or calendar after any mutation */
const _bustPlanCache = () => {
  const year = new Date().getFullYear()
  apiCache.invalidate(`annualPlanFull:${year}`)
  apiCache.invalidatePrefix('calendar:')
  apiCache.invalidatePrefix('activities:')
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
  async createAnnualPlan(planData) {
    const { data } = await apiClient.post(ENDPOINTS.annualPlan.create, planData)
    return data
  },
  async updateAnnualPlan(id, planUpdate) {
    const { data } = await apiClient.put(ENDPOINTS.annualPlan.update(id), planUpdate)
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
    return data
  },
  async updateFocusArea(id, update) {
    const { data } = await apiClient.put(ENDPOINTS.focusAreas.update(id), update)
    return data
  },
  async deleteFocusArea(id) {
    const { data } = await apiClient.delete(ENDPOINTS.focusAreas.delete(id))
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
