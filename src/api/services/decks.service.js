import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'

/**
 * Decks Service
 * Handles all deck-related API operations
 */
export const decksService = {
  /**
   * Get all decks for the current user
   */
  async getAll() {
    const { data } = await apiClient.get(ENDPOINTS.decks.all)
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
   * Delete a deck
   */
  async delete(id) {
    const { data } = await apiClient.delete(ENDPOINTS.decks.delete(id))
    return data
  }
}
