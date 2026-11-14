import { apiClient } from '../client'

/**
 * The admin invitation calls (ADMIN-007a, FR-012, ADR-077 amendment).
 *
 * Every call needs an admin (403 otherwise) and every write a sign-in from the
 * last 12 hours (401 `reauth_required`, FR-010); the Invitations tab draws its
 * own refusals, so none of them raises the global toast.
 */
const OWN_ERRORS = { suppressErrorToast: true }

/** The API answers at most this many invitations per list. */
export const INVITE_LIST_LIMIT = 200

const listParams = ({ state, cohort, limit } = {}) => ({
  ...(state ? { state } : {}),
  ...(cohort ? { cohort } : {}),
  limit: Math.min(Number(limit) || INVITE_LIST_LIMIT, INVITE_LIST_LIMIT)
})

export const adminInvitesService = {
  /**
   * @returns {Promise<{cohorts: string[], default_cohort: string, lifetimes: number[], default_lifetime: number, invitations_left_today: number}>}
   */
  getCohorts: async () => {
    const { data } = await apiClient.get('/beta/admin/cohorts', OWN_ERRORS)
    return data
  },

  /**
   * @param {{state?: 'open'|'used'|'revoked'|'expired', cohort?: string, limit?: number}} [filters]
   * @returns {Promise<{invites: Object[], counts: Object, totals: Object}>}
   */
  listInvites: async (filters) => {
    const { data } = await apiClient.get('/beta/admin/invites', { ...OWN_ERRORS, params: listParams(filters) })
    return data
  },

  /**
   * A dry run checks every address; a send emails the ones that can be invited.
   * Over today's budget a send is refused whole with 409 `over_budget`.
   * Waitlist rows go by their ids (WAIT-006), each in its own language, so
   * `addresses` and `locale` may be left out.
   * @param {{addresses?: string[], waitlistIds?: string[], cohort: string, expiresInDays: number, locale?: string, dryRun: boolean}} batch
   */
  sendBatch: async ({ addresses, waitlistIds, cohort, expiresInDays, locale, dryRun }) => {
    const body = {
      ...(addresses ? { addresses } : {}),
      ...(waitlistIds ? { waitlist_ids: waitlistIds } : {}),
      cohort,
      expires_in_days: expiresInDays,
      ...(locale ? { locale } : {}),
      dry_run: Boolean(dryRun)
    }
    const { data } = await apiClient.post('/beta/admin/invites/batch', body, OWN_ERRORS)
    return data
  },

  /** Resend (open or expired) or invite again (revoked): a new link, emailed; 429 `resend_too_soon`. */
  resend: async (inviteId) => {
    const { data } = await apiClient.post(`/beta/admin/invites/${encodeURIComponent(inviteId)}/resend`, null, OWN_ERRORS)
    return data
  },

  /** Revoke an open invitation: its link stops working at once. */
  revoke: async (inviteId) => {
    const { data } = await apiClient.post(`/beta/admin/invites/${encodeURIComponent(inviteId)}/revoke`, null, OWN_ERRORS)
    return data
  }
}
