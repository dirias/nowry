/**
 * BOARD-005/006 — what the board reaches outside itself: Make items turns
 * notes into tasks and the notes into their tiles (one undo step, links
 * kept); a tile's tick writes the task or the milestone; a click opens the
 * item sheet or the goal's area; a note's cards open on their deck.
 */
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import BoardLinks from '../BoardLinks'
import BoardSelectionActions from '../BoardSelectionActions'
import { useBoardLinks } from '../boardLinksContext'
import { tasksService } from '@nowry/core/api/services/tasks.service'
import { annualPlanningService } from '@nowry/core/api/services/annualPlanning.service'
import { cardsService } from '@nowry/core/api/services/cards.service'
import { queryClient } from '@nowry/core/api/queryClient'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.count !== undefined ? `${key}:${options.count}` : key),
    i18n: { language: 'en' }
  })
}))
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me' } }) }))
jest.mock('@nowry/core/api/queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() } }))
jest.mock('@nowry/core/api/services/tasks.service', () => ({ tasksService: { create: jest.fn(), update: jest.fn() } }))
jest.mock('@nowry/core/api/services/annualPlanning.service', () => ({
  annualPlanningService: { updateMilestone: jest.fn(), getGoal: jest.fn() }
}))
jest.mock('@nowry/core/api/services/cards.service', () => ({ cardsService: { getById: jest.fn() } }))
const mockTasks = [{ _id: 't1', title: 'Essay', is_completed: false }]
const mockGoals = [{ _id: 'g1', title: 'Pass biology', focus_area_id: 'a1', milestones: [{ id: 'm1', title: 'Unit 3 test' }] }]
jest.mock('@nowry/core/hooks/useTaskData', () => ({ useTaskData: () => ({ tasks: mockTasks, loading: false, error: null }) }))
jest.mock('@nowry/core/hooks/useAnnualPlan', () => ({
  useAnnualPlan: () => ({ goals: mockGoals, areas: [], loading: false, error: null })
}))
jest.mock('@nowry/core/hooks/useBlocks', () => ({ useBlocks: () => ({ blocks: [] }) }))
let mockSheetProps = null
jest.mock(
  '../../Calendar/ItemSheet',
  () =>
    function ItemSheetStub(props) {
      mockSheetProps = props
      return <div data-testid='item-sheet' />
    }
)
jest.mock(
  '../MakeCardsSheet',
  () =>
    function MakeCardsSheetStub() {
      return <div data-testid='make-cards-sheet' />
    }
)

const note = (id, text) => ({
  id,
  kind: 'note',
  x: 10,
  y: 20,
  w: null,
  h: null,
  z: 1,
  text,
  color: 'yellow',
  size: null,
  title: null,
  ref: null,
  cardIds: []
})

let board
const steps = []
const apply = (updater, options) => {
  const next = updater(board)
  if (!next) return
  steps.push(options)
  board = { ...board, ...next }
}

let links = null
function Probe() {
  links = useBoardLinks()
  return null
}

const queries = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
let client = queries()
const mount = (children) =>
  render(
    <QueryClientProvider client={client}>
      <CssVarsProvider>
        <BoardLinks boardId='b1' apply={apply}>
          <Probe />
          {children}
        </BoardLinks>
      </CssVarsProvider>
    </QueryClientProvider>
  )

beforeEach(() => {
  client = queries()
  board = {
    nodes: [note('a', 'Read chapter 3\nfocus on the Calvin cycle'), note('b', 'Book the lab'), note('c', '')],
    links: [{ id: 'l1', from: 'a', to: 'b', label: '' }]
  }
  steps.length = 0
  links = null
  mockSheetProps = null
})

describe('Make items', () => {
  it('makes a task per note with words, turns those notes into their tiles in one step, and says how many', async () => {
    let n = 0
    tasksService.create.mockImplementation(async () => {
      n += 1
      return { _id: `new${n}` }
    })
    mount(<BoardSelectionActions nodes={board.nodes} />)
    fireEvent.click(screen.getByRole('button', { name: 'boards.selection.makeItems:3' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('boards.items.made:2'))
    expect(tasksService.create).toHaveBeenCalledTimes(2)
    expect(tasksService.create).toHaveBeenNthCalledWith(1, {
      title: 'Read chapter 3',
      deadline: null,
      is_priority: false,
      category: null,
      is_completed: false,
      description: 'focus on the Calvin cycle'
    })
    expect(tasksService.create).toHaveBeenNthCalledWith(2, {
      title: 'Book the lab',
      deadline: null,
      is_priority: false,
      category: null,
      is_completed: false
    })
    expect(steps).toEqual([undefined])
    expect(board.nodes.map((x) => [x.id, x.kind, x.ref?.id ?? null])).toEqual([
      ['a', 'item', 'new1'],
      ['b', 'item', 'new2'],
      ['c', 'note', null]
    ])
    expect(board.links).toEqual([{ id: 'l1', from: 'a', to: 'b', label: '' }])
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks', 'me'] })
  })

  it('a failure leaves the notes as they were and says so', async () => {
    tasksService.create.mockRejectedValue(new Error('offline'))
    mount(<BoardSelectionActions nodes={[board.nodes[1]]} />)
    fireEvent.click(screen.getByRole('button', { name: 'boards.selection.makeItems:1' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('boards.items.failed'))
    expect(steps).toEqual([])
    expect(board.nodes[1].kind).toBe('note')
  })

  it('the selection bar offers both actions only for notes', () => {
    const { rerender } = mount(<BoardSelectionActions nodes={[{ ...board.nodes[0], kind: 'text' }]} />)
    expect(screen.queryByRole('button', { name: 'boards.selection.makeCards' })).toBeNull()
    rerender(
      <QueryClientProvider client={client}>
        <CssVarsProvider>
          <BoardLinks boardId='b1' apply={apply}>
            <BoardSelectionActions nodes={[board.nodes[0]]} />
          </BoardLinks>
        </CssVarsProvider>
      </QueryClientProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'boards.selection.makeCards' }))
    expect(screen.getByTestId('make-cards-sheet')).toBeInTheDocument()
  })
})

describe('live items', () => {
  it('the tick writes a task and a milestone through their own services', async () => {
    tasksService.update.mockResolvedValue({})
    annualPlanningService.updateMilestone.mockResolvedValue({})
    mount()
    await act(() => links.setDone({ kind: 'task', id: 't1', goalId: null }, true))
    expect(tasksService.update).toHaveBeenCalledWith('t1', { is_completed: true })
    await act(() => links.setDone({ kind: 'milestone', id: 'm1', goalId: null }, true, { goalId: 'g1' }))
    expect(annualPlanningService.updateMilestone).toHaveBeenCalledWith('g1', 'm1', { completed: true })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['annualPlan', 'me'] })
  })

  it('a failed tick throws, so the tile can go back, and says so', async () => {
    tasksService.update.mockRejectedValue(new Error('offline'))
    mount()
    await expect(links.setDone({ kind: 'task', id: 't1', goalId: null }, true)).rejects.toThrow('offline')
    expect(await screen.findByRole('alert')).toHaveTextContent('boards.item.tickFailed')
  })

  it('a task or a milestone opens the item sheet in edit; a goal opens its area', () => {
    mount()
    act(() => links.openItem({ kind: 'task', id: 't1' }, links.read({ kind: 'task', id: 't1' })))
    expect(mockSheetProps).toMatchObject({ open: true, mode: 'edit', source: { task: mockTasks[0] } })
    act(() => mockSheetProps.onClose())
    act(() => links.openItem({ kind: 'milestone', id: 'm1' }, links.read({ kind: 'milestone', id: 'm1', goalId: 'g1' })))
    expect(mockSheetProps.source).toEqual({ milestone: mockGoals[0].milestones[0], goalId: 'g1' })
    act(() => links.openItem({ kind: 'goal', id: 'g1' }, links.read({ kind: 'goal', id: 'g1' })))
    expect(mockNavigate).toHaveBeenCalledWith('/annual-planning/area/a1')
  })
})

describe('a note’s cards', () => {
  it('open on the deck of the first of them', async () => {
    cardsService.getById.mockResolvedValue({ _id: 'c1', deck_id: 'd9' })
    mount()
    await act(() => links.openCards({ cardIds: ['c1', 'c2'] }))
    expect(cardsService.getById).toHaveBeenCalledWith('c1')
    expect(mockNavigate).toHaveBeenCalledWith('/study/d9?mode=browse')
  })
})

describe('items from another year (BOARD-013)', () => {
  it('fetches a goal that is not in this year’s plan, once, by its id, and reads its milestone live', async () => {
    const { annualPlanningService } = require('@nowry/core/api/services/annualPlanning.service')
    annualPlanningService.getGoal.mockResolvedValue({
      _id: 'g-old',
      title: 'Run 10k',
      focus_area_id: 'a1',
      milestones: [{ id: 'm-old', title: 'Half marathon', due_date: '2025-06-01', completed: true }]
    })
    const item = { id: 'i1', kind: 'item', x: 0, y: 0, ref: { kind: 'milestone', id: 'm-old', goalId: 'g-old' } }
    render(
      <QueryClientProvider client={client}>
        <CssVarsProvider>
          <BoardLinks boardId='b1' apply={apply} nodes={[item]}>
            <Probe />
          </BoardLinks>
        </CssVarsProvider>
      </QueryClientProvider>
    )
    await waitFor(() => expect(links.read(item.ref)).toMatchObject({ status: 'ready', title: 'Half marathon', done: true }))
    expect(annualPlanningService.getGoal).toHaveBeenCalledTimes(1)
    expect(annualPlanningService.getGoal).toHaveBeenCalledWith('g-old')
  })
})
