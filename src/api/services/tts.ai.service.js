import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'

/**
 * AMagic TTS service.
 * Returns a Blob URL (caller must call URL.revokeObjectURL(url) on unmount).
 *
 * responseType: 'arraybuffer' is required — default 'json' corrupts binary MP3 data.
 */
export const ttsService = {
  generate: async (bookId, text, languageCode = 'en-US') => {
    const { data } = await apiClient.post(
      ENDPOINTS.books.tts(bookId),
      { text, language_code: languageCode },
      { responseType: 'arraybuffer' }
    )
    const blob = new Blob([data], { type: 'audio/mpeg' })
    return URL.createObjectURL(blob)
  },
}
