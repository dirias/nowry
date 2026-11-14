/**
 * ADMIN-003 — the Moderation tab's data (FR-004, FR-011 Moderation, board B):
 * the queue by state with its totals, the to-review count on the tab, and
 * keep / unpublish through the re-sign-in, then reading the queue again.
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useModerationAction, useModerationQueue, useToReviewCount } from './useAdminModeration'
import { reauthCancelled } from '../domain/recentSignIn'

jest.mock('../api/services/adminModeration.service', () => ({
  MODERATION_QUEUE_LIMIT: 100,
  adminModerationService: { listQueue: jest.fn(), keep: jest.fn(), remove: jest.fn() }
}))
const { adminModerationService } = require('../api/services/adminModeration.service')

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapperFor = (client) => {
  // eslint-disable-next-line react/display-name
  return ({ children }) => React.createElement(QueryClientProvider, { client }, children)
}

const ITEM = { content_type: 'deck', content_id: 'd1', title: 'JLPT', public_copies: 1, reports: [] }
const QUEUE = { items: [ITEM], totals: { to_review: 2, kept: 5, removed: 1 } }

describe('useModerationQueue', () => {
  it('reads one state, as many items as the API allows', async () => {
    adminModerationService.listQueue.mockResolvedValue(QUEUE)
    const { result, rerender } = renderHook((props) => useModerationQueue(props), {
      wrapper: wrapperFor(makeClient()),
      initialProps: { state: 'to_review' }
    })
    await waitFor(() => expect(result.current.items).toEqual(QUEUE.items))
    expect(adminModerationService.listQueue).toHaveBeenCalledWith({ state: 'to_review', limit: 100 })
    expect(result.current.totals).toEqual(QUEUE.totals)
    rerender({ state: 'removed' })
    await waitFor(() => expect(adminModerationService.listQueue).toHaveBeenLastCalledWith({ state: 'removed', limit: 100 }))
  })

  it('reads zero for a state the answer left out, and says when it could not read', async () => {
    adminModerationService.listQueue.mockResolvedValueOnce({ items: [], totals: { kept: 3 } })
    const { result } = renderHook(() => useModerationQueue({ state: 'kept' }), { wrapper: wrapperFor(makeClient()) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totals).toEqual({ to_review: 0, kept: 3, removed: 0 })

    adminModerationService.listQueue.mockRejectedValue(new Error('down'))
    const failing = renderHook(() => useModerationQueue({ state: 'removed' }), { wrapper: wrapperFor(makeClient()) })
    await waitFor(() => expect(failing.result.current.error).toBeTruthy())
    expect(failing.result.current.items).toEqual([])
  })
})

describe('useToReviewCount', () => {
  it('reads how many wait for review with one item', async () => {
    adminModerationService.listQueue.mockResolvedValue(QUEUE)
    const { result } = renderHook(() => useToReviewCount(), { wrapper: wrapperFor(makeClient()) })
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toBe(2))
    expect(adminModerationService.listQueue).toHaveBeenCalledWith({ state: 'to_review', limit: 1 })
  })
})

describe('useModerationAction', () => {
  let passThrough
  beforeEach(() => {
    passThrough = jest.fn((action, call) => call())
  })

  it('keeps an item public through the runner, says how many reports closed, then reads again', async () => {
    adminModerationService.keep.mockResolvedValue({ dismissed: 2 })
    const client = makeClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useModerationAction({ run: passThrough }), { wrapper: wrapperFor(client) })
    let done
    await act(async () => {
      done = await result.current.keep(ITEM)
    })
    expect(done).toBe(true)
    expect(passThrough).toHaveBeenCalledWith('keep', expect.any(Function))
    expect(adminModerationService.keep).toHaveBeenCalledWith('deck', 'd1')
    expect(result.current.outcome).toEqual({ kind: 'kept', closed: 2 })
    expect(result.current.busy).toBeNull()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'moderation'] })
  })

  it('unpublishes with the reason and note, and says what went and who was told', async () => {
    adminModerationService.remove.mockResolvedValue({
      removed: [{}, {}],
      copies_removed: 1,
      owners_told: 2,
      owners_not_told: 0
    })
    const { result } = renderHook(() => useModerationAction({ run: passThrough }), { wrapper: wrapperFor(makeClient()) })
    let done
    await act(async () => {
      done = await result.current.remove(ITEM, { reason: 'copyright', note: 'Copied' })
    })
    expect(done).toBe(true)
    expect(passThrough).toHaveBeenCalledWith('unpublish', expect.any(Function))
    expect(adminModerationService.remove).toHaveBeenCalledWith('deck', 'd1', { reason: 'copyright', note: 'Copied' })
    expect(result.current.outcome).toEqual({ kind: 'removed', count: 2, told: 2, notTold: 0 })
  })

  it('says an item was already removed or is gone, and reads the queue again', async () => {
    adminModerationService.remove.mockRejectedValueOnce({ response: { status: 409, data: { detail: { code: 'already_removed' } } } })
    const client = makeClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useModerationAction({ run: passThrough }), { wrapper: wrapperFor(client) })
    let done
    await act(async () => {
      done = await result.current.remove(ITEM, { reason: 'spam' })
    })
    expect(done).toBe(true)
    expect(result.current.outcome).toEqual({ kind: 'alreadyRemoved' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'moderation'] })

    adminModerationService.keep.mockRejectedValueOnce({ response: { status: 404, data: { detail: { code: 'not_found' } } } })
    await act(async () => {
      await result.current.keep(ITEM)
    })
    expect(result.current.outcome).toEqual({ kind: 'notFound' })
  })

  it('says it failed, says nothing when the re-sign-in was cancelled, and works without a runner', async () => {
    adminModerationService.keep.mockRejectedValueOnce(reauthCancelled())
    const { result } = renderHook(() => useModerationAction({}), { wrapper: wrapperFor(makeClient()) })
    let done
    await act(async () => {
      done = await result.current.keep(ITEM)
    })
    expect(done).toBe(false)
    expect(result.current.outcome).toBeNull()

    adminModerationService.remove.mockRejectedValueOnce(new Error('down'))
    await act(async () => {
      await result.current.remove(ITEM, { reason: 'spam' })
    })
    expect(result.current.outcome).toEqual({ kind: 'failed' })
    act(() => result.current.reset())
    expect(result.current.outcome).toBeNull()
  })
})
