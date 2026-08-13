/**
 * Lightweight in-memory TTL cache for API responses.
 *
 * Eliminates redundant API calls when multiple components on the same
 * page need the same data (e.g. annual plan fetched by both CalendarModal
 * and EventFormModal).
 *
 * Key feature: in-flight deduplication — if multiple components call
 * get() simultaneously with the same key (e.g. on home mount), they all
 * share a single Promise instead of firing separate API requests.
 *
 * Usage:
 *   import { apiCache } from '../utils/cache'
 *
 *   const plan = await apiCache.get('annualPlan:2026', 5 * 60 * 1000, () =>
 *     annualPlanningService.getAnnualPlan(2026)
 *   )
 */

const store = new Map() // key → { data, expiresAt }
const inFlight = new Map() // key → Promise (for deduplication)

export const apiCache = {
  /**
   * Return cached value if fresh, otherwise call fetcher(), cache, and return.
   * Concurrent calls to the same key share a single in-flight Promise.
   * @param {string} key - Cache key
   * @param {number} ttlMs - Time-to-live in milliseconds
   * @param {() => Promise<any>} fetcher - Async function to fetch data
   */
  async get(key, ttlMs, fetcher) {
    // 1. Cache hit — return immediately
    const hit = store.get(key)
    if (hit && Date.now() < hit.expiresAt) {
      return hit.data
    }

    // 2. In-flight deduplication — if another component already fired this
    //    request, wait on the same Promise instead of creating a new one.
    if (inFlight.has(key)) {
      return inFlight.get(key)
    }

    // 3. Fire the request and register it as in-flight
    const promise = fetcher()
      .then((data) => {
        store.set(key, { data, expiresAt: Date.now() + ttlMs })
        return data
      })
      .finally(() => {
        inFlight.delete(key)
      })

    inFlight.set(key, promise)
    return promise
  },

  /** Explicitly invalidate a cache entry */
  invalidate(key) {
    store.delete(key)
    inFlight.delete(key) // also cancel any in-flight so next call re-fetches
  },

  /** Invalidate all entries whose keys start with a given prefix */
  invalidatePrefix(prefix) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key)
    }
    for (const key of inFlight.keys()) {
      if (key.startsWith(prefix)) inFlight.delete(key)
    }
  },

  /** Synchronously read cached data if it exists and is fresh. Returns null otherwise. */
  peek(key) {
    const hit = store.get(key)
    if (hit && Date.now() < hit.expiresAt) return hit.data
    return null
  },

  /** Clear the entire cache */
  clear() {
    store.clear()
    inFlight.clear()
  }
}
