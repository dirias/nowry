import { readingOf, repeats, scheduledDate } from './facts'

/**
 * What the sheet says back (PRD D2): the header's readout and the key's
 * label, as KEYS and parameters (ADR-031) for each client's `t`.
 */

/** "Add task" / "Add routine" / "Add milestone" / "Add study time"; "Save" in edit. */
export const keyLabel = (facts, { edit = false } = {}) => (edit ? { key: 'items.key.save' } : { key: `items.key.add.${readingOf(facts)}` })

/**
 * The readout's parts, in order: the reading, "priority" when flagged, when
 * it is due, when it is scheduled. The client joins them with " · ".
 */
export const readoutParts = (facts) => {
  const parts = [{ key: `items.reading.${readingOf(facts)}` }]
  if (facts.priority) parts.push({ key: 'items.readout.priority' })
  if (facts.due) parts.push({ key: 'items.readout.due', params: { date: facts.due } })
  if (facts.scheduled) {
    const { start, daysOfWeek } = facts.scheduled
    if (repeats(facts.scheduled)) {
      const weekdays = [0, 1, 2, 3, 4].every((d) => daysOfWeek.includes(d)) && daysOfWeek.length === 5
      const every = daysOfWeek.length === 7
      parts.push(
        every
          ? { key: 'items.readout.everyDay', params: { time: start } }
          : weekdays
            ? { key: 'items.readout.weekdays', params: { time: start } }
            : { key: 'items.readout.someDays', params: { time: start, count: daysOfWeek.length } }
      )
    } else {
      const date = scheduledDate(facts)
      parts.push(
        date ? { key: 'items.readout.once', params: { date, time: start } } : { key: 'items.readout.onceNoDay', params: { time: start } }
      )
    }
  }
  return parts
}
