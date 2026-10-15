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
 * It is the SAME key `domain/dailyRoutine.js` reads completions back with: for
 * a while this file keyed by the UTC date (`toISOString`) while the domain
 * keyed by the local one, so a tick made after 17:00 in Los Angeles was
 * written under tomorrow and read back from today (PLAN-010). One key, local.
 *
 * Usage:
 *   import { todayKey } from '../../api/utils/routineCache'
 */

export { todayKey } from '../../domain/dailyRoutine'
