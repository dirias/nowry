/**
 * Who owns the bottom safe-area inset on this screen.
 *
 * Android's edge-to-edge mode draws the app UNDER the system navigation, so
 * something has to hold that space. Exactly one thing may: the piece of chrome
 * closest to the bottom of the window.
 *
 * With a tab bar that is the tab bar, and a screen above it must not add the
 * inset again — doing so is a band of dead space between the content and the
 * bar. Without a tab bar the screen is the closest thing to the edge and takes
 * it itself.
 *
 * A context rather than a prop, because it is a fact about where a screen is
 * mounted, and asking every route to remember it is asking every route to get
 * it wrong once.
 */
import { createContext, useContext } from 'react'

const TabBarContext = createContext(false)

/** Wraps the tab navigator's screens. */
export const TabBarProvider = ({ children }) => <TabBarContext.Provider value>{children}</TabBarContext.Provider>

export const useHasTabBar = () => useContext(TabBarContext)

export default TabBarProvider
