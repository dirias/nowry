/**
 * Splitting mixed-language text into pieces each engine can pronounce (ADR-001).
 *
 * A Japanese card whose answer is glossed in English is one string with two
 * languages in it, and a single utterance reads the whole thing in one voice:
 * either the Japanese comes out as gibberish or the English does. The backend
 * segments the text and says which language each piece is; the client speaks
 * the pieces in order, switching voice between them.
 *
 * **Every failure is silent, and returns `null`.** Offline, rate-limited, a
 * 500 — none of them may cost the learner their audio, because the fallback is
 * the plain single-utterance path that worked before this existed and still
 * works with no network at all. A caller that gets `null` speaks the text
 * whole; it does not show an error, because nothing the user did failed.
 *
 * Sequencing the pieces is NOT here: queuing utterances is the one part that
 * is genuinely a different animal per platform, and each client wires it to
 * its own engine.
 */
import { queryClient } from '../api/queryClient'
import { ttsService } from '../api/services/tts.ai.service'

/** Segmentation is deterministic per text, so a day is a conservative age. */
const SEGMENTS_TTL_MS = 24 * 60 * 60 * 1000

/**
 * FNV-1a, 32-bit. A cheap fingerprint of card text for a cache key, and
 * nothing else — not a security boundary.
 */
export function fnv1aHash(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < String(str).length; i++) {
    hash ^= String(str).charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

/** The cache key, exported so a client can prime or read it. */
export const segmentsKey = (text) => ['ttsSegments', fnv1aHash(text)]

/**
 * The segments for `text`, or `null` on any failure whatsoever.
 *
 * @returns {Promise<Array<{text: string, lang_code: string}>|null>}
 */
export async function fetchSegments(text) {
  if (!text) return null

  try {
    const segments = await queryClient.fetchQuery({
      queryKey: segmentsKey(text),
      queryFn: () => ttsService.segmentText(text),
      staleTime: SEGMENTS_TTL_MS,
      // No retry: a failure here must degrade fast, not add a round trip in
      // front of speech the user is waiting for.
      retry: false
    })
    return segments && segments.length > 0 ? segments : null
  } catch {
    return null
  }
}

/**
 * The two fields a segment carries, read by name here rather than at each call
 * site. `lang_code` is the API's spelling and this is where the client learns
 * it — a screen that guesses at a field name gets `undefined`, and `undefined`
 * falls through to a default and renders as if nothing were wrong.
 */
export const segmentText = (segment) => segment?.text || ''
export const segmentLang = (segment) => segment?.lang_code || null

export default fetchSegments
