import { useCallback, useMemo, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { publicContentService } from '../api/services'

/** The web's own page size for this catalogue. */
export const PAGE_SIZE = 12

/**
 * The public deck catalogue, a page at a time (MOB-049).
 *
 * `useInfiniteQuery` rather than a skip counter in component state, which is
 * what the web keeps: a phone list is scrolled rather than paged, so "load
 * more" has to append without re-fetching what is already on screen, and the
 * pages have to survive a screen being left and come back. React Query does
 * both, and on mobile the cache is persisted, so a catalogue browsed with
 * signal opens without one.
 *
 * Decks only. The same endpoint serves books, and the phone has no reader —
 * a browse that offered them would be a shelf of things that cannot be opened.
 */
export function usePublicDecks({ search = '', category = '', sort = 'recent' } = {}) {
  const client = useQueryClient()
  const [forking, setForking] = useState({})

  const filters = useMemo(() => ({ search: search.trim(), category, sort_by: sort }), [search, category, sort])

  const { data, isLoading, error, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ['publicDecks', filters],
    queryFn: ({ pageParam = 0 }) => publicContentService.browseDecks({ ...filters, skip: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((count, page) => count + (page.items?.length ?? 0), 0)
      return loaded < (last.total ?? 0) ? loaded : undefined
    },
    // A catalogue is read far more often than it changes.
    staleTime: 5 * 60 * 1000
  })

  const decks = useMemo(() => (data?.pages ?? []).flatMap((page) => page.items ?? []), [data])
  const total = data?.pages?.[0]?.total ?? 0

  /**
   * Take a copy. The endpoint is idempotent on (deck, user) — asking twice
   * returns the copy that already exists rather than making a second one — so
   * a double tap costs nothing and the row can say "Added" either way.
   *
   * The library's own queries are invalidated on success, because a deck that
   * has just been added and is not in the library is the kind of gap a user
   * reads as a failure.
   */
  const fork = useCallback(
    async (deckId) => {
      setForking((state) => ({ ...state, [deckId]: 'working' }))
      try {
        const result = await publicContentService.forkDeck(deckId)
        setForking((state) => ({ ...state, [deckId]: 'added' }))
        client.invalidateQueries({ queryKey: ['decks'] })
        return result
      } catch (err) {
        setForking((state) => ({ ...state, [deckId]: 'failed' }))
        throw err
      }
    },
    [client]
  )

  return {
    decks,
    total,
    loading: isLoading,
    error: decks.length > 0 ? null : (error ?? null),
    loadingMore: isFetchingNextPage,
    canLoadMore: Boolean(hasNextPage),
    loadMore: fetchNextPage,
    reload: refetch,
    /** Per deck: undefined, 'working', 'added' or 'failed'. */
    forking,
    fork
  }
}

export default usePublicDecks
