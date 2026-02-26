/**
 * useCardData — Shared hook for cardsService.getAll()
 *
 * Problem it solves:
 *   Home.js calls cardsService.getAll() to count due cards.
 *   CardHome.js then calls cardsService.getAll() again if the user navigates to /cards.
 *   That's two massive identical payloads downloaded within seconds.
 *
 * Solution:
 *   Cache the result for 30 seconds. The second page load returns instantly.
 *
 * Invalidate after completing study sessions or editing cards:
 *   import { apiCache } from '../api/utils/cache'
 *   apiCache.invalidate('cards:all')
 */

import { useState, useEffect } from 'react'
import { cardsService } from '../api/services'
import { apiCache } from '../api/utils/cache'

const CACHE_KEY = 'cards:all'
const CACHE_TTL = 30000 // 30 seconds

export function useCardData() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    apiCache
      .get(CACHE_KEY, CACHE_TTL, () => cardsService.getAll())
      .then((data) => {
        if (!cancelled) {
          setCards(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useCardData] Error:', err)
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Explicit reload function if a consumer needs to force a fresh fetch
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
      if (!loading) setLoading(false) // just to trigger re-render if needed
    }
  }

  return { cards, loading, error, reload }
}
