/**
 * Shared constants for the `dailyRoutine` apiCache entry.
 *
 * DailyRoutinePlanner.js, SideMenu.js, and AnnualPlanningHome.js all read/write
 * the same `apiCache` entry so that a mutation on any of the three surfaces
 * keeps the others in sync (see 26-REVIEW.md CR-01/WR-07). Previously the cache
 * key, TTL, and todayKey() helper were independently redefined in each file —
 * an implicit, unenforced contract that could silently desync if one copy
 * drifted. Import from here instead of redefining locally.
 *
 * Usage:
 *   import { ROUTINE_CACHE_KEY, ROUTINE_TTL, todayKey } from '../../api/utils/routineCache'
 */

export const ROUTINE_CACHE_KEY = 'dailyRoutine'
export const ROUTINE_TTL = 2 * 60000 // 2 minutes

// Today's date as 'YYYY-MM-DD' — used as the key in daily_completions
export const todayKey = () => new Date().toISOString().slice(0, 10)
