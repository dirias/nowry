/**
 * Local dates and clock times as strings (ADR-045 §3).
 *
 * A block's `start` is "HH:MM" on the learner's own clock and a log's `date`
 * is the learner's local calendar date as "YYYY-MM-DD". Nothing here touches a
 * time zone: the key of a Date is read from its local getters, never from
 * `toISOString`, which is how the routine's completions landed on the wrong
 * day west of UTC (PLAN-010).
 */

const pad = (n) => String(n).padStart(2, '0')

/**
 * "YYYY-MM-DD" of a Date, in local time. The instant shifted by its own offset
 * reads, in UTC, as the local wall clock; written this way so a test can fake
 * the zone through `getTimezoneOffset` alone.
 */
export const localDateKey = (date = new Date()) => {
  const wallClock = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return `${wallClock.getUTCFullYear()}-${pad(wallClock.getUTCMonth() + 1)}-${pad(wallClock.getUTCDate())}`
}

/** A local-midnight Date for a key. Invalid keys give an invalid Date. */
export const parseDateKey = (key) => {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/**
 * A Date for a deadline that may be a date key or a datetime. `new Date` reads
 * "2026-09-13" as UTC midnight, which west of UTC is the evening before, so a
 * key is read as local midnight instead (QA-002).
 */
export const dateOf = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDateKey(value) : new Date(value))

export const addDaysKey = (key, days) => {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

/** 0 = Monday … 6 = Sunday, the API's convention, from a date key. */
export const weekdayOf = (key) => (parseDateKey(key).getDay() + 6) % 7

/** "07:30" → 450. A malformed time reads as 0 rather than NaN. */
export const minutesOf = (time) => {
  const [h, m] = String(time ?? '')
    .split(':')
    .map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0
}

/** 450 → "07:30", wrapping at midnight. */
export const formatTime = (minutes) => {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

export const addMinutes = (time, minutes) => formatTime(minutesOf(time) + minutes)

/** Minutes since local midnight of a Date. */
export const minutesOfDay = (date = new Date()) => date.getHours() * 60 + date.getMinutes()
