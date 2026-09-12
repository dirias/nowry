import { useCallback, useMemo, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { publicContentService } from '../api/services'

/** The web's own page size for this catalogue. */
export const PAGE_SIZE = 12

/** The two halves of the catalogue, and what each one is called everywhere. */
export const CATALOGUE_KINDS = ['decks', 'books']

const BROWSE = { decks: 'browseDecks', books: 'browseBooks' }
const FORK = { decks: 'forkDeck', books: 'forkBook' }
/** Which library a fresh copy lands in, so that library is re-read. */
const LIBRARY_KEY = { decks: 'decks', books: 'books' }

/**
 * The public catalogue, a page at a time (MOB-049, MOB-066).
 *
 * `useInfiniteQuery` rather than a skip counter in component state, which is
 * what the web keeps: a phone list is scrolled rather than paged, so "load
 * more" has to append without re-fetching what is already on screen, and the
 * pages have to survive a screen being left and come back. React Query does
 * both, and on mobile the cache is persisted, so a catalogue browsed with
 * signal opens without one.
 *
 * **Books and decks, not decks alone.** This hook was `usePublicDecks`, and its
 * comment said the phone had no reader so a shelf of books would be a shelf of
 * things that cannot be opened. V3 built the reader (MOB-056); the reason
 * expired and the restriction outlived it. The service is symmetric — browse,
 * fork and their idempotency contract are the same two endpoints — so the only
 * thing that was ever deck-specific here was the method name.
 *
 * @param {{ kind?: 'decks'|'books', search?: string, category?: string, sort?: string }} options
 */
export function usePublicCatalogue({ kind = 'decks', search = '', category = '', sort = 'recent' } = {}) {
  const client = useQueryClient()
  const [forking, setForking] = useState({})

  const filters = useMemo(() => ({ search: search.trim(), category, sort_by: sort }), [search, category, sort])

  const { data, isLoading, error, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ['publicCatalogue', kind, filters],
    queryFn: ({ pageParam = 0 }) => publicContentService[BROWSE[kind]]({ ...filters, skip: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((count, page) => count + (page.items?.length ?? 0), 0)
      return loaded < (last.total ?? 0) ? loaded : undefined
    },
    // A catalogue is read far more often than it changes.
    staleTime: 5 * 60 * 1000
  })

  const items = useMemo(() => (data?.pages ?? []).flatMap((page) => page.items ?? []), [data])
  const total = data?.pages?.[0]?.total ?? 0

  /**
   * Take a copy. The endpoint is idempotent on (item, user) — asking twice
   * returns the copy that already exists rather than making a second one — so
   * a double tap costs nothing and the row can say "Added" either way. Books
   * and decks answer it the same way, which ONB-014 made true by replacing the
   * books endpoint's `409 already_forked` with `200 { created: false }`.
   *
   * The matching library's queries are invalidated on success, because an item
   * that has just been added and is not in the library is the kind of gap a
   * user reads as a failure.
   */
  const fork = useCallback(
    async (id) => {
      setForking((state) => ({ ...state, [id]: 'working' }))
      try {
        const result = await publicContentService[FORK[kind]](id)
        setForking((state) => ({ ...state, [id]: 'added' }))
        client.invalidateQueries({ queryKey: [LIBRARY_KEY[kind]] })
        return result
      } catch (err) {
        setForking((state) => ({ ...state, [id]: 'failed' }))
        throw err
      }
    },
    [client, kind]
  )

  return {
    items,
    total,
    loading: isLoading,
    error: items.length > 0 ? null : (error ?? null),
    loadingMore: isFetchingNextPage,
    canLoadMore: Boolean(hasNextPage),
    loadMore: fetchNextPage,
    reload: refetch,
    /** Per item: undefined, 'working', 'added' or 'failed'. */
    forking,
    fork
  }
}

export default usePublicCatalogue
