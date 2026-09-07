/**
 * useForecast — STUDY-002. Pins the key shape and that today is never asked for.
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useForecast } from './useForecast'

const mockGet = jest.fn()
jest.mock('../api/client', () => ({ apiClient: { get: (...args) => mockGet(...args) } }))
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

beforeEach(() => mockGet.mockReset())

it("asks for the coming days in the viewer's timezone and returns the payload as is", async () => {
  const payload = { days: [{ date: '2026-09-07', due: 18 }], total: 18 }
  mockGet.mockResolvedValue({ data: payload })
  const { wrapper } = makeWrapper()

  const { result } = renderHook(() => useForecast(7), { wrapper })
  await waitFor(() => expect(result.current.loading).toBe(false))

  expect(result.current.forecast).toEqual(payload)
  const url = mockGet.mock.calls[0][0]
  expect(url).toMatch(/^\/study-cards\/forecast\?days=7/)
  expect(url).toMatch(/tz=/)
})

it("keys the cache by user and days, so invalidating ['forecast', user] catches every horizon", async () => {
  mockGet.mockResolvedValue({ data: { days: [], total: 0 } })
  const { client, wrapper } = makeWrapper()

  renderHook(() => useForecast(14), { wrapper })
  await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['forecast', 'user-1'] })).toHaveLength(1))

  expect(client.getQueryCache().findAll({ queryKey: ['forecast', 'user-1', 14] })).toHaveLength(1)
})
