import { useState, useEffect } from 'react'
import { annualPlanningService } from '../api/services/annualPlanning.service'
import { apiCache } from '../api/utils/cache'

const PLAN_TTL = 5 * 60 * 1000 // 5 minutes
const AREAS_TTL = 5 * 60 * 1000

/**
 * useAnnualPlan
 * Shared hook that fetches the annual plan, focus areas, and goals for a given year.
 * Results are cached in-memory (5 min TTL) so multiple components on the same page
 * don't redundantly hit the API.
 *
 * @param {number} year - Year to fetch (defaults to current year)
 * @returns {{ plan, focusAreas, goals, loading, error }}
 */
const useAnnualPlan = (year = new Date().getFullYear()) => {
  const [plan, setPlan] = useState(null)
  const [focusAreas, setFocusAreas] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const fetchedPlan = await apiCache.get(`annualPlan:${year}`, PLAN_TTL, () => annualPlanningService.getAnnualPlan(year))
        if (cancelled) return
        setPlan(fetchedPlan)

        if (!fetchedPlan?._id) return

        const fetchedAreas = await apiCache.get(`focusAreas:${fetchedPlan._id}`, AREAS_TTL, () =>
          annualPlanningService.getFocusAreas(fetchedPlan._id)
        )
        if (cancelled) return
        setFocusAreas(Array.isArray(fetchedAreas) ? fetchedAreas : [])

        // Goals for all areas in parallel
        const goalResults = await Promise.allSettled(
          (fetchedAreas || []).map((area) => apiCache.get(`goals:${area._id}`, AREAS_TTL, () => annualPlanningService.getGoals(area._id)))
        )
        if (cancelled) return
        const allGoals = goalResults.flatMap((r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []))
        setGoals(allGoals)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [year])

  return { plan, focusAreas, goals, loading, error }
}

export default useAnnualPlan
