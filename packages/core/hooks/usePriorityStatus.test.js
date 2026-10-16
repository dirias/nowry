/**
 * usePriorityStatus (ADR-015 point 6, ADR-046 §5) — the one implementation of
 * what a priority row can do, shared by AllPrioritiesPage, FocusAreaView and
 * OverviewTabView: done, and the flag off.
 */
import { renderHook, act } from '@testing-library/react'

jest.mock('../api/services', () => ({
  annualPlanningService: { completePriority: jest.fn(), unflagPriority: jest.fn() }
}))

const { annualPlanningService } = require('../api/services')
const usePriorityStatus = require('./usePriorityStatus').default

const priority = { _id: 'p1', title: 'P', is_completed: false, completed_at: null, linked_entity_type: 'task', linked_entity_id: 'p1' }

/** A setter that applies functional updates to a plain array we can inspect. */
const makeSetter = (initial) => {
  const state = { list: initial }
  const setPriorities = jest.fn((updater) => {
    state.list = typeof updater === 'function' ? updater(state.list) : updater
  })
  return { state, setPriorities }
}

beforeEach(() => jest.clearAllMocks())

describe('toggleComplete', () => {
  it('patches is_completed and a completed_at stamp locally, then writes done on the item', async () => {
    annualPlanningService.completePriority.mockResolvedValue({})
    const { state, setPriorities } = makeSetter([priority])
    const { result } = renderHook(() => usePriorityStatus(setPriorities))

    await act(() => result.current.toggleComplete(priority))

    expect(state.list[0].is_completed).toBe(true)
    expect(typeof state.list[0].completed_at).toBe('string')
    expect(annualPlanningService.completePriority).toHaveBeenCalledWith(priority, true)
  })

  it('restores the original values when the request fails', async () => {
    annualPlanningService.completePriority.mockRejectedValue(new Error('offline'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const { state, setPriorities } = makeSetter([priority])
    const { result } = renderHook(() => usePriorityStatus(setPriorities))

    await act(() => result.current.toggleComplete(priority))

    expect(state.list[0].is_completed).toBe(false)
    expect(state.list[0].completed_at).toBeNull()
    console.error.mockRestore()
  })
})

describe('unflag', () => {
  it('drops the row at once and turns the flag off on the item', async () => {
    annualPlanningService.unflagPriority.mockResolvedValue({})
    const { state, setPriorities } = makeSetter([priority, { ...priority, _id: 'p2' }])
    const { result } = renderHook(() => usePriorityStatus(setPriorities))

    await act(() => result.current.unflag(priority))

    expect(state.list.map((p) => p._id)).toEqual(['p2'])
    expect(annualPlanningService.unflagPriority).toHaveBeenCalledWith(priority)
  })

  it('puts the row back when the request fails', async () => {
    annualPlanningService.unflagPriority.mockRejectedValue(new Error('offline'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const { state, setPriorities } = makeSetter([priority])
    const { result } = renderHook(() => usePriorityStatus(setPriorities))

    await act(() => result.current.unflag(priority))

    expect(state.list).toHaveLength(1)
    console.error.mockRestore()
  })
})
