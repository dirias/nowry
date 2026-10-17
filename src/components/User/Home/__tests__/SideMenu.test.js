/**
 * SideMenu (PLAN-008, PLAN-019): the Now tab's blocks from the one spine, the
 * tick writing through the optimistic log, the day read back once it is spent;
 * the Tasks tab on the same row, its disclosures, capture and states; and the
 * one-time hand-over of this browser's lists (PLAN-021).
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// The Start wiring (PLAN-005/006) reads the timer; this suite renders no provider.
const mockTimer = { block: null, startBlock: jest.fn(), setShowWidget: jest.fn(), keepBlock: jest.fn(), skipBlock: jest.fn() }
jest.mock('@nowry/core/context/PomodoroContext', () => ({
  ...jest.requireActual('@nowry/core/context/PomodoroContext'),
  usePomodoro: () => mockTimer
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
}))

jest.mock('@nowry/core/api/services', () => ({
  tasksService: {
    create: jest.fn(),
    delete: jest.fn(),
    toggleComplete: jest.fn(),
    update: jest.fn()
  }
}))

let mockTasks = []
let mockTasksState = { loading: false, error: null }
const mockReloadTasks = jest.fn()
jest.mock('@nowry/core/hooks/useTaskData', () => ({
  useTaskData: () => ({ tasks: mockTasks, ...mockTasksState, reload: mockReloadTasks })
}))

let mockLists = []
const mockImportLegacy = jest.fn()
const mockCreateList = jest.fn()
jest.mock('@nowry/core/hooks/useTaskLists', () => ({
  useTaskLists: () => ({
    lists: mockLists,
    loading: false,
    error: null,
    create: mockCreateList,
    rename: jest.fn(),
    remove: jest.fn(),
    importLegacy: mockImportLegacy
  })
}))
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me' } }) }))
jest.mock('@nowry/core/hooks/useBlocks', () => ({ useBlocks: () => ({ blocks: [] }) }))

let mockSheetProps = null
jest.mock(
  '../../../Calendar/ItemSheet',
  () =>
    function ItemSheetStub(props) {
      mockSheetProps = props
      return null
    }
)

// The core hooks are react-query reads; they are mocked at the module
// boundary, this file's convention, so no QueryClientProvider is needed.
let mockDay = null
const mockKeep = jest.fn()
const mockUndo = jest.fn()
jest.mock('@nowry/core/hooks/useToday', () => ({
  useToday: () => mockDay
}))
jest.mock('@nowry/core/hooks/useBlockLog', () => ({
  useBlockLog: () => ({ keep: mockKeep, undo: mockUndo, skip: jest.fn(), pending: false })
}))
jest.mock('@nowry/core/hooks/useAnnualPlan', () => ({
  __esModule: true,
  default: () => ({ focusAreas: [], loading: false })
}))
jest.mock('../../../Study/useTodayData', () => ({
  useTodayData: () => ({ dueToday: 12 })
}))

const SideMenu = require('../SideMenu').default

const occurrence = (id, start, title, extra = {}) => ({
  blockId: id,
  date: '2026-07-20',
  start,
  lengthMin: 20,
  title,
  block: { id, title, source: { type: 'routine', id: null }, areaId: null },
  log: null,
  ...extra
})

const dayWith = (overrides) => ({
  date: '2026-07-20',
  isToday: true,
  nowMinutes: 9 * 60,
  occurrences: [],
  current: null,
  next: null,
  later: [],
  past: [],
  kept: { planned: 0, kept: 0, partial: 0, skipped: 0, rate: 0 },
  due: 12,
  suggestedStudyLength: 10,
  loading: false,
  error: null,
  reload: jest.fn(),
  ...overrides
})

const renderPanel = () =>
  render(
    <MemoryRouter>
      <SideMenu />
    </MemoryRouter>
  )

beforeEach(() => {
  jest.clearAllMocks()
  mockTasks = []
  mockTasksState = { loading: false, error: null }
  mockLists = []
  mockSheetProps = null
  mockImportLegacy.mockResolvedValue([])
  window.localStorage.clear()
  mockKeep.mockResolvedValue(undefined)
  mockUndo.mockResolvedValue(undefined)
})

describe('the Now tab', () => {
  it('opens on Now and lists the current block first, every row with the tick and none with Start (PLAN-017)', () => {
    const running = occurrence('b1', '09:00', 'Morning review')
    const next = occurrence('b2', '10:00', 'Stretch')
    const later = [
      occurrence('b3', '13:00', 'Read'),
      occurrence('b4', '14:00', 'Write'),
      occurrence('b5', '15:00', 'Walk'),
      occurrence('b6', '16:00', 'Beyond')
    ]
    mockDay = dayWith({ occurrences: [running, next, ...later], current: running, next, later })
    renderPanel()

    const rows = screen.getAllByTestId('home-block-row')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Morning review'),
      expect.stringContaining('Stretch'),
      expect.stringContaining('Read'),
      expect.stringContaining('Write'),
      expect.stringContaining('Walk')
    ])
    expect(rows[0]).toHaveAttribute('data-row-state', 'running')
    // Start is not a row action; the current row has its tick like the rest.
    expect(screen.queryByRole('button', { name: 'blocks.row.start' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'calendarPage.blocks.markKept' })).toHaveLength(5)
  })

  it('keeps a block through the log on tick, and undoes a kept one', () => {
    const current = occurrence('b1', '09:00', 'Morning review')
    const next = occurrence('b2', '10:00', 'Stretch')
    const kept = occurrence('b3', '13:00', 'Read', { log: { status: 'kept', blockId: 'b3', date: '2026-07-20' } })
    mockDay = dayWith({ occurrences: [current, next, kept], current, next, later: [kept] })
    renderPanel()

    // The current row ticks like the rest (PLAN-017): first the current, then the next.
    const [currentTick, nextTick] = screen.getAllByRole('button', { name: 'calendarPage.blocks.markKept' })
    fireEvent.click(currentTick)
    expect(mockKeep).toHaveBeenCalledWith(current)
    fireEvent.click(nextTick)
    expect(mockKeep).toHaveBeenCalledWith(next)

    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.blocks.undoKept' }))
    expect(mockUndo).toHaveBeenCalledWith(kept)
  })

  it('reads the day back once it is spent: the last three past rows, ticks live', () => {
    const past = ['07:00', '07:30', '08:00', '08:30'].map((start, i) =>
      occurrence(`p${i}`, start, `Block ${i}`, { log: i % 2 ? { status: 'kept' } : { status: 'skipped' } })
    )
    mockDay = dayWith({ occurrences: past, past, nowMinutes: 22 * 60 })
    renderPanel()

    expect(screen.getByText('blocks.home.dayDone')).toBeInTheDocument()
    const rows = screen.getAllByTestId('home-block-row')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Block 1')
    expect(rows.map((row) => row.getAttribute('data-row-state'))).toEqual(['kept', 'skipped', 'kept'])
    // The ticks stay live on a spent day: the evening is when the day is ticked.
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.blocks.markKept' }))
    expect(mockKeep).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'blocks.row.start' })).toBeNull()
  })

  it('says the day is empty and offers the calendar', () => {
    mockDay = dayWith({})
    renderPanel()

    expect(screen.getByText('blocks.home.empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'blocks.home.planDay' })).toHaveAttribute('href', '/calendar')
  })

  it('opens the block’s item sheet from its title', () => {
    const current = occurrence('b1', '09:00', 'Morning review')
    mockDay = dayWith({ occurrences: [current], current })
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'blocks.row.openAria' }))
    expect(mockSheetProps).toMatchObject({ open: true, mode: 'edit', source: { block: current.block, occurrence: current } })
  })
})

const dayKey = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const task = (id, extra = {}) => ({ _id: id, title: id, is_completed: false, deadline: null, ...extra })
const openTasks = () => fireEvent.click(screen.getAllByRole('tab')[1])

describe('the Tasks tab (PLAN-019): the Now row, for tasks', () => {
  beforeEach(() => {
    mockDay = dayWith({})
  })

  it('lists late and today’s tasks on the one row: Late as a word, the tile, the list under the title, the circle last', () => {
    mockLists = [{ id: '6a6b5f6e11d5b6cc24a77c32', name: 'Shopping list' }]
    mockTasks = [
      task('Regleta', { deadline: `${dayKey(-30)}T00:00:00`, category: '6a6b5f6e11d5b6cc24a77c32' }),
      task('Gym', { deadline: `${dayKey(-40)}T00:00:00`, is_priority: true }),
      task('Today', { deadline: `${dayKey(0)}T00:00:00` }),
      task('Later', { deadline: `${dayKey(20)}T00:00:00` }),
      task('Someday')
    ]
    renderPanel()
    openTasks()

    const rows = screen.getAllByTestId('home-task-row')
    // Late first, flagged first among them, then today; later and undated wait behind Upcoming.
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Gym'),
      expect.stringContaining('Regleta'),
      expect.stringContaining('Today')
    ])
    expect(rows[0]).toHaveTextContent('tasks.row.late')
    expect(rows[0]).toHaveTextContent('tasks.row.priority · tasks.row.task')
    expect(rows[1]).toHaveTextContent('Shopping list')
    expect(rows[2]).not.toHaveTextContent('tasks.row.late')
    expect(rows[0].querySelector('[data-testid="task-tile"]')).toHaveAttribute('data-flagged', 'true')
    // The circle is the row's last control, as on Now.
    const controls = rows[0].querySelectorAll('button')
    expect(controls[controls.length - 1]).toHaveAttribute('aria-label', 'tasks.row.markDone')
    // The tab's count is the rows above the foot.
    expect(screen.getAllByRole('tab')[1]).toHaveTextContent('3')
    // No status chips, no search, no list chips, no handles.
    expect(screen.queryByText('tasks.filter.pending')).toBeNull()
    expect(screen.queryByPlaceholderText('tasks.searchPlaceholder')).toBeNull()
  })

  it('opens Upcoming and Completed from the foot', () => {
    mockTasks = [
      task('Later', { deadline: `${dayKey(20)}T00:00:00` }),
      task('Someday'),
      task('Done', { deadline: `${dayKey(0)}T00:00:00`, is_completed: true, updated_at: new Date().toISOString() })
    ]
    renderPanel()
    openTasks()

    expect(screen.getByText('tasks.day.empty')).toBeInTheDocument()
    const upcoming = screen.getByRole('button', { name: 'tasks.day.upcoming · 2' })
    expect(upcoming).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(upcoming)
    expect(screen.getAllByTestId('home-task-row').map((row) => row.textContent)).toEqual([
      expect.stringContaining('Later'),
      expect.stringContaining('Someday')
    ])
    fireEvent.click(screen.getByRole('button', { name: 'tasks.filter.completed · 1' }))
    expect(screen.getByRole('button', { name: 'tasks.row.markUndone' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('ticks a task with the circle, at once', async () => {
    const { tasksService } = require('@nowry/core/api/services')
    tasksService.update.mockResolvedValue({})
    mockTasks = [task('Essay', { deadline: `${dayKey(0)}T00:00:00` })]
    renderPanel()
    openTasks()

    fireEvent.click(screen.getByRole('button', { name: 'tasks.row.markDone' }))
    expect(tasksService.update).toHaveBeenCalledWith('Essay', { is_completed: true })
    await waitFor(() => expect(mockReloadTasks).toHaveBeenCalled())
  })

  it('opens the task’s item sheet from its title', () => {
    const essay = task('Essay', { deadline: `${dayKey(0)}T00:00:00` })
    mockTasks = [essay]
    renderPanel()
    openTasks()

    fireEvent.click(screen.getByRole('button', { name: 'tasks.row.openAria' }))
    expect(mockSheetProps).toMatchObject({ open: true, mode: 'edit', source: { task: essay } })
  })

  it('captures a task due today, into the list its menu names', async () => {
    const { tasksService } = require('@nowry/core/api/services')
    tasksService.create.mockResolvedValue({ _id: 'n1' })
    mockLists = [{ id: 'L1', name: 'Shopping list' }]
    renderPanel()
    openTasks()

    fireEvent.click(screen.getByRole('button', { name: 'tasks.capture.listAria' }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Shopping list' }))
    const field = screen.getByRole('textbox', { name: 'home.addTaskToday' })
    fireEvent.change(field, { target: { value: '  Tape ' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    await waitFor(() =>
      expect(tasksService.create).toHaveBeenCalledWith({ title: 'Tape', deadline: dayKey(0), category: 'L1', is_completed: false })
    )
  })

  it('shows skeleton rows while loading, and a retry when the tasks did not load', () => {
    mockTasksState = { loading: true, error: null }
    const { unmount } = renderPanel()
    openTasks()
    expect(screen.queryByTestId('home-task-row')).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
    unmount()

    mockTasksState = { loading: false, error: new Error('offline') }
    renderPanel()
    openTasks()
    expect(screen.getByRole('alert')).toHaveTextContent('tasks.day.error')
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(mockReloadTasks).toHaveBeenCalled()
  })
})

describe('the lists this browser kept (PLAN-021)', () => {
  it('hands them to the server once, then forgets them', async () => {
    mockDay = dayWith({})
    window.localStorage.setItem('nowry_task_lists', JSON.stringify([{ id: 'list_1788662138438', label: 'shopping list' }]))
    renderPanel()

    await waitFor(() => expect(mockImportLegacy).toHaveBeenCalledWith([{ legacy_id: 'list_1788662138438', name: 'shopping list' }]))
    await waitFor(() => expect(window.localStorage.getItem('nowry_task_lists')).toBeNull())
  })

  it('does nothing when there is nothing to hand over', () => {
    mockDay = dayWith({})
    renderPanel()
    expect(mockImportLegacy).not.toHaveBeenCalled()
  })
})
