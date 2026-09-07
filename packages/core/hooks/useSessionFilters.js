import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { countMarked, countTags, filterCardsByMark, filterCardsByTags } from '../utils/tagFilter'

/**
 * Frozen empty array shared by every "no tags" return path. A fresh `[]` per
 * render would be a new reference each time, defeating the memo on
 * `visibleCards` and re-running the re-anchor effect on every render.
 */
const NO_TAGS = Object.freeze([])

/**
 * Client-side filters for a study session: tags, and the user's mark.
 *
 * The two dimensions are independent of each other and compose with AND — a
 * marked card tagged `verbs` is what `?marked=1&tags=verbs` shows. Adding a
 * third belongs here too, provided it preserves the identity guarantee below.
 *
 * The whole feature is a view over the already-loaded `cards` array — no
 * network, no service layer, nothing that can fail. A malformed `?tags=`
 * degrades to "no filter"; it never produces an error state.
 *
 * Each dimension has ITS OWN gate, and each gate is absolute:
 *
 * - `tagsEnabled` — when false the hook reports no tags and no selection, so a
 *   `?tags=` on the URL changes nothing. StudySession passes `true` in both
 *   modes (ADR-014): tags may narrow the SM-2 queue, because narrowing keeps
 *   the server's order and grading writes cards back by id, never by array.
 * - `markEnabled` — when false the hook reports no mark filter and a marked
 *   count of 0, so a `?marked=1` on the URL changes nothing. StudySession
 *   passes `isReadOnlyMode`: the mark is Browse-only, and this flag is the
 *   whole of ADR-010's enforcement on the read side. It is a separate flag
 *   precisely so that enabling tags in study mode cannot carry the mark onto
 *   the queue as a side effect.
 *
 * With both gates closed — or both open and nothing selected — the hook hands
 * back the EXACT `cards` reference it was given.
 *
 * Owns its own `useSearchParams()`. React Router hands every caller in the same
 * router context the same live params object, so this coexists safely with
 * StudySession's existing call rather than needing the value threaded down.
 *
 * @param {{ cards: Array<object>, tagsEnabled: boolean, markEnabled: boolean }} params
 */
export function useSessionFilters({ cards, tagsEnabled, markEnabled }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const availableTags = useMemo(() => (tagsEnabled ? countTags(cards) : NO_TAGS), [tagsEnabled, cards])

  const tagsParam = tagsEnabled ? searchParams.get('tags') : null

  /**
   * Parsed selection: split on `,`, trim, drop empties, dedupe, then INTERSECT
   * with the tags this deck actually has. The intersection is what makes a
   * shared link survive the deck being edited afterwards — a stale `?tags=old`
   * silently drops instead of stranding the recipient on an empty result they
   * cannot explain.
   */
  const selectedTags = useMemo(() => {
    if (!tagsEnabled || !tagsParam) return NO_TAGS

    const known = new Set(availableTags.map(({ tag }) => tag))
    const parsed = []
    for (const raw of String(tagsParam).split(',')) {
      const tag = raw.trim()
      if (!tag || !known.has(tag) || parsed.includes(tag)) continue
      parsed.push(tag)
    }
    return parsed.length > 0 ? parsed : NO_TAGS
  }, [tagsEnabled, tagsParam, availableTags])

  /**
   * The mark filter is a plain flag, not a value list: the mark itself is
   * binary, so `?marked=1` is the whole of its state. Any other value (or the
   * param's absence) reads as off, which keeps a mangled URL degrading to "no
   * filter" exactly as a stale `?tags=` does.
   */
  const markedOnly = markEnabled && searchParams.get('marked') === '1'

  /** How many of this deck's cards are marked, before any filter narrows them. */
  const markedCount = useMemo(() => (markEnabled ? countMarked(cards) : 0), [markEnabled, cards])

  /*
   * Identity guarantee: with no tags selected AND no mark filter, both helpers
   * return their input untouched, so this is `cards` itself — by reference. The
   * composition order is irrelevant to the result but both steps must preserve
   * identity for the guarantee to survive.
   */
  const visibleCards = useMemo(
    () => filterCardsByMark(filterCardsByTags(cards, selectedTags), markedOnly),
    [cards, selectedTags, markedOnly]
  )

  const setTags = useCallback(
    (nextTags) => {
      const unique = []
      for (const raw of Array.isArray(nextTags) ? nextTags : []) {
        const tag = typeof raw === 'string' ? raw.trim() : ''
        if (!tag || unique.includes(tag)) continue
        unique.push(tag)
      }

      setSearchParams(
        (prev) => {
          // Copy rather than mutate, and copy from `prev` rather than from the
          // render-time snapshot, so `mode` (and anything else on the URL)
          // survives every write.
          const next = new URLSearchParams(prev)
          if (unique.length === 0) next.delete('tags')
          else next.set('tags', unique.join(','))
          return next
        },
        // replace, not push: without this the Back button degrades into a
        // filter-undo stack, and the user's actual way out of the session
        // (back to the library) retreats one click per tag they tried.
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const toggleTag = useCallback(
    (tag) => {
      setTags(selectedTags.includes(tag) ? selectedTags.filter((entry) => entry !== tag) : [...selectedTags, tag])
    },
    [selectedTags, setTags]
  )

  const clearTags = useCallback(() => setTags(NO_TAGS), [setTags])

  const setMarkedOnly = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          // Same copy-from-`prev` discipline as setTags: `mode` and `tags` have
          // to survive a write to this dimension.
          const params = new URLSearchParams(prev)
          if (next) params.set('marked', '1')
          else params.delete('marked')
          return params
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const toggleMarkedOnly = useCallback(() => setMarkedOnly(!markedOnly), [markedOnly, setMarkedOnly])

  /** Drop both dimensions at once — the one control that always gets the user out. */
  const clearFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.delete('tags')
        params.delete('marked')
        return params
      },
      { replace: true }
    )
  }, [setSearchParams])

  return {
    availableTags,
    selectedTags,
    markedOnly,
    markedCount,
    visibleCards,
    toggleTag,
    setTags,
    clearTags,
    setMarkedOnly,
    toggleMarkedOnly,
    clearFilters,
    // Any active dimension counts: `isFilteredEmpty` in StudySession keys off
    // this to offer a way out, and a mark filter that matched nothing needs that
    // escape just as much as a tag filter that did.
    isFiltering: selectedTags.length > 0 || markedOnly
  }
}

export default useSessionFilters
