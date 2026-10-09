/**
 * The session's queue as the learner sees it, on the phone (MOB-107, MOB-108; ADR-014, ADR-042).
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
 * **The mark filter reaches the queue only under the All scope** (MOB-109,
 * ADR-042). ADR-010 keeps the mark away from the study queue; All is every card
 * of the deck, not the queue SM-2 chose, and that is the one place it may
 * narrow. `narrowQueue` is where that rule is enforced, so a caller cannot
 * get a marked-only due queue by passing the wrong flag.
 *
 * The web's `useSessionFilters` is not reused because it reads the selection
 * from `react-router-dom`'s search params; on the phone the selection is state,
 * because a filter is not a place the Back button should retreat through.
 *
 * MOB-108 made the count readout the door to this queue (ADR-042): the sheet it
 * opens lists `visibleCards`, and a search over that list is answered here too.
 * **Search finds; it does not filter.** It narrows the sheet's list so a card can
 * be found and jumped to, and never the session — one keystroke must not turn
 * the readout into "1 / 1".
 */
import { useCallback, useMemo, useState } from 'react'
import { backText, frontText } from '@nowry/core/domain/cardSpeech'
import { countMarked, countTags, filterCardsByMark, filterCardsByTags } from '@nowry/core/utils/tagFilter'

/** The two spellings a card's id has worn. */
export const cardKey = (card) => card?._id ?? card?.id ?? null

/** The deck a card belongs to, whether the list sent the deck or only its id. */
export const deckKeyOf = (card) => {
  const deck = card?.deck_id
  if (deck && typeof deck === 'object') return deck._id ?? deck.id ?? null
  return deck ?? null
}

/**
 * The decks a mixed queue draws from, most cards first (MOB-110). The daily
 * review has no All scope, so its sheet narrows by deck instead; a deck session
 * has one deck and gets an empty list.
 *
 * The daily review's cards carry the deck as a bare id, so `names` — the deck
 * list the library already caches, as `{ [id]: name }` — supplies the label;
 * a card that embeds its deck names itself.
 *
 * @returns {Array<{ id: string, name: string, count: number }>}
 */
export function countDecks(cards, names = {}) {
  if (!Array.isArray(cards)) return []
  const counts = new Map()
  for (const card of cards) {
    const id = deckKeyOf(card)
    if (id === null) continue
    const deck = card?.deck_id
    const name = (deck && typeof deck === 'object' && (deck.name || deck.title)) || names[id] || String(id)
    const row = counts.get(id) ?? { id, name, count: 0 }
    row.count += 1
    counts.set(id, row)
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

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
 * The queue as the learner sees it, from the server's list and the selection.
 *
 * Tags narrow under either scope; the mark narrows under All only (ADR-010).
 * With nothing selected this returns the same array it was given, which the
 * utilities promise and the session's memos rely on.
 *
 * @param {Array<object> | null} cards
 * @param {{ selectedTags?: string[], markedOnly?: boolean, scope?: 'due' | 'all' }} selection
 */
export function narrowQueue(cards, { selectedTags = [], markedOnly = false, scope = 'due', selectedDecks = [] } = {}) {
  const byTags = filterCardsByTags(cards, selectedTags)
  const byDecks =
    Array.isArray(byTags) && Array.isArray(selectedDecks) && selectedDecks.length > 0
      ? byTags.filter((card) => selectedDecks.includes(deckKeyOf(card)))
      : byTags
  return scope === 'all' ? filterCardsByMark(byDecks, markedOnly) : byDecks
}

/** Whether a card answers a search: its two faces and its tags, case-insensitively. */
export function matchesQueueSearch(card, needle) {
  const query = String(needle ?? '')
    .trim()
    .toLowerCase()
  if (!query) return true
  const haystack = [frontText(card), backText(card), ...(Array.isArray(card?.tags) ? card.tags : [])]
  return haystack.some((text) => typeof text === 'string' && text.toLowerCase().includes(query))
}

/**
 * @param {Array<object> | null} cards - the queue as the server returned it; null while loading
 * @param {{ scope?: 'due' | 'all' }} [options]
 */
export function useSessionQueue(cards, { scope = 'due', deckNames = {} } = {}) {
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedDecks, setSelectedDecks] = useState([])
  const [markedOnly, setMarkedOnly] = useState(false)

  const availableTags = useMemo(() => countTags(cards), [cards])
  const availableDecks = useMemo(() => countDecks(cards, deckNames), [cards, deckNames])
  const markedCount = useMemo(() => (scope === 'all' ? countMarked(cards) : 0), [scope, cards])
  // With nothing selected this is the SAME array (the utility promises so),
  // which keeps every memo downstream of the queue intact — and keeps `null`
  // as `null`, so the loading state survives the narrowing.
  const visibleCards = useMemo(
    () => narrowQueue(cards, { selectedTags, selectedDecks, markedOnly, scope }),
    [cards, selectedTags, selectedDecks, markedOnly, scope]
  )
  const clearTags = useCallback(() => setSelectedTags([]), [])
  const clearAll = useCallback(() => {
    setSelectedTags([])
    setSelectedDecks([])
    setMarkedOnly(false)
  }, [])

  return {
    availableTags,
    selectedTags,
    setSelectedTags,
    clearTags,
    availableDecks,
    selectedDecks,
    setSelectedDecks,
    markedOnly,
    setMarkedOnly,
    markedCount,
    clearAll,
    visibleCards,
    isFiltering: selectedTags.length > 0 || selectedDecks.length > 0 || (scope === 'all' && markedOnly)
  }
}

export default useSessionQueue
