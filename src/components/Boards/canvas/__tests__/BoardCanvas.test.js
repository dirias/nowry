/**
 * BOARD-004 — the canvas grammar (PRD D3), driven through the handlers the
 * library would call. `@xyflow/react` is replaced by a stand-in that renders
 * each node with its real component and records the props ReactFlow got, so
 * a test can play the library's part (a double-click on the pane, a link
 * dropped, a drag) and read the board that results.
 */
import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import BoardCanvas from '../BoardCanvas'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
}))

let mockFlowProps = null
const mockFlow = {
  screenToFlowPosition: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
  fitView: jest.fn()
}

jest.mock('@xyflow/react', () => {
  const ReactMod = require('react')
  const h = ReactMod.createElement
  return {
    __esModule: true,
    ReactFlowProvider: ({ children }) => children,
    ReactFlow: (props) => {
      mockFlowProps = props
      return h(
        'div',
        { 'data-testid': 'rf', onDoubleClick: props.onDoubleClick },
        h('div', { className: 'react-flow__pane', 'data-testid': 'pane' }),
        props.nodes.map((n) => {
          const Node = props.nodeTypes[n.type]
          return h(
            'div',
            { key: n.id, className: 'react-flow__node', 'data-id': n.id, 'data-testid': `rf-node-${n.id}` },
            h(Node, { id: n.id, data: n.data, selected: n.selected })
          )
        }),
        props.children
      )
    },
    Background: () => null,
    BackgroundVariant: { Dots: 'dots' },
    ConnectionMode: { Loose: 'loose' },
    MarkerType: { ArrowClosed: 'arrowclosed' },
    Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
    useReactFlow: () => mockFlow,
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    useInternalNode: () => null,
    Handle: ({ children, onClick, className, role, ...rest }) =>
      h('div', { onClick, className, role, 'aria-label': rest['aria-label'] }, children),
    NodeResizer: () => null,
    NodeToolbar: ({ children, isVisible }) => (isVisible ? h('div', { 'data-testid': 'node-toolbar' }, children) : null),
    BaseEdge: () => null,
    EdgeLabelRenderer: ({ children }) => children,
    getBezierPath: () => ['', 0, 0]
  }
})

const note = (id, x = 0, y = 0, extra = {}) => ({
  id,
  kind: 'note',
  x,
  y,
  w: null,
  h: null,
  z: 1,
  text: `Note ${id}`,
  color: 'yellow',
  size: null,
  title: null,
  ref: null,
  cardIds: [],
  ...extra
})

let latest = null
const spies = {}

function Harness({ initial, ...props }) {
  const ref = React.useRef(initial)
  const [board, setBoard] = React.useState(initial)
  latest = ref
  const apply = React.useCallback((updater, options) => {
    spies.apply(options)
    const next = updater({ nodes: ref.current.nodes, links: ref.current.links })
    if (!next) return
    ref.current = { ...ref.current, nodes: next.nodes, links: next.links }
    setBoard(ref.current)
  }, [])
  return (
    <BoardCanvas
      board={board}
      apply={apply}
      checkpoint={spies.checkpoint}
      undo={spies.undo}
      redo={spies.redo}
      setViewport={spies.setViewport}
      onShowKeys={spies.keys}
      {...props}
    />
  )
}

const BOARD = (nodes = [], links = []) => ({ id: 'b1', name: 'Board', nodes, links, viewport: { x: 0, y: 0, zoom: 1 } })

const mount = (board = BOARD(), props = {}) =>
  render(
    <CssVarsProvider>
      <Harness initial={board} {...props} />
    </CssVarsProvider>
  )
const nodes = () => latest.current.nodes
const links = () => latest.current.links
const canvas = () => screen.getByTestId('board-canvas')
const select = (...ids) => act(() => mockFlowProps.onNodesChange(ids.map((id) => ({ type: 'select', id, selected: true }))))
const editorOf = (id) => screen.getByTestId(`board-editor-${id}`)

beforeEach(() => {
  mockFlowProps = null
  latest = null
  Object.assign(spies, {
    apply: jest.fn(),
    checkpoint: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    setViewport: jest.fn(),
    keys: jest.fn()
  })
  // CRA resets mock implementations between tests; the projection is set again here.
  mockFlow.screenToFlowPosition.mockImplementation(({ x, y }) => ({ x: x + 1000, y: y + 2000 }))
  document.elementFromPoint = jest.fn(() => null)
})

describe('the library is configured for the one grammar (PRD D3)', () => {
  it('pans on drag, selects with Shift, zooms with ⌘ or pinch, never on double-click, and deletes through the canvas', () => {
    mount(BOARD([note('a')]))
    expect(mockFlowProps).toMatchObject({
      panOnDrag: true,
      selectionOnDrag: false,
      selectionKeyCode: 'Shift',
      panOnScroll: true,
      zoomOnScroll: false,
      zoomOnPinch: true,
      zoomActivationKeyCode: ['Meta', 'Control'],
      zoomOnDoubleClick: false,
      minZoom: 0.1,
      maxZoom: 4,
      deleteKeyCode: null,
      connectionMode: 'loose'
    })
  })

  it('opens at the saved viewport, and fits a board that has none', () => {
    const saved = { ...BOARD([note('a')]), viewport: { x: 40, y: -20, zoom: 0.8 } }
    const { unmount } = mount(saved)
    expect(mockFlowProps.defaultViewport).toEqual({ x: 40, y: -20, zoom: 0.8 })
    expect(mockFlowProps.fitView).toBe(false)
    unmount()
    mount(BOARD([note('a')]))
    expect(mockFlowProps.fitView).toBe(true)
  })

  it('saves the view when it stops moving', () => {
    mount(BOARD([note('a')]))
    act(() => mockFlowProps.onMoveEnd(null, { x: 5, y: 6, zoom: 1.5 }))
    expect(spies.setViewport).toHaveBeenCalledWith({ x: 5, y: 6, zoom: 1.5 })
  })

  it('draws frames behind every other node', () => {
    mount(BOARD([note('a'), { ...note('f'), kind: 'frame', w: 400, h: 300, z: 3, text: null }]))
    const frame = mockFlowProps.nodes.find((n) => n.id === 'f')
    const plain = mockFlowProps.nodes.find((n) => n.id === 'a')
    expect(frame.zIndex).toBeLessThan(0)
    expect(plain.zIndex).toBeGreaterThan(frame.zIndex)
  })
})

describe('making a note', () => {
  it('double-click on empty canvas makes a note there, typing, in the last colour used', () => {
    mount()
    fireEvent.doubleClick(screen.getByTestId('pane'), { clientX: 100, clientY: 50 })
    expect(mockFlow.screenToFlowPosition).toHaveBeenCalledWith({ x: 100, y: 50 })
    expect(nodes()).toHaveLength(1)
    expect(nodes()[0]).toMatchObject({ kind: 'note', x: 1100 - 110, y: 2050 - 24, color: 'yellow' })
    expect(editorOf(nodes()[0].id)).toHaveFocus()
  })

  it('a double-click on a note is not a double-click on the canvas', () => {
    mount(BOARD([note('a')]))
    fireEvent.doubleClick(screen.getByTestId('board-note-a'))
    expect(nodes()).toHaveLength(1)
  })

  it('typing writes the text, and the new note and its words are one undo step', () => {
    mount()
    fireEvent.doubleClick(screen.getByTestId('pane'), { clientX: 0, clientY: 0 })
    const id = nodes()[0].id
    spies.apply.mockClear()
    fireEvent.change(editorOf(id), { target: { value: 'Photosynthesis' } })
    fireEvent.change(editorOf(id), { target: { value: 'Photosynthesis\nLight to sugar' } })
    expect(nodes()[0].text).toBe('Photosynthesis\nLight to sugar')
    expect(spies.apply.mock.calls.map(([options]) => options)).toEqual([{ history: false }, { history: false }])
  })

  it('the N tool makes a note at the next click, then returns to Select', () => {
    mount()
    fireEvent.keyDown(canvas(), { key: 'n' })
    expect(screen.getByRole('button', { name: 'boards.tools.note' })).toHaveAttribute('aria-pressed', 'true')
    act(() => mockFlowProps.onPaneClick({ clientX: 10, clientY: 10 }))
    expect(nodes()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'boards.tools.select' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('a new board starts on one note, already typing', () => {
    mount(BOARD(), { startWithNote: true })
    act(() => mockFlowProps.onInit(mockFlow))
    act(() => mockFlowProps.onInit(mockFlow))
    expect(nodes()).toHaveLength(1)
    expect(editorOf(nodes()[0].id)).toBeInTheDocument()
  })
})

describe('the next idea is one key away', () => {
  it('Tab while typing makes a linked child to the right, already typing', () => {
    mount(BOARD([note('a', 0, 0)]))
    fireEvent.doubleClick(screen.getByTestId('board-note-a'))
    act(() => mockFlowProps.onNodeDoubleClick({ target: document.body }, { id: 'a', type: 'note' }))
    fireEvent.keyDown(editorOf('a'), { key: 'Tab' })
    expect(nodes()).toHaveLength(2)
    const child = nodes()[1]
    expect(child.x).toBeGreaterThan(0)
    expect(links()).toEqual([expect.objectContaining({ from: 'a', to: child.id })])
    expect(editorOf(child.id)).toHaveFocus()
  })

  it('Tab on a selected note does the same', () => {
    mount(BOARD([note('a')]))
    select('a')
    fireEvent.keyDown(canvas(), { key: 'Tab' })
    expect(nodes()).toHaveLength(2)
    expect(links()[0]).toMatchObject({ from: 'a', to: nodes()[1].id })
  })

  it('⌘ Enter makes a sibling below, linked from the same parent', () => {
    mount(BOARD([note('p', 0, 0), note('a', 300, 0)], [{ id: 'l1', from: 'p', to: 'a', label: '' }]))
    select('a')
    fireEvent.keyDown(canvas(), { key: 'Enter', metaKey: true })
    expect(nodes()).toHaveLength(3)
    const sibling = nodes()[2]
    expect(sibling.x).toBe(300)
    expect(sibling.y).toBeGreaterThan(0)
    expect(links()[1]).toMatchObject({ from: 'p', to: sibling.id })
  })

  it('Ctrl Enter while typing does the same', () => {
    mount(BOARD([note('a')]))
    act(() => mockFlowProps.onNodeDoubleClick({ target: document.body }, { id: 'a', type: 'note' }))
    fireEvent.keyDown(editorOf('a'), { key: 'Enter', ctrlKey: true })
    expect(nodes()).toHaveLength(2)
  })

  it('a "+" on the single selected note makes a linked note on its side', () => {
    mount(BOARD([note('a', 0, 0)]))
    select('a')
    fireEvent.click(screen.getByRole('button', { name: 'boards.plus.bottom' }))
    expect(nodes()).toHaveLength(2)
    expect(nodes()[1].y).toBeGreaterThan(0)
    expect(links()[0]).toMatchObject({ from: 'a', to: nodes()[1].id })
  })

  it('Enter edits the selected note; a printable key starts editing with it', () => {
    mount(BOARD([note('a')]))
    select('a')
    fireEvent.keyDown(canvas(), { key: 'Enter' })
    expect(editorOf('a')).toBeInTheDocument()
    fireEvent.keyDown(editorOf('a'), { key: 'Escape' })
    expect(screen.queryByTestId('board-editor-a')).toBeNull()
    fireEvent.keyDown(canvas(), { key: 'x' })
    expect(nodes()[0].text).toBe('Note ax')
    expect(editorOf('a')).toBeInTheDocument()
  })
})

describe('connecting', () => {
  it('a link dropped on a note links them', () => {
    mount(BOARD([note('a'), note('b', 400)]))
    const target = screen.getByTestId('rf-node-b')
    document.elementFromPoint = jest.fn(() => target)
    act(() => mockFlowProps.onConnectEnd({ clientX: 500, clientY: 20 }, { isValid: false, fromNode: { id: 'a' } }))
    expect(links()).toEqual([expect.objectContaining({ from: 'a', to: 'b' })])
  })

  it('a link dropped on empty canvas makes a linked note there, typing', () => {
    mount(BOARD([note('a', 0, 0, { color: 'blue' })]))
    document.elementFromPoint = jest.fn(() => screen.getByTestId('pane'))
    act(() => mockFlowProps.onConnectEnd({ clientX: 300, clientY: 40 }, { isValid: false, fromNode: { id: 'a' } }))
    expect(nodes()).toHaveLength(2)
    const made = nodes()[1]
    expect(made).toMatchObject({ x: 1300 - 110, y: 2040 - 24, color: 'blue' })
    expect(links()).toEqual([expect.objectContaining({ from: 'a', to: made.id })])
    expect(editorOf(made.id)).toBeInTheDocument()
  })

  it('a valid connection goes through onConnect, and the end adds nothing', () => {
    mount(BOARD([note('a'), note('b', 400)]))
    act(() => mockFlowProps.onConnect({ source: 'a', target: 'b' }))
    act(() => mockFlowProps.onConnectEnd({ clientX: 1, clientY: 1 }, { isValid: true, fromNode: { id: 'a' } }))
    expect(links()).toHaveLength(1)
    expect(nodes()).toHaveLength(2)
  })
})

describe('selecting with a modifier click', () => {
  it('Shift- or ⌘-click adds a node to the selection, and takes it out again, whatever the library decided', () => {
    mount(BOARD([note('a'), note('b', 300), note('c', 600)]))
    select('a')
    // In one click the library, having missed the Shift key, replaces the
    // selection with b; the click's own modifier then restores a and adds b.
    act(() => {
      mockFlowProps.onNodesChange([
        { type: 'select', id: 'a', selected: false },
        { type: 'select', id: 'b', selected: true }
      ])
      mockFlowProps.onNodeClick({ shiftKey: true }, { id: 'b' })
    })
    act(() => mockFlowProps.onNodeClick({ metaKey: true }, { id: 'c' }))
    act(() => mockFlowProps.onNodeClick({ shiftKey: true }, { id: 'a' }))
    fireEvent.keyDown(canvas(), { key: 'Delete' })
    expect(nodes().map((n) => n.id)).toEqual(['a'])
  })
})

describe('removing, and the keys that must not fire', () => {
  it('Delete removes the selection with its links', () => {
    mount(BOARD([note('a'), note('b', 400)], [{ id: 'l', from: 'a', to: 'b', label: '' }]))
    select('a')
    fireEvent.keyDown(canvas(), { key: 'Delete' })
    expect(nodes().map((n) => n.id)).toEqual(['b'])
    expect(links()).toEqual([])
  })

  it('Backspace while a note is being edited deletes text, never the note', () => {
    mount(BOARD([note('a')]))
    act(() => mockFlowProps.onNodeDoubleClick({ target: document.body }, { id: 'a', type: 'note' }))
    fireEvent.keyDown(editorOf('a'), { key: 'Backspace' })
    fireEvent.keyDown(canvas(), { key: 'Delete' })
    expect(nodes()).toHaveLength(1)
  })

  it('keys pressed in a field are the field’s', () => {
    mount(BOARD([note('a')]))
    select('a')
    const field = document.createElement('input')
    canvas().appendChild(field)
    fireEvent.keyDown(field, { key: 'Delete' })
    expect(nodes()).toHaveLength(1)
  })
})

describe('undo, duplicate, frame, nudge, fit', () => {
  it('⌘Z undoes, ⌘⇧Z and Ctrl Y redo', () => {
    mount(BOARD([note('a')]))
    fireEvent.keyDown(canvas(), { key: 'z', metaKey: true })
    fireEvent.keyDown(canvas(), { key: 'z', metaKey: true, shiftKey: true })
    fireEvent.keyDown(canvas(), { key: 'y', ctrlKey: true })
    expect(spies.undo).toHaveBeenCalledTimes(1)
    expect(spies.redo).toHaveBeenCalledTimes(2)
  })

  it('⌘D duplicates the selection and selects the copies', () => {
    mount(BOARD([note('a')]))
    select('a')
    fireEvent.keyDown(canvas(), { key: 'd', metaKey: true })
    expect(nodes()).toHaveLength(2)
    expect(nodes()[1]).toMatchObject({ x: 24, y: 24, text: 'Note a' })
  })

  it('⌘G frames the selection behind it and names it', () => {
    mount(BOARD([note('a', 0, 0), note('b', 300, 0)]))
    select('a', 'b')
    fireEvent.keyDown(canvas(), { key: 'g', metaKey: true })
    const frame = nodes().find((n) => n.kind === 'frame')
    expect(frame).toBeTruthy()
    expect(frame.x).toBeLessThan(0)
    expect(screen.getByRole('textbox', { name: 'boards.frame.titleAria' })).toBeInTheDocument()
  })

  it('arrows nudge by 10, Shift arrows by 50, one undo step each', () => {
    mount(BOARD([note('a', 0, 0)]))
    select('a')
    fireEvent.keyDown(canvas(), { key: 'ArrowRight' })
    fireEvent.keyDown(canvas(), { key: 'ArrowDown', shiftKey: true })
    expect(nodes()[0]).toMatchObject({ x: 10, y: 50 })
    expect(spies.apply).toHaveBeenLastCalledWith(undefined)
  })

  it('⇧1 fits the board, ⇧2 the selection, ⌘+ and ⌘− zoom, ? lists the keys', () => {
    mount(BOARD([note('a')]))
    select('a')
    fireEvent.keyDown(canvas(), { key: '!', code: 'Digit1', shiftKey: true })
    fireEvent.keyDown(canvas(), { key: '@', code: 'Digit2', shiftKey: true })
    fireEvent.keyDown(canvas(), { key: '=', metaKey: true })
    fireEvent.keyDown(canvas(), { key: '-', metaKey: true })
    expect(mockFlow.fitView).toHaveBeenCalledTimes(2)
    expect(mockFlow.fitView.mock.calls[1][0].nodes).toEqual([{ id: 'a' }])
    expect(mockFlow.zoomIn).toHaveBeenCalled()
    expect(mockFlow.zoomOut).toHaveBeenCalled()
    fireEvent.keyDown(canvas(), { key: 'Escape' })
    fireEvent.keyDown(canvas(), { key: '?' })
    expect(spies.keys).toHaveBeenCalled()
  })
})

describe('dragging is one undo step, and a frame carries what it holds', () => {
  it('checkpoints at the start and moves without history', () => {
    const frame = { ...note('f'), kind: 'frame', x: 0, y: 0, w: 500, h: 400, z: -1, text: null }
    mount(BOARD([frame, note('in', 100, 100), note('out', 900, 900)]))
    act(() => mockFlowProps.onNodeDragStart({}, { id: 'f' }, [{ id: 'f', type: 'frame' }]))
    expect(spies.checkpoint).toHaveBeenCalledTimes(1)
    act(() => mockFlowProps.onNodesChange([{ type: 'position', id: 'f', position: { x: 40, y: 30 }, dragging: true }]))
    act(() => mockFlowProps.onNodesChange([{ type: 'position', id: 'f', position: { x: 50, y: 30 }, dragging: false }]))
    act(() => mockFlowProps.onNodeDragStop({}, { id: 'f' }, []))
    const byId = Object.fromEntries(nodes().map((n) => [n.id, n]))
    expect(byId.f).toMatchObject({ x: 50, y: 30 })
    expect(byId.in).toMatchObject({ x: 150, y: 130 })
    expect(byId.out).toMatchObject({ x: 900, y: 900 })
    expect(spies.apply.mock.calls.every(([options]) => options?.history === false)).toBe(true)
  })

  it('a resize saves the size the handle reports', () => {
    mount(BOARD([note('a')]))
    act(() =>
      mockFlowProps.onNodesChange([
        { type: 'dimensions', id: 'a', resizing: true, setAttributes: true, dimensions: { width: 300.4, height: 180 } }
      ])
    )
    expect(nodes()[0]).toMatchObject({ w: 300, h: 180 })
  })

  it('a measurement is not an edit', () => {
    mount(BOARD([note('a')]))
    act(() => mockFlowProps.onNodesChange([{ type: 'dimensions', id: 'a', dimensions: { width: 220, height: 90 } }]))
    expect(spies.apply).not.toHaveBeenCalled()
    expect(mockFlowProps.nodes[0].measured).toEqual({ width: 220, height: 90 })
  })
})

describe('the selection bar', () => {
  it('recolours the selected notes and remembers the colour for the next note', () => {
    mount(BOARD([note('a')]))
    select('a')
    fireEvent.click(screen.getByRole('button', { name: 'boards.selection.colors.green' }))
    expect(nodes()[0].color).toBe('green')
    act(() => mockFlowProps.onNodesChange([{ type: 'select', id: 'a', selected: false }]))
    fireEvent.doubleClick(screen.getByTestId('pane'), { clientX: 0, clientY: 0 })
    expect(nodes()[1].color).toBe('green')
  })

  it('is hidden while a note is being edited', () => {
    mount(BOARD([note('a')]))
    select('a')
    expect(screen.getByTestId('node-toolbar')).toBeInTheDocument()
    act(() => mockFlowProps.onNodeDoubleClick({ target: document.body }, { id: 'a', type: 'note' }))
    expect(screen.queryByTestId('node-toolbar')).toBeNull()
  })
})
