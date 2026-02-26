/* eslint-disable */
import { useState, useEffect } from 'react'
import { decksService } from '../api/services'
import { apiCache } from '../api/utils/cache'

const CACHE_KEY = 'decks:all'
const CACHE_TTL = 60000 // 60 seconds

export function useDeckData() {
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async (isCancelled = () => false) => {
    setLoading(true)
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
