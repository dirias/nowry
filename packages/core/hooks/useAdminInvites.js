/**
 * The admin Invitations tab's data (ADMIN-007a, FR-012), for any client.
 *
 * - `useInviteCohorts` — the cohorts in use, the lifetimes, today's budget.
 * - `useInviteList(state)` — the invitations in one state (or all), with the
 *   totals per state for the filters.
 * - `useInviteDryRun(...)` — the pasted lines checked as a dry run, after a
 *   pause in typing or at once on `flush` (the field's blur).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminInvitesService, INVITE_LIST_LIMIT } from '../api/services/adminInvites.service'
import { isReauthCancelled } from '../domain/recentSignIn'
import { MAX_BATCH, isValidCohort } from '../domain/invitations'

/** The React Query family every admin invitation read sits under. */
export const ADMIN_INVITES_KEY = ['admin', 'invites']
const COHORTS_KEY = ['admin', 'invites', 'cohorts']

/** How long typing pauses before the lines are checked. */
export const DRY_RUN_DELAY_MS = 600

/** Refresh every admin invitation read — the lists and today's budget — after a write. */
export function useRefreshInvites() {
  const queryClient = useQueryClient()
  return useCallback(() => queryClient.invalidateQueries({ queryKey: ADMIN_INVITES_KEY }), [queryClient])
}

export function useInviteCohorts() {
  const { data, isLoading, error } = useQuery({ queryKey: COHORTS_KEY, queryFn: adminInvitesService.getCohorts })
  return { data: data ?? null, loading: isLoading, error: error ?? null }
}

const EMPTY_TOTALS = Object.freeze({ open: 0, used: 0, expired: 0, revoked: 0 })

export function useInviteList(state) {
  const reload = useRefreshInvites()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...ADMIN_INVITES_KEY, 'list', state ?? 'all'],
    queryFn: () => adminInvitesService.listInvites({ state: state ?? undefined, limit: INVITE_LIST_LIMIT })
  })
  return {
    invites: data?.invites ?? [],
    totals: { ...EMPTY_TOTALS, ...(data?.totals ?? {}) },
    loading: isLoading,
    error: error ?? null,
    retry: refetch,
    reload
  }
}

const IDLE = Object.freeze({ status: 'idle', results: null, left: null, error: null })

/** The lines worth checking, as one key; empty when there is nothing the API would take. */
const checkKey = (addresses, cohort) =>
  addresses.length > 0 && addresses.length <= MAX_BATCH && isValidCohort(cohort) ? JSON.stringify([addresses, cohort]) : ''

/**
 * @param {{addresses: string[], cohort: string, expiresInDays: number, locale: string,
 *   run?: (action: string, call: () => Promise<any>) => Promise<any>, delayMs?: number}} options
 *   `run` is the re-sign-in runner (`useReauthRetry().run`); without it the call is made as is.
 */
export function useInviteDryRun({ addresses, cohort, expiresInDays, locale, run, delayMs = DRY_RUN_DELAY_MS }) {
  const [state, setState] = useState(IDLE)
  const key = checkKey(addresses, cohort)
  const latest = useRef({})
  latest.current = { addresses, cohort, expiresInDays, locale, run, key }
  const sequence = useRef(0)
  const timer = useRef(null)
  const checkedKey = useRef('')

  const check = useCallback(async () => {
    clearTimeout(timer.current)
    timer.current = null
    const current = latest.current
    if (!current.key) return
    const id = ++sequence.current
    checkedKey.current = current.key
    setState((previous) => ({ ...previous, status: 'checking', error: null }))
    const call = () =>
      adminInvitesService.sendBatch({
        addresses: current.addresses,
        cohort: current.cohort,
        expiresInDays: current.expiresInDays,
        locale: current.locale,
        dryRun: true
      })
    try {
      const data = await (current.run ? current.run('check', call) : call())
      if (id === sequence.current)
        setState({ status: 'done', results: data?.results ?? [], left: data?.invitations_left_today ?? null, error: null })
    } catch (error) {
      if (id !== sequence.current) return
      checkedKey.current = ''
      setState(isReauthCancelled(error) ? IDLE : { ...IDLE, status: 'error', error })
    }
  }, [])

  useEffect(() => {
    if (!key) {
      sequence.current++
      checkedKey.current = ''
      setState(IDLE)
      return undefined
    }
    timer.current = setTimeout(check, delayMs)
    return () => clearTimeout(timer.current)
  }, [key, check, delayMs])

  /** Check now (the field lost focus), unless these lines were already checked. */
  const flush = useCallback(async () => {
    if (latest.current.key && latest.current.key !== checkedKey.current) await check()
  }, [check])

  const reset = useCallback(() => {
    sequence.current++
    checkedKey.current = ''
    setState(IDLE)
  }, [])

  return { ...state, flush, reset }
}
