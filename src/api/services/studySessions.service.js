/**
 * Study Sessions Service
 * Fetches the user's completed quiz session history.
 */
import { apiClient } from '../client'

export const studySessionsService = {
  /**
   * List the user's completed study sessions, newest first.
   * @param {number} limit - Max records to return (default 20, max 100)
   * @returns {Promise<{ sessions: SessionRecord[], total: number }>}
   */
  async list(limit = 20) {
    const { data } = await apiClient.get('/v1/study-sessions', { params: { limit } })
    return data
  },

  /**
   * Log a completed SRS flashcard review session.
   * Called when StudySession.js reaches sessionComplete.
   *
   * @param {{
   *   deckId: string|null,
   *   deckName: string|null,
   *   startedAt: Date,
   *   cards: Array<{ cardId: string, cardTitle: string|null, grade: string, evaluation: string }>
   * }} payload
   */
  async log({ deckId, deckName, startedAt, cards }) {
    const { data } = await apiClient.post('/v1/study-sessions/log', {
      session_type: 'srs_review',
      deck_id: deckId ?? null,
      deck_name: deckName ?? null,
      started_at: startedAt instanceof Date ? startedAt.toISOString() : startedAt,
      cards: cards.map((c) => ({
        card_id: c.cardId,
        card_title: c.cardTitle ?? null,
        grade: c.grade,
        evaluation: c.evaluation
      }))
    })
    return data
  }
}
