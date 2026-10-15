/**
 * The forecast sizes the study block (PRD D4, ADR-045 §4).
 *
 * About forty seconds a card, rounded to the five-minute grid, never under
 * five: a learner's review pace in this app measured on the session log sits
 * between thirty and fifty seconds, and a block is a budget, not a stopwatch.
 */
export const SECONDS_PER_CARD = 40
export const MIN_BLOCK_MINUTES = 5
export const BLOCK_STEP = 5

export const studyBlockLength = (due) => {
  const cards = Math.max(0, Number(due) || 0)
  const minutes = (cards * SECONDS_PER_CARD) / 60
  return Math.max(MIN_BLOCK_MINUTES, Math.round(minutes / BLOCK_STEP) * BLOCK_STEP)
}

/** The forecast's due count for a date key, or today's from the statistics. */
export const dueOn = (key, todayKey, dueToday, forecastDays = []) => {
  if (key === todayKey) return dueToday ?? 0
  return forecastDays.find((d) => d.date === key)?.due ?? 0
}
