/**
 * The cards of a drill (ADR-059 §4): named by id, fetched one by one.
 *
 * A drill is a handful of misses from one session, never the deck, so there
 * is no queue endpoint for it; the card endpoint answers each id. Capped so a
 * mistaken link cannot ask for hundreds, and a card that is gone is skipped
 * rather than failing the drill.
 */
import { useQuery } from '@tanstack/react-query'
import { cardsService } from '../api/services/cards.service'
import { useAuth } from '../context/AuthContext'

export const DRILL_MAX = 40

/** Parse the route's `cards` value: a comma-joined list, or a list already. */
export const drillIdsOf = (value) => {
  const raw = Array.isArray(value) ? value.join(',') : String(value ?? '')
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  ).slice(0, DRILL_MAX)
}

export function useDrillCards(ids, { enabled = true } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const key = (ids ?? []).join(',')

  const { data, isLoading, error } = useQuery({
    queryKey: ['cards', userId, 'drill', key],
    queryFn: async () => {
      const results = await Promise.allSettled(ids.map((id) => cardsService.getById(id)))
      return results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value)
    },
    enabled: Boolean(enabled && userId && ids && ids.length > 0),
    staleTime: 0
  })

  return { cards: data ?? null, loading: isLoading, error: error ?? null }
}

export default useDrillCards
