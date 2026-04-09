import { apiClient } from '../client'

/**
 * Public Content Service
 * Handles all public content sharing API operations
 */
export const publicContentService = {
  /**
   * Browse public books
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Paginated results
   */
  async browseBooks(filters = {}) {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.category) params.append('category', filters.category)
    if (filters.tags?.length) params.append('tags', filters.tags.join(','))
    if (filters.language) params.append('language', filters.language)
    if (filters.difficulty) params.append('difficulty', filters.difficulty)
    if (filters.sort_by) params.append('sort_by', filters.sort_by)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.limit) params.append('limit', filters.limit)

    const { data } = await apiClient.get(`/public/books?${params}`)
    return data
  },

  /**
   * Browse public decks
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Paginated results
   */
  async browseDecks(filters = {}) {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.category) params.append('category', filters.category)
    if (filters.tags?.length) params.append('tags', filters.tags.join(','))
    if (filters.language) params.append('language', filters.language)
    if (filters.difficulty) params.append('difficulty', filters.difficulty)
    if (filters.sort_by) params.append('sort_by', filters.sort_by)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.limit) params.append('limit', filters.limit)

    const { data } = await apiClient.get(`/public/decks?${params}`)
    return data
  },

  /**
   * Get single public book by ID
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Book object
   */
  async getPublicBook(id) {
    const { data } = await apiClient.get(`/public/books/${id}`)
    return data
  },

  /**
   * Get single public deck by ID
   * @param {string} id - Deck ID
   * @returns {Promise<Object>} Deck object
   */
  async getPublicDeck(id) {
    const { data } = await apiClient.get(`/public/decks/${id}`)
    return data
  },

  /**
   * Get cards for a public deck (preview)
   * @param {string} deckId - Deck ID
   * @param {Object} options - Query options (limit, etc.)
   * @returns {Promise<Object>} Cards list
   */
  async getDeckCards(deckId, options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.append('limit', options.limit)

    const { data } = await apiClient.get(`/decks/${deckId}/cards?${params}`)
    return data
  },

  /**
   * Get cards for a public deck without ownership required (browse preview)
   * @param {string} deckId - Deck ID
   * @param {number} limit - Max number of cards to return
   * @returns {Promise<Object>} Cards list
   */
  getPublicDeckCards: (deckId, limit = 6) => apiClient.get(`/public/decks/${deckId}/cards`, { params: { limit } }).then((r) => r.data),

  /**
   * Publish a book
   * @param {string} id - Book ID
   * @param {Object} metadata - Public metadata
   * @returns {Promise<Object>} Updated book
   */
  async publishBook(id, metadata) {
    const { data } = await apiClient.post(`/public/books/${id}/publish`, metadata)
    return data
  },

  /**
   * Publish a deck
   * @param {string} id - Deck ID
   * @param {Object} metadata - Public metadata
   * @returns {Promise<Object>} Updated deck
   */
  async publishDeck(id, metadata) {
    const { data } = await apiClient.post(`/public/decks/${id}/publish`, metadata)
    return data
  },

  /**
   * Unpublish a book
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Updated book
   */
  async unpublishBook(id) {
    const { data } = await apiClient.post(`/public/books/${id}/unpublish`)
    return data
  },

  /**
   * Unpublish a deck
   * @param {string} id - Deck ID
   * @returns {Promise<Object>} Updated deck
   */
  async unpublishDeck(id) {
    const { data } = await apiClient.post(`/public/decks/${id}/unpublish`)
    return data
  },

  /**
   * Like a book
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Result
   */
  async likeBook(id) {
    const { data } = await apiClient.post(`/public/books/${id}/like`)
    return data
  },

  /**
   * Unlike a book
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Result
   */
  async unlikeBook(id) {
    const { data } = await apiClient.delete(`/public/books/${id}/like`)
    return data
  },

  /**
   * Like a deck
   * @param {string} id - Deck ID
   * @returns {Promise<Object>} Result
   */
  async likeDeck(id) {
    const { data } = await apiClient.post(`/public/decks/${id}/like`)
    return data
  },

  /**
   * Unlike a deck
   * @param {string} id - Deck ID
   * @returns {Promise<Object>} Result
   */
  async unlikeDeck(id) {
    const { data } = await apiClient.delete(`/public/decks/${id}/like`)
    return data
  },

  /**
   * Fork a book
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Forked book
   */
  async forkBook(id) {
    const { data } = await apiClient.post(`/public/books/${id}/fork`)
    return data
  },

  /**
   * Fork a deck
   * @param {string} id - Deck ID
   * @returns {Promise<Object>} Forked deck
   */
  async forkDeck(id) {
    const { data } = await apiClient.post(`/public/decks/${id}/fork`)
    return data
  },

  /**
   * Get user's liked content
   * @param {string} contentType - 'book' or 'deck' or 'all'
   * @returns {Promise<Array>} Liked content
   */
  async getMyLikes(contentType = 'all') {
    const params = contentType !== 'all' ? `?content_type=${contentType}` : ''
    const { data } = await apiClient.get(`/public/me/liked${params}`)
    return data
  },

  /**
   * Report content
   * @param {string} contentType - 'book' or 'deck'
   * @param {string} contentId - Content ID
   * @param {Object} report - Report data
   * @returns {Promise<Object>} Report result
   */
  async reportContent(contentType, contentId, report) {
    const { data } = await apiClient.post(`/moderation/report/${contentType}/${contentId}`, report)
    return data
  },

  /**
   * Get my reports
   * @returns {Promise<Array>} My reports
   */
  async getMyReports() {
    const { data } = await apiClient.get('/moderation/reports')
    return data
  }
}
