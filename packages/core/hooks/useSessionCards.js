import { useQuery } from '@tanstack/react-query'
import { cardsService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

/** The sentinel the deck-id slot carries for "today, across every deck". */
export const DAILY_REVIEW = 'daily-review'

/**
 * The cards a session is about to ask (MOB-026, MOB-042).
 *
 * A `useQuery` rather than a bare service call, and that is the whole point:
 * the mobile client persists its query cache to disk, so a queue fetched with
 * signal is a queue that opens without one. Fetching directly — which is what
 * this screen did — put the one part of the app that most needs to work offline
 * outside the only thing that makes offline possible.
 *
 * `deckId` is either a deck's id or `daily-review`, and the daily review is a
 * queue the SERVER owns: it stamps the day's selection, so the same cards come
 * back until they are graded rather than being redrawn on each open. `tags` and
 * `group` narrow that pool server-side.
 *
 * The key carries every narrowing, so a tag's session and the whole day's are
 * separate entries and neither serves the other's cards from cache.
 */
/**
 * @param {object} options
 * @param {'due' | 'all'} [options.scope] - `all` is every card of the deck, the web's browse
 *   mode and the phone's All scope (ADR-042); ignored for the daily review, which has no All.
 * @param {boolean} [options.enabled] - a second scope can be mounted without being fetched.
 */
export function useSessionCards({ deckId, tags = [], group, limit, attempt = 0, scope = 'due', enabled = true } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const isDaily = deckId === DAILY_REVIEW

  const everyCard = scope === 'all' && !isDaily

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['cards', userId, 'session', deckId, { tags, group, limit, attempt, scope: everyCard ? 'all' : 'due' }],
    queryFn: () =>
      isDaily
        ? cardsService.getDailyReviewCards({ limit, tags, group })
        : everyCard
          ? cardsService.getAllCards(deckId)
          : cardsService.getDueCards(deckId),
    enabled: enabled && !!userId && !!deckId,
    /*
     * A session's queue is read once and then worked through. Refetching it
     * mid-session would change the cards under the user's thumb, so it stays
     * fresh for as long as a session plausibly lasts.
     */
    staleTime: 15 * 60 * 1000
  })

  return {
    cards: data ?? null,
    loading: isLoading,
    /** True only when there is nothing to show: cached cards beat an error. */
    error: data ? null : (error ?? null),
    /** A refetch is happening over cards already on screen. */
    refreshing: isFetching && Boolean(data),
    reload: () => queryClient.invalidateQueries({ queryKey: ['cards', userId, 'session'] })
  }
}

export default useSessionCards
