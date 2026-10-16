import { readingOf, repeats, scheduledDate } from './facts'

/**
 * What the sheet says back (PRD D2): the header's readout and the key's
 * label, as KEYS and parameters (ADR-031) for each client's `t`.
 */

/** "Add task" / "Add routine" / "Add milestone" / "Add study time"; "Save" in edit. */
export const keyLabel = (facts, { edit = false } = {}) => (edit ? { key: 'items.key.save' } : { key: `items.key.add.${readingOf(facts)}` })

/** The Scheduled fact alone, as a key and parameters: what the row and the header both say. */
export const scheduledReadout = (facts) => {
  if (!facts.scheduled) return null
  const { start, daysOfWeek } = facts.scheduled
  if (repeats(facts.scheduled)) {
    const weekdays = [0, 1, 2, 3, 4].every((d) => daysOfWeek.includes(d)) && daysOfWeek.length === 5
    if (daysOfWeek.length === 7) return { key: 'items.readout.everyDay', params: { time: start } }
    if (weekdays) return { key: 'items.readout.weekdays', params: { time: start } }
    return { key: 'items.readout.someDays', params: { time: start, count: daysOfWeek.length } }
  }
  const date = scheduledDate(facts)
  return date ? { key: 'items.readout.once', params: { date, time: start } } : { key: 'items.readout.onceNoDay', params: { time: start } }
}

/**
 * The readout's parts, in order: the reading, "priority" when flagged, when
 * it is due, when it is scheduled. The client joins them with " · ".
 */
export const readoutParts = (facts) => {
  const parts = [{ key: `items.reading.${readingOf(facts)}` }]
  if (facts.priority) parts.push({ key: 'items.readout.priority' })
  if (facts.due) parts.push({ key: 'items.readout.due', params: { date: facts.due } })
  const scheduled = scheduledReadout(facts)
  if (scheduled) parts.push(scheduled)
  return parts
}
