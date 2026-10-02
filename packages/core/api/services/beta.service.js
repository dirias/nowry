import { apiClient } from '../client'
import { normalizeBetaConfig } from '../../domain/beta'

/**
 * The beta gate's three public calls (ADR-038).
 *
 * None needs auth: the config decides what a visitor sees, an invite is
 * checked before an account exists, and the waitlist is for people who were
 * not let in. The enforcement is not here; it is where accounts are created.
 */
export const betaService = {
  /** @returns {Promise<{ active: boolean, invite_required: boolean, upgrades_open: boolean }>} */
  getConfig: async () => {
    const { data } = await apiClient.get('/beta/config')
    return normalizeBetaConfig(data)
  },

  /**
   * @param {string} code
   * @returns {Promise<{ valid: boolean, cohort: string | null }>}
   */
  checkInvite: async (code) => {
    const { data } = await apiClient.post('/beta/invites/check', { code: String(code ?? '').trim() })
    return data
  },

  /**
   * @param {{ email: string, locale?: string, source?: string }} payload
   * @returns {Promise<{ message: string }>}
   */
  joinWaitlist: async (payload) => {
    const { data } = await apiClient.post('/beta/waitlist', payload)
    return data
  }
}
