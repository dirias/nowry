/**
 * useStatistics — Shared hook for cardsService.getStatistics()
 *
 * Problem it solves:
 *   WeeklyProgress and StudyCalendar both call getStatistics() independently
 *   on the same Home page → 2 identical API calls for the same data.
 *
 * Solution:
 *   Cache the result for 60 seconds using the existing apiCache. The second
 *   component to mount gets the cached value immediately without a round-trip.
 *
 * Invalidate after a study session completes:
 *   import { apiCache } from '../api/utils/cache'
 *   apiCache.invalidate(`cards:statistics:${user.id}`)
 */

import { useState, useEffect } from 'react'
import { cardsService } from '../api/services'
import { apiCache } from '../api/utils/cache'
import { useAuth } from '../context/AuthContext'

const CACHE_TTL = 60000 // 60 seconds

export function useStatistics() {
  const { user } = useAuth()
  // Scope cache key to the logged-in user to prevent cross-account data leaks
  const CACHE_KEY = user?.id ? `cards:statistics:${user.id}` : null

  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!CACHE_KEY) return
    let cancelled = false

    apiCache
      .get(CACHE_KEY, CACHE_TTL, () => cardsService.getStatistics())
      .then((data) => {
        if (!cancelled) {
          setStatistics(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useStatistics] Error:', err)
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [CACHE_KEY])

  const reload = () => {
    if (!CACHE_KEY) return
    apiCache.invalidate(CACHE_KEY)
    apiCache
      .get(CACHE_KEY, CACHE_TTL, () => cardsService.getStatistics())
      .then((data) => setStatistics(data))
      .catch((err) => console.error('[useStatistics] Reload error:', err))
  }

  return { statistics, loading, error, reload }
}
