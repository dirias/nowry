import { formatClock } from '../formatClock'

describe('formatClock', () => {
  it('renders mm:ss, zero-padded, never negative', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(61)).toBe('01:01')
    expect(formatClock(25 * 60)).toBe('25:00')
    expect(formatClock(-5)).toBe('00:00')
    expect(formatClock(undefined)).toBe('00:00')
    expect(formatClock(3599)).toBe('59:59')
  })
})
