/**
 * Quiz Service
 * Handles AI-driven quiz mode endpoints for the Study Partner feature.
 */
import { apiClient } from '../client'

export const quizService = {
  /**
   * Fetch all decks available for quiz mode (includes due_count per deck).
   * @returns {Promise<Array<{ id: string, name: string, due_count: number }>>}
   */
  getQuizDecks: () => apiClient.get('/v1/assistant/quiz/decks'),

  /**
   * Start a new quiz session for a given deck.
   * @param {{ deck_id: string, card_count: number, prioritize_due: boolean }} params
   * @returns {Promise<{ session_id: string, total_cards: number, first_question: Object }>}
   */
  startQuizSession: ({ deck_id, card_count, prioritize_due }) =>
    apiClient.post('/v1/assistant/quiz/start', { deck_id, card_count, prioritize_due }),

  /**
   * Submit a user answer for the current quiz card.
   * @param {{ session_id: string, card_id: string, question_type: string, question_text: string, user_answer: string, attempt_number: number }} params
   * @returns {Promise<{ evaluation: 'correct'|'partial'|'incorrect', feedback_message: string, revealed_answer: string|null, hint: string|null, is_last_card: boolean, next_question: Object|null, summary: Object|null }>}
   */
  submitQuizAnswer: ({ session_id, card_id, question_type, question_text, user_answer, attempt_number, conversation_history = [] }) =>
    apiClient.post('/v1/assistant/quiz/answer', {
      session_id,
      card_id,
      question_type,
      question_text,
      user_answer,
      attempt_number,
      conversation_history
    }),

  /**
   * Start an AI-generated quiz on a free-form topic (no deck required).
   * @param {{ topic: string, question_count: number, language?: string }} params
   * @returns {Promise<{ session_id: string, total_cards: number, first_question: Object }>}
   */
  startAIQuiz: ({ topic, question_count, language = 'en' }) =>
    apiClient.post('/v1/assistant/quiz/start-ai', { topic, question_count, language })
}
