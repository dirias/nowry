import { useEffect } from 'react'

/** How many frames to keep trying: a node is measured within one or two. */
const MAX_FRAMES = 30

/**
 * Focus a field as soon as it can take focus, and put the caret at the end.
 *
 * `@xyflow/react` keeps a node hidden (`visibility: hidden`) until it has
 * measured it, and the browser refuses focus to a hidden element without a
 * word. A field that focused itself once on mount therefore lost every
 * keystroke typed into a new note: the person double-clicked, typed, and
 * nothing appeared. So this tries each animation frame until focus lands.
 */
export function useFocusOnMount(ref) {
  useEffect(() => {
    let frame = null
    let tries = 0
    const attempt = () => {
      const el = ref.current
      if (!el) return
      el.focus({ preventScroll: true })
      if (el.ownerDocument?.activeElement === el) {
        const end = el.value?.length ?? 0
        if (typeof el.setSelectionRange === 'function') el.setSelectionRange(end, end)
        return
      }
      if (tries++ < MAX_FRAMES) frame = requestAnimationFrame(attempt)
    }
    attempt()
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [ref])
}

export default useFocusOnMount
