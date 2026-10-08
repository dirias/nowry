/**
 * Which existing tags to offer under a tag line, and what the line becomes when
 * one is picked (MOB-106).
 *
 * The web's tag input is an autocomplete: the deck's tags appear as it is
 * typed and a pick adds a chip. The phone's field is a comma-separated line
 * (MOB-102), so the offer is a row of chips under it and a pick writes the tag
 * into the line. Both read the same pool — `useCardForm` fetches it once per
 * open — so the two clients suggest the same names by construction.
 *
 * Pure, so it is tested in node like the rest of the phone's logic.
 */
import { parseTagInput } from '@nowry/core/utils/formUtils'

/** A row of chips is a hint, not a catalogue; the search is the typing. */
export const MAX_SUGGESTIONS = 8

/** The text after the last comma: the tag being typed, or '' between tags. */
export const pendingToken = (text = '') => text.slice(text.lastIndexOf(',') + 1).trim()

/** The tags before the last comma — the ones already settled on the line. */
export const committedTags = (text = '') => {
  const cut = text.lastIndexOf(',')
  return cut < 0 ? [] : parseTagInput(text.slice(0, cut + 1))
}

/**
 * The pool, minus what the line already holds, narrowed by what is being typed.
 *
 * Case-insensitive on both counts: "Japan" on the line hides "japan" in the
 * pool, and "ja" offers "Japan". A tag equal to the token is still offered —
 * tapping it is how the token is settled without typing a comma.
 */
export function suggestTags(pool = [], text = '', max = MAX_SUGGESTIONS) {
  const taken = new Set(committedTags(text).map((tag) => tag.toLowerCase()))
  const needle = pendingToken(text).toLowerCase()
  const seen = new Set()
  const offered = []

  for (const raw of Array.isArray(pool) ? pool : []) {
    const tag = typeof raw === 'string' ? raw.trim() : ''
    const key = tag.toLowerCase()
    if (!tag || taken.has(key) || seen.has(key)) continue
    if (needle && !key.includes(needle)) continue
    seen.add(key)
    offered.push(tag)
    if (offered.length >= max) break
  }
  return offered
}

/**
 * The line with `tag` in place of the token being typed, ending in a separator
 * so the next tag can be typed straight away. The parser drops the trailing
 * empty, so the caller's list is exactly the committed tags plus this one.
 */
export function withPickedTag(text = '', tag) {
  const committed = committedTags(text)
  return [...committed, tag].join(', ') + ', '
}
