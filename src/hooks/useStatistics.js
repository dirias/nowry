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
 *   apiCache.invalidate('cards:statistics')
 */

import { useState, useEffect } from 'react'
import { cardsService } from '../api/services'
import { apiCache } from '../api/utils/cache'

const CACHE_KEY = 'cards:statistics'
const CACHE_TTL = 60000 // 60 seconds

export function useStatistics() {
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
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
  }, [])

  const reload = () => {
    apiCache.invalidate(CACHE_KEY)
    apiCache
      .get(CACHE_KEY, CACHE_TTL, () => cardsService.getStatistics())
      .then((data) => setStatistics(data))
      .catch((err) => console.error('[useStatistics] Reload error:', err))
  }

  return { statistics, loading, error, reload }
}
