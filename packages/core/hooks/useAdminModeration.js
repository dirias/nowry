/**
 * The admin Moderation tab's data (ADMIN-003, FR-004, FR-011 Moderation, board B), for any client.
 *
 * - `useModerationQueue({state})` — the items in one state with the totals per state.
 * - `useToReviewCount()` — how many items wait for review, for the tab's count.
 * - `useModerationAction({run})` — keep public or unpublish through the
 *   re-sign-in runner; afterwards the queue and its counts are read again.
 */
import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminModerationService, MODERATION_QUEUE_LIMIT } from '../api/services/adminModeration.service'
import { isReauthCancelled } from '../domain/recentSignIn'
import { keepSummary, moderationRefusal, removalSummary } from '../domain/moderation'

/** The React Query family every admin moderation read sits under. */
export const ADMIN_MODERATION_KEY = ['admin', 'moderation']

const EMPTY_TOTALS = Object.freeze({ to_review: 0, kept: 0, removed: 0 })

export function useModerationQueue({ state } = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...ADMIN_MODERATION_KEY, 'queue', state ?? 'to_review'],
    queryFn: () => adminModerationService.listQueue({ state: state ?? 'to_review', limit: MODERATION_QUEUE_LIMIT })
  })
  return {
    items: data?.items ?? [],
    totals: { ...EMPTY_TOTALS, ...(data?.totals ?? {}) },
    loading: isLoading,
    error: error ?? null,
    retry: refetch
  }
}

/** The count the tab carries ("Moderation 2"); null until it is known. */
export function useToReviewCount() {
  const { data } = useQuery({
    queryKey: [...ADMIN_MODERATION_KEY, 'toReview'],
    queryFn: () => adminModerationService.listQueue({ state: 'to_review', limit: 1 })
  })
  const count = data?.totals?.to_review
  return Number.isFinite(count) ? count : null
}

/**
 * @param {{run?: (action: string, call: () => Promise<any>) => Promise<any>}} options
 *   `run` is the re-sign-in runner (`useReauthRetry().run`); without it the call is made as is.
 * @returns {{busy: 'keep'|'unpublish'|null, outcome: Object|null, keep: Function, remove: Function, reset: Function}}
 *   `outcome` is `{kind: 'kept', closed}`, `{kind: 'removed', count, told, notTold}`, `{kind: 'alreadyRemoved'}`,
 *   `{kind: 'notFound'}` or `{kind: 'failed'}`; `keep` and `remove` resolve true when the item has left the list.
 */
export function useModerationAction({ run } = {}) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(null)
  const [outcome, setOutcome] = useState(null)

  const write = useCallback(
    async (action, call, summarise) => {
      setBusy(action)
      setOutcome(null)
      try {
        const data = await (run ? run(action, call) : call())
        setOutcome(summarise(data))
        queryClient.invalidateQueries({ queryKey: ADMIN_MODERATION_KEY })
        return true
      } catch (error) {
        // The item changed under the admin: say so, and read the queue again so it leaves.
        const refusal = moderationRefusal(error)
        if (refusal) {
          setOutcome({ kind: refusal })
          queryClient.invalidateQueries({ queryKey: ADMIN_MODERATION_KEY })
          return true
        }
        if (!isReauthCancelled(error)) setOutcome({ kind: 'failed' })
        return false
      } finally {
        setBusy(null)
      }
    },
    [run, queryClient]
  )

  const keep = useCallback(
    (item) =>
      write(
        'keep',
        () => adminModerationService.keep(item.content_type, item.content_id),
        (data) => ({ kind: 'kept', ...keepSummary(data) })
      ),
    [write]
  )

  const remove = useCallback(
    (item, removal) =>
      write(
        'unpublish',
        () => adminModerationService.remove(item.content_type, item.content_id, removal),
        (data) => ({ kind: 'removed', ...removalSummary(data) })
      ),
    [write]
  )

  const reset = useCallback(() => setOutcome(null), [])
  return { busy, outcome, keep, remove, reset }
}
