/* eslint-disable */
import { useState, useEffect } from 'react'
import { decksService } from '../api/services'
import { apiCache } from '../api/utils/cache'

const CACHE_KEY = 'decks:all'
const CACHE_TTL = 60000 // 60 seconds

export function useDeckData() {
  // Pre-seed from cache so remounting shows data instantly
  const [decks, setDecks] = useState(() => apiCache.peek(CACHE_KEY) ?? [])
  const [loading, setLoading] = useState(() => apiCache.peek(CACHE_KEY) === null)
  const [error, setError] = useState(null)

  const load = async (isCancelled = () => false) => {
    const preloaded = apiCache.peek(CACHE_KEY)
    if (!preloaded) setLoading(true)
    setError(null)
    try {
      const data = await apiCache.get(CACHE_KEY, CACHE_TTL, () => decksService.getAll())
      if (!isCancelled()) {
        setDecks(data || [])
      }
    } catch (err) {
      if (!isCancelled()) {
        console.error('[useDeckData] Error:', err)
        setError(err)
      }
    } finally {
      if (!isCancelled()) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false
    load(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [])

  const reload = async () => {
    apiCache.invalidate(CACHE_KEY)
    await load()
  }

  return { decks, loading, error, reload }
}
