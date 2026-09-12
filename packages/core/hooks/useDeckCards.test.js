/**
 * useDeckCards — MOB-078. Every card in one deck, for a screen that lists them.
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useDeckCards } from './useDeckCards'

const mockGet = jest.fn()
jest.mock('../api/client', () => ({ apiClient: { get: (...args) => mockGet(...args) } }))
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

beforeEach(() => mockGet.mockReset())

it('asks for the deck without the due filter, which is what Browse asks for', async () => {
  mockGet.mockResolvedValue({ data: { cards: [{ _id: 'c1' }, { _id: 'c2' }] } })
  const { client, wrapper } = makeWrapper()

  const { result } = renderHook(() => useDeckCards('deck-9'), { wrapper })
  await waitFor(() => expect(result.current.loading).toBe(false))

  expect(result.current.cards).toHaveLength(2)
  const [url] = mockGet.mock.calls[0]
  expect(url).toContain('deck_id=deck-9')
  expect(url).toContain('due_only=false')
  expect(client.getQueryCache().findAll({ queryKey: ['cards', 'deck', 'deck-9', 'user-1'] })).toHaveLength(1)
})

it('holds null until the answer arrives, so a screen can tell empty from unknown', async () => {
  mockGet.mockResolvedValue({ data: { cards: [] } })
  const { wrapper } = makeWrapper()

  const { result } = renderHook(() => useDeckCards('deck-9'), { wrapper })
  expect(result.current.cards).toBeNull()
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.cards).toEqual([])
})

it('asks for nothing without a deck', async () => {
  const { wrapper } = makeWrapper()
  renderHook(() => useDeckCards(null), { wrapper })
  expect(mockGet).not.toHaveBeenCalled()
})

it('defers while the caller says so', async () => {
  mockGet.mockResolvedValue({ data: { cards: [] } })
  const { wrapper } = makeWrapper()

  const { result, rerender } = renderHook(({ enabled }) => useDeckCards('deck-9', { enabled }), {
    wrapper,
    initialProps: { enabled: false }
  })
  expect(mockGet).not.toHaveBeenCalled()

  rerender({ enabled: true })
  await waitFor(() => expect(result.current.cards).toEqual([]))
  expect(mockGet).toHaveBeenCalledTimes(1)
})
