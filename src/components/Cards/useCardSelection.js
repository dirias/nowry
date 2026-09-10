import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useCardSelection as useSharedSelection } from '@nowry/core/hooks/useCardSelection'
import { useIsMobile } from '../../hooks/useIsMobile'

export const LONG_PRESS_MS = 500

// Escape inside a sheet, a menu or a listbox belongs to that surface — Joy
// closes it — and must not also throw the selection away underneath.
const OWNED_BY_OVERLAY = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'

/**
 * The web's selection: the shared set, plus the two ways this client starts and
 * ends one.
 *
 * The set and its rules moved to `@nowry/core/hooks/useCardSelection` so the
 * phone runs the same ones. What stays here is DOM — Escape clears from
 * anywhere on the page while a selection exists, and on a touch screen a long
 * press on a row starts one. `longPressHandlers(id)` are the pointer handlers a
 * row spreads; the click that follows the release is swallowed so the row does
 * not toggle straight back.
 */
export function useCardSelection() {
  const isMobile = useIsMobile()
  const shared = useSharedSelection()
  const { selecting, clear, toggle } = shared

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

  return useMemo(() => ({ ...shared, longPressHandlers }), [shared, longPressHandlers])
}

export default useCardSelection
