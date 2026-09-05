/**
 * usePriorityStatus (ADR-015 point 6) — the one implementation of the two
 * optimistic status toggles that AllPrioritiesPage, FocusAreaView and
 * OverviewTabView share.
 */
import { renderHook, act } from '@testing-library/react'

jest.mock('../api/services', () => ({
  annualPlanningService: { updatePriority: jest.fn() }
}))

const { annualPlanningService } = require('../api/services')
const usePriorityStatus = require('./usePriorityStatus').default

const priority = { _id: 'p1', title: 'P', is_active: true, is_completed: false, completed_at: null }

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
  it('patches is_completed and a completed_at stamp locally, then sends only is_completed', async () => {
    annualPlanningService.updatePriority.mockResolvedValue({})
    const { state, setPriorities } = makeSetter([priority])
    const { result } = renderHook(() => usePriorityStatus(setPriorities))

    await act(() => result.current.toggleComplete(priority))

    expect(state.list[0].is_completed).toBe(true)
    expect(typeof state.list[0].completed_at).toBe('string')
    expect(state.list[0].is_active).toBe(true)
    expect(annualPlanningService.updatePriority).toHaveBeenCalledWith('p1', { is_completed: true })
  })

  it('restores the exact original is_completed and completed_at when the request rejects', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    annualPlanningService.updatePriority.mockRejectedValue(new Error('boom'))
    const done = { ...priority, is_completed: true, completed_at: '2026-09-01T00:00:00.000Z' }
    const { state, setPriorities } = makeSetter([done])
    const { result } = renderHook(() => usePriorityStatus(setPriorities))

    await act(() => result.current.toggleComplete(done))

    expect(state.list[0].is_completed).toBe(true)
    expect(state.list[0].completed_at).toBe('2026-09-01T00:00:00.000Z')
    expect(annualPlanningService.updatePriority).toHaveBeenCalledWith('p1', { is_completed: false })
    console.error.mockRestore()
  })

  it('only touches the row with the matching id', async () => {
    annualPlanningService.updatePriority.mockResolvedValue({})
    const other = { ...priority, _id: 'p2' }
    const { state, setPriorities } = makeSetter([priority, other])
    const { result } = renderHook(() => usePriorityStatus(setPriorities))

    await act(() => result.current.toggleComplete(priority))

    expect(state.list[1]).toBe(other)
  })
})

describe('toggleActive', () => {
  it('flips is_active locally and sends only is_active, never is_completed', async () => {
    annualPlanningService.updatePriority.mockResolvedValue({})
    const { state, setPriorities } = makeSetter([priority])
    const { result } = renderHook(() => usePriorityStatus(setPriorities))

    await act(() => result.current.toggleActive(priority))

    expect(state.list[0].is_active).toBe(false)
    expect(state.list[0].is_completed).toBe(false)
    expect(annualPlanningService.updatePriority).toHaveBeenCalledWith('p1', { is_active: false })
  })

  it('restores is_active when the request rejects', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    annualPlanningService.updatePriority.mockRejectedValue(new Error('boom'))
    const { state, setPriorities } = makeSetter([priority])
    const { result } = renderHook(() => usePriorityStatus(setPriorities))

    await act(() => result.current.toggleActive(priority))

    expect(state.list[0].is_active).toBe(true)
    console.error.mockRestore()
  })
})
