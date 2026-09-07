/**
 * useDeckData — MGMT-002 (PRD D18, ADR-023 point 4). The archived list is its
 * own key, so the dashboard's plain call never sees an archived deck; one
 * `reload()` still refreshes both.
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useDeckData } from './useDeckData'

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
  mockGet.mockReset().mockResolvedValue({ data: [] })
  mockInvalidate.mockReset()
})

it('reads the active list by default and the archived list on its own key', async () => {
  const { client, wrapper } = makeWrapper()

  const active = renderHook(() => useDeckData(), { wrapper })
  const archived = renderHook(() => useDeckData(undefined, { archived: true }), { wrapper })
  await waitFor(() => expect(active.result.current.loading).toBe(false))
  await waitFor(() => expect(archived.result.current.loading).toBe(false))

  expect(mockGet).toHaveBeenCalledWith('/decks')
  expect(mockGet).toHaveBeenCalledWith('/decks?archived=true')
  expect(client.getQueryCache().findAll({ queryKey: ['decks', 'user-1', 'all', 'active'] })).toHaveLength(1)
  expect(client.getQueryCache().findAll({ queryKey: ['decks', 'user-1', 'all', 'archived'] })).toHaveLength(1)
  expect(client.getQueryCache().findAll({ queryKey: ['decks', 'user-1'] })).toHaveLength(2)
})

it('reload() from either side invalidates every deck variant for the user', async () => {
  const { wrapper } = makeWrapper()
  const { result } = renderHook(() => useDeckData(undefined, { archived: true }), { wrapper })
  await waitFor(() => expect(result.current.loading).toBe(false))

  await result.current.reload()
  expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['decks', 'user-1'] })
})
