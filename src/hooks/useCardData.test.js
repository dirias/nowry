/**
 * useCardData — MGMT-002 (PRD D15). The untagged filter is part of the key,
 * and `reload()` still invalidates every variant.
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useCardData } from './useCardData'

const mockGet = jest.fn()
const mockInvalidate = jest.fn()
jest.mock('../api/client', () => ({ apiClient: { get: (...args) => mockGet(...args) } }))
jest.mock('../api/queryClient', () => ({ queryClient: { invalidateQueries: (...args) => mockInvalidate(...args) } }))
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ data: { cards: [], total: 0, has_more: false } })
  mockInvalidate.mockReset()
})

it('keys the untagged list apart from the plain one and asks the server for it', async () => {
  const { client, wrapper } = makeWrapper()

  const { result, rerender } = renderHook(({ untagged }) => useCardData([], '', false, null, untagged), {
    wrapper,
    initialProps: { untagged: false }
  })
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(mockGet.mock.calls[0][0]).not.toMatch(/untagged/)

  rerender({ untagged: true })
  await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2))
  expect(mockGet.mock.calls[1][0]).toMatch(/untagged=true/)

  const keys = client
    .getQueryCache()
    .findAll({ queryKey: ['cards', 'user-1'] })
    .map((query) => query.queryKey[2].untagged)
  expect(keys.sort()).toEqual([false, true])
})

it('reload() invalidates every filter variant for the user', async () => {
  const { wrapper } = makeWrapper()
  const { result } = renderHook(() => useCardData(['verbs'], '', false, null, true), { wrapper })
  await waitFor(() => expect(result.current.loading).toBe(false))

  await result.current.reload()
  expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['cards', 'user-1'] })
})
