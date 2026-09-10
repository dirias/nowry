import { useCallback, useMemo, useState } from 'react'

/**
 * The selection over a list of cards (PRD D16, ADR-023 point 2).
 *
 * A set of ids and the five verbs over it. `selecting` is true while the set is
 * non-empty, which is what swaps a toolbar for a selection bar and shows every
 * row's checkbox at once.
 *
 * `retain(ids)` prunes the set to the cards still listed: a card that left
 * after a filter change or a bulk verb must not stay selected out of sight,
 * where the next verb would silently include it.
 *
 * **What is NOT here is the point.** Starting a selection is a gesture, and the
 * two clients have different ones — a long press on a phone, a hover checkbox
 * and the Escape key on the web. Both are DOM or native, so each client wraps
 * this with its own. What they share is the set and the rules over it.
 */
export function useCardSelection() {
  const [selected, setSelected] = useState(() => new Set())
  const selecting = selected.size > 0

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids) => setSelected(new Set(ids)), [])

  const retain = useCallback((ids) => {
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const keep = new Set(ids)
      const next = new Set([...prev].filter((id) => keep.has(id)))
      // Same size means same set here, since `next` is a subset of `prev`.
      return next.size === prev.size ? prev : next
    })
  }, [])

  const clear = useCallback(() => setSelected((prev) => (prev.size === 0 ? prev : new Set())), [])
  const isSelected = useCallback((id) => selected.has(id), [selected])

  return useMemo(
    () => ({ selected, selecting, isSelected, toggle, selectAll, retain, clear }),
    [selected, selecting, isSelected, toggle, selectAll, retain, clear]
  )
}

export default useCardSelection
