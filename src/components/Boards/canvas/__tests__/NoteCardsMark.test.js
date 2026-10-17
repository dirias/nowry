/**
 * BOARD-006 — a note that made cards says how many, and the mark opens them.
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import NoteNode from '../nodes/NoteNode'
import { BoardCanvasContext } from '../BoardCanvasContext'
import { BoardLinksContext } from '../../boardLinksContext'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, options) => (options?.count !== undefined ? `${key}:${options.count}` : key) })
}))
jest.mock('@xyflow/react', () => ({
  Handle: () => null,
  NodeResizer: () => null,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' }
}))

const note = (cardIds) => ({
  id: 'n',
  kind: 'note',
  x: 0,
  y: 0,
  w: null,
  h: null,
  z: 1,
  text: 'Calvin cycle\nIn the stroma',
  color: 'green',
  size: null,
  title: null,
  ref: null,
  cardIds
})

const mount = (node, links = { openCards: jest.fn() }) => {
  render(
    <CssVarsProvider>
      <BoardCanvasContext.Provider value={{ checkpoint: jest.fn() }}>
        <BoardLinksContext.Provider value={links}>
          <NoteNode id='n' data={{ node, editing: false, plus: false, fresh: false }} selected={false} />
        </BoardLinksContext.Provider>
      </BoardCanvasContext.Provider>
    </CssVarsProvider>
  )
  return links
}

it('shows "3 cards" and opens them', () => {
  const node = note(['c1', 'c2', 'c3'])
  const links = mount(node)
  const mark = screen.getByRole('button', { name: 'boards.note.cardsAria:3' })
  expect(mark).toHaveTextContent('boards.note.cards:3')
  fireEvent.click(mark)
  expect(links.openCards).toHaveBeenCalledWith(node)
})

it('a note that made no cards has no mark', () => {
  mount(note([]))
  expect(screen.queryByRole('button', { name: /boards\.note\.cardsAria/ })).toBeNull()
})
