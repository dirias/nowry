import {
  ROUTINE_PERIODS,
  completedToday,
  currentPeriod,
  routineItems,
  routineProgress,
  todayKey,
  toggledCompletions
} from '../dailyRoutine'

const now = new Date('2026-09-12T20:00:00')
const routine = {
  morning_routine: [{ id: 'm1' }, { id: 'm2' }],
  afternoon_routine: [],
  evening_routine: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }],
  daily_completions: { '2026-09-12': ['m1', 'e2'], '2026-09-11': ['m1', 'm2'] }
}

describe('the API shape, read once', () => {
  it('finds the items under `<period>_routine`', () => {
    // The first pass on the phone assumed `routine.morning.items`, a shape the
    // server has never sent — the readout simply never appeared (MOB-075).
    expect(routineItems(routine, 'morning').map((i) => i.id)).toEqual(['m1', 'm2'])
    expect(routineItems(routine, 'afternoon')).toEqual([])
    expect(routineItems(undefined, 'evening')).toEqual([])
  })

  it("reads today's ticks from the flat id array, not from a flag on the item", () => {
    expect([...completedToday(routine, now)]).toEqual(['m1', 'e2'])
  })

  it('keys today the way the server does, in local time', () => {
    // `toISOString().slice(0, 10)` is the web's version and is UTC: at 20:00 in
    // a UTC-6 zone it is still today, but at 20:00 in UTC+6 it is tomorrow's
    // key and every tick lands on the wrong day.
    expect(todayKey(new Date('2026-09-12T23:30:00'))).toBe('2026-09-12')
    expect(todayKey(new Date('2026-01-05T00:10:00'))).toBe('2026-01-05')
  })

  it('ignores yesterday', () => {
    expect(completedToday(routine, new Date('2026-09-13T09:00:00')).size).toBe(0)
  })
})

describe('currentPeriod', () => {
  it("is the web's own boundaries: noon and six", () => {
    expect(currentPeriod(new Date('2026-09-12T06:00:00'))).toBe('morning')
    expect(currentPeriod(new Date('2026-09-12T11:59:00'))).toBe('morning')
    expect(currentPeriod(new Date('2026-09-12T12:00:00'))).toBe('afternoon')
    expect(currentPeriod(new Date('2026-09-12T17:59:00'))).toBe('afternoon')
    expect(currentPeriod(new Date('2026-09-12T18:00:00'))).toBe('evening')
    expect(ROUTINE_PERIODS).toEqual(['morning', 'afternoon', 'evening'])
  })
})

describe('routineProgress', () => {
  it('counts every period together', () => {
    expect(routineProgress(routine, now)).toEqual({ done: 2, total: 5 })
  })

  it('is null for no routine at all, and a zero for one with nothing ticked', () => {
    expect(routineProgress(null, now)).toBeNull()
    expect(routineProgress({}, now)).toBeNull()
    expect(routineProgress({ morning_routine: [] }, now)).toBeNull()
    expect(routineProgress({ morning_routine: [{ id: 'a' }] }, now)).toEqual({ done: 0, total: 1 })
  })
})

describe('toggledCompletions', () => {
  it('adds one that was not ticked and removes one that was', () => {
    expect(toggledCompletions(routine, 'e1', now).sort()).toEqual(['e1', 'e2', 'm1'])
    expect(toggledCompletions(routine, 'm1', now).sort()).toEqual(['e2'])
  })

  it('sends the whole day, because the endpoint takes a set and not a delta', () => {
    expect(toggledCompletions({ daily_completions: {} }, 'x', now)).toEqual(['x'])
  })
})
