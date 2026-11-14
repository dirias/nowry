import { apiClient } from '../client'

/**
 * The bug report calls (BUG-001, ADMIN-008a, ADMIN-007b; FR-007, FR-008, FR-011 Bug reports).
 *
 * `submit` is open to every signed-in account while the beta is on; the rest
 * are the admin's (403 otherwise), and `updateStatus` needs a sign-in from the
 * last 12 hours (401 `reauth_required`, FR-010). Both screens draw their own
 * refusals, so none of them raises the global toast.
 */
const OWN_ERRORS = { suppressErrorToast: true }

/** The most reports the Bug reports tab asks for in one state. */
export const BUG_LIST_LIMIT = 100

export const bugsService = {
  /**
   * Send a report. Refusals: 403 `reports_closed`, 413 `too_large` with its
   * `field`, 429 `daily_limit` with `retry_at`.
   * @param {Object} body - title, description, steps_to_reproduce, severity, category, url,
   *   browser_info, screenshots, platform, app_version, device
   * @returns {Promise<{bug_id: string, message: string, status: string, created_at: string}>}
   */
  submit: async (body) => {
    const { data } = await apiClient.post('/bugs', body, OWN_ERRORS)
    return data
  },

  /**
   * The reports in one state, newest first (admin).
   * @param {{status?: 'new'|'in_progress'|'fixed'|'wont_fix', limit?: number}} [filters]
   * @returns {Promise<Object[]>}
   */
  list: async ({ status, limit } = {}) => {
    const params = {
      ...(status ? { status } : {}),
      limit: Math.min(Number(limit) || BUG_LIST_LIMIT, BUG_LIST_LIMIT)
    }
    const { data } = await apiClient.get('/bugs/all', { ...OWN_ERRORS, params })
    return Array.isArray(data) ? data : []
  },

  /** The counts by state and severity (admin). @returns {Promise<{by_status: Object, by_severity: Object}>} */
  stats: async () => {
    const { data } = await apiClient.get('/bugs/stats', OWN_ERRORS)
    return data
  },

  /**
   * Move a report to a state and/or add a note to its history (admin).
   * @param {string} bugId
   * @param {{status?: string, note?: string}} changes
   * @returns {Promise<Object>} the updated report
   */
  updateStatus: async (bugId, changes) => {
    const { data } = await apiClient.patch(`/bugs/${encodeURIComponent(bugId)}/status`, changes, OWN_ERRORS)
    return data
  }
}
