/**
 * The item (ADR-046): a title and four optional facts. Nothing here is a
 * kind; the kind is read off the facts by `readingOf`.
 *
 * @typedef {object} Scheduled
 * @property {string} start        local "HH:MM"
 * @property {number} lengthMin
 * @property {number[]} daysOfWeek Monday-first weekday numbers; [] for once
 * @property {string|null} date    the one day, when `daysOfWeek` is empty
 *
 * @typedef {object} Facts
 * @property {string} title
 * @property {string|null} due          local "YYYY-MM-DD"
 * @property {Scheduled|null} scheduled
 * @property {boolean} priority
 * @property {string|null} goalId       part of a goal
 * @property {'study'|null} origin      made from the Study Center: the study time
 */

export const EMPTY_FACTS = Object.freeze({ title: '', due: null, scheduled: null, priority: false, goalId: null, origin: null })

/** A complete Facts from a partial one; the sheet starts from this. */
export const factsFrom = (partial = {}) => ({ ...EMPTY_FACTS, ...partial })

/** Scheduled on repeat, as opposed to once. */
export const repeats = (scheduled) => Boolean(scheduled) && (scheduled.daysOfWeek?.length ?? 0) > 0

/**
 * The reading (PRD D2). Part of a goal → a milestone. Made from the Study
 * Center → the study time. Scheduled on repeat and not due → a routine item.
 * Anything else → a task. Priority is never a kind; the readout says it
 * beside the reading.
 */
export const readingOf = (facts) => {
  if (facts.goalId) return 'milestone'
  if (facts.origin === 'study') return 'study'
  if (repeats(facts.scheduled) && !facts.due) return 'routine'
  return 'task'
}

/** When a scheduled-once item names no day, it is scheduled on its due day (D3). */
export const scheduledDate = (facts) => {
  if (!facts.scheduled || repeats(facts.scheduled)) return null
  return facts.scheduled.date || facts.due || null
}

/**
 * What the facts are missing before they can be written. Keys are what the
 * sheet shows under the field; an empty list is a valid item.
 */
export const missingIn = (facts) => {
  const missing = []
  if (!facts.title?.trim()) missing.push('title')
  if (facts.scheduled && !repeats(facts.scheduled) && !scheduledDate(facts)) missing.push('date')
  return missing
}
