import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { cardsService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

// Matches the old apiCache TTL for this resource (see api/queryClient.js's
// query-key convention doc, which documents 30000ms as useCardData's
// per-resource override of the shared default staleTime).
const CARDS_STALE_TIME = 30000 // 30 seconds
const PAGE_SIZE = 50

// Tags are sorted before entering the query key so that toggling the same
// set of tags in a different order (or re-deriving the array on every
// render) still hashes to the same cache entry — mirrors the old
// apiCache-backed buildCacheKey()'s `[...tags].sort()`.
function buildFilterKey(tags, search) {
  return { tags: [...tags].sort(), search: search || '' }
}

/**
 * useCardData — React Query-backed, paginated card list (ADR-008 / CACHE-004).
 *
 * Replaces the old hand-rolled `apiCache`-backed version. Every
 * `useCardData(selectedTags, search)` instance with the same filter
 * combination subscribes to the same `queryClient` cache entry, so
 * invalidating it from ANY component (via `reload()` here, or directly via
 * `queryClient.invalidateQueries`) re-renders every other mounted component
 * reading it too — same pattern as CACHE-003's `useDeckData`.
 *
 * Pagination is modeled with `useInfiniteQuery` rather than a manual
 * "fetch and append" `fetchMore` — `cardsService.getAll(skip, limit, ...)`
 * is already plain offset/limit pagination with a `has_more` flag, which
 * maps directly onto `pageParam`/`getNextPageParam` with no awkward
 * reshaping. The hook still flattens `data.pages` back into a single
 * `cards` array before returning, so callers (`CardHome.js`, `StudySession.js`,
 * `DailyFocus.js`, `WeeklyStatsCard.js`) keep the exact same
 * `{ cards, total, hasMore, loading, error, reload, fetchMore }` shape they
 * had before this migration.
 */
export function useCardData(selectedTags = [], search = '') {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const filter = buildFilterKey(selectedTags, search)

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    // Scoped by user (and the tag/search filter combo) so filtered variants
    // don't collide with the unfiltered list or with another account's data —
    // see the query-key convention documented in `api/queryClient.js`.
    queryKey: ['cards', userId, filter],
    queryFn: ({ pageParam = 0 }) => cardsService.getAll(pageParam, PAGE_SIZE, selectedTags, search),
    // Next page's offset is simply how many cards have been loaded so far;
    // returning undefined (when the server says there's no more) is what
    // React Query reads as "no next page" for `hasNextPage`.
    getNextPageParam: (lastPage, allPages) => (lastPage.has_more ? allPages.flatMap((page) => page.cards).length : undefined),
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: CARDS_STALE_TIME
  })

  // React Query's own cache (keyed by `['cards', userId, filter]`) already
  // gives instant, no-flicker data on remount within `staleTime`/`gcTime` —
  // no manual pre-seed-from-cache step is needed the way the old
  // `apiCache.peek()` call was, and it applies uniformly to every filter
  // combination rather than only the unfiltered key.
  // `data` is only referentially stable across renders when React Query
  // hasn't refetched — deriving `cards` with a fresh `flatMap` on every
  // render (regardless of whether `data` changed) breaks that stability and
  // was feeding a new array reference into every consumer's effect deps on
  // every render, causing "Maximum update depth exceeded" loops downstream
  // (e.g. CardHome.js's fetchData `useCallback`).
  const { cards, total, hasMore } = useMemo(() => {
    const pages = data?.pages ?? []
    const lastPage = pages[pages.length - 1]
    return {
      cards: pages.flatMap((page) => page.cards),
      total: lastPage?.total ?? 0,
      hasMore: lastPage?.has_more ?? false
    }
  }, [data])

  const reload = async () => {
    if (!userId) return
    // Invalidate every tag/search variant for this user (not just the one
    // this instance was called with) so every subscribed useCardData
    // instance — regardless of filters — refetches. Matches the old
    // apiCache-backed hook's implicit broad scope (every caller shared one
    // of three possible cache keys and each `reload()` only ever refreshed
    // its own instance's key, but React Query's per-key subscriber model
    // means a full-resource invalidation is what actually keeps every
    // mounted view, e.g. CardHome + DailyFocus + WeeklyStatsCard, in sync).
    await queryClient.invalidateQueries({ queryKey: ['cards', userId] })
  }

  const fetchMore = async () => {
    if (isFetchingNextPage || !hasNextPage) return
    await fetchNextPage()
  }

  return { cards, total, hasMore, loading: isLoading, error: error ?? null, reload, fetchMore }
}
