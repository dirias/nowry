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

export default ScreenChromeProvider
