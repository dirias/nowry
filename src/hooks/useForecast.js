import { useQuery } from '@tanstack/react-query'
import { cardsService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

export const FORECAST_STALE_TIME = 60000 // same window as statistics — the two are read together

/**
 * useForecast — due counts for the coming days (STUDY-001 / STUDY-002).
 *
 * Feeds the Today object's forward half (PRD D1): 7 days starting tomorrow.
 * Today's due count is not here on purpose — it is `summary.due_today` from
 * useStatistics(), so the timeline's centre cell and the readout can never
 * disagree (architecture addendum, "one number, one owner").
 *
 * Key: ['forecast', userId, days] per api/queryClient.js. Invalidated beside
 * ['statistics', userId] when a review is graded (StudySession).
 */
export function useForecast(days = 7) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error } = useQuery({
    queryKey: ['forecast', userId, days],
    queryFn: () => cardsService.getForecast(days),
    enabled: !!userId,
    staleTime: FORECAST_STALE_TIME
  })

  const reload = async () => {
    if (!userId) return
    await queryClient.invalidateQueries({ queryKey: ['forecast', userId] })
  }

  return { forecast: data ?? null, loading: isLoading, error: error ?? null, reload }
}

export default useForecast
