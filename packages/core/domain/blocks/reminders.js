/**
 * Reminders are per occurrence, local, and in the block's voice (PRD D6,
 * ADR-045 §5). This is the pure part: which occurrences earn one, and when
 * it fires. The platform port schedules; the hook composes the words.
 *
 * A block with no `reminderMin` earns nothing. An occurrence already logged
 * — kept, skipped, partial — earns nothing either: a skipped block is not
 * nagged twice. A fire time already behind the clock is dropped rather than
 * fired late.
 */
import { minutesOf, parseDateKey } from './dates'

/** How far ahead the phone schedules; the schedule is re-planned on every open. */
export const REMINDER_HORIZON_DAYS = 7

/** Where a tapped reminder lands: the Day view. */
export const REMINDER_ROUTE = '/calendar?view=day'

/** The local instant a reminder fires for an occurrence. */
export const fireAt = (date, start, leadMin = 0) => {
  const at = parseDateKey(date)
  at.setMinutes(minutesOf(start) - leadMin, 0, 0)
  return at
}

/**
 * The reminders to stand for a set of occurrences, soonest first.
 * Each item carries the occurrence it is for, so the caller can word it.
 */
export const reminderItems = (occurrences, now = new Date()) =>
  (occurrences ?? [])
    .filter((o) => o.block && o.block.reminderMin != null && !o.log)
    .map((o) => ({
      blockId: o.blockId,
      date: o.date,
      leadMin: o.block.reminderMin,
      fireAt: fireAt(o.date, o.start, o.block.reminderMin),
      occurrence: o
    }))
    .filter((item) => item.fireAt.getTime() > now.getTime())
    .sort((a, b) => a.fireAt - b.fireAt)
