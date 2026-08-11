/**
 * quarterUtils tests — the date math behind the quarter-close alert and the
 * Reports empty-state countdown. Everything is asserted in local time on purpose:
 * a quarter boundary is a calendar boundary, so a UTC-based answer would be off by
 * a day for any user in an offset timezone.
 */
import { getQuarterFromDate, getQuarterEndDate, getDaysUntilQuarterEnd, isQuarterClosed, getQuarterCloseState } from '../quarterUtils'

describe('getQuarterFromDate', () => {
  it('maps each month to its calendar quarter', () => {
    expect(getQuarterFromDate(new Date(2026, 0, 15))).toBe(1)
    expect(getQuarterFromDate(new Date(2026, 2, 31))).toBe(1)
    expect(getQuarterFromDate(new Date(2026, 3, 1))).toBe(2)
    expect(getQuarterFromDate(new Date(2026, 8, 30))).toBe(3)
    expect(getQuarterFromDate(new Date(2026, 11, 31))).toBe(4)
  })
})

describe('getQuarterEndDate', () => {
  it('returns the last calendar day of the quarter in local time', () => {
    expect(getQuarterEndDate(2026, 1).getMonth()).toBe(2)
    expect(getQuarterEndDate(2026, 1).getDate()).toBe(31)
    expect(getQuarterEndDate(2026, 2).getDate()).toBe(30) // June
    expect(getQuarterEndDate(2026, 4).getMonth()).toBe(11)
    expect(getQuarterEndDate(2026, 4).getDate()).toBe(31)
  })
})

describe('getDaysUntilQuarterEnd', () => {
  it('counts down to zero on the final day', () => {
    expect(getDaysUntilQuarterEnd(2026, 1, new Date(2026, 2, 31, 10, 0))).toBe(0)
    expect(getDaysUntilQuarterEnd(2026, 1, new Date(2026, 2, 30, 10, 0))).toBe(1)
    expect(getDaysUntilQuarterEnd(2026, 1, new Date(2026, 2, 21, 10, 0))).toBe(10)
  })

  it('goes negative once the quarter has passed', () => {
    expect(getDaysUntilQuarterEnd(2026, 1, new Date(2026, 3, 5, 10, 0))).toBeLessThan(0)
  })
})

describe('isQuarterClosed', () => {
  const reports = [{ quarter: 1, year: 2026 }]
  it('matches on quarter and year together', () => {
    expect(isQuarterClosed(reports, 1, 2026)).toBe(true)
    expect(isQuarterClosed(reports, 1, 2025)).toBe(false)
    expect(isQuarterClosed(reports, 2, 2026)).toBe(false)
    expect(isQuarterClosed(undefined, 1, 2026)).toBe(false)
  })
})

describe('getQuarterCloseState', () => {
  const plan = { year: 2026 }

  it('is not closable in the middle of an open quarter', () => {
    const state = getQuarterCloseState({ plan, quarterReports: [], now: new Date(2026, 1, 10) })
    expect(state.closable).toBe(false)
    expect(state.currentQuarter).toBe(1)
  })

  it('becomes closable inside the last 10 days', () => {
    const state = getQuarterCloseState({ plan, quarterReports: [], now: new Date(2026, 2, 25, 9, 0) })
    expect(state.closable).toBe(true)
    expect(state.closingSoon).toBe(true)
    expect(state.closableQuarter).toBe(1)
  })

  it('stops offering to close a quarter that already has a report', () => {
    const state = getQuarterCloseState({ plan, quarterReports: [{ quarter: 1, year: 2026 }], now: new Date(2026, 2, 25, 9, 0) })
    expect(state.closable).toBe(false)
  })

  it('prefers the backend-flagged overdue quarter over the current one', () => {
    const state = getQuarterCloseState({
      plan: { year: 2026, overdue_quarter: { quarter: 4, year: 2025 } },
      quarterReports: [],
      now: new Date(2026, 1, 10)
    })
    expect(state.closable).toBe(true)
    expect(state.closableQuarter).toBe(4)
    expect(state.closableYear).toBe(2025)
    expect(state.overdueEndDate.getFullYear()).toBe(2025)
    expect(state.overdueEndDate.getMonth()).toBe(11)
  })
})
