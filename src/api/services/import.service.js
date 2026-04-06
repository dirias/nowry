import { apiClient } from '../client'

/**
 * Import Service
 * Handles Anki .apkg file parsing and import confirmation
 */
export const importService = {
  /**
   * Step 1: Upload and parse an .apkg file.
   * Returns preview data (deck name, card count, sample cards, all cards).
   * No database writes occur at this step.
   */
  async parseApkg(file) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post('/import/apkg', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  /**
   * Step 2: Confirm the import.
   * Creates the deck and bulk-inserts all cards with SM-2 defaults.
   */
  async confirmImport({ deck_name, description, cards }) {
    const { data } = await apiClient.post('/import/apkg/confirm', {
      deck_name,
      description,
      cards
    })
    return data
  }
}
