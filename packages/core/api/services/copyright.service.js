import { apiClient } from '../client'

/**
 * The takedown form (GTM-008, ADR-037's missing half). No auth: a rights
 * holder is not a user. The API stores the notice and rate-limits the address.
 */
export const copyrightService = {
  /**
   * @param {{ name: string, email: string, work: string, location: string, statement: boolean, signature: string, locale?: string }} payload
   * @returns {Promise<{ notice_id: string, message: string }>}
   */
  sendNotice: async (payload) => {
    const response = await apiClient.post('/copyright-notices', payload)
    return response.data
  }
}
