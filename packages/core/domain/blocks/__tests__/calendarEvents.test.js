/**
 * PLAN-004 — blocks on the calendar grid are decided by pure rules (ADR-045 §6).
 */
import {
  clockOn,
  dropChanges,
  gridRangeKeys,
  groupStateOf,
  mergeAgendaBlocks,
  monthRangeKeys,
  occurrenceEnd,
  resizeChanges,
  routineRuns,
  selectionToBlock,
  toBlockEvents
} from '../index'

const block = (overrides = {}) => ({
  id: 'b1',
  title: 'Morning review',
  source: { type: 'study', id: null },
  start: '07:30',
  lengthMin: 20,
  daysOfWeek: [0, 1, 2, 3, 4],
  date: null,
  reminderMin: null,
  afterBlockId: null,
  areaId: null,
  deletedAt: null,
  ...overrides
})

const occurrence = (overrides = {}) => {
  const b = block(overrides.block ?? {})
  return { date: '2026-10-14', blockId: b.id, start: b.start, lengthMin: b.lengthMin, title: b.title, block: b, log: null, ...overrides }
}

const routine = (id, start, date = '2026-10-14', lengthMin = 10) =>
  occurrence({ date, block: { id, title: `Routine ${id}`, source: { type: 'routine', id: null }, start, lengthMin } })

describe('toBlockEvents', () => {
  it('draws an occurrence as a timed event on local wall-clock strings, never with a Z', () => {
    const [event] = toBlockEvents([occurrence()])
    expect(event).toMatchObject({
      id: 'block:b1:2026-10-14',
      title: 'Morning review',
      start: '2026-10-14T07:30:00',
      end: '2026-10-14T07:50:00',
      allDay: false,
      durationEditable: true
    })
    expect(event.extendedProps.kind).toBe('block')
    expect(event.extendedProps.occurrence.blockId).toBe('b1')
    expect(event.extendedProps.group).toBeNull()
  })

  it('ends a block that crosses midnight on the next day', () => {
    expect(occurrenceEnd(occurrence({ block: { start: '23:50', lengthMin: 20 } }))).toEqual({ date: '2026-10-15', time: '00:10' })
  })

  it('in Week, a run of routine items in one period is ONE event from the first start to the last end', () => {
    const items = [routine('r1', '07:00'), routine('r2', '07:10'), routine('r3', '07:20')]
    const events = toBlockEvents(items, { groupRoutines: true })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ start: '2026-10-14T07:00:00', end: '2026-10-14T07:30:00', editable: false })
    expect(events[0].extendedProps.group).toMatchObject({ period: 'morning', count: 3 })
  })

  it('a study block between two routine items breaks the run; a lone routine item stays single', () => {
    const items = [routine('r1', '07:00'), occurrence({ block: { start: '07:10' } }), routine('r2', '07:30'), routine('r3', '20:00')]
    const runs = routineRuns(items)
    expect(runs.map((run) => run.items.length)).toEqual([1, 1, 1, 1])
    const events = toBlockEvents(items, { groupRoutines: true })
    expect(events).toHaveLength(4)
    expect(events.every((event) => event.extendedProps.group === null)).toBe(true)
  })

  it('never groups across two days or two periods', () => {
    const items = [routine('r1', '07:00'), routine('r2', '07:10'), routine('r3', '13:00'), routine('r4', '13:10'), routine('r1', '07:00', '2026-10-15')]
    const events = toBlockEvents(items, { groupRoutines: true })
    expect(events.map((event) => event.extendedProps.group?.count ?? 1)).toEqual([2, 2, 1])
  })

  it('Day draws every item', () => {
    expect(toBlockEvents([routine('r1', '07:00'), routine('r2', '07:10')])).toHaveLength(2)
  })
})

describe('state on a day', () => {
  it('reads the clock on today, the end of the day for a day gone, before the start for a day to come', () => {
    expect(clockOn('2026-10-14', '2026-10-14', 500)).toBe(500)
    expect(clockOn('2026-10-13', '2026-10-14', 500)).toBe(1440)
    expect(clockOn('2026-10-15', '2026-10-14', 500)).toBe(-1)
  })

  it('a run is kept when every item is, running when one is, partial when the logs disagree', () => {
    const kept = (o) => ({ ...o, log: { status: 'kept' } })
    const skipped = (o) => ({ ...o, log: { status: 'skipped' } })
    const items = [routine('r1', '07:00'), routine('r2', '07:10')]
    expect(groupStateOf(items.map(kept), 600)).toBe('kept')
    expect(groupStateOf([kept(items[0]), skipped(items[1])], 600)).toBe('partial')
    expect(groupStateOf([kept(items[0]), items[1]], 7 * 60 + 12)).toBe('running')
    expect(groupStateOf([kept(items[0]), items[1]], 6 * 60)).toBe('upcoming')
    expect(groupStateOf([kept(items[0]), items[1]], 9 * 60)).toBe('missed')
  })
})

describe('what the grid may write', () => {
  const monday = (h, m) => new Date(2026, 9, 12, h, m) // 2026-10-12 is a Monday
  const tuesday = (h, m) => new Date(2026, 9, 13, h, m)

  it('a drag-select becomes a one-off on the 5-minute grid, never under 5 minutes', () => {
    expect(selectionToBlock(monday(7, 32), monday(7, 59))).toEqual({ date: '2026-10-12', start: '07:30', lengthMin: 25 })
    expect(selectionToBlock(monday(7, 0), monday(7, 1)).lengthMin).toBe(5)
  })

  it('a one-off dropped elsewhere moves its date and start', () => {
    const oneOff = occurrence({ date: '2026-10-12', block: { date: '2026-10-12', daysOfWeek: [] } })
    expect(dropChanges(oneOff, tuesday(9, 3))).toEqual({ date: '2026-10-13', start: '09:05' })
  })

  it('a recurring block dropped within its weekday moves its start alone; on another weekday it writes nothing', () => {
    const recurring = occurrence({ date: '2026-10-12' })
    expect(dropChanges(recurring, monday(9, 0))).toEqual({ start: '09:00' })
    expect(dropChanges(recurring, tuesday(9, 0))).toBeNull()
  })

  it('a resize writes the length on the 5-minute grid within the API bounds', () => {
    expect(resizeChanges(monday(7, 0), monday(7, 47))).toEqual({ lengthMin: 45 })
    expect(resizeChanges(monday(7, 0), monday(7, 1))).toEqual({ lengthMin: 5 })
    expect(resizeChanges(monday(7, 0), monday(18, 0))).toEqual({ lengthMin: 480 })
  })
})

describe('ranges', () => {
  it('turns FullCalendar’s exclusive end into an inclusive key and caps the range at 62 days', () => {
    expect(gridRangeKeys(new Date(2026, 8, 27), new Date(2026, 10, 8))).toEqual({ from: '2026-09-27', to: '2026-11-07' })
    expect(gridRangeKeys(new Date(2026, 0, 1), new Date(2026, 5, 1))).toEqual({ from: '2026-01-01', to: '2026-03-03' })
  })

  it('names the whole month of a cursor', () => {
    expect(monthRangeKeys(new Date(2026, 1, 10))).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })
})

describe('mergeAgendaBlocks', () => {
  const today = new Date(2026, 9, 14)
  const cursor = today
  const group = (date, events = []) => ({ date, isToday: false, events })

  it('attaches a day’s occurrences to its group, sorted by time', () => {
    const groups = [group(new Date(2026, 9, 14), [{ id: 'task-1' }])]
    const merged = mergeAgendaBlocks(groups, [routine('r2', '20:00'), routine('r1', '07:00')], cursor, today)
    expect(merged).toHaveLength(1)
    expect(merged[0].events).toEqual([{ id: 'task-1' }])
    expect(merged[0].blocks.map((o) => o.start)).toEqual(['07:00', '20:00'])
  })

  it('adds a group for a day that has blocks and nothing due, in date order', () => {
    const groups = [group(new Date(2026, 9, 20), [{ id: 'task-1' }])]
    const merged = mergeAgendaBlocks(groups, [routine('r1', '07:00', '2026-10-16')], cursor, today)
    expect(merged.map((g) => g.date.getDate())).toEqual([16, 20])
    expect(merged[0]).toMatchObject({ isToday: false, events: [] })
    expect(merged[0].blocks).toHaveLength(1)
  })

  it('keeps the agenda’s scope: this month from today, another month whole', () => {
    const past = routine('r1', '07:00', '2026-10-13')
    const nextMonth = routine('r1', '07:00', '2026-11-02')
    expect(mergeAgendaBlocks([], [past, nextMonth], cursor, today)).toEqual([])
    const merged = mergeAgendaBlocks([], [routine('r1', '07:00', '2026-11-02')], new Date(2026, 10, 1), today)
    expect(merged).toHaveLength(1)
  })

  it('leaves a group without blocks with an empty list', () => {
    const merged = mergeAgendaBlocks([group(new Date(2026, 9, 14))], [], cursor, today)
    expect(merged[0].blocks).toEqual([])
  })
})
