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
   *   cards: Array<{ cardId: string, cardTitle: string|null, grade: string, evaluation: string }>,
   *   clientSessionId?: string|null,
   *   sessionType?: 'srs_review'|'drill'
   * }} payload — `deckName` is a courtesy; the server names the record (ADR-058 §1).
   *   `clientSessionId` makes a repeat the same record and links the ledger's rows.
   */
  async log({ deckId, deckName, startedAt, cards, clientSessionId = null, sessionType = 'srs_review' }) {
    const { data } = await apiClient.post('/v1/study-sessions/log', {
      session_type: sessionType,
      deck_id: deckId ?? null,
      deck_name: deckName ?? null,
      // Minted at session start; a repeat is the same record (ADR-058 §2), and
      // the ledger's rows are found by it (ADR-059 §1).
      client_session_id: clientSessionId ?? null,
      started_at: startedAt instanceof Date ? startedAt.toISOString() : startedAt,
      cards: cards.map((c) => ({
        card_id: c.cardId,
        card_title: c.cardTitle ?? null,
        grade: c.grade,
        evaluation: c.evaluation
      }))
    })
    // Read into the clients' words here: a screen never spells an API field.
    return { logged: Boolean(data?.logged), scorePercentage: data?.score_percentage ?? null, sessionId: data?.session_id ?? null }
  },

  /**
   * The ledger behind one session (ADR-059): its attempt rows, the learner's
   * own median think time for the deck, and the days since the previous session.
   * A session logged before the ledger has no rows.
   * @param {string} sessionId
   * @returns {Promise<{ attempts: object[], medianThinkMs: number|null, daysSincePrevious: number|null }>}
   */
  async attempts(sessionId) {
    const { data } = await apiClient.get(`/v1/study-sessions/${encodeURIComponent(sessionId)}/attempts`)
    return {
      attempts: data?.attempts ?? [],
      medianThinkMs: data?.median_think_ms ?? null,
      daysSincePrevious: data?.days_since_previous ?? null
    }
  }
}
