/**
 * Lightweight in-memory TTL cache for API responses.
 *
 * Eliminates redundant API calls when multiple components on the same
 * page need the same data (e.g. annual plan fetched by both CalendarModal
 * and EventFormModal).
 *
 * Usage:
 *   import { apiCache } from '../utils/cache'
 *
 *   const plan = await apiCache.get('annualPlan:2026', 5 * 60 * 1000, () =>
 *     annualPlanningService.getAnnualPlan(2026)
 *   )
 */

const store = new Map() // key → { data, expiresAt }

export const apiCache = {
  /**
   * Return cached value if fresh, otherwise call fetcher(), cache, and return.
   * @param {string} key - Cache key
   * @param {number} ttlMs - Time-to-live in milliseconds
   * @param {() => Promise<any>} fetcher - Async function to fetch data
   */
  async get(key, ttlMs, fetcher) {
    const hit = store.get(key)
    if (hit && Date.now() < hit.expiresAt) {
      return hit.data
    }
    const data = await fetcher()
    store.set(key, { data, expiresAt: Date.now() + ttlMs })
    return data
  },

  /** Explicitly invalidate a cache entry */
  invalidate(key) {
    store.delete(key)
  },

  /** Invalidate all entries whose keys start with a given prefix */
  invalidatePrefix(prefix) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key)
    }
  },

  /** Clear the entire cache */
  clear() {
    store.clear()
  }
}
