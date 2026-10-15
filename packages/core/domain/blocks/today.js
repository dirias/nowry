/**
 * The day read from the clock (PRD D9): which block is now, which is next,
 * and how the day is going. One reader, so Home, Plan and Study agree.
 */
import { minutesOf } from './dates'

/**
 * A block's state on its day. The log wins when there is one; otherwise the
 * clock says whether it is still to come, running, or already behind us.
 */
export const stateOf = (occurrence, nowMinutes) => {
  if (occurrence.log) return occurrence.log.status
  const start = minutesOf(occurrence.start)
  const end = start + occurrence.lengthMin
  if (nowMinutes < start) return 'upcoming'
  if (nowMinutes < end) return 'running'
  return 'missed'
}

/**
 * The spine: the day's occurrences split around the clock.
 *
 * `current` is the running block, or the next one when nothing runs; `next` is
 * the one after it. `past` holds everything whose end is behind now, logged or
 * not, so an evening close can read the day back.
 */
export const nowAndNext = (occurrences, nowMinutes) => {
  const ahead = []
  const past = []
  let current = null
  for (const o of occurrences) {
    const state = stateOf(o, nowMinutes)
    if (state === 'running' && !current) current = o
    else if (state === 'upcoming') ahead.push(o)
    else past.push(o)
  }
  if (!current) current = ahead.shift() ?? null
  return { current, next: ahead[0] ?? null, later: ahead.slice(1), past }
}

/** How the day (or the range) is going, read from the logs only. */
export const keptRate = (occurrences) => {
  const planned = occurrences.length
  const kept = occurrences.filter((o) => o.log?.status === 'kept').length
  const partial = occurrences.filter((o) => o.log?.status === 'partial').length
  const skipped = occurrences.filter((o) => o.log?.status === 'skipped').length
  return { planned, kept, partial, skipped, rate: planned ? (kept + partial / 2) / planned : 0 }
}
