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
  // Access the internal store by calling get() with a 0-TTL sentinel
  // is tricky — instead we expose a helper on apiCache below.
  return apiCache.peek(CACHE_KEY)
}

export function useCardData() {
  // Pre-seed from cache so the component renders real data on remount
  const [cards, setCards] = useState(() => readCache() ?? [])
  const [loading, setLoading] = useState(() => readCache() === null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // If we already pre-seeded from cache, we can skip the loading spinner
      const preloaded = apiCache.peek(CACHE_KEY)
      if (!preloaded) setLoading(true)

      try {
        const data = await apiCache.get(CACHE_KEY, CACHE_TTL, () => cardsService.getAll())
        if (!cancelled) {
          setCards(data)
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
  }, [])

  const reload = async () => {
    setLoading(true)
    apiCache.invalidate(CACHE_KEY)
    try {
      const data = await apiCache.get(CACHE_KEY, CACHE_TTL, () => cardsService.getAll())
      setCards(data)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return { cards, loading, error, reload }
}
