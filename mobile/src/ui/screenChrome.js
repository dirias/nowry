/**
 * Who owns each safe-area inset on this screen.
 *
 * Android draws this app under the system bars, so something has to hold that
 * space at each edge. Exactly one thing may: the piece of chrome closest to
 * that edge of the window.
 *
 * With an app bar the top inset is the bar's; with a tab bar the bottom inset
 * is the bar's. A screen between them must not add either again — doing so is a
 * band of dead space against chrome that is already clear. A screen with
 * nothing above or below it takes both itself.
 *
 * A context rather than props, because it is a fact about where a screen is
 * mounted, and asking every route to remember it is asking every route to get
 * it wrong once.
 */
import { createContext, useContext, useMemo } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * The tab bar's own height, before the system navigation is added under it.
 *
 * It lives here rather than in the layout that draws it because it is chrome
 * spec, and because anything that needs to clear the keyboard has to know how
 * much of the window the bar below it is already holding.
 */
export const TAB_BAR_HEIGHT = 56

const NO_CHROME = { top: false, bottom: false }

const ScreenChromeContext = createContext(NO_CHROME)

/**
 * Wraps a navigator that draws its own chrome. `top` means an app bar sits
 * above these screens, `bottom` means a tab bar sits below them.
 */
export function ScreenChromeProvider({ top = false, bottom = false, children }) {
  // Memoised so the context does not re-render every consumer on each render
  // of the layout that provides it.
  const value = useMemo(() => ({ top, bottom }), [top, bottom])
  return <ScreenChromeContext.Provider value={value}>{children}</ScreenChromeContext.Provider>
}

/** The edges this screen must still inset for itself. */
export function useScreenEdges() {
  const chrome = useContext(ScreenChromeContext)
  const edges = []
  if (!chrome.top) edges.push('top')
  if (!chrome.bottom) edges.push('bottom')
  return edges
}

/**
 * How far a bottom-anchored control on THIS screen must rise to clear the
 * keyboard (MOB-085).
 *
 * Not simply the keyboard's height. The keyboard covers the window from its
 * bottom edge; a screen under a tab bar already ends at the bar's top, so the
 * bar and the system navigation beneath it are height the keyboard takes
 * without taking any of this screen. Padding by the raw height is that much
 * dead space between the control and the keys.
 *
 * @param {number} keyboard - from `useKeyboardHeight`.
 */
export function useKeyboardClearance(keyboard) {
  const chrome = useContext(ScreenChromeContext)
  const insets = useSafeAreaInsets()
  if (!keyboard) return 0
  const held = chrome.bottom ? TAB_BAR_HEIGHT + insets.bottom : 0
  return Math.max(0, keyboard - held)
}

export default ScreenChromeProvider
