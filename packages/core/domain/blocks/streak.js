/**
 * A streak belongs to a row, never to the app (the hooks board). It is read
 * from the log on every render and stored nowhere.
 *
 * Counting walks back from today over the days the block is SCHEDULED on: a
 * day it does not occur is neither a hit nor a break. Today counts when kept
 * and is otherwise ignored (the day is still open); the first scheduled day
 * before that without a kept row ends the count. A partial day keeps the
 * streak alive without lengthening it, the way a rested card is not a lapse.
 */
import { addDaysKey } from './dates'
import { occursOn } from './occurrences'

const MAX_WALK = 366

export const rowStreak = (logs, block, todayKey) => {
  const byDate = new Map((logs ?? []).filter((l) => l.blockId === block.id).map((l) => [l.date, l.status]))
  let streak = 0
  let key = todayKey
  for (let walked = 0; walked < MAX_WALK; walked += 1) {
    if (occursOn(block, key)) {
      const status = byDate.get(key)
      if (status === 'kept') streak += 1
      else if (status === 'partial') {
        /* alive, not longer */
      } else if (key !== todayKey) break
    }
    key = addDaysKey(key, -1)
  }
  return streak
}
