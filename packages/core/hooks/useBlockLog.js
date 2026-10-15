import { useMutation } from '@tanstack/react-query'
import { blocksService } from '../api/services/blocks.service'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

/**
 * useBlockLog — record or forget a day's outcome for a block (PRD D5).
 *
 * Optimistic the way the agenda's tick is (calendar PRD A7): every cached
 * `['blocks', userId, …]` range that holds the occurrence gets its log row
 * written at once, the request follows, a rejection restores the snapshot.
 * The tick is the most frequent write the day has, and a tick that waits for
 * the network reads as a tick that did not take.
 */
export function useBlockLog() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const family = ['blocks', userId]

  const patchRanges = (blockId, date, patch) => {
    const snapshots = queryClient.getQueriesData({ queryKey: family })
    for (const [key, data] of snapshots) {
      if (!data?.occurrences) continue
      queryClient.setQueryData(key, {
        ...data,
        occurrences: data.occurrences.map((o) => (o.blockId === blockId && o.date === date ? { ...o, log: patch(o.log) } : o))
      })
    }
    return snapshots
  }

  const restore = (snapshots) => {
    for (const [key, data] of snapshots ?? []) queryClient.setQueryData(key, data)
  }

  const settle = () => queryClient.invalidateQueries({ queryKey: family })

  const setLog = useMutation({
    mutationFn: ({ blockId, date, log }) => blocksService.setLog(blockId, date, log),
    onMutate: async ({ blockId, date, log }) => {
      await queryClient.cancelQueries({ queryKey: family })
      return patchRanges(blockId, date, (previous) => ({ ...(previous ?? {}), blockId, date, ...log }))
    },
    onError: (_error, _variables, snapshots) => restore(snapshots),
    onSettled: settle
  })

  const clearLog = useMutation({
    mutationFn: ({ blockId, date }) => blocksService.clearLog(blockId, date),
    onMutate: async ({ blockId, date }) => {
      await queryClient.cancelQueries({ queryKey: family })
      return patchRanges(blockId, date, () => null)
    },
    onError: (_error, _variables, snapshots) => restore(snapshots),
    onSettled: settle
  })

  return {
    /** `keep(occurrence, { minutes, record })` — the tick. */
    keep: (o, extra = {}) =>
      setLog.mutateAsync({ blockId: o.blockId, date: o.date, log: { status: 'kept', minutes: o.lengthMin, ...extra } }),
    skip: (o) => setLog.mutateAsync({ blockId: o.blockId, date: o.date, log: { status: 'skipped', minutes: 0 } }),
    partial: (o, extra = {}) => setLog.mutateAsync({ blockId: o.blockId, date: o.date, log: { status: 'partial', ...extra } }),
    undo: (o) => clearLog.mutateAsync({ blockId: o.blockId, date: o.date }),
    setLog: setLog.mutateAsync,
    pending: setLog.isPending || clearLog.isPending
  }
}

export default useBlockLog
