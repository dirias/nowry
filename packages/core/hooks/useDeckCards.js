import { useQuery } from '@tanstack/react-query'
import { cardsService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

/** The card list's own age: a grade elsewhere should show here soon enough. */
export const DECK_CARDS_STALE_TIME = 30000

/**
 * useDeckCards — every card in one deck, due or not.
 *
 * The web reaches a deck's cards through Browse, which is the session component
 * running without a scheduler; it has never needed a list of them. The phone
 * does: its deck screen is a place rather than a session, and a deck you cannot
 * see the contents of is a folder that will not open (MOB-078).
 *
 * `getAllCards` is the same endpoint Browse uses, with `due_only=false`, so the
 * set here is exactly the set the web would page through.
 *
 * Key: `['cards', 'deck', deckId, userId]` — under `cards`, so it is persisted
 * with the rest of the library and cleared by the same invalidation a grade or
 * a mark already triggers.
 */
export function useDeckCards(deckId, { enabled = true } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const id = deckId ? String(deckId) : null

  const { data, isLoading, error } = useQuery({
    queryKey: ['cards', 'deck', id, userId],
    queryFn: () => cardsService.getAllCards(id),
    enabled: Boolean(userId && id) && enabled,
    staleTime: DECK_CARDS_STALE_TIME
  })

  const reload = async () => {
    if (!id) return
    await queryClient.invalidateQueries({ queryKey: ['cards', 'deck', id, userId] })
  }

  return { cards: data ?? null, loading: isLoading, error: error ?? null, reload }
}

export default useDeckCards
