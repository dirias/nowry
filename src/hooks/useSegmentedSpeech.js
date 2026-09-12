/**
 * useSegmentedSpeech — mixed-language playback for Study Cards TTS (ADR-001).
 *
 * `getSegments(text)` is the shared `fetchSegments` boundary: it degrades
 * silently (returns `null`) on any failure — offline, rate-limited, or a
 * backend error must never block the free, offline-capable single-utterance
 * path. Callers fall back to `ttsService.speak()` when this returns null. The
 * request, its cache key and its silence live in `@nowry/core` now, because
 * the phone speaks too and a second copy of that rule would drift.
 *
 * `speakSegments(segments, options)` queues one `ttsService.speak()` call per
 * segment, chained sequentially off each segment's `onend`, reusing
 * `ttsService`'s existing cancel/re-speak timing rather than reimplementing
 * utterance queuing. Sequencing stays here: it is wired to this platform's
 * engine and nothing about it is shareable.
 */

import { fetchSegments, segmentLang, segmentText } from '@nowry/core/domain/speechSegments'
import ttsService from '../utils/tts.service'

export function useSegmentedSpeech() {
  /**
   * Returns the segments for `text`, or `null` on ANY failure (network error,
   * 429, 500, offline). Never throws to the caller.
   */
  const getSegments = (text) => fetchSegments(text)

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

      ttsService.speak(segmentText(segment), {
        lang: segmentLang(segment),
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
