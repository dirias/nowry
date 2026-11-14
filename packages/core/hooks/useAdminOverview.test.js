/**
 * ADMIN-007c — the Overview's data and the admin log's pages (FR-011, boards A and K):
 * one read for the Overview; the log by kind, older pages by `before`.
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminLog, useAdminOverview } from './useAdminOverview'

jest.mock('../api/services/adminOverview.service', () => ({
  ADMIN_LOG_PAGE: 50,
  adminOverviewService: { getOverview: jest.fn(), listActions: jest.fn() }
}))
const { adminOverviewService } = require('../api/services/adminOverview.service')

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapperFor = (client) => {
  // eslint-disable-next-line react/display-name
  return ({ children }) => React.createElement(QueryClientProvider, { client }, children)
}

describe('useAdminOverview', () => {
  it('reads the Overview once', async () => {
    const data = { needs: {}, emails_today: {}, recent_actions: [{ id: 'a1' }] }
    adminOverviewService.getOverview.mockResolvedValue(data)
    const { result } = renderHook(() => useAdminOverview(), { wrapper: wrapperFor(makeClient()) })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.overview).toEqual(data))
    expect(result.current.error).toBeNull()
  })

  it('says when it could not read, and reads again on retry', async () => {
    adminOverviewService.getOverview.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ needs: {} })
    const { result } = renderHook(() => useAdminOverview(), { wrapper: wrapperFor(makeClient()) })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.overview).toBeNull()
    await act(async () => {
      await result.current.retry()
    })
    await waitFor(() => expect(result.current.overview).toEqual({ needs: {} }))
  })
})

describe('useAdminLog', () => {
  it('reads every kind by default, then one kind', async () => {
    adminOverviewService.listActions.mockResolvedValue({ actions: [{ id: 'a1' }], next_before: null })
    const { result, rerender } = renderHook((props) => useAdminLog(props), { wrapper: wrapperFor(makeClient()), initialProps: {} })
    await waitFor(() => expect(result.current.actions).toEqual([{ id: 'a1' }]))
    expect(adminOverviewService.listActions).toHaveBeenCalledWith({ kind: undefined, before: undefined, limit: 50 })
    expect(result.current.hasOlder).toBe(false)
    rerender({ kind: 'invitations' })
    await waitFor(() =>
      expect(adminOverviewService.listActions).toHaveBeenLastCalledWith({ kind: 'invitations', before: undefined, limit: 50 })
    )
  })

  it('ignores a kind the log does not know', async () => {
    adminOverviewService.listActions.mockResolvedValue({ actions: [], next_before: null })
    const { result } = renderHook(() => useAdminLog({ kind: 'all' }), { wrapper: wrapperFor(makeClient()) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(adminOverviewService.listActions).toHaveBeenCalledWith({ kind: undefined, before: undefined, limit: 50 })
  })

  it('reads older rows with next_before and appends them', async () => {
    adminOverviewService.listActions
      .mockResolvedValueOnce({ actions: [{ id: 'a1' }, { id: 'a2' }], next_before: 'a2' })
      .mockResolvedValueOnce({ actions: [{ id: 'a3' }], next_before: null })
    const { result } = renderHook(() => useAdminLog({ kind: 'bugs' }), { wrapper: wrapperFor(makeClient()) })
    await waitFor(() => expect(result.current.hasOlder).toBe(true))
    await act(async () => {
      await result.current.loadOlder()
    })
    await waitFor(() => expect(result.current.actions.map((a) => a.id)).toEqual(['a1', 'a2', 'a3']))
    expect(adminOverviewService.listActions).toHaveBeenLastCalledWith({ kind: 'bugs', before: 'a2', limit: 50 })
    expect(result.current.hasOlder).toBe(false)
    expect(result.current.loadingOlder).toBe(false)
  })

  it('says when it could not read', async () => {
    adminOverviewService.listActions.mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useAdminLog({}), { wrapper: wrapperFor(makeClient()) })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.actions).toEqual([])
    expect(typeof result.current.retry).toBe('function')
  })
})
