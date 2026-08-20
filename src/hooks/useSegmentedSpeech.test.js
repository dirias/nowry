/**
 * TASK-003 — useSegmentedSpeech tests.
 *
 * getSegments() must degrade silently (return null, never throw) on ANY
 * failure — this is the mandatory silent-fallback guarantee from ADR-001:
 * Study Cards TTS is free/offline-capable today and must never gain a
 * user-visible loading gate or error state from the new network boundary.
 *
 * Cache-hit behavior is verified against the real React Query client (not a
 * mock) since the "one network call per unique text, ever" guarantee is the
 * entire point of the client-side cache in ADR-001.
 */

import { renderHook } from '@testing-library/react'
import { useSegmentedSpeech } from './useSegmentedSpeech'
import { queryClient } from '../api/queryClient'

const mockSegmentText = jest.fn()
jest.mock('../api/services/tts.ai.service', () => ({
  ttsService: { segmentText: (...args) => mockSegmentText(...args) }
}))

const mockSpeak = jest.fn()
jest.mock('../utils/tts.service', () => ({
  __esModule: true,
  default: { speak: (...args) => mockSpeak(...args) }
}))

describe('useSegmentedSpeech: getSegments', () => {
  beforeEach(() => {
    queryClient.clear()
    mockSegmentText.mockReset()
    mockSpeak.mockReset()
  })

  it('returns null and does not throw when the API call rejects', async () => {
    mockSegmentText.mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useSegmentedSpeech())

    await expect(result.current.getSegments('Hola, how are you?')).resolves.toBeNull()
    expect(mockSegmentText).toHaveBeenCalledTimes(1)
  })

  it('returns null and does not throw on a 429 rate-limit style rejection', async () => {
    const rateLimitErr = Object.assign(new Error('rate limited'), { response: { status: 429 } })
    mockSegmentText.mockRejectedValue(rateLimitErr)
    const { result } = renderHook(() => useSegmentedSpeech())

    await expect(result.current.getSegments('some card text')).resolves.toBeNull()
  })

  it('returns the resolved segments on success', async () => {
    const segments = [
      { text: 'Hola, ', lang_code: 'es-ES' },
      { text: 'how are you?', lang_code: 'en-US' }
    ]
    mockSegmentText.mockResolvedValue(segments)
    const { result } = renderHook(() => useSegmentedSpeech())

    await expect(result.current.getSegments('Hola, how are you?')).resolves.toEqual(segments)
  })

  it('cache hit makes zero additional network calls for the same text', async () => {
    const segments = [{ text: 'Bonjour', lang_code: 'fr-FR' }]
    mockSegmentText.mockResolvedValue(segments)
    const { result } = renderHook(() => useSegmentedSpeech())

    const first = await result.current.getSegments('Bonjour')
    const second = await result.current.getSegments('Bonjour')

    expect(first).toEqual(segments)
    expect(second).toEqual(segments)
    expect(mockSegmentText).toHaveBeenCalledTimes(1) // only the first call hit the network
  })

  it('different text produces a different cache key and does hit the network again', async () => {
    mockSegmentText.mockResolvedValue([{ text: 'a', lang_code: 'en-US' }])
    const { result } = renderHook(() => useSegmentedSpeech())

    await result.current.getSegments('text one')
    await result.current.getSegments('text two')

    expect(mockSegmentText).toHaveBeenCalledTimes(2)
  })
})

describe('useSegmentedSpeech: speakSegments', () => {
  beforeEach(() => {
    mockSpeak.mockReset()
  })

  it('speaks each segment with its own lang_code, in order', () => {
    const { result } = renderHook(() => useSegmentedSpeech())
    const segments = [
      { text: 'Hola', lang_code: 'es-ES' },
      { text: 'world', lang_code: 'en-US' }
    ]

    result.current.speakSegments(segments, {})
    expect(mockSpeak).toHaveBeenCalledTimes(1)
    expect(mockSpeak).toHaveBeenCalledWith('Hola', expect.objectContaining({ lang: 'es-ES' }))

    // Simulate the first utterance ending -> triggers the second speak() call.
    const firstCallOptions = mockSpeak.mock.calls[0][1]
    firstCallOptions.onEnd()

    expect(mockSpeak).toHaveBeenCalledTimes(2)
    expect(mockSpeak).toHaveBeenCalledWith('world', expect.objectContaining({ lang: 'en-US' }))
  })

  it('fires the caller onStart only before the first segment, not every segment', () => {
    const { result } = renderHook(() => useSegmentedSpeech())
    const onStart = jest.fn()
    const segments = [
      { text: 'one', lang_code: 'en-US' },
      { text: 'two', lang_code: 'en-US' }
    ]

    result.current.speakSegments(segments, { onStart })

    // First segment's onStart fires -> aggregate onStart fires once.
    mockSpeak.mock.calls[0][1].onStart()
    expect(onStart).toHaveBeenCalledTimes(1)

    // End first, speaking second segment starts -> aggregate onStart must NOT fire again.
    mockSpeak.mock.calls[0][1].onEnd()
    mockSpeak.mock.calls[1][1].onStart()
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('fires the caller onEnd only after the last segment', () => {
    const { result } = renderHook(() => useSegmentedSpeech())
    const onEnd = jest.fn()
    const segments = [
      { text: 'one', lang_code: 'en-US' },
      { text: 'two', lang_code: 'en-US' }
    ]

    result.current.speakSegments(segments, { onEnd })

    mockSpeak.mock.calls[0][1].onEnd() // end of segment 1 -> not the last, onEnd must not fire yet
    expect(onEnd).not.toHaveBeenCalled()

    mockSpeak.mock.calls[1][1].onEnd() // end of segment 2 -> last segment, onEnd fires
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('stops the sequence and propagates onError on a mid-sequence engine error, without continuing to the next segment', () => {
    const { result } = renderHook(() => useSegmentedSpeech())
    const onError = jest.fn()
    const segments = [
      { text: 'one', lang_code: 'en-US' },
      { text: 'two', lang_code: 'en-US' }
    ]

    result.current.speakSegments(segments, { onError })
    expect(mockSpeak).toHaveBeenCalledTimes(1)

    mockSpeak.mock.calls[0][1].onError(new Error('engine failure'))

    expect(onError).toHaveBeenCalledTimes(1)
    expect(mockSpeak).toHaveBeenCalledTimes(1) // must NOT have queued the second segment
  })

  it('does nothing when given null or empty segments', () => {
    const { result } = renderHook(() => useSegmentedSpeech())
    expect(() => result.current.speakSegments(null, {})).not.toThrow()
    expect(() => result.current.speakSegments([], {})).not.toThrow()
    expect(mockSpeak).not.toHaveBeenCalled()
  })
})
