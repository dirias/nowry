import { createContext, useContext } from 'react'

/**
 * What a node or a link on the canvas may ask the canvas to do: write its
 * text, finish editing, make the next idea, start a resize. Passed by context
 * rather than through each node's `data`, so a node's props change only when
 * the node itself does and the library can skip redrawing the others.
 */
export const BoardCanvasContext = createContext(null)

export const useBoardCanvas = () => {
  const value = useContext(BoardCanvasContext)
  if (!value) throw new Error('useBoardCanvas must be used inside BoardCanvas')
  return value
}
