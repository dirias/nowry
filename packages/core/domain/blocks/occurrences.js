/**
 * A block on a day is an occurrence (PRD FR-004).
 *
 * The server expands the range it is asked for; this is the same rule for the
 * client, used for the reminder schedule (seven days ahead) and for a day the
 * cache already holds. The two must agree, so both read the same three facts:
 * a one-off happens on its date, a rule happens on its weekdays, a removed
 * block happens never.
 */
import { addDaysKey, minutesOf, weekdayOf } from './dates'

export const occursOn = (block, key) => {
  if (!block || block.deletedAt) return false
  if (block.date) return block.date === key
  return (block.daysOfWeek ?? []).includes(weekdayOf(key))
}

const byDayThenStart = (a, b) =>
  a.date.localeCompare(b.date) || minutesOf(a.start) - minutesOf(b.start) || String(a.title).localeCompare(String(b.title))

const occurrence = (block, key) => ({
  date: key,
  blockId: block.id,
  start: block.start,
  lengthMin: block.lengthMin,
  title: block.title,
  block,
  log: null
})

/** The day's occurrences in clock order, with their log rows attached. */
export const occurrencesOn = (blocks, key, logs = []) =>
  withLogs(
    (blocks ?? []).filter((b) => occursOn(b, key)).map((b) => occurrence(b, key)),
    logs
  ).sort(byDayThenStart)

/** Every (day, block) from one key to another, inclusive, in order. */
export const expandRange = (blocks, fromKey, toKey, logs = []) => {
  const rows = []
  for (let key = fromKey; key <= toKey; key = addDaysKey(key, 1)) {
    for (const block of blocks ?? []) if (occursOn(block, key)) rows.push(occurrence(block, key))
  }
  return withLogs(rows, logs).sort(byDayThenStart)
}

/** Logs keyed by (block, date), attached to the occurrences they belong to. */
export const withLogs = (occurrences, logs = []) => {
  const byKey = new Map((logs ?? []).map((log) => [`${log.blockId}|${log.date}`, log]))
  return occurrences.map((o) => ({ ...o, log: byKey.get(`${o.blockId}|${o.date}`) ?? o.log ?? null }))
}
