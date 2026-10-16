import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'
import { queryClient } from '../queryClient'
import { tasksService } from './tasks.service'
import { priorityItemRef } from '../../domain/priorities'

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
  /**
   * Done or not, written on the item the flag sits on (ADR-046 §5): a task's
   * `is_completed`, a milestone's `completed`.
   */
  async completePriority(priority, done) {
    const ref = priorityItemRef(priority)
    const data =
      ref.kind === 'milestone'
        ? await this.updateMilestone(ref.goalId, ref.id, { completed: done })
        : await tasksService.update(ref.id, { is_completed: done })
    _bustPlanCache()
    return data
  },
  /** The flag off. The item stays; it just stops being a priority. */
  async unflagPriority(priority) {
    const ref = priorityItemRef(priority)
    const data =
      ref.kind === 'milestone'
        ? await this.updateMilestone(ref.goalId, ref.id, { is_priority: false })
        : await tasksService.update(ref.id, { is_priority: false })
    _bustPlanCache()
    return data
  },

  // Goals
  /**
   * Goals for ONE focus area. The endpoint requires `focus_area_id`, so calling
   * this without one used to put the literal string "undefined" in the query and
   * come back 404 — silently, on every Home load, on both clients. There is no
   * "every goal" variant of this route; use getAllGoals() for that.
   */
  async getGoals(focusAreaId) {
    if (!focusAreaId) {
      throw new Error('getGoals requires a focusAreaId; use getAllGoals() for every goal in a year')
    }
    const { data } = await apiClient.get(ENDPOINTS.goals.all(focusAreaId))
    return data
  },
  /**
   * Every goal in a year, across all focus areas. Reads through the same
   * fetchAnnualPlanData() the planning page and the calendar use, so it costs one
   * /annual-plan/full request and cannot drift from what those surfaces show.
   */
  async getAllGoals(year = new Date().getFullYear()) {
    const { goals } = await fetchAnnualPlanData(year)
    return goals
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

  /**
   * PATCH one milestone by its own id (title, due_date, completed,
   * is_key_result — the backend's MilestonePatch). Milestones have carried an
   * id since the Goal model gained one; the calendar addressed them by array
   * index only because nothing had wrapped this route (CAL-004).
   */
  async updateMilestone(goalId, milestoneId, patch) {
    const { data } = await apiClient.patch(ENDPOINTS.milestones.update(goalId, milestoneId), patch)
    _bustPlanCache()
    return data
  },
  /** DELETE one milestone by its own id (the item sheet's delete, PLAN-012). */
  async deleteMilestone(goalId, milestoneId) {
    const { data } = await apiClient.delete(ENDPOINTS.milestones.delete(goalId, milestoneId))
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
