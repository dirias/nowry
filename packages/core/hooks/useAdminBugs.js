/**
 * The admin Bug reports tab's data (ADMIN-007b, FR-011 Bug reports, board C), for any client.
 *
 * - `useBugList({status})` — the reports in one state, newest first.
 * - `useBugCounts()` — how many reports sit in each state, for the filters.
 * - `useNewBugCount()` — how many are new, for the tab's count; null until known.
 * - `useBugSave({run})` — save a state change and/or a note through the
 *   re-sign-in runner; afterwards the list and its counts are read again.
 */
import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BUG_LIST_LIMIT, bugsService } from '../api/services/bugs.service'
import { isReauthCancelled } from '../domain/recentSignIn'
import { bugChanges, statusCounts } from '../domain/bugReports'

/** The React Query family every admin bug read sits under. */
export const ADMIN_BUGS_KEY = ['admin', 'bugs']

export function useBugList({ status } = {}) {
  const state = status ?? 'new'
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...ADMIN_BUGS_KEY, 'list', state],
    queryFn: () => bugsService.list({ status: state, limit: BUG_LIST_LIMIT })
  })
  return { bugs: data ?? [], loading: isLoading, error: error ?? null, retry: refetch }
}

const useBugStats = () =>
  useQuery({
    queryKey: [...ADMIN_BUGS_KEY, 'stats'],
    queryFn: () => bugsService.stats()
  })

export function useBugCounts() {
  const { data } = useBugStats()
  return statusCounts(data)
}

export function useNewBugCount() {
  const { data } = useBugStats()
  return data ? statusCounts(data).new : null
}

/**
 * @param {{run?: (action: string, call: () => Promise<any>) => Promise<any>}} options
 * @returns {{busy: boolean, outcome: Object|null, save: (bug: Object, draft: {status?: string, note?: string}) => Promise<boolean>, reset: Function}}
 *   `outcome` is `{kind: 'saved'}`, `{kind: 'nothing'}`, `{kind: 'notFound'}` or `{kind: 'failed'}`;
 *   `save` resolves true when something was saved.
 */
export function useBugSave({ run } = {}) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState(null)

  const save = useCallback(
    async (bug, draft) => {
      const changes = bugChanges(bug, draft)
      if (!changes) {
        setOutcome({ kind: 'nothing' })
        return false
      }
      const call = () => bugsService.updateStatus(bug.id, changes)
      setBusy(true)
      setOutcome(null)
      try {
        await (run ? run('saveBug', call) : call())
        setOutcome({ kind: 'saved' })
        queryClient.invalidateQueries({ queryKey: ADMIN_BUGS_KEY })
        return true
      } catch (error) {
        if (error?.response?.status === 404) {
          setOutcome({ kind: 'notFound' })
          queryClient.invalidateQueries({ queryKey: ADMIN_BUGS_KEY })
        } else if (!isReauthCancelled(error)) setOutcome({ kind: 'failed' })
        return false
      } finally {
        setBusy(false)
      }
    },
    [run, queryClient]
  )

  const reset = useCallback(() => setOutcome(null), [])
  return { busy, outcome, save, reset }
}
