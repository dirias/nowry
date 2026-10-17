/**
 * BOARD-005 — `I` picks an item (PRD D6): one search over tasks, milestones
 * and goals, grouped; the arrows and Enter place the chosen one at the
 * view's centre, selected, in one undo step; Esc closes.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import BoardCanvas from '../BoardCanvas'
import { BoardLinksContext } from '../../boardLinksContext'
import { readItem } from '../../itemReading'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
}))

let mockFlowProps = null
const mockFlow = { screenToFlowPosition: jest.fn(), zoomIn: jest.fn(), zoomOut: jest.fn(), fitView: jest.fn() }

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
        { 'data-testid': 'rf' },
        h('div', { className: 'react-flow__pane', 'data-testid': 'pane' }),
        props.nodes.map((n) => {
          const Node = props.nodeTypes[n.type]
          return h('div', { key: n.id, 'data-id': n.id }, h(Node, { id: n.id, data: n.data, selected: n.selected }))
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
    Handle: () => null,
    NodeResizer: () => null,
    NodeToolbar: ({ children, isVisible }) => (isVisible ? h('div', { 'data-testid': 'node-toolbar' }, children) : null),
    BaseEdge: () => null,
    EdgeLabelRenderer: ({ children }) => children,
    getBezierPath: () => ['', 0, 0]
  }
})

const TASKS = [
  { _id: 't1', title: 'Biology essay draft', is_completed: false },
  { _id: 't2', title: 'Book the dentist', is_completed: false }
]
const GOALS = [
  { _id: 'g1', title: 'Pass biology', focus_area_id: 'a1', milestones: [{ id: 'm1', title: 'Unit 3 test', completed: false }] }
]
const LINKS = {
  tasks: TASKS,
  goals: GOALS,
  areas: [],
  loading: false,
  error: null,
  read: (ref) => readItem(ref, { tasks: TASKS, goals: GOALS }),
  setDone: jest.fn(),
  openItem: jest.fn()
}

let latest = null
const applied = []

function Harness() {
  const ref = React.useRef({ id: 'b1', name: 'Board', nodes: [], links: [], viewport: { x: 0, y: 0, zoom: 1 } })
  const [board, setBoard] = React.useState(ref.current)
  latest = ref
  const apply = React.useCallback((updater, options) => {
    const next = updater({ nodes: ref.current.nodes, links: ref.current.links })
    if (!next) return
    applied.push(options)
    ref.current = { ...ref.current, nodes: next.nodes, links: next.links }
    setBoard(ref.current)
  }, [])
  const noop = () => {}
  return <BoardCanvas board={board} apply={apply} checkpoint={noop} undo={noop} redo={noop} setViewport={noop} />
}

const mount = () =>
  render(
    <CssVarsProvider>
      <BoardLinksContext.Provider value={LINKS}>
        <Harness />
      </BoardLinksContext.Provider>
    </CssVarsProvider>
  )

const search = () => screen.getByRole('combobox', { name: 'boards.picker.search' })

beforeEach(() => {
  mockFlowProps = null
  applied.length = 0
  mockFlow.screenToFlowPosition.mockImplementation(({ x, y }) => ({ x: x + 1000, y: y + 2000 }))
})

it('I opens the picker; it lists tasks, milestones and goals in groups', async () => {
  mount()
  fireEvent.keyDown(screen.getByTestId('board-canvas'), { key: 'i' })
  // The modal's trap focuses the dialog first; the field takes focus back a frame later.
  await waitFor(() => expect(search()).toHaveFocus())
  expect(screen.getByRole('group', { name: 'boards.picker.groups.task' })).toHaveTextContent('Biology essay draft')
  expect(screen.getByRole('group', { name: 'boards.picker.groups.milestone' })).toHaveTextContent('Unit 3 test')
  expect(screen.getByRole('group', { name: 'boards.picker.groups.goal' })).toHaveTextContent('Pass biology')
})

it('search, arrows and Enter place the chosen item at the view centre, selected, in one step', () => {
  mount()
  fireEvent.keyDown(screen.getByTestId('board-canvas'), { key: 'i' })
  fireEvent.change(search(), { target: { value: 'bio' } })
  const options = screen.getAllByRole('option')
  expect(options.map((o) => o.textContent)).toEqual(['Biology essay draft', 'Unit 3 testPass biology', 'Pass biology'])
  expect(options[0]).toHaveAttribute('aria-selected', 'true')
  fireEvent.keyDown(search(), { key: 'ArrowDown' })
  fireEvent.keyDown(search(), { key: 'ArrowDown' })
  expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true')
  act(() => {
    fireEvent.keyDown(search(), { key: 'Enter' })
  })
  const nodes = latest.current.nodes
  expect(nodes).toHaveLength(1)
  // jsdom lays nothing out: the centre of a 0×0 canvas, projected.
  expect(nodes[0]).toMatchObject({
    kind: 'item',
    x: 1000 - 128,
    y: 2000 - 28,
    title: 'Pass biology',
    ref: { kind: 'goal', id: 'g1', goalId: null }
  })
  expect(applied).toEqual([undefined])
  expect(mockFlowProps.nodes[0].selected).toBe(true)
  expect(screen.queryByRole('combobox', { name: 'boards.picker.search' })).toBeNull()
  expect(screen.getByTestId(`board-item-${nodes[0].id}`)).toHaveTextContent('Pass biology')
})

it('the dock’s Item button opens it too, and Esc closes it without placing anything', () => {
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'boards.tools.item' }))
  expect(search()).toBeInTheDocument()
  fireEvent.keyDown(search(), { key: 'Escape' })
  expect(screen.queryByRole('combobox', { name: 'boards.picker.search' })).toBeNull()
  expect(latest.current.nodes).toHaveLength(0)
})

it('says so when nothing matches', () => {
  mount()
  fireEvent.keyDown(screen.getByTestId('board-canvas'), { key: 'i' })
  fireEvent.change(search(), { target: { value: 'zebra' } })
  expect(screen.queryAllByRole('option')).toHaveLength(0)
  expect(screen.getByText('boards.picker.empty')).toBeInTheDocument()
})
