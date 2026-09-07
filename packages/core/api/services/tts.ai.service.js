import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'

/**
 * Extract the backend's `detail` string from a failed TTS request.
 *
 * The request below uses `responseType: 'arraybuffer'` — required so a
 * successful MP3 response isn't corrupted by the default 'json' parser. But
 * axios applies that SAME responseType to error responses too, so a failed
 * request's JSON error body (`{"detail": "..."}`) arrives in
 * `error.response.data` as raw bytes, not a parsed object. Decode it back to
 * text before reading `.detail`, otherwise callers can never distinguish
 * error reasons (e.g. ADR-001's `segmentation_failed:`-prefixed detail) from
 * one another.
 */
const extractTtsErrorDetail = (error) => {
  const data = error?.response?.data
  if (!(data instanceof ArrayBuffer)) return undefined
  try {
    const parsed = JSON.parse(new TextDecoder('utf-8').decode(data))
    return typeof parsed?.detail === 'string' ? parsed.detail : undefined
  } catch {
    return undefined
  }
}

/**
 * AMagic TTS service.
 * Returns a Blob URL (caller must call URL.revokeObjectURL(url) on unmount).
 *
 * responseType: 'arraybuffer' is required — default 'json' corrupts binary MP3 data.
 */
export const ttsService = {
  /**
   * @param {string} bookId
   * @param {string} text
   * @param {string} [languageCode='en-US']
   * @param {{ autoDetect?: boolean }} [options] - `autoDetect` maps to the
   *   backend's `auto_detect` flag (ADR-001, Pro-tier only — Plus/Free
   *   silently ignore it server-side). Optional 4th param keeps this
   *   backward-compatible with existing 3-arg call sites.
   */
  generate: async (bookId, text, languageCode = 'en-US', options = {}) => {
    const { autoDetect = false } = options
    try {
      const { data } = await apiClient.post(
        ENDPOINTS.books.tts(bookId),
        {
          text,
          // When auto-detect is on, the manually-selected language is not
          // meaningful (the backend segments per-language itself) — omit it
          // rather than sending a stale value that contradicts auto_detect.
          ...(autoDetect ? {} : { language_code: languageCode }),
          auto_detect: autoDetect
        },
        { responseType: 'arraybuffer', timeout: 120000 }
      )
      const blob = new Blob([data], { type: 'audio/mpeg' })
      return URL.createObjectURL(blob)
    } catch (error) {
      // Decoded once here so every caller can branch on it without redoing
      // the arraybuffer decode themselves.
      error.ttsDetail = extractTtsErrorDetail(error)
      throw error
    }
  },

  segmentText: async (text) => {
    const { data } = await apiClient.post(ENDPOINTS.tts.segment(), { text })
    return data.segments
  }
}
