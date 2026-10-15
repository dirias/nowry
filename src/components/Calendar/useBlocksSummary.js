import { useQuery } from '@tanstack/react-query'
import { blocksService } from '@nowry/core/api/services/blocks.service'
import { BLOCKS_STALE_TIME } from '@nowry/core/hooks/useBlocks'
import { useAuth } from '@nowry/core/context/AuthContext'

/**
 * The toolbar's readout for a Day or a Week (PLAN-004): "14 of 23 blocks kept
 * · 6 h 10 min", from `GET /blocks/summary` for the visible range.
 *
 * Keyed inside the `['blocks', userId]` family on purpose: a kept tick or an
 * edited block invalidates every range in the family, and the summary must
 * move with them. `useBlockLog`'s optimistic patch skips this entry because it
 * carries no `occurrences`; the settle refetches it.
 */
export function useBlocksSummary({ from, to, enabled = true } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const ready = Boolean(userId && from && to) && enabled

  const { data, isLoading, error } = useQuery({
    queryKey: ['blocks', userId, 'summary', from, to],
    queryFn: () => blocksService.summary({ from, to }),
    enabled: ready,
    staleTime: BLOCKS_STALE_TIME
  })

  return { summary: data ?? null, loading: isLoading, error: error ?? null }
}

export default useBlocksSummary
