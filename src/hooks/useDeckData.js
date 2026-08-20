import { useQuery } from '@tanstack/react-query'
import { decksService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

// Matches the old apiCache TTL for this resource (see api/queryClient.js's
// query-key convention doc, which documents 60000ms as useDeckData's
// per-resource override of the shared default staleTime).
const DECKS_STALE_TIME = 60000 // 60 seconds

/**
 * useDeckData — React Query-backed deck list (ADR-008 / CACHE-003).
 *
 * Replaces the old hand-rolled `apiCache`-backed version. Because every
 * `useDeckData()` instance subscribes to the same `queryClient` cache entry
 * for a given key, invalidating that key from ANY component (via `reload()`
 * here, or directly via `queryClient.invalidateQueries`) re-renders every
 * other mounted component reading it too — this is what keeps StudyCenter's
 * Dashboard tab and CardHome's Content Library tab in sync without manual
 * `onDeckChange`/prop-threading between them.
 */
export function useDeckData(deckType) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error } = useQuery({
    // Scoped by user (and deck type) to prevent cross-account data leaks and
    // to keep type-filtered results from colliding with unfiltered ones —
    // see the query-key convention documented in `api/queryClient.js`.
    queryKey: ['decks', userId, deckType || 'all'],
    queryFn: () => decksService.getAll(deckType),
    enabled: !!userId,
    staleTime: DECKS_STALE_TIME
  })

  const reload = async () => {
    if (!userId) return
    // Invalidate every deckType variant for this user (not just the one this
    // instance was called with) so every subscribed useDeckData instance —
    // regardless of deckType — refetches. Matches the old
    // apiCache.invalidatePrefix-style broad scope this hook relied on.
    await queryClient.invalidateQueries({ queryKey: ['decks', userId] })
  }

  return { decks: data ?? [], loading: isLoading, error: error ?? null, reload }
}
