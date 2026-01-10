import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'

/**
 * Books Service
 * Handles all book-related API operations
 */
export const booksService = {
  /**
   * Get all books for the current user
   * @returns {Promise<Array>} Array of books
   */
  async getAll() {
    const { data } = await apiClient.get(ENDPOINTS.books.all)
    return data
  },

  /**
   * Get a single book by ID
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Book object with pages
   */
  async getById(id) {
    const { data } = await apiClient.get(ENDPOINTS.books.byId(id))
    return data
  },

  /**
   * Create a new book
   * @param {Object} bookData - Book data
   * @param {string} bookData.title - Book title
   * @param {string} bookData.author - Author name
   * @param {string} bookData.isbn - ISBN number
   * @returns {Promise<Object>} Created book
   */
  async create({ title, author, isbn }) {
    const { data } = await apiClient.post(ENDPOINTS.books.create, {
      title,
      author,
      isbn
    })
    return data
  },

  /**
   * Update an existing book
   * @param {string} id - Book ID
   * @param {Object} updates - Fields to update
   * @param {string} updates.title - Book title
   * @param {string} updates.coverColor - Cover color
   * @param {string} updates.coverImage - Cover image URL
   * @param {string} updates.summary - Book summary
   * @param {Array} updates.tags - Book tags
   * @param {boolean} updates.auto_save_enabled - Auto-save preference
   * @returns {Promise<Object>} Updated book
   */
  async update(id, { title, coverColor, coverImage, summary, tags, full_content, page_size, auto_save_enabled }) {
    const payload = {}

    // Only include fields that are defined
    if (title !== undefined) payload.title = title
    if (coverColor !== undefined) payload.cover_color = coverColor
    if (coverImage !== undefined) payload.cover_image = coverImage
    if (summary !== undefined) payload.summary = summary
    if (tags !== undefined) payload.tags = tags
    if (full_content !== undefined) payload.full_content = full_content
    if (page_size !== undefined) payload.page_size = page_size
    if (auto_save_enabled !== undefined) payload.auto_save_enabled = auto_save_enabled

    const { data } = await apiClient.put(ENDPOINTS.books.update(id), payload)
    return data
  },

  /**
   * Delete a book
   * @param {string} id - Book ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    const { data } = await apiClient.delete(ENDPOINTS.books.delete(id))
    return data
  },

  /**
   * Search books by title
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of matching books
   */
  async search(searchTerm) {
    const { data } = await apiClient.get(ENDPOINTS.books.search, {
      params: { title: searchTerm }
    })
    return data
  },

  /**
   * Import a book from file (PDF, DOCX, TXT)
   * @param {File} file - File to import
   * @param {string} username - Current user's username
   * @param {boolean} preview - If true, returns preview for validation
   * @param {string} title - Optional override title
   * @returns {Promise<Object>} Created book with pages or preview data
   */
  async importFile(file, username, preview = false, title = null) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('username', username)
    formData.append('preview', preview.toString())
    if (title) formData.append('title', title)

    const { data } = await apiClient.post('/book/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return data
  }
}
