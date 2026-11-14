import { apiClient } from '../client'
import { isLogKind } from '../../domain/adminLog'

/**
 * The admin Overview and the admin log (ADMIN-007c, FR-011, boards A and K).
 *
 * Admins only (403 otherwise). Both screens draw their own error, so a
 * refusal raises no global toast.
 */
const OWN_ERRORS = { suppressErrorToast: true }

/** How many log rows one page asks for. */
export const ADMIN_LOG_PAGE = 50

const logParams = ({ kind, before, limit } = {}) => ({
  ...(isLogKind(kind) ? { kind } : {}),
  ...(before ? { before } : {}),
  limit: Math.min(Number(limit) || ADMIN_LOG_PAGE, ADMIN_LOG_PAGE)
})

export const adminOverviewService = {
  /**
   * @returns {Promise<{needs: Object, emails_today: Object, recent_actions: Object[]}>}
   */
  getOverview: async () => {
    const { data } = await apiClient.get('/admin/overview', OWN_ERRORS)
    return data
  },

  /**
   * One page of the log, newest first.
   * @param {{kind?: 'invitations'|'moderation'|'bugs'|'access', before?: string, limit?: number}} [filters]
   * @returns {Promise<{actions: Object[], next_before: string|null}>}
   */
  listActions: async (filters) => {
    const { data } = await apiClient.get('/admin/actions', { ...OWN_ERRORS, params: logParams(filters) })
    return data
  }
}
