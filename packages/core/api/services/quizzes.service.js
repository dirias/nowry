import { apiClient } from '../client'

export const quizzesService = {
  /**
   * Generate a quiz from text
   * @param {string} sampleText - The text content
   * @param {number} numQuestions - Number of questions (default 5)
   * @param {string} difficulty - Difficulty level (Easy, Medium, Hard)
   * @returns {Promise<Array>} List of generated questions
   */
  async generate(sampleText, numQuestions = 5, difficulty = 'Medium') {
    const { data } = await apiClient.post('/quiz/generate', {
      sampleText,
      numQuestions,
      difficulty
    })
    return data
  }

  /* Future: save, list, etc. */
}
