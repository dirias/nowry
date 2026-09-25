import { apiClient } from '../client'

/**
 * The public contact form (docs/prd-public-site.md D6, ADR-035 §6).
 *
 * No auth: a visitor writes before they have an account. The API stores the
 * message and rate-limits the address; nothing is simulated on the client.
 */
export const contactService = {
  /**
   * @param {{ name: string, email: string, message: string, locale?: string, page?: string }} payload
   * @returns {Promise<{ message_id: string, message: string }>}
   */
  send: async (payload) => {
    const response = await apiClient.post('/contact', payload)
    return response.data
  }
}
