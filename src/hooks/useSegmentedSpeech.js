/**
 * useSegmentedSpeech — mixed-language playback for Study Cards TTS (ADR-001).
 *
 * `getSegments(text)` calls the cached `POST /v1/tts/segment` boundary and
 * degrades silently (returns `null`) on any failure — offline, rate-limited,
 * or a backend error must never block or error out the existing free,
 * offline-capable Study Cards TTS experience. Callers fall back to the
 * existing single-utterance `ttsService.speak()` path when this returns null.
 *
 * `speakSegments(segments, options)` queues one `ttsService.speak()` call per
 * segment, chained sequentially off each segment's `onend`, reusing
 * `ttsService`'s existing cancel/re-speak timing rather than reimplementing
 * utterance queuing.
 */

import { ttsService as ttsAiService } from '../api/services/tts.ai.service'
import ttsService from '../utils/tts.service'
import { apiCache } from '../api/utils/cache'

const SEGMENTS_TTL_MS = 24 * 60 * 60 * 1000 // ~24h — segmentation is deterministic per text

/**
 * Fast non-cryptographic 32-bit hash (FNV-1a) used only to build a cache key
 * from card text — not a security boundary, just a cheap content fingerprint.
 */
function fnv1aHash(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

export function useSegmentedSpeech() {
  /**
   * Returns cached/fetched segments for `text`, or `null` on ANY failure
   * (network error, 429, 500, offline). Never throws to the caller.
   */
  const getSegments = async (text) => {
    if (!text) return null

    const key = `ttsSegments:${fnv1aHash(text)}`

    try {
      const segments = await apiCache.get(key, SEGMENTS_TTL_MS, () => ttsAiService.segmentText(text))
      return segments && segments.length > 0 ? segments : null
    } catch (err) {
      // Silent degrade — the caller falls back to plain ttsService.speak().
      return null
    }
  }

  /**
   * Speaks each segment in sequence, one `ttsService.speak()` call per
   * segment, using each segment's own `lang_code`. `onStart` fires only
   * before the first segment and `onEnd` only after the last segment (or
   * never, if an error stops the sequence early), so the caller's aggregate
   * "isPlaying" state reflects the whole sequence rather than each piece.
   *
   * A mid-sequence engine error calls `onError` and stops the sequence —
   * it does NOT continue to the next segment.
   */
  const speakSegments = (segments, { rate, onStart, onEnd, onError } = {}) => {
    if (!segments || segments.length === 0) return

    const speakAt = (index) => {
      const segment = segments[index]
      const isFirst = index === 0
      const isLast = index === segments.length - 1

      ttsService.speak(segment.text, {
        lang: segment.lang_code,
        rate,
        onStart: () => {
          if (isFirst && onStart) onStart()
        },
        onEnd: () => {
          if (isLast) {
            if (onEnd) onEnd()
          } else {
            speakAt(index + 1)
          }
        },
        onError: (err) => {
          if (onError) onError(err)
        }
      })
    }

    speakAt(0)
  }

  return { getSegments, speakSegments }
}
