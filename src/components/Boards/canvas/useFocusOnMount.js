import { useEffect } from 'react'

/** How many frames to keep trying: a node is measured within one or two. */
const MAX_FRAMES = 30
/** Focus must hold this many frames in a row before the hook lets go. */
const HOLD_FRAMES = 3

/**
 * Focus a field as soon as it can take focus, keep it there while the
 * surface settles, and put the caret at the end.
 *
 * Two things took focus away from a field that focused itself once on
 * mount. `@xyflow/react` keeps a node hidden until it has measured it, and
 * the browser refuses focus to a hidden element without a word, so a new note
 * took no keystrokes. And a modal's focus trap moves focus to the dialog once
 * it has opened, so the item picker's search field lost it and Enter did
 * nothing. And a modal renders its field a moment after mounting. The hook
 * tries each frame until the field exists and focus has held for a few frames.
 */
export function useFocusOnMount(ref) {
  useEffect(() => {
    let frame = null
    let tries = 0
    let held = 0
    let placed = false
    const attempt = () => {
      const el = ref.current
      // A modal renders its content through a portal a moment after the
      // component mounts: no field yet is a reason to wait, not to stop.
      if (!el) {
        if (tries++ < MAX_FRAMES) frame = requestAnimationFrame(attempt)
        return
      }
      if (el.ownerDocument?.activeElement !== el) {
        held = 0
        el.focus({ preventScroll: true })
      }
      if (el.ownerDocument?.activeElement === el) {
        if (!placed && typeof el.setSelectionRange === 'function') {
          const end = el.value?.length ?? 0
          el.setSelectionRange(end, end)
        }
        placed = true
        held += 1
        if (held >= HOLD_FRAMES) return
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
