import { AI_LIMIT_REACHED_CODE, DOCUMENT_TOO_LONG_CODE, TTS_LIMIT_REACHED_CODE, limitRefusalKey, limitRefusalOptions, refusalCode } from './limits'

const refused = (code, extra = {}) => ({ response: { status: 429, data: { detail: { code, ...extra } } } })

describe('limitRefusalKey', () => {
  it('names a key for each of the three refusals', () => {
    expect(limitRefusalKey(refused(AI_LIMIT_REACHED_CODE))).toBe('subscription.errors.aiLimitReached')
    expect(limitRefusalKey(refused(DOCUMENT_TOO_LONG_CODE))).toBe('subscription.errors.documentTooLong')
    expect(limitRefusalKey(refused(TTS_LIMIT_REACHED_CODE))).toBe('subscription.errors.ttsLimitReached')
  })

  it('reads the read-aloud code from the audio error shape too', () => {
    expect(limitRefusalKey({ ttsDetail: TTS_LIMIT_REACHED_CODE })).toBe('subscription.errors.ttsLimitReached')
    expect(limitRefusalKey({ ttsDetail: 'segmentation_failed: x' })).toBeNull()
  })

  it('is null for anything else', () => {
    expect(limitRefusalKey(null)).toBeNull()
    expect(limitRefusalKey({ response: { data: { detail: 'Book not found' } } })).toBeNull()
    expect(limitRefusalKey(refused('fork_in_progress'))).toBeNull()
    expect(refusalCode({ response: { data: { detail: [{ msg: 'x' }] } } })).toBeNull()
  })

  it('carries the limit the server sent', () => {
    expect(limitRefusalOptions(refused(AI_LIMIT_REACHED_CODE, { limit: 50 }))).toEqual({ limit: 50 })
    expect(limitRefusalOptions(refused(AI_LIMIT_REACHED_CODE))).toEqual({})
  })
})
