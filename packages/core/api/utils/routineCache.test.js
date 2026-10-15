/**
 * The completion key is the user's day, not UTC's (PLAN-010).
 *
 * `routineCache.todayKey` is what the web's three routine surfaces WRITE
 * completions under; `domain/dailyRoutine.completedToday` is what every client
 * READS them back with. They keyed by different calendars: a tick at 22:30 in
 * Los Angeles was written under the UTC date — tomorrow — and read back from
 * today, so it vanished until midnight UTC. Both now resolve to the local day.
 *
 * The zone is faked through the Date's own offset rather than `process.env.TZ`:
 * Jest hands each test a copy of `process.env`, so a TZ set there never reaches
 * V8, and the suite would silently run in whatever zone the machine is in.
 */
import { todayKey } from './routineCache'
import { completedToday, localDateKey } from '../../domain/dailyRoutine'

// 22:30 on 14 October in Los Angeles (PDT, UTC−7), which is already the 15th in UTC.
const EVENING_WEST_OF_UTC = new Date('2026-10-15T05:30:00Z')
const LOS_ANGELES_OFFSET_MINUTES = 420

describe('routineCache.todayKey', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern')
    jest.setSystemTime(EVENING_WEST_OF_UTC)
    jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(LOS_ANGELES_OFFSET_MINUTES)
  })
  afterEach(() => jest.useRealTimers())

  it('runs at an instant where the UTC day has already turned', () => {
    // Guards the fixture: without this the next assertion could pass by coincidence.
    expect(EVENING_WEST_OF_UTC.toISOString().slice(0, 10)).toBe('2026-10-15')
  })

  it('keys the evening by the local day, not the UTC one', () => {
    expect(todayKey()).toBe('2026-10-14')
  })

  it('writes under the same key the domain reads back with', () => {
    const routine = { daily_completions: { [todayKey()]: ['m1'] } }
    expect([...completedToday(routine)]).toEqual(['m1'])
    expect(todayKey()).toBe(localDateKey(new Date()))
  })
})
