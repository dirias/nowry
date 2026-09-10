/**
 * The session's queue, read through the cache that survives a lost signal.
 *
 * Written after the offline pass: the session fetched its cards directly, so
 * the persisted query cache — the entire mechanism that makes offline study
 * possible — did not apply to the one screen that needs it most. Airplane mode
 * produced "Couldn't load cards" over a queue that was already on the device.
 */
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockGetDue = jest.fn()
const mockGetDaily = jest.fn()

jest.mock('../api/services', () => ({
  cardsService: {
    getDueCards: (...args) => mockGetDue(...args),
    getDailyReviewCards: (...args) => mockGetDaily(...args)
  }
}))
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
jest.mock('../api/queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() } }))

const { DAILY_REVIEW, useSessionCards } = require('./useSessionCards')

const wrapper = ({ children }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return React.createElement(QueryClientProvider, { client }, children)
}

beforeEach(() => {
  mockGetDue.mockReset().mockResolvedValue([{ _id: 'c1' }])
  mockGetDaily.mockReset().mockResolvedValue([{ _id: 'c2' }])
})

it('asks the deck endpoint for a deck', async () => {
  const { result } = renderHook(() => useSessionCards({ deckId: 'd1' }), { wrapper })

  await waitFor(() => expect(result.current.cards).toEqual([{ _id: 'c1' }]))
  expect(mockGetDue).toHaveBeenCalledWith('d1')
  expect(mockGetDaily).not.toHaveBeenCalled()
})

it('asks the daily-review endpoint for the sentinel, and passes the narrowing', async () => {
  const { result } = renderHook(() => useSessionCards({ deckId: DAILY_REVIEW, tags: ['verbs'], group: undefined, limit: 10 }), { wrapper })

  await waitFor(() => expect(result.current.cards).toEqual([{ _id: 'c2' }]))
  expect(mockGetDaily).toHaveBeenCalledWith({ limit: 10, tags: ['verbs'], group: undefined })
})

it('prefers cards it already has over an error', async () => {
  // This is the offline case: a refetch fails, the cache still has the queue,
  // and showing "Couldn't load cards" over it is the bug this replaced.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const withClient = ({ children }) => React.createElement(QueryClientProvider, { client }, children)

  const first = renderHook(() => useSessionCards({ deckId: 'd1' }), { wrapper: withClient })
  await waitFor(() => expect(first.result.current.cards).toEqual([{ _id: 'c1' }]))

  mockGetDue.mockRejectedValue(new Error('offline'))
  await client.refetchQueries()

  expect(first.result.current.cards).toEqual([{ _id: 'c1' }])
  expect(first.result.current.error).toBeNull()
})

it('reports an error only when it has nothing to show', async () => {
  mockGetDue.mockRejectedValue(new Error('offline'))
  const { result } = renderHook(() => useSessionCards({ deckId: 'd1' }), { wrapper })

  await waitFor(() => expect(result.current.error).toBeTruthy())
  expect(result.current.cards).toBeNull()
})

it("keeps a tag's session and the whole day's apart", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const withClient = ({ children }) => React.createElement(QueryClientProvider, { client }, children)

  const all = renderHook(() => useSessionCards({ deckId: DAILY_REVIEW }), { wrapper: withClient })
  await waitFor(() => expect(all.result.current.cards).toBeTruthy())

  mockGetDaily.mockResolvedValue([{ _id: 'tagged' }])
  const tagged = renderHook(() => useSessionCards({ deckId: DAILY_REVIEW, tags: ['verbs'] }), { wrapper: withClient })

  // A different narrowing is a different queue, not the same one from cache.
  await waitFor(() => expect(tagged.result.current.cards).toEqual([{ _id: 'tagged' }]))
})
