import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'
import { DEFAULT_CARD_GEN_PROMPT } from '../../constants/prompts'

/**
 * Study Cards Service
 * Handles AI-powered study card generation and manual CRUD
 */
export const cardsService = {
  /**
   * Generate study cards from text using AI
   * @param {string} sampleText - Text to generate cards from
   * @param {number} sampleNumber - Number of cards to generate
   * @param {string} prompt - Optional custom prompt for generation
   * @returns {Promise<Array>} Array of generated study cards
   */
  async generate(sampleText, sampleNumber, prompt = null) {
    const generationPrompt = prompt || process.env.REACT_APP_CARD_GENERATION_PROMPT || DEFAULT_CARD_GEN_PROMPT

    const { data } = await apiClient.post(ENDPOINTS.studyCards.generate, {
      prompt: generationPrompt,
      sampleText,
      sampleNumber
    })

    return data
  },

  /**
   * Generate flashcards from full book content (Plus+ only)
   * @param {string} bookId - Book ID
   * @returns {Promise<{cards: Array<{title: string, content: string}>}>}
   */
  async generateFromBook(bookId) {
    const { data } = await apiClient.post(ENDPOINTS.studyCards.generateFromBook, {
      book_id: bookId,
    })
    return data
  },

  /**
   * Run AI deck analysis: duplicates, gaps, rewrite suggestions (Pro only)
   * @param {string} deckId - Deck ID
   * @returns {Promise<{duplicates: Array, gaps: Array, rewrite_suggestions: Array}>}
   */
  async analyzeDeck(deckId) {
    const { data } = await apiClient.post(ENDPOINTS.studyCards.analyzeDeck, {
      deck_id: deckId,
    })
    return data
  },

  /**
   * Get paginated study cards
   * @param {number} skip - Offset for pagination
   * @param {number} limit - Number of cards to fetch
   * @param {string[]} tags - Optional tag filters (OR logic on backend)
   * @param {string} search - Optional search query (server-side, title/content/tags/deck)
   */
  async getAll(skip = 0, limit = 50, tags = [], search = '') {
    const params = new URLSearchParams({ skip, limit })
    tags.forEach((t) => params.append('tags', t))
    if (search) params.append('search', search)
    const { data } = await apiClient.get(`${ENDPOINTS.studyCards.all}?${params}`)
    return data
  },

  /**
   * Get all tags used across the user's cards with their counts
   * @returns {Promise<Array<{tag: string, count: number}>>}
   */
  async getTags() {
    const { data } = await apiClient.get('/study-cards/tags')
    return data
  },

  /**
   * Create a manual study card
   */
  async create(cardData) {
    const { data } = await apiClient.post(ENDPOINTS.studyCards.create, cardData)
    return data
  },

  /**
   * Update an existing card
   */
  async update(id, updates) {
    const { data } = await apiClient.patch(ENDPOINTS.studyCards.update(id), updates)
    return data
  },

  /**
   * Delete a card
   */
  async delete(id) {
    const { data } = await apiClient.delete(ENDPOINTS.studyCards.delete(id))
    return data
  },

  /**
   * Review a card with SM-2 grading
   * @param {string} id - Card ID
   * @param {string} grade - Grade: 'again', 'hard', 'good', or 'easy'
   */
  async review(id, grade) {
    const { data } = await apiClient.post(`/study-cards/${id}/review?grade=${grade}`)
    return data
  },

  /**
   * Get due cards for a specific deck directly from the API
   * @param {string} deckId - Deck ID to fetch due cards for
   * @returns {Promise<Array>} Array of due study cards
   */
  async getDueCards(deckId) {
    const params = new URLSearchParams({ deck_id: deckId, due_only: 'true', limit: 500 })
    const { data } = await apiClient.get(`${ENDPOINTS.studyCards.all}?${params}`)
    return data.cards || []
  },

  /**
   * Get today's locked daily review session across all active decks.
   * The selection is sticky for the day on the backend (introduced_at stamp),
   * so the same cards reappear across sessions until graded.
   * @returns {Promise<Array>} Array of cards (new + due reviews) for today
   */
  async getDailyReviewCards() {
    const { data } = await apiClient.get('/study-cards/daily-review')
    return data.cards || []
  },

  /**
   * Get study statistics
   */
  async getStatistics() {
    const { data } = await apiClient.get('/study-cards/statistics')
    return data
  }
}
