/**
 * FE-1 — useGoalCardModel (UX-CONTRACT §5.1).
 * Covers the memoisation guarantee and the isLocked rule the hook inherits from
 * GoalsTabView's isGoalQuarterClosed.
 */
import { renderHook } from '@testing-library/react'
import useGoalCardModel from './useGoalCardModel'
import { GOAL_STATE_COLOR, getGoalProgress, getGoalState } from '../components/AnnualPlanning/goalDerivation'

const goal = {
  _id: 'g1',
  title: 'Ship the redesign',
  status: 'not_started',
  type: 'quarterly',
  quarter: 1,
  milestones: [{ completed: true }, { completed: false }]
}

const area = { _id: 'a1', name: 'Health', color: '#4caf50' }

const context = {
  area,
  activities: [
    { _id: 'act1', goal_id: 'g1' },
    { _id: 'act2', goal_id: 'other' }
  ],
  quarterReports: [],
  planYear: 2026
}

describe('useGoalCardModel', () => {
  it('exposes the derived state, its colour and its i18n key', () => {
    const { result } = renderHook(() => useGoalCardModel(goal, context))
    expect(result.current.state).toBe(getGoalState(goal))
    expect(result.current.color).toBe(GOAL_STATE_COLOR[result.current.state])
    expect(result.current.stateLabelKey).toMatch(/^annualPlanning\.goal\.healthStatus\./)
  })

  it('exposes progress straight from the derivation core', () => {
    const { result } = renderHook(() => useGoalCardModel(goal, context))
    expect(result.current.progress).toEqual(getGoalProgress(goal))
  })

  it('counts only the goal’s own activities', () => {
    const { result } = renderHook(() => useGoalCardModel(goal, context))
    expect(result.current.activityCount).toBe(1)
    expect(result.current.activities.map((a) => a._id)).toEqual(['act1'])
  })

  it('surfaces the focus area as name + colour only', () => {
    const { result } = renderHook(() => useGoalCardModel(goal, context))
    expect(result.current.areaName).toBe('Health')
    expect(result.current.areaColor).toBe('#4caf50')
  })

  it('tolerates a missing area', () => {
    const { result } = renderHook(() => useGoalCardModel(goal, { ...context, area: null }))
    expect(result.current.areaName).toBeNull()
    expect(result.current.areaColor).toBeNull()
  })

  it('returns a referentially equal object when re-rendered with identical inputs', () => {
    const { result, rerender } = renderHook(() => useGoalCardModel(goal, context))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it('recomputes when the goal changes', () => {
    const { result, rerender } = renderHook(({ g }) => useGoalCardModel(g, context), { initialProps: { g: goal } })
    const first = result.current
    rerender({ g: { ...goal, milestones: [{ completed: true }, { completed: true }] } })
    expect(result.current).not.toBe(first)
    expect(result.current.progress.percent).toBe(100)
  })
})

describe('useGoalCardModel isLocked', () => {
  it('is false when no report exists for the goal’s quarter', () => {
    const { result } = renderHook(() => useGoalCardModel(goal, { ...context, quarterReports: [] }))
    expect(result.current.isLocked).toBe(false)
  })

  it('is true when a report exists for the goal’s quarter in the plan year', () => {
    const { result } = renderHook(() => useGoalCardModel(goal, { ...context, quarterReports: [{ quarter: 1, year: 2026 }] }))
    expect(result.current.isLocked).toBe(true)
  })

  it('ignores a report for the same quarter in a different year', () => {
    const { result } = renderHook(() => useGoalCardModel(goal, { ...context, quarterReports: [{ quarter: 1, year: 2025 }] }))
    expect(result.current.isLocked).toBe(false)
  })

  it('ignores a report for a different quarter', () => {
    const { result } = renderHook(() => useGoalCardModel(goal, { ...context, quarterReports: [{ quarter: 2, year: 2026 }] }))
    expect(result.current.isLocked).toBe(false)
  })

  it('never quarter-locks a yearly objective', () => {
    const yearly = { ...goal, type: 'yearly', quarter: null }
    const { result } = renderHook(() => useGoalCardModel(yearly, { ...context, quarterReports: [{ quarter: 1, year: 2026 }] }))
    expect(result.current.isLocked).toBe(false)
  })
})
