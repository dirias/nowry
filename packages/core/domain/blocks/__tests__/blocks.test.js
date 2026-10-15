/**
 * PLAN-002 — the Block domain is pure and agrees with the server (ADR-045).
 */
import {
  addDaysKey,
  addMinutes,
  expandRange,
  groupByPeriod,
  keptRate,
  localDateKey,
  minutesOf,
  nowAndNext,
  occurrencesOn,
  periodOf,
  readBlock,
  readLog,
  rowStreak,
  stateOf,
  studyBlockLength,
  toApiBlock,
  weekdayOf
} from '../index'

const block = (overrides = {}) => ({
  id: 'b1',
  title: 'Morning review',
  source: { type: 'study', id: null },
  start: '07:30',
  lengthMin: 20,
  daysOfWeek: [0, 1, 2, 3, 4],
  date: null,
  reminderMin: 5,
  afterBlockId: null,
  areaId: null,
  deletedAt: null,
  ...overrides
})

describe('dates', () => {
  it('keys a Date by its LOCAL day, never by toISOString', () => {
    // 23:30 local on the 14th; in any zone west of UTC toISOString is the 15th.
    expect(localDateKey(new Date(2026, 9, 14, 23, 30))).toBe('2026-10-14')
    expect(localDateKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })
  it('walks days and reads weekdays with Monday as 0', () => {
    expect(addDaysKey('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDaysKey('2026-03-01', -1)).toBe('2026-02-28')
    expect(weekdayOf('2026-10-12')).toBe(0) // a Monday
    expect(weekdayOf('2026-10-18')).toBe(6) // the Sunday
  })
  it('does clock arithmetic on strings', () => {
    expect(minutesOf('07:30')).toBe(450)
    expect(minutesOf('nonsense')).toBe(0)
    expect(addMinutes('07:00', 25)).toBe('07:25')
    expect(addMinutes('23:50', 20)).toBe('00:10')
  })
})

describe('periods', () => {
  it('assigns a start to its period and groups a day', () => {
    expect(periodOf('07:30')).toBe('morning')
    expect(periodOf('12:00')).toBe('afternoon')
    expect(periodOf('18:00')).toBe('evening')
    const groups = groupByPeriod([{ start: '20:00' }, { start: '07:00' }])
    expect(groups.map((g) => g.items.length)).toEqual([1, 0, 1])
  })
})

describe('occurrences', () => {
  it('expands a weekday rule, a one-off and never a removed block, in order', () => {
    const rule = block()
    const once = block({ id: 'b2', title: 'Dentist', daysOfWeek: [], date: '2026-10-17', start: '09:00' })
    const gone = block({ id: 'b3', title: 'Gone', deletedAt: '2026-10-01T00:00:00Z' })
    const rows = expandRange([once, rule, gone], '2026-10-12', '2026-10-18')
    expect(rows.filter((r) => r.blockId === 'b1').map((r) => r.date)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16'
    ])
    expect(rows.filter((r) => r.blockId === 'b2').map((r) => r.date)).toEqual(['2026-10-17'])
    expect(rows.some((r) => r.blockId === 'b3')).toBe(false)
  })
  it('attaches the day’s log rows by block and date', () => {
    const logs = [{ blockId: 'b1', date: '2026-10-15', status: 'kept', minutes: 18 }]
    const [row] = occurrencesOn([block()], '2026-10-15', logs)
    expect(row.log.status).toBe('kept')
    expect(occurrencesOn([block()], '2026-10-16', logs)[0].log).toBeNull()
    expect(occurrencesOn([block()], '2026-10-17', logs)).toEqual([]) // Saturday
  })
})

describe('the spine', () => {
  const day = [
    { ...block({ id: 'a', start: '07:00', lengthMin: 10 }), log: { status: 'kept' } },
    { ...block({ id: 'b', start: '07:30', lengthMin: 20 }), log: null },
    { ...block({ id: 'c', start: '13:00', lengthMin: 50 }), log: null },
    { ...block({ id: 'd', start: '20:00', lengthMin: 10 }), log: null }
  ].map((o) => ({ ...o, blockId: o.id, date: '2026-10-15' }))

  it('reads a block’s state from its log, else from the clock', () => {
    expect(stateOf(day[0], 7 * 60 + 5)).toBe('kept')
    expect(stateOf(day[1], 7 * 60 + 20)).toBe('upcoming')
    expect(stateOf(day[1], 7 * 60 + 40)).toBe('running')
    expect(stateOf(day[1], 8 * 60)).toBe('missed')
  })
  it('names now, next and later, and keeps the past for the evening close', () => {
    const at740 = nowAndNext(day, 7 * 60 + 40)
    expect(at740.current.id).toBe('b')
    expect(at740.next.id).toBe('c')
    expect(at740.later.map((o) => o.id)).toEqual(['d'])
    expect(at740.past.map((o) => o.id)).toEqual(['a'])
    const at10 = nowAndNext(day, 10 * 60)
    expect(at10.current.id).toBe('c') // nothing runs: the next one is current
    expect(at10.past.map((o) => o.id)).toEqual(['a', 'b'])
  })
  it('counts the kept rate from logs only', () => {
    const rate = keptRate([{ log: { status: 'kept' } }, { log: { status: 'partial' } }, { log: { status: 'skipped' } }, { log: null }])
    expect(rate).toEqual({ planned: 4, kept: 1, partial: 1, skipped: 1, rate: 0.375 })
  })
})

describe('row streak', () => {
  const b = block() // weekdays only
  const kept = (date) => ({ blockId: 'b1', date, status: 'kept' })
  it('walks back over scheduled days, skipping the weekend, and today counts only when kept', () => {
    const logs = [kept('2026-10-09'), kept('2026-10-12'), kept('2026-10-13'), kept('2026-10-14')]
    // Thu 15th, not yet kept: Wed, Tue, Mon, (weekend skipped), Fri = 4
    expect(rowStreak(logs, b, '2026-10-15')).toBe(4)
    expect(rowStreak([...logs, kept('2026-10-15')], b, '2026-10-15')).toBe(5)
  })
  it('ends on a scheduled day without a kept row; a partial day keeps it alive', () => {
    const logs = [kept('2026-10-12'), kept('2026-10-14')]
    expect(rowStreak(logs, b, '2026-10-15')).toBe(1) // Tue 13th breaks it
    const partial = [...logs, { blockId: 'b1', date: '2026-10-13', status: 'partial' }]
    expect(rowStreak(partial, b, '2026-10-15')).toBe(2)
    expect(rowStreak([], b, '2026-10-15')).toBe(0)
  })
})

describe('the study block', () => {
  it('sizes itself from the forecast on the five-minute grid, never under five', () => {
    expect(studyBlockLength(27)).toBe(20)
    expect(studyBlockLength(41)).toBe(25)
    expect(studyBlockLength(3)).toBe(5)
    expect(studyBlockLength(0)).toBe(5)
    expect(studyBlockLength(undefined)).toBe(5)
  })
})

describe('readers', () => {
  it('reads the API’s names once and writes them back once', () => {
    const read = readBlock({
      id: 'x',
      title: 'Run',
      source: { type: 'goal', id: 'g' },
      start: '17:30',
      length_min: 30,
      days_of_week: [0, 2, 4],
      reminder_min: 15,
      area_id: 'a',
      migrated_from: { collection: 'activities', id: '1' }
    })
    expect(read).toMatchObject({ id: 'x', lengthMin: 30, daysOfWeek: [0, 2, 4], reminderMin: 15, areaId: 'a', migrated: true, date: null })
    expect(toApiBlock({ title: 'Run', lengthMin: 30, daysOfWeek: [0], reminderMin: null })).toEqual({
      title: 'Run',
      length_min: 30,
      days_of_week: [0],
      reminder_min: null
    })
    expect(
      readLog({ id: 'l', block_id: 'x', date: '2026-10-15', status: 'kept', minutes: 18, record: { study_session_id: 's', cards: 27 } })
    ).toMatchObject({ blockId: 'x', minutes: 18, record: { studySessionId: 's', cards: 27 } })
  })
})
