/**
 * SideMenu's Now tab (PLAN-008, PRD D9): the day's blocks from the one spine,
 * the current block first with its Start link, the tick writing through the
 * optimistic log, and the day read back once it is spent.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// The Start wiring (PLAN-005/006) reads the timer; this suite renders no provider.
const mockTimer = { block: null, startBlock: jest.fn(), setShowWidget: jest.fn(), keepBlock: jest.fn(), skipBlock: jest.fn() }
jest.mock('@nowry/core/context/PomodoroContext', () => ({
  ...jest.requireActual('@nowry/core/context/PomodoroContext'),
  usePomodoro: () => mockTimer
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key })
}))

jest.mock('@nowry/core/api/services', () => ({
  tasksService: {
    create: jest.fn(),
    delete: jest.fn(),
    toggleComplete: jest.fn(),
    update: jest.fn()
  }
}))

jest.mock('@nowry/core/hooks/useTaskData', () => ({
  useTaskData: () => ({ tasks: [], loading: false, reload: jest.fn() })
}))

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

jest.mock('../../../Task/SortableTask', () => () => null)

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => children,
  closestCenter: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => [])
}))
jest.mock('@dnd-kit/sortable', () => ({
  arrayMove: jest.fn(),
  SortableContext: ({ children }) => children,
  verticalListSortingStrategy: jest.fn()
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
    expect(rows[0]).toHaveAttribute('data-block-state', 'running')
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
    expect(rows.map((row) => row.getAttribute('data-block-state'))).toEqual(['kept', 'skipped', 'kept'])
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

  it('still has the Tasks tab beside it', () => {
    mockDay = dayWith({})
    renderPanel()

    // The tab's glyph is named by a tooltip, not an aria-label: pick it by position.
    fireEvent.click(screen.getAllByRole('tab')[1])
    expect(screen.getByText('tasks.emptyTitle')).toBeInTheDocument()
  })
})
