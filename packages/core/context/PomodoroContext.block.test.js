/**
 * PLAN-006 — Focus is the block's clock (PRD D7, ADR-045 §7).
 *
 * A block runs for its own length, named after it; its end is kept or not,
 * and either writes the log; a block cut short after a minute is partial; a
 * focus session started free becomes a kept focus block on the record.
 */
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { configureTestPlatform, resetPlatform } from '../platform/testing'

const mockSetLog = jest.fn()
const mockCreate = jest.fn()
jest.mock('../api/services/blocks.service', () => ({
  blocksService: { setLog: (...args) => mockSetLog(...args), create: (...args) => mockCreate(...args) }
}))
jest.mock('../api/queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() } }))
jest.mock('../hooks/useUserProfile', () => ({ useUserProfile: () => ({ profile: null }) }))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, params) => (params?.title ? `${key}:${params.title}` : key) }) }))

const { PomodoroProvider, usePomodoro } = require('./PomodoroContext')

const wrapper = ({ children }) => React.createElement(PomodoroProvider, null, children)
const occurrence = {
  blockId: 'b1',
  date: '2026-10-15',
  start: '07:30',
  lengthMin: 20,
  title: 'Morning review',
  block: { id: 'b1', source: { type: 'study', id: null } }
}

const minutes = (n) => n * 60 * 1000

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(2026, 9, 15, 7, 30))
  configureTestPlatform()
  mockSetLog.mockReset().mockResolvedValue({})
  mockCreate.mockReset().mockResolvedValue({ id: 'free-1' })
})

afterEach(() => {
  resetPlatform()
  jest.useRealTimers()
})

it('runs a block for its own length, named after it, with the sheet open', () => {
  const { result } = renderHook(() => usePomodoro(), { wrapper })

  act(() => result.current.startBlock(occurrence))

  expect(result.current.block).toMatchObject({ blockId: 'b1', date: '2026-10-15', title: 'Morning review', sourceType: 'study' })
  expect(result.current.totalSeconds).toBe(20 * 60)
  expect(result.current.isActive).toBe(true)
  expect(result.current.showWidget).toBe(true)
})

it('kept at the end logs the block with its minutes and what it produced, then puts the timer away', () => {
  const { result } = renderHook(() => usePomodoro(), { wrapper })
  act(() => result.current.startBlock(occurrence))
  act(() => {
    jest.advanceTimersByTime(minutes(20) + 500)
  })
  expect(result.current.isEnded).toBe(true)

  act(() => result.current.keepBlock({ record: { studySessionId: 's1', cards: 27 } }))

  expect(mockSetLog).toHaveBeenCalledWith(
    'b1',
    '2026-10-15',
    expect.objectContaining({ status: 'kept', minutes: 20, record: { studySessionId: 's1', cards: 27 } })
  )
  expect(result.current.block).toBeNull()
  expect(result.current.isEnded).toBe(false)
  expect(result.current.showWidget).toBe(false)
})

it('not kept logs a skip with no minutes', () => {
  const { result } = renderHook(() => usePomodoro(), { wrapper })
  act(() => result.current.startBlock(occurrence))
  act(() => {
    jest.advanceTimersByTime(minutes(20) + 500)
  })

  act(() => result.current.skipBlock())

  expect(mockSetLog).toHaveBeenCalledWith('b1', '2026-10-15', expect.objectContaining({ status: 'skipped', minutes: 0 }))
  expect(mockCreate).not.toHaveBeenCalled()
})

it('a block cut short after a minute is partial; sooner it was a false start', () => {
  const { result } = renderHook(() => usePomodoro(), { wrapper })
  act(() => result.current.startBlock(occurrence))
  act(() => {
    jest.advanceTimersByTime(30 * 1000)
  })
  act(() => result.current.resetTimer())
  expect(mockSetLog).not.toHaveBeenCalled()
  expect(result.current.block).toBeNull()

  act(() => result.current.startBlock(occurrence))
  act(() => {
    jest.advanceTimersByTime(minutes(2) + 500)
  })
  act(() => result.current.resetTimer())
  expect(mockSetLog).toHaveBeenCalledWith('b1', '2026-10-15', expect.objectContaining({ status: 'partial', minutes: 2 }))
})

it('a focus session started free becomes a kept focus block on today, once it ends', async () => {
  const { result } = renderHook(() => usePomodoro(), { wrapper })
  act(() => result.current.startTimer())
  const length = result.current.totalSeconds
  act(() => {
    jest.advanceTimersByTime(length * 1000 + 500)
  })
  expect(result.current.isEnded).toBe(true)

  await act(async () => {
    result.current.stopAfterEnd()
    await Promise.resolve()
  })

  expect(mockCreate).toHaveBeenCalledWith({
    title: 'blocks.free.title',
    source: { type: 'focus', id: null },
    start: '07:30',
    lengthMin: 25,
    daysOfWeek: [],
    date: '2026-10-15',
    reminderMin: null
  })
  await act(async () => {
    await Promise.resolve()
  })
  expect(mockSetLog).toHaveBeenCalledWith('free-1', '2026-10-15', expect.objectContaining({ status: 'kept', minutes: 25 }))
})
