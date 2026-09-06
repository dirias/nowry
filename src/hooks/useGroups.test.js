/**
 * useGroups — STUDY-002. The Tags view index; deferrable until the segment is engaged.
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useGroups } from './useGroups'

const mockGet = jest.fn()
jest.mock('../api/client', () => ({ apiClient: { get: (...args) => mockGet(...args) } }))
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

beforeEach(() => mockGet.mockReset())

it('returns the system groups and the tags from one request, keyed by user', async () => {
  const payload = {
    system: [{ key: 'marked', cards: 6, decks: 3, due: 2, new: 1 }],
    tags: [{ tag: 'verbs', cards: 46, decks: 3, due: 9, new: 2 }]
  }
  mockGet.mockResolvedValue({ data: payload })
  const { client, wrapper } = makeWrapper()

  const { result } = renderHook(() => useGroups(), { wrapper })
  await waitFor(() => expect(result.current.loading).toBe(false))

  expect(result.current.groups).toEqual(payload)
  expect(mockGet).toHaveBeenCalledWith('/study-cards/groups')
  expect(client.getQueryCache().findAll({ queryKey: ['groups', 'user-1'] })).toHaveLength(1)
})

it('does not fetch until the caller enables it — the Tags segment, not the page, pays for the index', async () => {
  mockGet.mockResolvedValue({ data: { system: [], tags: [] } })
  const { wrapper } = makeWrapper()

  const { result, rerender } = renderHook(({ enabled }) => useGroups({ enabled }), { wrapper, initialProps: { enabled: false } })
  expect(mockGet).not.toHaveBeenCalled()

  rerender({ enabled: true })
  await waitFor(() => expect(result.current.groups).toEqual({ system: [], tags: [] }))
  expect(mockGet).toHaveBeenCalledTimes(1)
})
