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
   * Get all study cards
   */
  async getAll() {
    const { data } = await apiClient.get(ENDPOINTS.studyCards.all)
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
   * Get study statistics
   */
  async getStatistics() {
    const { data } = await apiClient.get('/study-cards/statistics')
    return data
  }
}
