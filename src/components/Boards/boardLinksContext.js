import { createContext, useContext } from 'react'

/**
 * What the board page lets a node reach outside the board (BOARD-005,
 * BOARD-006): the live items behind item tiles and their tick, the item
 * sheet, the cards a note made, Make items and Make cards. Provided by
 * `BoardLinks`; null outside it, and every reader copes with null (a canvas
 * mounted on its own draws stored titles and offers none of these).
 */
export const BoardLinksContext = createContext(null)

export const useBoardLinks = () => useContext(BoardLinksContext)
