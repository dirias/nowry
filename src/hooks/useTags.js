import { useQuery } from '@tanstack/react-query'
import { cardsService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

export const TAGS_STALE_TIME = 30000 // same as the card list it filters

/**
 * useTags — the user's tags with their counts (`GET /study-cards/tags`), on
 * React Query so a bulk tag, a rename or a remove (PRD D16, D17) can
 * invalidate `['tags', userId]` and every menu built from the list refetches
 * together — the library's Tags filter and the selection bar's Tag ▾ read the
 * same entry (ADR-008).
 *
 * The card sheet and Save to deck still fetch through the service on open;
 * their pool is a suggestion list, and one fetch per open is the right cost.
 */
export function useTags({ enabled = true } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error } = useQuery({
    queryKey: ['tags', userId],
    queryFn: () => cardsService.getTags(),
    enabled: !!userId && enabled,
    staleTime: TAGS_STALE_TIME
  })

  const reload = async () => {
    if (!userId) return
    await queryClient.invalidateQueries({ queryKey: ['tags', userId] })
  }

  return { tags: data ?? [], loading: isLoading, error: error ?? null, reload }
}

export default useTags
