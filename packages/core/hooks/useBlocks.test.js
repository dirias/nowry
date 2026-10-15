/**
 * PLAN-002 — useBlocks and useBlockLog: the key family, the readers on the way
 * in, the API's names on the way out, and the tick's body.
 */
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useBlocks } from './useBlocks'
import { useBlockLog } from './useBlockLog'

const mockGet = jest.fn()
const mockPut = jest.fn()
const mockPost = jest.fn()
jest.mock('../api/client', () => ({
  apiClient: {
    get: (...args) => mockGet(...args),
    put: (...args) => mockPut(...args),
    post: (...args) => mockPost(...args),
    patch: jest.fn(),
    delete: jest.fn()
  }
}))
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

beforeEach(() => {
  mockGet.mockReset()
  mockPut.mockReset()
  mockPost.mockReset()
})

it('asks for the range, keys the cache by user and range, and reads the API names once', async () => {
  mockGet.mockResolvedValue({
    data: {
      blocks: [
        { id: 'b1', title: 'Morning review', source: { type: 'study' }, start: '07:30', length_min: 20, days_of_week: [0, 1, 2, 3, 4] }
      ],
      occurrences: [
        {
          date: '2026-10-15',
          block_id: 'b1',
          start: '07:30',
          length_min: 20,
          log: { id: 'l1', block_id: 'b1', date: '2026-10-15', status: 'kept', minutes: 18 }
        }
      ],
      migrated: { blocks: 1, logs: 1 }
    }
  })
  const { client, wrapper } = makeWrapper()

  const { result } = renderHook(() => useBlocks({ from: '2026-10-15', to: '2026-10-15' }), { wrapper })
  await waitFor(() => expect(result.current.loading).toBe(false))

  expect(mockGet).toHaveBeenCalledWith('/blocks', { params: { from: '2026-10-15', to: '2026-10-15' } })
  expect(client.getQueryCache().findAll({ queryKey: ['blocks', 'user-1', '2026-10-15', '2026-10-15'] })).toHaveLength(1)
  expect(result.current.blocks[0]).toMatchObject({ id: 'b1', lengthMin: 20, daysOfWeek: [0, 1, 2, 3, 4] })
  const [occurrence] = result.current.occurrences
  expect(occurrence).toMatchObject({ blockId: 'b1', lengthMin: 20, log: { status: 'kept', minutes: 18 } })
  expect(occurrence.block.title).toBe('Morning review')
  expect(result.current.migrated).toEqual({ blocks: 1, logs: 1 })
})

it('creates with the API names and never leaks a camelCase key', async () => {
  mockPost.mockResolvedValue({ data: { id: 'b2', title: 'Run', start: '17:30', length_min: 30, days_of_week: [0, 2, 4] } })
  const { wrapper } = makeWrapper()
  const { result } = renderHook(() => useBlocks({ from: '2026-10-12', to: '2026-10-18' }), { wrapper })

  await act(async () => {
    await result.current.create({
      title: 'Run',
      source: { type: 'goal', id: 'g' },
      start: '17:30',
      lengthMin: 30,
      daysOfWeek: [0, 2, 4],
      reminderMin: 15
    })
  })
  expect(mockPost).toHaveBeenCalledWith('/blocks', {
    title: 'Run',
    source: { type: 'goal', id: 'g' },
    start: '17:30',
    length_min: 30,
    days_of_week: [0, 2, 4],
    reminder_min: 15
  })
})

it('the tick writes a kept row with the block’s minutes; skip writes zero', async () => {
  mockPut.mockResolvedValue({ data: { id: 'l', block_id: 'b1', date: '2026-10-15', status: 'kept', minutes: 20 } })
  const { wrapper } = makeWrapper()
  const { result } = renderHook(() => useBlockLog(), { wrapper })
  const occurrence = { blockId: 'b1', date: '2026-10-15', lengthMin: 20 }

  await act(async () => {
    await result.current.keep(occurrence, { record: { studySessionId: 's1', cards: 27 } })
  })
  expect(mockPut).toHaveBeenCalledWith('/blocks/b1/log/2026-10-15', {
    status: 'kept',
    started_at: null,
    ended_at: null,
    minutes: 20,
    record: { study_session_id: 's1', cards: 27 }
  })

  await act(async () => {
    await result.current.skip(occurrence)
  })
  expect(mockPut.mock.calls[1][1]).toMatchObject({ status: 'skipped', minutes: 0 })
})
