/**
 * useAnnualPlan — Extended shared hook for annual planning data.
 *
 * Improvements over the original:
 *   1. Fetches priorities (were missing from the original).
 *   2. getProfile() now runs IN PARALLEL with getAnnualPlan() — not after.
 *   3. Returns enriched focusAreas (with progress + goals array) for FocusBar.
 *   4. Returns preferredPriorityIds from user profile preferences.
 *   5. Same apiCache integration and TTL as the original.
 *
 * Before (waterfall):
 *   getAnnualPlan()
 *    → getFocusAreas + getPriorities
 *      → N × getGoals
 *        → getProfile()   ← unnecessary delay
 *
 * After:
 *   getAnnualPlan() ─┐
 *   getProfile()    ─┘  concurrent
 *    → getFocusAreas + getPriorities
 *      → N × getGoals (parallel)
 *
 * Invalidate on mutations:
 *   import { apiCache } from '../api/utils/cache'
 *   apiCache.invalidatePrefix('annualPlan:')
 *   apiCache.invalidatePrefix('focusAreas:')
 *   apiCache.invalidatePrefix('goals:')
 *   apiCache.invalidate('annual:profile')
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
 * @returns {{
 *   plan: object|null,
 *   focusAreas: object[],  // enriched with .progress and .goals array
 *   goals: object[],        // flat list of all goals across all areas
 *   priorities: object[],
 *   preferredPriorityIds: string[],
 *   loading: boolean,
 *   error: Error|null
 * }}
 */
export const useAnnualPlan = (year = new Date().getFullYear()) => {
  const [plan, setPlan] = useState(null)
  const [focusAreas, setFocusAreas] = useState([])
  const [goals, setGoals] = useState([])
  const [priorities, setPriorities] = useState([])
  const [preferredPriorityIds, setPreferredPriorityIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async (isCancelled = () => false) => {
    setLoading(true)
    setError(null)
    try {
      // Level 1: plan + profile fire concurrently — profile doesn't depend on plan
      const [fetchedPlan, profile] = await Promise.all([
        apiCache.get(`annualPlan:${year}`, PLAN_TTL, () => annualPlanningService.getAnnualPlan(year)),
        apiCache.get('annual:profile', PROFILE_TTL, () => userService.getProfile().catch(() => null))
      ])
      if (isCancelled()) return

      const preferredIds = profile?.preferences?.homepage_priority_ids || []
      setPreferredPriorityIds(preferredIds)
      setPlan(fetchedPlan)

      if (!fetchedPlan?._id) {
        setLoading(false)
        return
      }

      // Level 2: areas + priorities in parallel
      const [fetchedAreas, fetchedPriorities] = await Promise.all([
        apiCache.get(`focusAreas:${fetchedPlan._id}`, PLAN_TTL, () => annualPlanningService.getFocusAreas(fetchedPlan._id)),
        apiCache.get(`priorities:${fetchedPlan._id}`, PLAN_TTL, () => annualPlanningService.getPriorities(fetchedPlan._id))
      ])
      if (isCancelled()) return

      const areasArr = Array.isArray(fetchedAreas) ? fetchedAreas : []
      setPriorities(Array.isArray(fetchedPriorities) ? fetchedPriorities : [])

      // Level 3: goals for every area, all in parallel
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
    } catch (err) {
      if (!isCancelled()) setError(err)
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

  return { plan, focusAreas, areas: focusAreas, goals, priorities, preferredPriorityIds, loading, error, reload: load }
}

export default useAnnualPlan
