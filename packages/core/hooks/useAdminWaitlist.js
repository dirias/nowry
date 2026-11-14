/**
 * The admin Waitlist tab's data (WAIT-002, WAIT-006, FR-012, board E), for any client.
 *
 * - `useWaitlist({state, locale})` — the rows in one state and language, oldest
 *   first, with the totals per state for the filters.
 * - `useWaitingCount()` — how many are waiting, for the tab's count.
 * - `useWaitlistInvite({run})` — the ticked rows invited as one batch through
 *   the re-sign-in runner; afterwards the waitlist, the invitations and
 *   today's budget are read again.
 */
import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminWaitlistService, WAITLIST_LIST_LIMIT } from '../api/services/adminWaitlist.service'
import { adminInvitesService } from '../api/services/adminInvites.service'
import { isReauthCancelled } from '../domain/recentSignIn'
import { sendRefusal } from '../domain/invitations'
import { ADMIN_INVITES_KEY } from './useAdminInvites'

/** The React Query family every admin waitlist read sits under. */
export const ADMIN_WAITLIST_KEY = ['admin', 'waitlist']

const EMPTY_TOTALS = Object.freeze({ waiting: 0, invited: 0, joined: 0, left: 0 })

export function useWaitlist({ state, locale } = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...ADMIN_WAITLIST_KEY, 'list', state ?? 'all', locale ?? 'all'],
    queryFn: () => adminWaitlistService.listWaitlist({ state: state ?? undefined, locale: locale ?? undefined, limit: WAITLIST_LIST_LIMIT })
  })
  return {
    rows: data?.rows ?? [],
    totals: { ...EMPTY_TOTALS, ...(data?.totals ?? {}) },
    loading: isLoading,
    error: error ?? null,
    retry: refetch
  }
}

/** The waiting count the tab carries ("Waitlist 37"); null until it is known. */
export function useWaitingCount() {
  const { data } = useQuery({
    queryKey: [...ADMIN_WAITLIST_KEY, 'waiting'],
    queryFn: () => adminWaitlistService.listWaitlist({ state: 'waiting', limit: 1 })
  })
  const count = data?.totals?.waiting
  return Number.isFinite(count) ? count : null
}

/**
 * @param {{run?: (action: string, call: () => Promise<any>) => Promise<any>}} options
 *   `run` is the re-sign-in runner (`useReauthRetry().run`); without it the call is made as is.
 * @returns {{sending: boolean, outcome: Object|null, invite: Function, reset: Function}}
 *   `outcome` is what `SendResult` draws; `invite` resolves true when the batch went.
 */
export function useWaitlistInvite({ run } = {}) {
  const queryClient = useQueryClient()
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState(null)

  const invite = useCallback(
    async ({ ids, cohort, expiresInDays }) => {
      const call = () => adminInvitesService.sendBatch({ waitlistIds: ids, cohort, expiresInDays, dryRun: false })
      setSending(true)
      setOutcome(null)
      try {
        const data = await (run ? run('send', call) : call())
        setOutcome({ kind: 'sent', results: data?.results ?? [] })
        queryClient.invalidateQueries({ queryKey: ADMIN_WAITLIST_KEY })
        queryClient.invalidateQueries({ queryKey: ADMIN_INVITES_KEY })
        return true
      } catch (error) {
        if (!isReauthCancelled(error)) setOutcome(sendRefusal(error))
        return false
      } finally {
        setSending(false)
      }
    },
    [run, queryClient]
  )

  const reset = useCallback(() => setOutcome(null), [])
  return { sending, outcome, invite, reset }
}
