/**
 * Shared `daily_completions` date-key helper.
 *
 * DailyRoutinePlanner.js, SideMenu.js, and AnnualPlanningLayout.js all key today's
 * routine completions by this date string. Previously this file also exported
 * `ROUTINE_CACHE_KEY`/`ROUTINE_TTL` for the shared `apiCache` entry the three
 * files read/invalidated directly — that cache entry has been replaced by
 * `hooks/useDailyRoutine.js` (React Query, CACHE-007 / ADR-008), so those two
 * constants were removed. `todayKey()` is unrelated to caching (it's a plain
 * date-formatting helper for the `daily_completions` map) and stays.
 *
 * Usage:
 *   import { todayKey } from '../../api/utils/routineCache'
 */

// Today's date as 'YYYY-MM-DD' — used as the key in daily_completions
export const todayKey = () => new Date().toISOString().slice(0, 10)
