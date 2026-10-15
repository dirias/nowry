import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { blocksService, blocksKey } from '../api/services/blocks.service'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

/** A day is read far more often than a plan changes; the phone persists it. */
export const BLOCKS_STALE_TIME = 2 * 60 * 1000

/**
 * useBlocks — the blocks and occurrences of a range of local date keys
 * (PLAN-002, ADR-045).
 *
 * The key carries the range, so a week and a day are their own cache entries;
 * a mutation invalidates the whole `['blocks', userId]` family, because a
 * changed rule changes every range it touches. Mutations are optimistic on
 * nothing: a block is edited from a sheet whose close is the refetch, and the
 * log's tick is what `useBlockLog` makes optimistic.
 */
export function useBlocks({ from, to, enabled = true } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const ready = Boolean(userId && from && to) && enabled

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: blocksKey(userId, from, to),
    queryFn: () => blocksService.list({ from, to }),
    enabled: ready,
    staleTime: BLOCKS_STALE_TIME
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['blocks', userId] })

  const create = useMutation({ mutationFn: (block) => blocksService.create(block), onSuccess: invalidate })
  const update = useMutation({ mutationFn: ({ id, changes }) => blocksService.update(id, changes), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: (id) => blocksService.remove(id), onSuccess: invalidate })

  const blocks = useMemo(() => data?.blocks ?? null, [data])
  const occurrences = useMemo(() => data?.occurrences ?? null, [data])

  return {
    blocks,
    occurrences,
    migrated: data?.migrated ?? null,
    loading: isLoading,
    fetching: isFetching,
    error: error ?? null,
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    reload: invalidate
  }
}

export default useBlocks
