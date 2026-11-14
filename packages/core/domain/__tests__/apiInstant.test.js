import { apiInstant, apiTime } from '../apiInstant'

describe('apiInstant', () => {
  test('a datetime without a zone is UTC, not local time', () => {
    expect(apiInstant('2026-11-14T12:00:00').toISOString()).toBe('2026-11-14T12:00:00.000Z')
    expect(apiInstant('2026-11-14T12:00:00.123456').toISOString()).toBe('2026-11-14T12:00:00.123Z')
  })
  test('a datetime with a zone keeps it', () => {
    expect(apiInstant('2026-11-14T12:00:00Z').toISOString()).toBe('2026-11-14T12:00:00.000Z')
    expect(apiInstant('2026-11-14T12:00:00+02:00').toISOString()).toBe('2026-11-14T10:00:00.000Z')
  })
  test('a Date is kept; nothing or nonsense is null', () => {
    const date = new Date('2026-11-14T00:00:00Z')
    expect(apiInstant(date)).toBe(date)
    expect(apiInstant(null)).toBeNull()
    expect(apiInstant('not a date')).toBeNull()
    expect(Number.isNaN(apiTime(undefined))).toBe(true)
    expect(apiTime('2026-11-14T00:00:00')).toBe(Date.UTC(2026, 10, 14))
  })
})
