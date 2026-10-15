/**
 * The companion speaks from the log (PLAN-009, the hooks board).
 *
 * Three moments, each read from the block log and nothing else, so nothing is
 * said that the record does not show:
 *
 *   - `kept_after_skips`: a recurring block kept today whose last two
 *     scheduled days were not kept (skipped, or simply missed).
 *   - `week_kept`: this week, Monday to today, has at least five planned
 *     occurrences and four in five of them kept (a partial counts half).
 *   - `under_estimate`: a study block kept today in fewer minutes than it
 *     was given, with at least one card on its record.
 *
 * Each moment carries a `key` the server dedups on, so a device that already
 * said it, or another device, says it once.
 */
import { addDaysKey, weekdayOf } from './dates'
import { occursOn } from './occurrences'

export const MOMENT_REASONS = ['kept_after_skips', 'week_kept', 'under_estimate']
export const WEEK_MIN_PLANNED = 5
export const WEEK_KEPT_RATE = 0.8
const LOOKBACK_DAYS = 60

/** The ISO-style week key of a date key: the Monday that starts its week. */
export const weekKeyOf = (key) => addDaysKey(key, -weekdayOf(key))

const logsByBlockDate = (occurrences) => {
  const map = new Map()
  for (const o of occurrences) if (o.log) map.set(`${o.blockId}|${o.date}`, o.log)
  return map
}

const previousScheduled = (block, fromKey, count) => {
  const days = []
  let key = addDaysKey(fromKey, -1)
  for (let walked = 0; walked < LOOKBACK_DAYS && days.length < count; walked += 1) {
    if (occursOn(block, key)) days.push(key)
    key = addDaysKey(key, -1)
  }
  return days
}

const keptAfterSkips = (occurrences, todayKey, logs) =>
  occurrences
    .filter((o) => o.date === todayKey && o.log?.status === 'kept' && o.block && (o.block.daysOfWeek ?? []).length > 0)
    .filter((o) => {
      const before = previousScheduled(o.block, todayKey, 2)
      return before.length === 2 && before.every((key) => logs.get(`${o.blockId}|${key}`)?.status !== 'kept')
    })
    .map((o) => ({
      reason: 'kept_after_skips',
      key: `kept_after_skips:${o.blockId}:${todayKey}`,
      params: { title: o.title || o.block.title || '' }
    }))

const weekKept = (occurrences, todayKey) => {
  const monday = weekKeyOf(todayKey)
  const week = occurrences.filter((o) => o.date >= monday && o.date <= todayKey)
  const planned = week.length
  if (planned < WEEK_MIN_PLANNED) return []
  const kept = week.filter((o) => o.log?.status === 'kept').length
  const partial = week.filter((o) => o.log?.status === 'partial').length
  if ((kept + partial / 2) / planned < WEEK_KEPT_RATE) return []
  return [{ reason: 'week_kept', key: `week_kept:${monday}`, params: { kept, planned } }]
}

const underEstimate = (occurrences, todayKey) =>
  occurrences
    .filter(
      (o) =>
        o.date === todayKey &&
        o.block?.source?.type === 'study' &&
        o.log?.status === 'kept' &&
        o.log.minutes > 0 &&
        o.log.minutes < o.lengthMin &&
        (o.log.record?.cards ?? 0) >= 1
    )
    .map((o) => ({
      reason: 'under_estimate',
      key: `under_estimate:${o.blockId}:${todayKey}`,
      params: { title: o.title || o.block.title || '', minutes: o.log.minutes, estimate: o.lengthMin }
    }))

/**
 * Every moment the log supports today, soonest-earned first. `occurrences`
 * is the recent history with logs attached (the Day view's sixty days).
 */
export const blockMoments = (occurrences, todayKey) => {
  const rows = occurrences ?? []
  const logs = logsByBlockDate(rows)
  return [...keptAfterSkips(rows, todayKey, logs), ...underEstimate(rows, todayKey), ...weekKept(rows, todayKey)]
}
