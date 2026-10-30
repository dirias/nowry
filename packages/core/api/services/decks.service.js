import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'

/**
 * Decks Service
 * Handles all deck-related API operations
 */
export const decksService = {
  /**
   * Get all decks for the current user
   * @param {string} [type] - Optional deck type filter ('flashcard' | 'quiz' | 'visual').
   *   Additive query param on an already-working endpoint — omitted entirely when falsy,
   *   so existing no-arg callers are unaffected.
   * @param {{ archived?: boolean }} [options] - `archived: true` lists the archived decks
   *   instead of the active ones (PRD D18, FR-012); the default list never includes them.
   */
  async getAll(type, { archived = false } = {}) {
    const params = new URLSearchParams()
    if (type) params.append('type', type)
    if (archived) params.append('archived', 'true')
    const query = params.toString()
    const { data } = await apiClient.get(query ? `${ENDPOINTS.decks.all}?${query}` : ENDPOINTS.decks.all)
    return data
  },

  /**
   * Archive a deck (PRD D18, ADR-023): out of Today, the forecast and every
   * count, history kept. No confirm on the client — Restore undoes it.
   * @returns {Promise<object>} The deck with `archived_at` set
   */
  async archive(id) {
    const { data } = await apiClient.post(`/decks/${id}/archive`)
    return data
  },

  /**
   * Restore an archived deck: clears the state and nothing else.
   * @returns {Promise<object>} The deck with `archived_at` cleared
   */
  async restore(id) {
    const { data } = await apiClient.post(`/decks/${id}/restore`)
    return data
  },

  /**
   * Rest a deck: its cards leave play, schedule kept, library unchanged
   * (SR-003, ADR-043). `until` is a Date, or null for "until woken".
   */
  async rest(id, until = null) {
    const { data } = await apiClient.post(`/decks/${id}/rest`, { until: until ? until.toISOString() : null })
    return data
  },

  /** Wake a deck; its cards land softly (SR-002). */
  async wake(id) {
    const { data } = await apiClient.post(`/decks/${id}/wake`)
    return data
  },

  /**
   * Get deck by ID
   */
  async getById(id) {
    const { data } = await apiClient.get(ENDPOINTS.decks.byId(id))
    return data
  },

  /**
   * Create a new mazo (deck)
   */
  async create(deckData) {
    const { data } = await apiClient.post(ENDPOINTS.decks.create, deckData)
    return data
  },

  /**
   * Update a deck
   */
  async update(id, updates) {
    const { data } = await apiClient.patch(ENDPOINTS.decks.update(id), updates)
    return data
  },

  /**
   * Update deck settings (config, voice_settings, is_public, public_metadata)
   */
  /**
   * The deck's field for the companion's ready questions (CHAT-009): the
   * learner's choice, else its voice language, else one saved guess.
   * @returns {Promise<{field: string, source: 'learner'|'language'|'guess'|'default'}>}
   */
  async getField(id) {
    const { data } = await apiClient.get(`/decks/${id}/field`)
    return data
  },

  /** Set the deck's field; `null` hands it back to the voice language and the guess. */
  async setField(id, field) {
    const { data } = await apiClient.put(`/decks/${id}/field`, { field })
    return data
  },

  async updateSettings(id, settings) {
    const { data } = await apiClient.patch(`/decks/${id}/settings`, settings)
    return data
  },

  /**
   * Get cards for a deck (paginated)
   */
  async getCards(id, skip = 0, limit = 200) {
    const { data } = await apiClient.get(`${ENDPOINTS.decks.cards(id)}?skip=${skip}&limit=${limit}`)
    return data
  },

  /**
   * Publish a deck to the community
   */
  async publish(id, payload) {
    const { data } = await apiClient.post(`/public/decks/${id}/publish`, payload)
    return data
  },

  /**
   * Remove a deck from the community
   */
  async unpublish(id) {
    const { data } = await apiClient.post(`/public/decks/${id}/unpublish`, {})
    return data
  },

  /**
   * Get deck settings
   */
  async getSettings(id) {
    const { data } = await apiClient.get(`/decks/${id}/settings`)
    return data
  },

  /**
   * Delete a deck
   */
  async delete(id) {
    const { data } = await apiClient.delete(ENDPOINTS.decks.delete(id))
    return data
  }
}
