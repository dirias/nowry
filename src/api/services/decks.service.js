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
   * Delete a deck
   */
  async delete(id) {
    const { data } = await apiClient.delete(ENDPOINTS.decks.delete(id))
    return data
  }
}
