import { apiClient } from '../client'

/**
 * The admin waitlist read (WAIT-002, FR-012, board E).
 *
 * Admins only (403 otherwise). Rows come oldest first, bounded; the tab draws
 * its own error, so a refusal raises no global toast. Inviting rows is the
 * batch call in `adminInvites.service` with `waitlistIds`.
 */
const OWN_ERRORS = { suppressErrorToast: true }

/** The API answers at most this many rows per list. */
export const WAITLIST_LIST_LIMIT = 200

/** What the API answers when no limit is asked for. */
export const WAITLIST_DEFAULT_LIMIT = 100

const listParams = ({ state, locale, source, limit } = {}) => ({
  ...(state ? { state } : {}),
  ...(locale ? { locale } : {}),
  ...(source ? { source } : {}),
  limit: Math.min(Number(limit) || WAITLIST_DEFAULT_LIMIT, WAITLIST_LIST_LIMIT)
})

export const adminWaitlistService = {
  /**
   * @param {{state?: 'waiting'|'invited'|'joined'|'left', locale?: string, source?: string, limit?: number}} [filters]
   * @returns {Promise<{rows: Object[], totals: {waiting: number, invited: number, joined: number, left: number},
   *   locales: Object<string, number>, sources: string[]}>}
   */
  listWaitlist: async (filters) => {
    const { data } = await apiClient.get('/beta/admin/waitlist', { ...OWN_ERRORS, params: listParams(filters) })
    return data
  }
}
