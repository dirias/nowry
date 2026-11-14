/**
 * WAIT-002 / WAIT-006 — the Waitlist tab's data: the list by state and
 * language, the waiting count on the tab, and inviting ticked rows through the
 * re-sign-in, then reading the waitlist and the invitations again.
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useWaitingCount, useWaitlist, useWaitlistInvite } from './useAdminWaitlist'
import { reauthCancelled } from '../domain/recentSignIn'

jest.mock('../api/services/adminWaitlist.service', () => ({
  WAITLIST_LIST_LIMIT: 200,
  adminWaitlistService: { listWaitlist: jest.fn() }
}))
jest.mock('../api/services/adminInvites.service', () => ({
  INVITE_LIST_LIMIT: 200,
  adminInvitesService: { sendBatch: jest.fn() }
}))
const { adminWaitlistService } = require('../api/services/adminWaitlist.service')
const { adminInvitesService } = require('../api/services/adminInvites.service')

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapperFor = (client) => {
  // eslint-disable-next-line react/display-name
  return ({ children }) => React.createElement(QueryClientProvider, { client }, children)
}

const LIST = {
  rows: [{ id: 'w1', email: 'a@x.com', status: 'waiting' }],
  totals: { waiting: 37, invited: 12, joined: 9, left: 2 },
  locales: { es: 20 },
  sources: ['/']
}

describe('useWaitlist', () => {
  it('lists by state and language, as many rows as the API allows', async () => {
    adminWaitlistService.listWaitlist.mockResolvedValue(LIST)
    const { result, rerender } = renderHook((filters) => useWaitlist(filters), {
      wrapper: wrapperFor(makeClient()),
      initialProps: { state: 'waiting', locale: null }
    })
    await waitFor(() => expect(result.current.rows).toEqual(LIST.rows))
    expect(adminWaitlistService.listWaitlist).toHaveBeenCalledWith({ state: 'waiting', locale: undefined, limit: 200 })
    expect(result.current.totals).toEqual(LIST.totals)
    rerender({ state: 'invited', locale: 'es' })
    await waitFor(() => expect(adminWaitlistService.listWaitlist).toHaveBeenLastCalledWith({ state: 'invited', locale: 'es', limit: 200 }))
  })

  it('reads zero for a state the answer left out, and says when it could not read', async () => {
    adminWaitlistService.listWaitlist.mockResolvedValueOnce({ rows: [], totals: { waiting: 1 } })
    const { result } = renderHook(() => useWaitlist({ state: 'waiting' }), { wrapper: wrapperFor(makeClient()) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totals).toEqual({ waiting: 1, invited: 0, joined: 0, left: 0 })

    adminWaitlistService.listWaitlist.mockRejectedValue(new Error('down'))
    const failing = renderHook(() => useWaitlist({ state: 'left' }), { wrapper: wrapperFor(makeClient()) })
    await waitFor(() => expect(failing.result.current.error).toBeTruthy())
    expect(failing.result.current.rows).toEqual([])
  })
})

describe('useWaitingCount', () => {
  it('reads how many are waiting, in any language, with one row', async () => {
    adminWaitlistService.listWaitlist.mockResolvedValue(LIST)
    const { result } = renderHook(() => useWaitingCount(), { wrapper: wrapperFor(makeClient()) })
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toBe(37))
    expect(adminWaitlistService.listWaitlist).toHaveBeenCalledWith({ state: 'waiting', limit: 1 })
  })
})

describe('useWaitlistInvite', () => {
  const SENT = { dry_run: false, results: [{ input: 'a@x.com', outcome: 'sent' }], invitations_left_today: 63 }
  let passThrough
  beforeEach(() => {
    passThrough = jest.fn((action, call) => call())
  })

  it('sends the ticked rows by id through the runner, then reads again', async () => {
    adminInvitesService.sendBatch.mockResolvedValue(SENT)
    const client = makeClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useWaitlistInvite({ run: passThrough }), { wrapper: wrapperFor(client) })
    let sent
    await act(async () => {
      sent = await result.current.invite({ ids: ['w1'], cohort: 'c1-waitlist', expiresInDays: 14 })
    })
    expect(sent).toBe(true)
    expect(passThrough).toHaveBeenCalledWith('send', expect.any(Function))
    expect(adminInvitesService.sendBatch).toHaveBeenCalledWith({
      waitlistIds: ['w1'],
      cohort: 'c1-waitlist',
      expiresInDays: 14,
      dryRun: false
    })
    expect(result.current.outcome).toEqual({ kind: 'sent', results: SENT.results })
    expect(result.current.sending).toBe(false)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'waitlist'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'invites'] })
  })

  it('says over budget when the batch is refused whole', async () => {
    adminInvitesService.sendBatch.mockRejectedValue({
      response: { status: 409, data: { detail: { code: 'over_budget', needed: 3, left: 1 } } }
    })
    const { result } = renderHook(() => useWaitlistInvite({ run: passThrough }), { wrapper: wrapperFor(makeClient()) })
    let sent
    await act(async () => {
      sent = await result.current.invite({ ids: ['w1', 'w2', 'w3'], cohort: 'c1-waitlist', expiresInDays: 14 })
    })
    expect(sent).toBe(false)
    expect(result.current.outcome).toEqual({ kind: 'overBudget', needed: 3, left: 1 })
  })

  it('says nothing when the re-sign-in was cancelled, and works without a runner', async () => {
    adminInvitesService.sendBatch.mockRejectedValueOnce(reauthCancelled())
    const { result } = renderHook(() => useWaitlistInvite({}), { wrapper: wrapperFor(makeClient()) })
    await act(async () => {
      await result.current.invite({ ids: ['w1'], cohort: 'c1-waitlist', expiresInDays: 14 })
    })
    expect(result.current.outcome).toBeNull()

    adminInvitesService.sendBatch.mockRejectedValueOnce(new Error('down'))
    await act(async () => {
      await result.current.invite({ ids: ['w1'], cohort: 'c1-waitlist', expiresInDays: 14 })
    })
    expect(result.current.outcome).toEqual({ kind: 'failed' })
    act(() => result.current.reset())
    expect(result.current.outcome).toBeNull()
  })
})
