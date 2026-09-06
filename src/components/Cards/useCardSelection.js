import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'

export const LONG_PRESS_MS = 500

// Escape inside a sheet, a menu or a listbox belongs to that surface — Joy
// closes it — and must not also throw the selection away underneath.
const OWNED_BY_OVERLAY = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'

/**
 * The selection over a list of cards (PRD D16, ADR-023 point 2): a set of
 * ids, `toggle` / `selectAll` / `clear`, and `selecting` — true while the set
 * is non-empty, which is what swaps the toolbar for the selection bar and
 * shows every row's checkbox at once.
 *
 * `retain(ids)` prunes it to the cards still listed. Escape clears it from
 * anywhere on the page while it exists. On a phone a
 * long press on a row starts it: `longPressHandlers(id)` are the pointer
 * handlers a row spreads, and they toggle the id after 500ms of press. The
 * click that follows the release is swallowed so the row does not toggle
 * straight back.
 */
export function useCardSelection() {
  const isMobile = useIsMobile()
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
  // Keep only what is still on screen: a card that left the list after a
  // filter change or a bulk verb cannot stay selected out of sight.
  const retain = useCallback((ids) => {
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const keep = new Set(ids)
      const next = new Set([...prev].filter((id) => keep.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [])
  const clear = useCallback(() => setSelected((prev) => (prev.size === 0 ? prev : new Set())), [])
  const isSelected = useCallback((id) => selected.has(id), [selected])

  useEffect(() => {
    if (!selecting) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || event.target?.closest?.(OWNED_BY_OVERLAY)) return
      clear()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selecting, clear])

  const timer = useRef(null)
  const fired = useRef(false)
  const cancelPress = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])
  useEffect(() => cancelPress, [cancelPress])

  const longPressHandlers = useCallback(
    (id) => {
      if (!isMobile) return {}
      return {
        onPointerDown: () => {
          cancelPress()
          fired.current = false
          timer.current = setTimeout(() => {
            timer.current = null
            fired.current = true
            toggle(id)
          }, LONG_PRESS_MS)
        },
        onPointerUp: cancelPress,
        onPointerLeave: cancelPress,
        onPointerCancel: cancelPress,
        onClickCapture: (event) => {
          if (!fired.current) return
          fired.current = false
          event.stopPropagation()
          event.preventDefault()
        }
      }
    },
    [isMobile, cancelPress, toggle]
  )

  return useMemo(
    () => ({ selected, selecting, isSelected, toggle, selectAll, retain, clear, longPressHandlers }),
    [selected, selecting, isSelected, toggle, selectAll, retain, clear, longPressHandlers]
  )
}

export default useCardSelection
