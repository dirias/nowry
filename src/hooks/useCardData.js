/**
 * useCardData — Shared hook for cardsService.getAll()
 *
 * Pre-seeds state from the in-memory cache synchronously so that
 * navigating back to Home renders existing data instantly (no flash
 * of empty state). When the cache is cold, fires one fetch and stores
 * the result. Concurrent callers share the same in-flight Promise via
 * the deduplication in apiCache.get().
 */

import { useState, useEffect } from 'react'
import { cardsService } from '../api/services'
import { apiCache } from '../api/utils/cache'

const CACHE_KEY = 'cards:all'
const CACHE_TTL = 30000 // 30 seconds

/** Read current cached value without triggering a fetch. */
function readCache() {
  return apiCache.peek(CACHE_KEY)
}

function buildCacheKey(tags, search) {
  const tagsPart = tags.length > 0 ? `t:${[...tags].sort().join(',')}` : ''
  const searchPart = search ? `s:${search}` : ''
  const parts = [tagsPart, searchPart].filter(Boolean)
  return parts.length > 0 ? `cards:filtered:${parts.join(':')}` : CACHE_KEY
}

export function useCardData(selectedTags = [], search = '') {
  const cacheKey = buildCacheKey(selectedTags, search)

  // Pre-seed from cache so the component renders real data on remount.
  // Only pre-seed when using the base (unfiltered) key to avoid stale data.
  const [cards, setCards] = useState(() => (cacheKey === CACHE_KEY ? readCache()?.cards : null) ?? [])
  const [total, setTotal] = useState(() => (cacheKey === CACHE_KEY ? readCache()?.total : null) ?? 0)
  const [hasMore, setHasMore] = useState(() => (cacheKey === CACHE_KEY ? readCache()?.has_more : null) ?? false)
  const [loading, setLoading] = useState(() => (cacheKey === CACHE_KEY ? readCache() === null : true))
  const [error, setError] = useState(null)

  // Stable dependency string — avoids array identity churn on every render.
  const filterKey = `${[...selectedTags].sort().join(',')}::${search}`

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const effectCacheKey = buildCacheKey(selectedTags, search)

      const preloaded = apiCache.peek(effectCacheKey)
      if (!preloaded) setLoading(true)

      try {
        const data = await apiCache.get(effectCacheKey, CACHE_TTL, () => cardsService.getAll(0, 50, selectedTags, search))
        if (!cancelled) {
          setCards(data.cards)
          setTotal(data.total)
          setHasMore(data.has_more)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useCardData] Error:', err)
          setError(err)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]) // re-run whenever tags or search changes

  const reload = async () => {
    const effectCacheKey = buildCacheKey(selectedTags, search)
    setLoading(true)
    apiCache.invalidate(effectCacheKey)
    try {
      const data = await apiCache.get(effectCacheKey, CACHE_TTL, () => cardsService.getAll(0, 50, selectedTags, search))
      setCards(data.cards)
      setTotal(data.total)
      setHasMore(data.has_more)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMore = async () => {
    if (loading || !hasMore) return

    const effectCacheKey = buildCacheKey(selectedTags, search)

    try {
      setLoading(true)
      const data = await cardsService.getAll(cards.length, 50, selectedTags, search)
      const updatedCards = [...cards, ...data.cards]

      setCards(updatedCards)
      setTotal(data.total)
      setHasMore(data.has_more)

      apiCache.set(effectCacheKey, { cards: updatedCards, total: data.total, has_more: data.has_more }, CACHE_TTL)

      setError(null)
    } catch (err) {
      console.error('[useCardData] FetchMore Error:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return { cards, total, hasMore, loading, error, reload, fetchMore }
}
