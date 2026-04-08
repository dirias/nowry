/**
 * useAnnualPlan — Extended shared hook for annual planning data.
 *
 * Primary path: single GET /annual-plan/full request returns plan + focus_areas +
 * priorities + all goals in one round-trip, replacing a 3-level waterfall:
 *
 *   Before: /annual-plan → /focus-areas + /priorities → /goals × N  (3 sequential levels)
 *   After:  /annual-plan/full                                         (1 request)
 *
 * Fallback: if /full returns 404 (e.g. backend not yet deployed), the hook
 * transparently falls back to the original multi-request path so nothing breaks.
 *
 * Accepts optional preloadedUser from AuthContext to skip the /users/profile
 * round-trip (seeds the apiCache so it's a cache hit).
 */

import { useState, useEffect } from 'react'
import { annualPlanningService, userService } from '../api/services'
import { apiCache } from '../api/utils/cache'

const PLAN_TTL = 5 * 60000 // 5 min
const PROFILE_TTL = 60000 // 60s

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

/**
 * @param {number} year - Year to fetch (defaults to current year)
 * @param {object|null} [preloadedUser] - Optional user object from AuthContext.
 *   When provided, skips the /users/profile network request entirely.
 */
export const useAnnualPlan = (year = new Date().getFullYear(), preloadedUser = null) => {
  const [plan, setPlan] = useState(null)
  const [focusAreas, setFocusAreas] = useState([])
  const [goals, setGoals] = useState([])
  const [activities, setActivities] = useState([])
  const [priorities, setPriorities] = useState([])
  const [quarterReports, setQuarterReports] = useState([])
  const [preferredPriorityIds, setPreferredPriorityIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async (isCancelled = () => false) => {
    setLoading(true)
    setError(null)
    try {
      // Seed profile cache from AuthContext user to avoid a duplicate /users/profile request
      if (preloadedUser) {
        apiCache.get('annual:profile', PROFILE_TTL, () => Promise.resolve(preloadedUser))
      }

      // Fire profile + full plan concurrently
      const [full, profile] = await Promise.all([
        apiCache.get(`annualPlanFull:${year}`, PLAN_TTL, () => annualPlanningService.getFullAnnualPlan(year)),
        apiCache.get('annual:profile', PROFILE_TTL, () => userService.getProfile().catch(() => null))
      ])
      if (isCancelled()) return

      const preferredIds = profile?.preferences?.homepage_priority_ids || []
      setPreferredPriorityIds(preferredIds)

      const fetchedPlan = full.plan
      const areasArr = Array.isArray(full.focus_areas) ? full.focus_areas : []
      const allGoalsList = Array.isArray(full.goals) ? full.goals : []
      const fetchedActivities = Array.isArray(full.activities) ? full.activities : []
      const fetchedPriorities = Array.isArray(full.priorities) ? full.priorities : []
      const fetchedQuarterReports = Array.isArray(full.quarter_reports) ? full.quarter_reports : []

      setPlan(fetchedPlan)
      setPriorities(fetchedPriorities)
      setQuarterReports(fetchedQuarterReports)

      // Enrich areas with their goals + progress (same shape as before)
      const allGoals = []
      const enrichedAreas = areasArr.map((area) => {
        const areaId = area._id || area.id
        const areaGoals = allGoalsList
          .filter((g) => g.focus_area_id === areaId || g.focus_area_id?._id === areaId)
          .map((g) => ({ ...g, focus_area_id: areaId }))
        areaGoals.forEach((g) => allGoals.push(g))
        return { ...area, progress: calcAreaProgress(areaGoals), goals: areaGoals }
      })

      setFocusAreas(enrichedAreas)
      setGoals(allGoals)
      setActivities(fetchedActivities)
    } catch (err) {
      if (isCancelled()) return
      // Fallback: /full endpoint not available yet — use legacy multi-request path
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        try {
          const [fetchedPlan, profile] = await Promise.all([
            apiCache.get(`annualPlan:${year}`, PLAN_TTL, () => annualPlanningService.getAnnualPlan(year)),
            apiCache.get('annual:profile', PROFILE_TTL, () => userService.getProfile().catch(() => null))
          ])
          if (isCancelled()) return

          setPreferredPriorityIds(profile?.preferences?.homepage_priority_ids || [])
          setPlan(fetchedPlan)

          if (!fetchedPlan?._id) {
            setLoading(false)
            return
          }

          const [fetchedAreas, fetchedPriorities] = await Promise.all([
            apiCache.get(`focusAreas:${fetchedPlan._id}`, PLAN_TTL, () => annualPlanningService.getFocusAreas(fetchedPlan._id)),
            apiCache.get(`priorities:${fetchedPlan._id}`, PLAN_TTL, () => annualPlanningService.getPriorities(fetchedPlan._id))
          ])
          if (isCancelled()) return

          const areasArr = Array.isArray(fetchedAreas) ? fetchedAreas : []
          setPriorities(Array.isArray(fetchedPriorities) ? fetchedPriorities : [])

          const goalResults = await Promise.allSettled(
            areasArr.map((area) => apiCache.get(`goals:${area._id}`, PLAN_TTL, () => annualPlanningService.getGoals(area._id)))
          )
          if (isCancelled()) return

          const allGoals = []
          const enrichedAreas = areasArr.map((area, i) => {
            const areaGoals = goalResults[i].status === 'fulfilled' ? goalResults[i].value || [] : []
            areaGoals.forEach((g) => allGoals.push({ ...g, focus_area_id: area._id || area.id }))
            return { ...area, progress: calcAreaProgress(areaGoals), goals: areaGoals }
          })
          setFocusAreas(enrichedAreas)
          setGoals(allGoals)
        } catch (fallbackErr) {
          if (!isCancelled()) setError(fallbackErr)
        }
      } else {
        setError(err)
      }
    } finally {
      if (!isCancelled()) setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    load(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [year])

  return {
    plan,
    focusAreas,
    areas: focusAreas,
    goals,
    activities,
    priorities,
    quarterReports,
    preferredPriorityIds,
    loading,
    error,
    reload: load
  }
}

export default useAnnualPlan
