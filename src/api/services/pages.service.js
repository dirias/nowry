import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'

/**
 * Pages Service
 * Handles all page-related API operations
 */
export const pagesService = {
  /**
   * Save a book page
   * @param {Object} pageData - Page data
   * @param {number} pageData.page_number - Page number
   * @param {string} pageData.book_id - Book ID
   * @param {string} pageData.content - Page content (HTML)
   * @param {number} pageData.word_count - Word count
   * @returns {Promise<Object>} Saved page
   */
  async savePage(pageData) {
    const { data } = await apiClient.post(ENDPOINTS.pages.save, pageData)
    return data
  }
}
