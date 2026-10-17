/**
 * BOARD-004 — the canvas on the real `@xyflow/react` (its UMD build), not a
 * stand-in: it mounts every kind of node and a labelled link, the dock and the
 * zoom readout, without an error. jsdom has no layout, so nothing here is
 * measured; the grammar itself is covered in BoardCanvas.test.js.
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import BoardCanvas from '../BoardCanvas'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }) }))

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  global.ResizeObserver = global.ResizeObserver || ResizeObserverStub
  window.DOMMatrixReadOnly =
    window.DOMMatrixReadOnly ||
    class {
      constructor() {
        this.m22 = 1
      }
    }
})

const base = { w: null, h: null, z: 1, text: null, color: null, size: null, title: null, ref: null, cardIds: [] }
const BOARD = {
  id: 'b1',
  name: 'Smoke',
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [
    { ...base, id: 'f', kind: 'frame', x: 0, y: 0, w: 400, h: 300, z: -1, title: 'Inputs' },
    { ...base, id: 'a', kind: 'note', x: 40, y: 60, text: 'Light\nAbsorbed by chlorophyll', color: 'green' },
    { ...base, id: 'b', kind: 'note', x: 500, y: 60, text: 'Sugar', color: 'grey' },
    { ...base, id: 't', kind: 'text', x: 0, y: -80, text: 'How a leaf makes food', size: 'xl' },
    { ...base, id: 'i', kind: 'item', x: 500, y: 300, ref: { kind: 'task', id: 'task1', goalId: null } }
  ],
  links: [{ id: 'l', from: 'a', to: 'b', label: 'feeds' }]
}

it('mounts on the real library', () => {
  const noop = () => {}
  render(
    <CssVarsProvider>
      <div style={{ width: 800, height: 600 }}>
        <BoardCanvas board={BOARD} apply={noop} checkpoint={noop} undo={noop} redo={noop} setViewport={noop} />
      </div>
    </CssVarsProvider>
  )
  expect(screen.getByTestId('board-canvas')).toBeInTheDocument()
  expect(screen.getByTestId('board-note-a')).toHaveTextContent('Light')
  expect(screen.getByTestId('board-frame-f')).toHaveTextContent('Inputs')
  expect(screen.getByTestId('board-text-t')).toHaveTextContent('How a leaf makes food')
  expect(screen.getByTestId('board-item-i')).toHaveTextContent('boards.item.kind.task')
  expect(screen.getByTestId('board-zoom-readout')).toHaveTextContent('100%')
  expect(screen.getByRole('toolbar', { name: 'boards.tools.label' })).toBeInTheDocument()
})

function Live({ initial }) {
  const ref = React.useRef(initial)
  const [board, setBoard] = React.useState(initial)
  const apply = React.useCallback((updater) => {
    const next = updater(ref.current)
    if (!next) return
    ref.current = { ...ref.current, nodes: next.nodes, links: next.links }
    setBoard(ref.current)
  }, [])
  const noop = () => {}
  return <BoardCanvas board={board} apply={apply} checkpoint={noop} undo={noop} redo={noop} setViewport={noop} />
}

it('on the real library, a double-click on the pane makes a note, typing, and Tab makes the next one', () => {
  const { container } = render(
    <CssVarsProvider>
      <Live initial={{ ...BOARD, nodes: [], links: [] }} />
    </CssVarsProvider>
  )
  fireEvent.doubleClick(container.querySelector('.react-flow__pane'), { clientX: 200, clientY: 100 })
  const editing = () => container.querySelectorAll('textarea[aria-label="boards.note.editAria"]')
  const editors = editing()
  expect(editors).toHaveLength(1)
  expect(editors[0]).toHaveFocus()
  fireEvent.change(editors[0], { target: { value: 'Photosynthesis' } })
  fireEvent.keyDown(editors[0], { key: 'Tab' })
  expect(container.querySelectorAll('.react-flow__node-note')).toHaveLength(2)
  expect(editing()).toHaveLength(1)
  expect(editing()[0]).toHaveFocus()
  expect(editing()[0]).not.toBe(editors[0])
})

it('on the real library, a click selects a note, its "+" makes a linked one, and Delete removes the selection', () => {
  const { container } = render(
    <CssVarsProvider>
      <Live initial={{ ...BOARD, nodes: [BOARD.nodes[1], BOARD.nodes[2]], links: [] }} />
    </CssVarsProvider>
  )
  const nodeA = container.querySelector('.react-flow__node[data-id="a"]')
  fireEvent.click(nodeA)
  expect(nodeA).toHaveClass('selected')
  fireEvent.click(nodeA.querySelector('.board-plus.react-flow__handle-right'))
  expect(container.querySelectorAll('.react-flow__node-note')).toHaveLength(3)
  const typing = container.querySelector('textarea[aria-label="boards.note.editAria"]')
  fireEvent.keyDown(typing, { key: 'Escape' })
  expect(screen.getByTestId('board-canvas')).toHaveFocus()
  fireEvent.keyDown(screen.getByTestId('board-canvas'), { key: 'Delete' })
  expect(container.querySelectorAll('.react-flow__node-note')).toHaveLength(2)
})
