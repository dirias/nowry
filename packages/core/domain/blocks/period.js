/**
 * The three periods survive as grouping and default starts, not as objects
 * (PRD D1). A block belongs to a period by its start.
 */
import { minutesOf } from './dates'

export const PERIOD_ORDER = ['morning', 'afternoon', 'evening']

/** The default start a migrated routine item gets, and the sheet's suggestion. */
export const PERIOD_STARTS = { morning: '07:00', afternoon: '13:00', evening: '20:00' }

const NOON = 12 * 60
const SIX_PM = 18 * 60

export const periodOf = (start) => {
  const minutes = minutesOf(start)
  if (minutes < NOON) return 'morning'
  if (minutes < SIX_PM) return 'afternoon'
  return 'evening'
}

/** Occurrences grouped under the three headers, in the day's order. */
export const groupByPeriod = (occurrences) =>
  PERIOD_ORDER.map((period) => ({ period, items: occurrences.filter((o) => periodOf(o.start) === period) }))
