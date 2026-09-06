import { useQuery } from '@tanstack/react-query'
import { cardsService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

export const GROUPS_STALE_TIME = 30000 // same as the card list it summarises

/**
 * useGroups — the library's Tags view index (STUDY-001 / STUDY-002, PRD D6).
 *
 * Returns the two system groups (marked, struggling) and every tag, each with
 * cards / decks / due / new under one counting rule, so a group's "Study · N"
 * is `due + new` and equals the session that opens (PRD US-006).
 *
 * `enabled` lets the caller defer the request until the Tags segment is first
 * engaged (PRD NFR performance). Key: ['groups', userId]; invalidated beside
 * ['cards', userId] when a review is graded or a card is marked.
 */
export function useGroups({ enabled = true } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error } = useQuery({
    queryKey: ['groups', userId],
    queryFn: () => cardsService.getGroups(),
    enabled: !!userId && enabled,
    staleTime: GROUPS_STALE_TIME
  })

  const reload = async () => {
    if (!userId) return
    await queryClient.invalidateQueries({ queryKey: ['groups', userId] })
  }

  return { groups: data ?? null, loading: isLoading, error: error ?? null, reload }
}

export default useGroups
