/* eslint-disable */
import { useState, useEffect } from 'react'
import { decksService } from '../api/services'
import { apiCache } from '../api/utils/cache'
import { useAuth } from '../context/AuthContext'

const CACHE_TTL = 60000 // 60 seconds

export function useDeckData() {
  const { user } = useAuth()
  // Scope cache key to the logged-in user to prevent cross-account data leaks
  const CACHE_KEY = user?.id ? `decks:all:${user.id}` : null

  // Pre-seed from cache so remounting shows data instantly
  const [decks, setDecks] = useState(() => (CACHE_KEY ? apiCache.peek(CACHE_KEY) : null) ?? [])
  const [loading, setLoading] = useState(() => !CACHE_KEY || apiCache.peek(CACHE_KEY) === null)
  const [error, setError] = useState(null)

  const load = async (isCancelled = () => false) => {
    if (!CACHE_KEY) return
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
  }, [CACHE_KEY])

  const reload = async () => {
    if (!CACHE_KEY) return
    apiCache.invalidate(CACHE_KEY)
    await load()
  }

  return { decks, loading, error, reload }
}
