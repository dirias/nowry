/**
 * What the Today object shows, assembled once (SITE-013).
 *
 * The Study Center used to derive these numbers inline and Home drew a
 * different week from a different endpoint. One hook, read by both pages, is
 * what makes the two summary objects agree by construction. The underlying
 * hooks are react-query reads with shared caches, so a second page mounting
 * this costs no second request.
 */
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import { useStatistics } from '@nowry/core/hooks/useStatistics'
import { useForecast } from '@nowry/core/hooks/useForecast'

export function useTodayData() {
  const { statistics, loading: statsLoading } = useStatistics()
  const { decks: hookDecks, loading: decksLoading, reload: reloadDecks } = useDeckData()
  const { forecast } = useForecast(7)

  const decks = hookDecks || []
  const dueToday = decks.reduce((sum, d) => sum + (d.due_cards || 0), 0)
  const newToday = decks.reduce((sum, d) => sum + (d.new_cards || 0), 0)
  const totalCards = decks.reduce((sum, d) => sum + (d.total_cards || 0), 0)

  // Streak and weekly progress come exclusively from the statistics endpoint;
  // the last entry of weekly_progress is today.
  const weekly = statistics?.weekly_progress || []
  const reviewedToday = weekly[weekly.length - 1]?.cards || 0
  const streak = statistics?.summary?.current_streak || 0

  return {
    loading: statsLoading || decksLoading,
    statsLoading,
    decksLoading,
    statistics,
    decks,
    reloadDecks,
    forecast,
    dueToday,
    newToday,
    reviewedToday,
    totalCards,
    streak,
    weekly
  }
}

export default useTodayData
