import { apiClient } from '../client'
import { NOTE_MAX } from '../../domain/moderation'

/**
 * The admin moderation calls (ADMIN-003, FR-004, FR-011 Moderation, board B).
 *
 * Admins only (403 otherwise); both writes need a sign-in from the last 12
 * hours (401 `reauth_required`, FR-010). The Moderation tab draws its own
 * refusals, so none of them raises the global toast.
 */
const OWN_ERRORS = { suppressErrorToast: true }

/** The most items the tab asks for in one state. */
export const MODERATION_QUEUE_LIMIT = 100

const itemPath = (contentType, contentId) => `/moderation/admin/queue/${encodeURIComponent(contentType)}/${encodeURIComponent(contentId)}`

export const adminModerationService = {
  /**
   * @param {{state?: 'to_review'|'kept'|'removed', limit?: number}} [filters]
   * @returns {Promise<{items: Object[], totals: {to_review: number, kept: number, removed: number}}>}
   */
  listQueue: async ({ state, limit } = {}) => {
    const params = {
      ...(state ? { state } : {}),
      limit: Math.min(Number(limit) || MODERATION_QUEUE_LIMIT, MODERATION_QUEUE_LIMIT)
    }
    const { data } = await apiClient.get('/moderation/admin/queue', { ...OWN_ERRORS, params })
    return data
  },

  /** Keep an item public: its open reports are dismissed. @returns {Promise<{dismissed: number}>} */
  keep: async (contentType, contentId) => {
    const { data } = await apiClient.post(`${itemPath(contentType, contentId)}/keep`, {}, OWN_ERRORS)
    return data
  },

  /**
   * Unpublish an item and its public copies, for good (ADR-087).
   * @param {{reason: string, note?: string}} removal
   * @returns {Promise<{removed: Object[], copies_removed: number, owners_told: number, owners_not_told: number}>}
   */
  remove: async (contentType, contentId, { reason, note } = {}) => {
    const trimmed = String(note ?? '')
      .trim()
      .slice(0, NOTE_MAX)
    const body = { reason, ...(trimmed ? { note: trimmed } : {}) }
    const { data } = await apiClient.post(`${itemPath(contentType, contentId)}/remove`, body, OWN_ERRORS)
    return data
  }
}
