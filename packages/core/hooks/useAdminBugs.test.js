/**
 * ADMIN-007b — the Bug reports tab's data (FR-011 Bug reports, board C): one
 * state's reports, the counts per state and the new count on the tab, and Save
 * through the re-sign-in, then reading the list again.
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBugCounts, useBugList, useBugSave, useNewBugCount } from './useAdminBugs'
import { reauthCancelled } from '../domain/recentSignIn'

jest.mock('../api/services/bugs.service', () => ({
  BUG_LIST_LIMIT: 100,
  bugsService: { list: jest.fn(), stats: jest.fn(), updateStatus: jest.fn() }
}))
const { bugsService } = require('../api/services/bugs.service')

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapperFor = (client) => {
  // eslint-disable-next-line react/display-name
  return ({ children }) => React.createElement(QueryClientProvider, { client }, children)
}

const BUG = { id: 'b1', title: 'Flip', status: 'new' }

describe('useBugList', () => {
  it('reads one state, New by default', async () => {
    bugsService.list.mockResolvedValue([BUG])
    const { result, rerender } = renderHook((props) => useBugList(props), { wrapper: wrapperFor(makeClient()), initialProps: {} })
    await waitFor(() => expect(result.current.bugs).toEqual([BUG]))
    expect(bugsService.list).toHaveBeenCalledWith({ status: 'new', limit: 100 })
    rerender({ status: 'fixed' })
    await waitFor(() => expect(bugsService.list).toHaveBeenLastCalledWith({ status: 'fixed', limit: 100 }))
  })

  it('says when it could not read', async () => {
    bugsService.list.mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useBugList({ status: 'new' }), { wrapper: wrapperFor(makeClient()) })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.bugs).toEqual([])
  })
})

describe('the counts', () => {
  it('reads every state and the new count', async () => {
    bugsService.stats.mockResolvedValue({ by_status: { new: 3, in_progress: 1, fixed: 14, wont_fix: 2 } })
    const client = makeClient()
    const counts = renderHook(() => useBugCounts(), { wrapper: wrapperFor(client) })
    const fresh = renderHook(() => useNewBugCount(), { wrapper: wrapperFor(client) })
    expect(fresh.result.current).toBeNull()
    await waitFor(() => expect(fresh.result.current).toBe(3))
    await waitFor(() => expect(counts.result.current).toEqual({ new: 3, in_progress: 1, fixed: 14, wont_fix: 2 }))
  })
})

describe('useBugSave', () => {
  const setup = (run) => {
    const client = makeClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const hook = renderHook(() => useBugSave({ run }), { wrapper: wrapperFor(client) })
    return { ...hook, invalidate }
  }

  it('says there is nothing to save, and sends nothing', async () => {
    const { result } = setup()
    let saved
    await act(async () => {
      saved = await result.current.save(BUG, { status: 'new', note: ' ' })
    })
    expect(saved).toBe(false)
    expect(bugsService.updateStatus).not.toHaveBeenCalled()
    expect(result.current.outcome).toEqual({ kind: 'nothing' })
  })

  it('saves through the runner and reads the list again', async () => {
    bugsService.updateStatus.mockResolvedValue({ ...BUG, status: 'fixed' })
    const run = jest.fn((action, call) => call())
    const { result, invalidate } = setup(run)
    let saved
    await act(async () => {
      saved = await result.current.save(BUG, { status: 'fixed', note: 'Done' })
    })
    expect(saved).toBe(true)
    expect(run).toHaveBeenCalledWith('saveBug', expect.any(Function))
    expect(bugsService.updateStatus).toHaveBeenCalledWith('b1', { status: 'fixed', note: 'Done' })
    expect(result.current.outcome).toEqual({ kind: 'saved' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'bugs'] })
    act(() => result.current.reset())
    expect(result.current.outcome).toBeNull()
  })

  it('saves without a runner too', async () => {
    bugsService.updateStatus.mockResolvedValue(BUG)
    const { result } = setup()
    await act(async () => {
      await result.current.save(BUG, { note: 'Seen' })
    })
    expect(bugsService.updateStatus).toHaveBeenCalledWith('b1', { note: 'Seen' })
  })

  it('says nothing when the sign-in was cancelled, notFound for a gone report, failed otherwise', async () => {
    const { result, invalidate } = setup((action, call) => call())
    bugsService.updateStatus.mockRejectedValueOnce(reauthCancelled())
    await act(async () => {
      await result.current.save(BUG, { status: 'fixed' })
    })
    expect(result.current.outcome).toBeNull()

    bugsService.updateStatus.mockRejectedValueOnce({ response: { status: 404 } })
    await act(async () => {
      await result.current.save(BUG, { status: 'fixed' })
    })
    expect(result.current.outcome).toEqual({ kind: 'notFound' })
    expect(invalidate).toHaveBeenCalled()

    bugsService.updateStatus.mockRejectedValueOnce(new Error('down'))
    await act(async () => {
      await result.current.save(BUG, { status: 'fixed' })
    })
    expect(result.current.outcome).toEqual({ kind: 'failed' })
  })
})
