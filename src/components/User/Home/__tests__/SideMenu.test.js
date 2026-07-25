/**
 * Phase 26 Plan 03 — SideMenu tests (D-05).
 * Verifies toggleRoutineItem uses id-based keys, not ${period}_${index}.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { apiCache } from '../../../../api/utils/cache'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key })
}))

const mockGetDailyRoutine = jest.fn()
const mockUpdateRoutineCompletions = jest.fn()

jest.mock('../../../../api/services', () => ({
  annualPlanningService: {
    getDailyRoutine: (...args) => mockGetDailyRoutine(...args),
    updateRoutineCompletions: (...args) => mockUpdateRoutineCompletions(...args)
  },
  tasksService: {
    create: jest.fn(),
    delete: jest.fn(),
    toggleComplete: jest.fn(),
    update: jest.fn()
  }
}))

jest.mock('../../../../hooks/useTaskData', () => ({
  useTaskData: () => ({ tasks: [], loading: false, reload: jest.fn() })
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

// Fix "now" to a local 9am so getCurrentPeriod() deterministically defaults
// the active tab to 'morning' regardless of the CI runner's real-world time.
// jest.useFakeTimers()/setSystemTime() is deliberately NOT used here: this
// project's Jest 27 setup only supports the legacy (no Date faking) or full
// modern (Date + setTimeout/setInterval all faked, doNotFake ignored) timer
// modes, and fully faking timers hangs @testing-library's real-timer-based
// waitFor/findBy* polling. Subclassing global.Date keeps setTimeout/Promise
// scheduling untouched while still controlling `new Date()`.
let RealDate
beforeEach(() => {
  RealDate = global.Date
  class FixedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(2026, 6, 20, 9, 0, 0)
      } else {
        super(...args)
      }
    }
    static now() {
      return new FixedDate().getTime()
    }
  }
  global.Date = FixedDate

  apiCache.clear()
  jest.clearAllMocks()
  mockUpdateRoutineCompletions.mockResolvedValue({ ok: true })
})

afterEach(() => {
  global.Date = RealDate
})

describe('D-05: toggleRoutineItem id-based', () => {
  it('Test 1: clicking a routine item calls updateRoutineCompletions with the item id, not an index key', async () => {
    mockGetDailyRoutine.mockResolvedValue({
      morning_routine: [{ id: 'item-1', title: 'Drink water' }],
      afternoon_routine: [],
      evening_routine: [],
      daily_completions: {}
    })
    render(
      <MemoryRouter>
        <SideMenu />
      </MemoryRouter>
    )
    const label = await screen.findByText('Drink water')
    fireEvent.click(label.closest('div'))
    await waitFor(() => expect(mockUpdateRoutineCompletions).toHaveBeenCalledWith(expect.any(String), ['item-1']))
  })

  it('Test 2: seeded completion state (backend-provided id key) renders the item as already checked', async () => {
    const todayStr = new Date().toISOString().slice(0, 10)
    mockGetDailyRoutine.mockResolvedValue({
      morning_routine: [{ id: 'item-1', title: 'Drink water' }],
      afternoon_routine: [],
      evening_routine: [],
      daily_completions: { [todayStr]: ['item-1'] }
    })
    render(
      <MemoryRouter>
        <SideMenu />
      </MemoryRouter>
    )
    const label = await screen.findByText('Drink water')
    expect(label).toHaveStyle('text-decoration: line-through')
  })
})
