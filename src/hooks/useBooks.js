import { useQuery } from '@tanstack/react-query'
import { booksService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

// Matches the old apiCache TTL for this resource (see api/queryClient.js's
// query-key convention doc — 30000ms was this hook's BOOKS_TTL under the old
// apiCache-backed implementation).
const BOOKS_STALE_TIME = 30000 // 30 seconds

/**
 * useBooks — React Query-backed book list (ADR-008 / CACHE-005).
 *
 * Replaces the old hand-rolled `apiCache`-backed version. Because every
 * `useBooks()` instance subscribes to the same `queryClient` cache entry for
 * a given key, invalidating that key from ANY component (via `reload()`
 * here, or directly via `queryClient.invalidateQueries`) re-renders every
 * other mounted component reading it too.
 *
 * The old implementation's cache key (`'books:all'`) was not scoped by user,
 * unlike `useDeckData`/`useCardData` — a latent cross-account-leak gap
 * (documented in ADR-008). The query key here is scoped by `userId` to close
 * that gap, matching the convention `api/queryClient.js` already documents
 * for `decks`/`cards`.
 */
export function useBooks() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error } = useQuery({
    queryKey: ['books', userId],
    queryFn: () => booksService.getAll(),
    enabled: !!userId,
    staleTime: BOOKS_STALE_TIME
  })

  const reload = async () => {
    if (!userId) return
    await queryClient.invalidateQueries({ queryKey: ['books', userId] })
  }

  return { books: data ?? [], loading: isLoading, error: error ?? null, reload }
}

export default useBooks
