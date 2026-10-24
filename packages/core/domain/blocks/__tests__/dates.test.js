import { dateOf } from '../dates'

describe('dateOf', () => {
  it('reads a date key as local midnight, in any zone', () => {
    // CI runs this file in UTC and in America/Los_Angeles (ADR-049): west of
    // UTC, `new Date('2026-09-13')` is the evening of the 12th (QA-002).
    const date = dateOf('2026-09-13')
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 8, 13, 0])
  })

  it('reads a datetime as the Date constructor does', () => {
    expect(dateOf('2026-09-12T23:00:00').getTime()).toBe(new Date('2026-09-12T23:00:00').getTime())
    expect(dateOf('2026-09-12T23:00:00Z').getTime()).toBe(Date.UTC(2026, 8, 12, 23))
  })

  it('passes a Date and a timestamp through, and leaves junk invalid', () => {
    const now = new Date(2026, 8, 12, 10)
    expect(dateOf(now).getTime()).toBe(now.getTime())
    expect(dateOf(now.getTime()).getTime()).toBe(now.getTime())
    expect(Number.isNaN(dateOf('soon').getTime())).toBe(true)
  })
})
