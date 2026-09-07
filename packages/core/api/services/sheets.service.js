import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'

/**
 * Sheets Service
 * Handles all Micro Sheets CRUD API operations.
 * Backend: Nowry-API/app/routers/sheets.py (08-02-PLAN)
 */
const sheetsService = {
  /**
   * List all sheets for the current user.
   * @returns {Promise<Array>} Array of SheetSummary objects
   */
  async listSheets() {
    const { data } = await apiClient.get(ENDPOINTS.sheets.all)
    return data
  },

  /**
   * Create a new sheet.
   * @param {Object} payload
   * @param {string} payload.title
   * @param {Array} payload.data - Matrix of CellBase objects
   * @param {Array} payload.column_labels - Column label strings
   * @returns {Promise<Object>} Created Sheet object
   */
  async createSheet(payload) {
    const { data } = await apiClient.post(ENDPOINTS.sheets.create, payload)
    return data
  },

  /**
   * Get a single sheet by ID.
   * @param {string} sheetId
   * @returns {Promise<Object>} Sheet object with full data matrix
   */
  async getSheet(sheetId) {
    const { data } = await apiClient.get(ENDPOINTS.sheets.byId(sheetId))
    return data
  },

  /**
   * Partial update a sheet (title, data, column_labels).
   * @param {string} sheetId
   * @param {Object} payload - Partial SheetUpdate fields
   * @returns {Promise<Object>} Updated Sheet object
   */
  async updateSheet(sheetId, payload) {
    const { data } = await apiClient.put(ENDPOINTS.sheets.update(sheetId), payload)
    return data
  },

  /**
   * Soft-delete a sheet (sets deleted_at on backend).
   * @param {string} sheetId
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteSheet(sheetId) {
    const { data } = await apiClient.delete(ENDPOINTS.sheets.delete(sheetId))
    return data
  }
}

export default sheetsService
