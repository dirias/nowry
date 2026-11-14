/**
 * ADMIN-007a — the Invitations tab's data: the cohorts and today's budget,
 * the list by state, and the dry run that checks pasted lines as they change.
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useInviteCohorts, useInviteDryRun, useInviteList } from './useAdminInvites'

jest.mock('../api/services/adminInvites.service', () => ({
  INVITE_LIST_LIMIT: 200,
  adminInvitesService: { getCohorts: jest.fn(), listInvites: jest.fn(), sendBatch: jest.fn() }
}))
const { adminInvitesService } = require('../api/services/adminInvites.service')

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // eslint-disable-next-line react/display-name
  return ({ children }) => React.createElement(QueryClientProvider, { client }, children)
}

describe('useInviteCohorts', () => {
  it('reads the cohorts once', async () => {
    adminInvitesService.getCohorts.mockResolvedValue({ cohorts: ['c1-waitlist', 'friends'], invitations_left_today: 64 })
    const { result } = renderHook(() => useInviteCohorts(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data?.cohorts).toEqual(['c1-waitlist', 'friends']))
    expect(result.current.loading).toBe(false)
  })
})

describe('useInviteList', () => {
  it('lists by state, all states when none is chosen', async () => {
    adminInvitesService.listInvites.mockResolvedValue({
      invites: [{ id: '1' }],
      counts: {},
      totals: { open: 1, used: 0, expired: 0, revoked: 0 }
    })
    const { result, rerender } = renderHook(({ state }) => useInviteList(state), { wrapper: makeWrapper(), initialProps: { state: null } })
    await waitFor(() => expect(result.current.invites).toEqual([{ id: '1' }]))
    expect(adminInvitesService.listInvites).toHaveBeenCalledWith({ state: undefined, limit: 200 })
    expect(result.current.totals.open).toBe(1)
    rerender({ state: 'open' })
    await waitFor(() => expect(adminInvitesService.listInvites).toHaveBeenLastCalledWith({ state: 'open', limit: 200 }))
  })

  it('reads again after a write', async () => {
    adminInvitesService.listInvites.mockResolvedValue({ invites: [], totals: {} })
    const { result } = renderHook(() => useInviteList('open'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.reload()
    })
    expect(adminInvitesService.listInvites).toHaveBeenCalledTimes(2)
  })

  it('says when the list could not be read', async () => {
    adminInvitesService.listInvites.mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useInviteList(null), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.invites).toEqual([])
  })
})

describe('useInviteDryRun', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  const settings = { cohort: 'c1-waitlist', expiresInDays: 14, locale: 'en' }

  it('checks the lines after a pause, as a dry run', async () => {
    adminInvitesService.sendBatch.mockResolvedValue({ results: [{ input: 'a@x.com', outcome: 'will_invite' }], invitations_left_today: 9 })
    const { result } = renderHook(() => useInviteDryRun({ addresses: ['a@x.com'], ...settings }))
    expect(result.current.status).toBe('idle')
    await act(async () => {
      jest.advanceTimersByTime(700)
    })
    await waitFor(() => expect(result.current.status).toBe('done'))
    expect(result.current.results).toEqual([{ input: 'a@x.com', outcome: 'will_invite' }])
    expect(result.current.left).toBe(9)
    expect(adminInvitesService.sendBatch).toHaveBeenCalledWith({ addresses: ['a@x.com'], ...settings, dryRun: true })
  })

  it('checks at once on flush, and only the latest lines count', async () => {
    adminInvitesService.sendBatch.mockResolvedValue({ results: [], invitations_left_today: 1 })
    const { result, rerender } = renderHook((props) => useInviteDryRun(props), {
      initialProps: { addresses: ['a@x.com'], ...settings }
    })
    rerender({ addresses: ['b@x.com'], ...settings })
    await act(async () => {
      await result.current.flush()
    })
    expect(adminInvitesService.sendBatch).toHaveBeenCalledTimes(1)
    expect(adminInvitesService.sendBatch).toHaveBeenCalledWith(expect.objectContaining({ addresses: ['b@x.com'] }))
    await act(async () => {
      jest.advanceTimersByTime(700)
    })
    expect(adminInvitesService.sendBatch).toHaveBeenCalledTimes(1)
  })

  it('does not call with nothing to check, too many lines, or a bad cohort', async () => {
    const many = Array.from({ length: 51 }, (_, i) => `p${i}@x.com`)
    const { rerender, result } = renderHook((props) => useInviteDryRun(props), { initialProps: { addresses: [], ...settings } })
    rerender({ addresses: many, ...settings })
    rerender({ addresses: ['a@x.com'], ...settings, cohort: 'Bad Name' })
    await act(async () => {
      jest.advanceTimersByTime(2000)
      await result.current.flush()
    })
    expect(adminInvitesService.sendBatch).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  it('reports a failed check and goes through the given runner', async () => {
    const run = jest.fn((action, call) => call())
    adminInvitesService.sendBatch.mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useInviteDryRun({ addresses: ['a@x.com'], ...settings, run }))
    await act(async () => {
      await result.current.flush()
    })
    expect(run).toHaveBeenCalledWith('check', expect.any(Function))
    expect(result.current.status).toBe('error')
  })

  it('goes quiet when the runner was cancelled', async () => {
    const cancelled = Object.assign(new Error('cancelled'), { code: 'reauth_cancelled' })
    const run = jest.fn(() => Promise.reject(cancelled))
    const { result } = renderHook(() => useInviteDryRun({ addresses: ['a@x.com'], ...settings, run }))
    await act(async () => {
      await result.current.flush()
    })
    expect(result.current.status).toBe('idle')
  })
})
