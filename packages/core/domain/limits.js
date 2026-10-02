/**
 * The refusals the tier contract can answer with (ADR-041), mapped once.
 *
 * The API refuses three things with stable codes: an AI generation call past
 * the month's ceiling, a document past the word ceiling, and read-aloud past
 * the month's characters. Every surface that can meet one reads the key here,
 * so the sentence is the same on the plans page, in the editor and on a card.
 */
export const AI_LIMIT_REACHED_CODE = 'ai_limit_reached'
export const DOCUMENT_TOO_LONG_CODE = 'document_too_long'
export const TTS_LIMIT_REACHED_CODE = 'tts_limit_reached'

const KEY_BY_CODE = Object.freeze({
  [AI_LIMIT_REACHED_CODE]: 'subscription.errors.aiLimitReached',
  [DOCUMENT_TOO_LONG_CODE]: 'subscription.errors.documentTooLong',
  [TTS_LIMIT_REACHED_CODE]: 'subscription.errors.ttsLimitReached'
})

/** The code an API error carries in an object `detail`, or null. */
export const refusalCode = (error) => {
  const detail = error?.response?.data?.detail
  if (detail && typeof detail === 'object' && !Array.isArray(detail) && typeof detail.code === 'string') return detail.code
  if (typeof error?.ttsDetail === 'string') return error.ttsDetail
  return null
}

/** The translation key for a tier-contract refusal, or null when the error is something else. */
export const limitRefusalKey = (error) => KEY_BY_CODE[refusalCode(error)] ?? null

/** The interpolation values the key's sentence may use (the limit, when the server sent one). */
export const limitRefusalOptions = (error) => {
  const detail = error?.response?.data?.detail
  const limit = detail && typeof detail === 'object' ? detail.limit : undefined
  return typeof limit === 'number' ? { limit } : {}
}
