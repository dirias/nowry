import { apiClient } from '../client'

/**
 * Bug Reporting Service
 * Handles all bug report related API calls
 */
export const bugsService = {
  /**
   * Submit a new bug report
   * @param {Object} bugData - Bug report data
   * @returns {Promise} Bug report response with bug_id
   */
  submitBug: async (bugData) => {
    const response = await apiClient.post('/bugs', bugData)
    return response.data
  },

  /**
   * Get all bug reports submitted by the current user
   * @returns {Promise<Array>} List of bug reports
   */
  getMyReports: async () => {
    const response = await apiClient.get('/bugs/my-reports')
    return response.data
  },

  /**
   * Get a specific bug report by ID
   * @param {string} bugId - Bug report ID
   * @returns {Promise<Object>} Bug report details
   */
  getBugById: async (bugId) => {
    const response = await apiClient.get(`/bugs/${bugId}`)
    return response.data
  },

  /**
   * Delete a bug report
   * @param {string} bugId - Bug report ID
   * @returns {Promise} Deletion confirmation
   */
  deleteBug: async (bugId) => {
    const response = await apiClient.delete(`/bugs/${bugId}`)
    return response.data
  },

  // ========== DEVELOPER-ONLY METHODS ==========

  /**
   * Get all bugs with filters (Dev only)
   * @param {Object} filters - Filter options {status, severity, category}
   * @returns {Promise<Array>} List of all bug reports
   */
  getAllBugs: async (filters = {}) => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.severity) params.severity = filters.severity
    if (filters.category) params.category = filters.category

    const response = await apiClient.get('/bugs/all', { params })
    return response.data
  },

  /**
   * Get bug statistics (Dev only)
   * @returns {Promise<Object>} Bug statistics
   */
  getBugStats: async () => {
    const response = await apiClient.get('/bugs/stats')
    return response.data
  },

  /**
   * Update bug status (Dev only)
   * @param {string} bugId - Bug report ID
   * @param {Object} statusData - {status, priority, notes}
   * @returns {Promise<Object>} Update confirmation
   */
  updateBugStatus: async (bugId, statusData) => {
    const response = await apiClient.patch(`/bugs/${bugId}/status`, statusData)
    return response.data
  }
}
