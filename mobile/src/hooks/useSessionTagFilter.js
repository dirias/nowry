/**
 * Narrowing a session's queue by tag, on the phone (MOB-107, ADR-014).
 *
 * The web's session has had this since ADR-014: the tag filter is a client-side
 * view over the due queue the server returned, the subset keeps the server's
 * order, and SM-2 still owns *when* a card returns — the learner chooses *which
 * of today's due cards* to sit with. The phone's session was written without it
 * ("none of that is the session"), which left one way to study a tag: the
 * library's Tags view, across every deck at once. A deck with three hundred
 * due cards and one exam tomorrow had no answer.
 *
 * The counting and the narrowing are the web's own functions from
 * `@nowry/core/utils/tagFilter`; what lives here is only what the web keeps on
 * its URL — the selection — and two placements the session needs to keep its
 * footing when the list under it changes.
 *
 * **The mark filter is not here**, and must not be: ADR-010 keeps it to
 * Browse, and the phone has no Browse session.
 *
 * The web's `useSessionFilters` is not reused because it reads the selection
 * from `react-router-dom`'s search params; on the phone the selection is state,
 * because a filter is not a place the Back button should retreat through.
 */
import { useCallback, useMemo, useState } from 'react'
import { countTags, filterCardsByTags } from '@nowry/core/utils/tagFilter'

/** The two spellings a card's id has worn. */
export const cardKey = (card) => card?._id ?? card?.id ?? null

/**
 * Where the card in hand sits after the queue is narrowed: its new position
 * when it survived, the top when it did not. Mirrors the web's anchor logic
 * without the ref — the caller passes the id it is looking at.
 */
export function positionAfter(visible, currentKey) {
  if (!Array.isArray(visible) || currentKey == null) return 0
  const at = visible.findIndex((card) => cardKey(card) === currentKey)
  return at >= 0 ? at : 0
}

/**
 * The visible index translated to the full queue, for the resume record.
 *
 * A session resumes with no filter, so the index it stores has to count the
 * whole queue: saving the filtered position would reopen the deck on the wrong
 * card. Past the end of the visible list is past the end of the queue — the
 * completion effect clears the record in that case anyway.
 */
export function fullQueueIndex(allCards, visible, index) {
  if (!Array.isArray(allCards)) return index
  const card = Array.isArray(visible) ? visible[index] : null
  if (!card) return allCards.length
  const at = allCards.findIndex((entry) => cardKey(entry) === cardKey(card))
  return at >= 0 ? at : allCards.length
}

/**
 * @param {Array<object> | null} cards - the queue as the server returned it; null while loading
 */
export function useSessionTagFilter(cards) {
  const [selectedTags, setSelectedTags] = useState([])

  const availableTags = useMemo(() => countTags(cards), [cards])
  // With nothing selected this is the SAME array (the utility promises so),
  // which keeps every memo downstream of the queue intact — and keeps `null`
  // as `null`, so the loading state survives the narrowing.
  const visibleCards = useMemo(() => filterCardsByTags(cards, selectedTags), [cards, selectedTags])
  const clearTags = useCallback(() => setSelectedTags([]), [])

  return {
    availableTags,
    selectedTags,
    setSelectedTags,
    clearTags,
    visibleCards,
    isFiltering: selectedTags.length > 0
  }
}

export default useSessionTagFilter
