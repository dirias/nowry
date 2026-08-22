import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { countTags, filterCardsByTags } from '../utils/tagFilter'

/**
 * Frozen empty array shared by every "no tags" return path. A fresh `[]` per
 * render would be a new reference each time, defeating the memo on
 * `visibleCards` and re-running the re-anchor effect on every render.
 */
const NO_TAGS = Object.freeze([])

/**
 * Client-side tag filter for a Browse-mode study session.
 *
 * The whole feature is a view over the already-loaded `cards` array — no
 * network, no service layer, nothing that can fail. A malformed `?tags=`
 * degrades to "no filter"; it never produces an error state.
 *
 * `enabled` is the safety switch, and it is deliberately absolute: when false
 * (i.e. anything other than Browse mode) this hook reports no tags, no
 * selection, and hands back the EXACT `cards` reference it was given. That
 * makes the SM-2 study queue structurally unfilterable — a crafted
 * `?mode=study&tags=verbs` URL cannot reorder or shrink what the scheduler
 * decided the user should review.
 *
 * Owns its own `useSearchParams()`. React Router hands every caller in the same
 * router context the same live params object, so this coexists safely with
 * StudySession's existing call rather than needing the value threaded down.
 *
 * @param {{ cards: Array<object>, enabled: boolean }} params
 */
export function useBrowseTagFilter({ cards, enabled }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const availableTags = useMemo(() => (enabled ? countTags(cards) : NO_TAGS), [enabled, cards])

  const tagsParam = enabled ? searchParams.get('tags') : null

  /**
   * Parsed selection: split on `,`, trim, drop empties, dedupe, then INTERSECT
   * with the tags this deck actually has. The intersection is what makes a
   * shared link survive the deck being edited afterwards — a stale `?tags=old`
   * silently drops instead of stranding the recipient on an empty result they
   * cannot explain.
   */
  const selectedTags = useMemo(() => {
    if (!enabled || !tagsParam) return NO_TAGS

    const known = new Set(availableTags.map(({ tag }) => tag))
    const parsed = []
    for (const raw of String(tagsParam).split(',')) {
      const tag = raw.trim()
      if (!tag || !known.has(tag) || parsed.includes(tag)) continue
      parsed.push(tag)
    }
    return parsed.length > 0 ? parsed : NO_TAGS
  }, [enabled, tagsParam, availableTags])

  // Identity guarantee: with `selectedTags === NO_TAGS` this is `cards` itself.
  const visibleCards = useMemo(() => filterCardsByTags(cards, selectedTags), [cards, selectedTags])

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

  return {
    availableTags,
    selectedTags,
    visibleCards,
    toggleTag,
    setTags,
    clearTags,
    isFiltering: selectedTags.length > 0
  }
}

export default useBrowseTagFilter
