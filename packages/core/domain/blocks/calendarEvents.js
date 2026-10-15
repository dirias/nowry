/**
 * Blocks on a calendar grid (PLAN-004, ADR-045 §6).
 *
 * The web draws occurrences as TIMED events on FullCalendar's time grid while
 * the deadlines stay in the all-day row; the agenda lists both on one day.
 * Everything that decides what an occurrence becomes — its event, its
 * grouping, what a drag or a resize may write back — is pure and lives here,
 * so the grid's callbacks are thin and the rules are tested without a DOM.
 *
 * Times stay strings on the learner's wall clock (ADR-045 §3): an event's
 * `start` is `YYYY-MM-DDTHH:MM:00` with no zone suffix, which FullCalendar
 * reads as local time — the only reading that puts 07:30 at 07:30.
 */
import { addDaysKey, formatTime, localDateKey, minutesOf, minutesOfDay, parseDateKey, weekdayOf } from './dates'
import { periodOf } from './period'
import { BLOCK_STEP, MIN_BLOCK_MINUTES } from './study'
import { stateOf } from './today'

/** The API refuses a wider range (FR-003); the grid never asks for one. */
export const MAX_RANGE_DAYS = 62
export const MAX_BLOCK_MINUTES = 480
export const BLOCK_EVENT_KIND = 'block'

const MINUTES_IN_DAY = 24 * 60

export const roundToStep = (minutes, step = BLOCK_STEP) => Math.round(minutes / step) * step

const clampLength = (minutes) => Math.min(MAX_BLOCK_MINUTES, Math.max(MIN_BLOCK_MINUTES, roundToStep(minutes)))

export const blockEventId = (occurrence) => `block:${occurrence.blockId}:${occurrence.date}`

/** The occurrence's end as `{ date, time }`: a block that crosses midnight ends tomorrow. */
export const occurrenceEnd = (occurrence) => {
  const endMinutes = minutesOf(occurrence.start) + occurrence.lengthMin
  return {
    date: endMinutes >= MINUTES_IN_DAY ? addDaysKey(occurrence.date, 1) : occurrence.date,
    time: formatTime(endMinutes)
  }
}

const localDateTime = (date, time) => `${date}T${time}:00`

const isRoutine = (occurrence) => occurrence.block?.source?.type === 'routine'

/**
 * Consecutive routine occurrences in one period on one day form a run. Any
 * other block between two routine items breaks the run, so "Morning routine ·
 * 3" never swallows the study block that sits between two of its items.
 */
export const routineRuns = (occurrences) => {
  const runs = []
  let run = null
  for (const occurrence of occurrences ?? []) {
    const period = periodOf(occurrence.start)
    const joins = run?.routine && isRoutine(occurrence) && run.date === occurrence.date && run.period === period
    if (joins) run.items.push(occurrence)
    else {
      run = { date: occurrence.date, period, items: [occurrence], routine: isRoutine(occurrence) }
      runs.push(run)
    }
  }
  return runs
}

const singleEvent = (occurrence) => {
  const end = occurrenceEnd(occurrence)
  return {
    id: blockEventId(occurrence),
    title: occurrence.title,
    start: localDateTime(occurrence.date, occurrence.start),
    end: localDateTime(end.date, end.time),
    allDay: false,
    durationEditable: true,
    extendedProps: { kind: BLOCK_EVENT_KIND, occurrence, group: null }
  }
}

const groupEvent = (run) => {
  const first = run.items[0]
  const last = run.items[run.items.length - 1]
  const end = occurrenceEnd(last)
  return {
    id: `block-group:${run.date}:${run.period}:${first.blockId}`,
    title: first.title,
    start: localDateTime(run.date, first.start),
    end: localDateTime(end.date, end.time),
    allDay: false,
    editable: false,
    durationEditable: false,
    extendedProps: {
      kind: BLOCK_EVENT_KIND,
      occurrence: first,
      group: { period: run.period, count: run.items.length, occurrences: run.items }
    }
  }
}

/**
 * FullCalendar event objects for a range's occurrences. With `groupRoutines`
 * (the Week grid) a run of two or more routine items is one event spanning
 * from the first start to the last end; Day draws every item.
 */
export const toBlockEvents = (occurrences, { groupRoutines = false } = {}) => {
  if (!groupRoutines) return (occurrences ?? []).map(singleEvent)
  return routineRuns(occurrences).flatMap((run) => (run.routine && run.items.length > 1 ? [groupEvent(run)] : run.items.map(singleEvent)))
}

/**
 * The clock an occurrence's state is read against: the real minutes on its
 * own day, past the end of a day gone by, before the start of a day to come.
 */
export const clockOn = (dateKey, todayKey, nowMinutes) => {
  if (dateKey === todayKey) return nowMinutes
  return dateKey < todayKey ? MINUTES_IN_DAY : -1
}

/** A run's state: the shared log status when every item has it, else the clock. */
export const groupStateOf = (occurrences, nowMinutes) => {
  const states = occurrences.map((o) => stateOf(o, nowMinutes))
  if (states.every((s) => s === states[0])) return states[0]
  if (states.includes('running')) return 'running'
  if (states.every((s) => s === 'kept' || s === 'partial' || s === 'skipped')) return 'partial'
  return states.includes('upcoming') ? 'upcoming' : 'missed'
}

/** A drag-select on empty hours → a one-off block's date, start and length on the 5-minute grid. */
export const selectionToBlock = (start, end) => {
  const startMinutes = roundToStep(minutesOfDay(start))
  const span = (end.getTime() - start.getTime()) / 60000
  return { date: localDateKey(start), start: formatTime(startMinutes), lengthMin: clampLength(span) }
}

/**
 * What a drop may write (PRD D1): a one-off moves to the day and time it was
 * dropped on; a recurring block keeps its weekdays, so a drop within the same
 * weekday writes the start alone and a drop on another weekday writes nothing
 * (`null` — the caller reverts and says why).
 */
export const dropChanges = (occurrence, droppedStart) => {
  const date = localDateKey(droppedStart)
  const start = formatTime(roundToStep(minutesOfDay(droppedStart)))
  if (occurrence.block?.date) return { date, start }
  if (weekdayOf(date) === weekdayOf(occurrence.date)) return { start }
  return null
}

/** A resize writes the length alone, on the 5-minute grid and within the API's bounds. */
export const resizeChanges = (start, end) => ({ lengthMin: clampLength((end.getTime() - start.getTime()) / 60000) })

/** FullCalendar's visible range (end exclusive) as inclusive local keys, never wider than the API allows. */
export const gridRangeKeys = (start, endExclusive) => {
  const from = localDateKey(start)
  const last = new Date(endExclusive.getTime())
  last.setDate(last.getDate() - 1)
  const to = localDateKey(last)
  const capped = addDaysKey(from, MAX_RANGE_DAYS - 1)
  return { from, to: to > capped ? capped : to }
}

/** The whole month a cursor sits in, as local keys. */
export const monthRangeKeys = (cursor) => ({
  from: localDateKey(new Date(cursor.getFullYear(), cursor.getMonth(), 1)),
  to: localDateKey(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0))
})

const byStart = (a, b) => minutesOf(a.start) - minutesOf(b.start) || String(a.title).localeCompare(String(b.title))

/**
 * The agenda's groups with each day's occurrences merged in as `blocks`.
 *
 * The agenda's own rule holds (ADR-016 §5): only the cursor's month, from
 * today when the month is the current one. A day that has blocks and nothing
 * due becomes a group of its own, so a routine shows on the days it is
 * planned, not only on the days something else happens to be due.
 */
export const mergeAgendaBlocks = (groups, occurrences, cursor, today = new Date()) => {
  const todayKey = localDateKey(today)
  const currentMonth = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth()
  const inScope = (key) => {
    const date = parseDateKey(key)
    if (date.getFullYear() !== cursor.getFullYear() || date.getMonth() !== cursor.getMonth()) return false
    return !currentMonth || key >= todayKey
  }
  const byKey = new Map((groups ?? []).map((group) => [localDateKey(group.date), { ...group, blocks: [] }]))
  for (const occurrence of occurrences ?? []) {
    if (!inScope(occurrence.date)) continue
    if (!byKey.has(occurrence.date)) {
      byKey.set(occurrence.date, { date: parseDateKey(occurrence.date), isToday: occurrence.date === todayKey, events: [], blocks: [] })
    }
    byKey.get(occurrence.date).blocks.push(occurrence)
  }
  return [...byKey.values()]
    .map((group) => ({ ...group, blocks: [...group.blocks].sort(byStart) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}
