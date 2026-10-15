import { useEffect, useRef } from 'react'
import { storage } from '../platform'

/** The marker on the block's source, so a locale change never doubles it. */
export const PLAN_TOMORROW_ID = 'plan-tomorrow'
const OFFERED_KEY = 'nowry_plan_tomorrow_offered'

/**
 * usePlanTomorrowBlock — the evening ritual, offered once (PRD D6, the hooks
 * board). The first time a learner HAS blocks — after the migration, or after
 * their first own block — a five-minute "Plan tomorrow" block at 21:30, every
 * day, with a reminder at its start, is created for them. It is a block like
 * any other: edit it, move it, delete it. Deleted, it stays gone: the device
 * remembers it was offered.
 */
export function usePlanTomorrowBlock({ blocks, create, title, enabled = true }) {
  const done = useRef(false)
  useEffect(() => {
    if (!enabled || done.current || !Array.isArray(blocks) || blocks.length === 0 || !title) return
    if (blocks.some((b) => b.source?.id === PLAN_TOMORROW_ID)) return
    let offered = false
    try {
      offered = storage.get(OFFERED_KEY) === 'yes'
    } catch {
      offered = false
    }
    if (offered) return
    done.current = true
    try {
      storage.set(OFFERED_KEY, 'yes')
    } catch {
      // Offered once this session, then.
    }
    Promise.resolve(
      create({
        title,
        source: { type: 'routine', id: PLAN_TOMORROW_ID },
        start: '21:30',
        lengthMin: 5,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        reminderMin: 0
      })
    ).catch(() => {})
  }, [blocks, create, title, enabled])
}

export default usePlanTomorrowBlock
