import { apiClient } from '../client'

/**
 * Study Cards Service
 * Handles AI-powered study card generation
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
    const generationPrompt = prompt || import.meta.env.VITE_CARD_GENERATION_PROMPT

    const { data } = await apiClient.post('/card/generate', {
      prompt: generationPrompt,
      sampleText,
      sampleNumber
    })

    return data
  }
}
