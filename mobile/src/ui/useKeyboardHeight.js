/**
 * How much of the screen the keyboard is covering, in points.
 *
 * Android's own resize mode does not reach inside a transparent modal under
 * edge-to-edge, and `KeyboardAvoidingView` is unreliable there — which is why
 * the bottom sheet measures the keyboard itself rather than wrapping in one,
 * and why the companion's chat, whose composer is pinned to the bottom of a
 * non-scrolling screen, has exactly the same problem (MOB-085).
 *
 * Measuring it in JavaScript also means no `softwareKeyboardLayoutMode` in the
 * app config, which would cost a native build.
 *
 * Zero when the keyboard is closed, so a caller can pad by it unconditionally.
 */
import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

export function useKeyboardHeight() {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    // iOS announces the keyboard before it arrives, Android only once it has.
    const shown = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hidden = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const open = Keyboard.addListener(shown, (event) => setHeight(event.endCoordinates?.height ?? 0))
    const close = Keyboard.addListener(hidden, () => setHeight(0))
    return () => {
      open.remove()
      close.remove()
    }
  }, [])

  return height
}

export default useKeyboardHeight
