import { apiClient } from '../client'

/**
 * Pet Service
 * Handles pet customization preferences (name, species).
 * Endpoints: GET/PUT /users/preferences/pet
 */
const petService = {
  /**
   * Load pet customization preferences.
   * @returns {Promise<{ pet_name: string|null, pet_species: string|null }>}
   */
  getPetPreferences: async () => {
    const { data } = await apiClient.get('/users/preferences/pet')
    return data
  },

  /**
   * Save pet customization preferences (partial update supported).
   * @param {{ pet_name?: string|null, pet_species?: string|null }} payload
   * @returns {Promise<{ pet_name: string|null, pet_species: string|null }>}
   */
  updatePetPreferences: async (payload) => {
    const { data } = await apiClient.put('/users/preferences/pet', payload)
    return data
  }
}

export default petService
