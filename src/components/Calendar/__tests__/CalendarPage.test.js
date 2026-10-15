/**
 * Phase 8 — CalendarPage tests.
 * Stubs written in Wave 0; implementations follow in 08-04-PLAN.
 * All suites use describe.skip — will be enabled when CalendarPage.js exists.
 *
 * Phase 16 — FLT-01/02/03: filter bar tests.
 * CAL-001 (ADR-016) — the three toolbars became two rows; the filter tests
 * below import the real predicate instead of mirroring it, and the toolbar
 * tests pin what the audit removed: a second Today, "This week", the
 * "More filters" disclosure and the "All …" chips.
 */
import React, { act } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock FullCalendar packages (not yet installed in Wave 0). The component
// records the props it was given so a suite can call its callbacks (PLAN-010).
const mockFullCalendar = jest.fn()
// The Start wiring (PLAN-005/006) reads the timer; this suite renders no provider.
const mockTimer = { block: null, startBlock: jest.fn(), setShowWidget: jest.fn(), keepBlock: jest.fn(), skipBlock: jest.fn() }
// The Start wiring navigates; this suite renders no Router.
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }))

jest.mock('@nowry/core/context/PomodoroContext', () => ({
  ...jest.requireActual('@nowry/core/context/PomodoroContext'),
  usePomodoro: () => mockTimer
}))

jest.mock(
  '@fullcalendar/react',
  () => (props) => {
    mockFullCalendar(props)
    return null
  },
  { virtual: true }
)
jest.mock('@fullcalendar/daygrid', () => ({}), { virtual: true })
jest.mock('@fullcalendar/timegrid', () => ({}), { virtual: true })
jest.mock('@fullcalendar/interaction', () => ({}), { virtual: true })

describe.skip('CalendarPage — CAL-01: All 5 event types in eventSources', () => {
  it('eventSources maps task events to FullCalendar shape with id, title, start, allDay, backgroundColor', () => {})
  it('eventSources maps goal events to FullCalendar shape', () => {})
  it('eventSources maps priority events to FullCalendar shape', () => {})
  it('eventSources maps milestone events to FullCalendar shape', () => {})
  it('eventSources maps activity events to FullCalendar shape', () => {})
})

describe.skip('CalendarPage — CAL-02: select callback opens EventFormModal', () => {
  it('handleSelect sets formOpen=true with selectionInfo.start as defaultDate', () => {})
  it('EventFormModal receives mode="create" and defaultDate when select fires', () => {})
})

describe.skip('CalendarPage — CAL-03: eventDrop calls correct update service', () => {
  it('dropping a task event calls tasksService.update with new deadline date', () => {})
  it('dropping a goal event calls annualPlanningService.updateGoal with target_date', () => {})
  it('dropping a milestone event calls revert() — milestones are not draggable', () => {})
  it('dropping an activity event calls revert() — activities are not draggable', () => {})
  it('service failure on drop calls revert()', () => {})
})

// ─── Phase 15 stubs (Goals on Calendar) ─────────────────────────────────────

// Additional mocks needed for Phase 15 tests
const mockUseCalendarFilters = jest.fn()
jest.mock('@nowry/core/hooks/useCalendarFilters', () => ({
  useCalendarFilters: (...args) => mockUseCalendarFilters(...args)
}))
const mockIsMobile = jest.fn(() => false)
jest.mock('../../../hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile()
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } })
}))
jest.mock('@nowry/core/api/services/calendar.service', () => ({
  calendarService: { getAllEvents: jest.fn(), invalidateCache: jest.fn() }
}))
jest.mock('@nowry/core/api/services', () => ({
  tasksService: { update: jest.fn() },
  annualPlanningService: { updatePriority: jest.fn(), updateGoal: jest.fn(), updateMilestone: jest.fn() }
}))
// Both sheets record the props the page hands them, so a suite can assert
// which one opened, in which mode, with what (PLAN-004).
const mockEventFormModal = jest.fn()
jest.mock('../EventFormModal', () => (props) => {
  mockEventFormModal(props)
  return null
})
const mockBlockFormModal = jest.fn()
jest.mock('../BlockFormModal', () => (props) => {
  mockBlockFormModal(props)
  return null
})
jest.mock('@fullcalendar/core/locales-all', () => [], { virtual: true })
const mockUseBlocks = jest.fn()
jest.mock('@nowry/core/hooks/useBlocks', () => ({
  useBlocks: (...args) => mockUseBlocks(...args)
}))
const mockUseBlockLog = jest.fn()
jest.mock('@nowry/core/hooks/useBlockLog', () => ({
  useBlockLog: () => mockUseBlockLog()
}))
const mockUseBlocksSummary = jest.fn()
jest.mock('../useBlocksSummary', () => ({
  useBlocksSummary: (...args) => mockUseBlocksSummary(...args)
}))
jest.mock('../../Study/useTodayData', () => ({
  useTodayData: () => ({ dueToday: 27, forecast: { days: [] } })
}))
const mockUpdateBlock = jest.fn()
const mockKeep = jest.fn()
const mockUndo = jest.fn()
const armBlockHooks = (occurrences = []) => {
  mockUpdateBlock.mockResolvedValue({})
  mockKeep.mockResolvedValue({})
  mockUndo.mockResolvedValue({})
  mockUseBlocks.mockReturnValue({
    blocks: [],
    occurrences,
    loading: false,
    error: null,
    create: jest.fn(),
    update: mockUpdateBlock,
    remove: jest.fn(),
    reload: jest.fn()
  })
  mockUseBlockLog.mockReturnValue({ keep: mockKeep, skip: jest.fn(), undo: mockUndo, pending: false })
  mockUseBlocksSummary.mockReturnValue({ summary: null, loading: false, error: null })
}
// CalendarPage now reads userId from useAuth() to scope the ['calendarEvents', userId,
// year] React Query key (CACHE-008 / ADR-008) — mocked here since this test has no
// AuthProvider wrapping it, following the convention from DailyRoutinePlanner.test.js.
jest.mock('@nowry/core/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } })
}))

const { filterCalendarEvents } = require('@nowry/core/domain/calendar/calendarFilters')

// Default mock return value for existing Phase 15 tests
beforeEach(() => {
  mockUseCalendarFilters.mockReturnValue({
    filters: { habitsEnabled: false, activeTypes: ['task', 'priority', 'goal', 'milestone'], activeAreaIds: [] },
    setFilters: jest.fn(),
    resetFilters: jest.fn(),
    applyPreset: jest.fn()
  })
  armBlockHooks()
})

// ─── Icon logic unit tests (pure logic, no render needed) ────────────────────

// Mirrors EVENT_TYPE_ICONS in EventTypeTile.js: one glyph per type. The star for a
// "key result" milestone went in CAL-005 — every milestone is a measurable step
// of its goal, so there was never a second kind to draw.
const EVENT_ICON_MAP = {
  task: 'CheckCircleOutlinedIcon',
  priority: 'FlagOutlinedIcon',
  goal: 'AdjustOutlinedIcon',
  milestone: 'DiamondOutlinedIcon',
  activity: 'RepeatRoundedIcon'
}
const resolveIcon = (type) => EVENT_ICON_MAP[type] ?? 'AdjustOutlinedIcon'

describe('CalendarPage — one glyph per event type', () => {
  it.each([
    ['task', 'CheckCircleOutlinedIcon'],
    ['priority', 'FlagOutlinedIcon'],
    ['goal', 'AdjustOutlinedIcon'],
    ['milestone', 'DiamondOutlinedIcon'],
    ['activity', 'RepeatRoundedIcon'],
    ['unknown', 'AdjustOutlinedIcon']
  ])('draws %s with %s', (type, icon) => {
    expect(resolveIcon(type)).toBe(icon)
  })
})

// ─── CAL-007: the row is transparent; colour lives on the tile ──────────────

describe('CAL-007: toCalendarEvent leaves colour to the tile', () => {
  const { toCalendarEvent } = require('../CalendarPage')

  it('sets no background, border or text colour on the FullCalendar object', () => {
    const ev = { id: 'task-1', title: 'Buy stamps', date: new Date(2026, 8, 5), type: 'task', color: '#6366f1', status: 'pending' }
    const out = toCalendarEvent(ev)
    expect(out).toEqual({ id: 'task-1', title: 'Buy stamps', start: ev.date, allDay: true, extendedProps: ev })
    expect(out).not.toHaveProperty('backgroundColor')
    expect(out).not.toHaveProperty('textColor')
  })
})

// ─── Phase 16 FLT-02: the three-step filter, imported rather than mirrored ──

describe('Phase 16 FLT-02: filterCalendarEvents (D-13 order: habits, types, areas)', () => {
  const allTypes = ['task', 'priority', 'goal', 'milestone']

  it('step 1 — activity events excluded when habitsEnabled=false', () => {
    const events = [
      { type: 'activity', focusAreaId: null },
      { type: 'task', focusAreaId: null },
      { type: 'goal', focusAreaId: 'area-1' }
    ]
    const result = filterCalendarEvents(events, { habitsEnabled: false, activeTypes: allTypes, activeAreaIds: [] })
    expect(result.some((e) => e.type === 'activity')).toBe(false)
    expect(result.some((e) => e.type === 'task')).toBe(true)
    expect(result.some((e) => e.type === 'goal')).toBe(true)
  })

  it('step 1 — activity events included when habitsEnabled=true', () => {
    const result = filterCalendarEvents([{ type: 'activity', focusAreaId: null }], {
      habitsEnabled: true,
      activeTypes: allTypes,
      activeAreaIds: []
    })
    expect(result).toHaveLength(1)
  })

  it('step 2 — events excluded when type not in activeTypes (partial filter)', () => {
    const events = [
      { type: 'goal', focusAreaId: 'area-1' },
      { type: 'task', focusAreaId: null },
      { type: 'priority', focusAreaId: null }
    ]
    const result = filterCalendarEvents(events, { habitsEnabled: false, activeTypes: ['goal'], activeAreaIds: [] })
    expect(result.map((e) => e.type)).toEqual(['goal'])
  })

  it('step 2 — every canonical type present means no type filter (WR-02)', () => {
    const result = filterCalendarEvents([{ type: 'task', focusAreaId: null }], {
      habitsEnabled: false,
      activeTypes: [...allTypes].reverse(),
      activeAreaIds: []
    })
    expect(result).toHaveLength(1)
  })

  it('step 3 — events with a focusAreaId outside activeAreaIds are excluded; null always passes', () => {
    const events = [
      { type: 'goal', focusAreaId: 'area-1' },
      { type: 'goal', focusAreaId: 'area-2' },
      { type: 'task', focusAreaId: null }
    ]
    const result = filterCalendarEvents(events, { habitsEnabled: false, activeTypes: allTypes, activeAreaIds: ['area-1'] })
    expect(result.find((e) => e.focusAreaId === 'area-1')).toBeDefined()
    expect(result.find((e) => e.focusAreaId === 'area-2')).toBeUndefined()
    expect(result.find((e) => e.focusAreaId === null)).toBeDefined()
  })
})

// ─── CAL-001: one toolbar on the grid's rails (ADR-016) ─────────────────────

describe('CAL-001: the toolbar', () => {
  const mockApplyPreset = jest.fn()
  const mockSetFilters = jest.fn()
  const mockResetFilters = jest.fn()
  const { calendarService } = require('@nowry/core/api/services/calendar.service')

  const mockFocusAreas = [
    { id: 'area-1', name: 'Learning', color: '#10b981' },
    { id: 'area-2', name: 'Health', color: '#f59e0b' }
  ]

  const renderPage = async () => {
    const CalendarPage = require('../CalendarPage').default
    let utils
    await act(async () => {
      utils = render(<CalendarPage />)
    })
    return utils
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsMobile.mockReturnValue(false)
    mockUseCalendarFilters.mockReturnValue({
      filters: { habitsEnabled: false, activeTypes: ['task', 'priority', 'goal', 'milestone'], activeAreaIds: [] },
      setFilters: mockSetFilters,
      resetFilters: mockResetFilters,
      applyPreset: mockApplyPreset
    })
    calendarService.getAllEvents.mockResolvedValue({ events: [], focusAreas: mockFocusAreas })
  })

  it('has exactly one control named Today, and it never touches the filters', async () => {
    await renderPage()
    const todays = screen.getAllByRole('button', { name: 'calendarPage.nav.today' })
    expect(todays).toHaveLength(1)
    // The view already shows this month, so the segment is engaged (a ground, not a hue).
    expect(todays[0]).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(todays[0])
    expect(mockSetFilters).not.toHaveBeenCalled()
    expect(mockResetFilters).not.toHaveBeenCalled()
    expect(mockApplyPreset).not.toHaveBeenCalled()
  })

  it('renders none of the controls the audit removed', async () => {
    await renderPage()
    ;[
      'calendarPage.presets.thisWeek',
      'calendarPage.presets.today',
      'calendarPage.moreFilters',
      'calendarPage.filters.allAreas',
      'calendarPage.filters.allTypes'
    ].forEach((name) => expect(screen.queryByRole('button', { name })).toBeNull())
    expect(screen.queryByText(/This week|More filters|All areas|All types/)).toBeNull()
  })

  it('names the month beside the nav object, in the user’s language', async () => {
    await renderPage()
    const expected = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date())
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('the Habits segment carries aria-pressed and toggles habitsEnabled', async () => {
    await renderPage()
    const habits = screen.getByRole('button', { name: 'calendarPage.filters.habits' })
    expect(habits).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(habits)
    expect(mockSetFilters).toHaveBeenCalledTimes(1)
    const updater = mockSetFilters.mock.calls[0][0]
    expect(updater({ habitsEnabled: false, activeTypes: [], activeAreaIds: [] }).habitsEnabled).toBe(true)
  })

  it('the Types menu opens with "Goals & milestones only" first, and it applies the preset', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.filters.types' }))
    const items = await screen.findAllByRole(/^menuitem(checkbox)?$/)
    expect(items[0]).toHaveTextContent('calendarPage.filters.goalsOnly')
    fireEvent.click(items[0])
    expect(mockApplyPreset).toHaveBeenCalledWith('goals_only')
  })

  it('the Types menu lists the four types as checked rows, and unchecking one narrows the filter', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.filters.types' }))
    const tasks = await screen.findByRole('menuitemcheckbox', { name: /typeTask/ })
    expect(tasks).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(tasks)
    const updater = mockSetFilters.mock.calls[0][0]
    expect(
      updater({ habitsEnabled: false, activeTypes: ['task', 'priority', 'goal', 'milestone'], activeAreaIds: [] }).activeTypes
    ).toEqual(['priority', 'goal', 'milestone'])
  })

  it('keeps the Types menu open while rows are ticked, so two choices are two clicks, not four', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.filters.types' }))
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /typeTask/ }))
    expect(screen.getByRole('menuitemcheckbox', { name: /typeGoal/ })).toBeInTheDocument()
    // The preset row is a single action and does close the menu.
    fireEvent.click(screen.getByRole('menuitem', { name: 'calendarPage.filters.goalsOnly' }))
    expect(screen.queryByRole('menuitemcheckbox', { name: /typeGoal/ })).toBeNull()
  })

  it('reads the count back on the segment once a filter narrows something', async () => {
    mockUseCalendarFilters.mockReturnValue({
      filters: { habitsEnabled: false, activeTypes: ['goal', 'milestone'], activeAreaIds: ['area-1'] },
      setFilters: mockSetFilters,
      resetFilters: mockResetFilters,
      applyPreset: mockApplyPreset
    })
    await renderPage()
    // A menu trigger carries aria-haspopup, not aria-pressed; the narrowed
    // state is spoken by the label itself ("Types · 2") and shown as a ground.
    expect(screen.getByRole('button', { name: 'calendarPage.filters.typesSelected' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'calendarPage.filters.areasSelected' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'calendarPage.filters.types' })).toBeNull()
  })

  it('the Areas menu lists each focus area and offers "Show all areas" once narrowed', async () => {
    mockUseCalendarFilters.mockReturnValue({
      filters: { habitsEnabled: false, activeTypes: ['task', 'priority', 'goal', 'milestone'], activeAreaIds: ['area-2'] },
      setFilters: mockSetFilters,
      resetFilters: mockResetFilters,
      applyPreset: mockApplyPreset
    })
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.filters.areasSelected' }))
    expect(await screen.findByRole('menuitemcheckbox', { name: /Learning/ })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('menuitemcheckbox', { name: /Health/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('menuitem', { name: 'calendarPage.filters.showAllAreas' }))
    const updater = mockSetFilters.mock.calls[0][0]
    expect(updater({ habitsEnabled: false, activeTypes: [], activeAreaIds: ['area-2'] }).activeAreaIds).toEqual([])
  })

  it('offers Day, Week, Month and Agenda as one object on desktop, in that order (PLAN-004)', async () => {
    await renderPage()
    const { within } = require('@testing-library/react')
    const names = within(screen.getByTestId('calendar-views'))
      .getAllByRole('button')
      .map((button) => button.textContent)
    expect(names).toEqual(['calendarPage.views.day', 'calendarPage.views.week', 'calendarPage.views.month', 'calendarPage.views.agenda'])
    expect(screen.getByRole('button', { name: 'calendarPage.views.month' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'calendarPage.views.week' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.views.agenda' }))
    expect(screen.getByRole('button', { name: 'calendarPage.views.agenda' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('calendar-agenda')).toBeInTheDocument()
  })

  it('on a phone there is no view object, and the Agenda opens on Today', async () => {
    mockIsMobile.mockReturnValue(true)
    await renderPage()
    expect(screen.queryByRole('button', { name: 'calendarPage.views.month' })).toBeNull()
    expect(screen.getByTestId('calendar-agenda')).toBeInTheDocument()
    expect(screen.getByText('calendarPage.agenda.today')).toBeInTheDocument()
    expect(screen.getByText('calendarPage.agenda.emptyToday')).toBeInTheDocument()
  })
})

// ─── CAL-002: finishing a task or priority from its agenda row ──────────────

describe('CAL-002: the agenda row check', () => {
  const { calendarService } = require('@nowry/core/api/services/calendar.service')
  const { tasksService, annualPlanningService } = require('@nowry/core/api/services')

  const today = new Date()
  const task = {
    id: 'task-1',
    type: 'task',
    title: 'Finish Spanish deck',
    status: 'pending',
    color: '#6366f1',
    date: today,
    focusAreaId: null
  }
  const priority = {
    id: 'priority-1',
    type: 'priority',
    title: 'Q3 review',
    status: 'active',
    color: '#f59e0b',
    date: today,
    focusAreaId: null
  }
  const milestone = {
    id: 'milestone-g1-0',
    type: 'milestone',
    title: 'Week 4',
    status: 'pending',
    color: '#10b981',
    date: today,
    focusAreaId: 'a1',
    goalId: 'g1',
    milestoneId: 'm1'
  }

  const renderPhone = async () => {
    const CalendarPage = require('../CalendarPage').default
    await act(async () => {
      render(<CalendarPage />)
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsMobile.mockReturnValue(true)
    mockUseCalendarFilters.mockReturnValue({
      filters: { habitsEnabled: false, activeTypes: ['task', 'priority', 'goal', 'milestone'], activeAreaIds: [] },
      setFilters: jest.fn(),
      resetFilters: jest.fn(),
      applyPreset: jest.fn()
    })
    calendarService.getAllEvents.mockResolvedValue({ events: [task, priority, milestone], focusAreas: [] })
  })

  it('ticking a task sends only is_completed, and the row reads as done before the request resolves', async () => {
    tasksService.update.mockReturnValue(new Promise(() => {})) // never resolves
    await renderPhone()
    const check = screen.getAllByRole('button', { name: 'calendarPage.agenda.markDone' })[0]
    fireEvent.click(check)
    expect(tasksService.update).toHaveBeenCalledWith('1', { is_completed: true })
    expect(screen.getByRole('button', { name: 'calendarPage.agenda.markUndone' })).toHaveAttribute('aria-pressed', 'true')
    expect(annualPlanningService.updatePriority).not.toHaveBeenCalled()
  })

  it('ticking a priority goes through updatePriority with the bare id', async () => {
    annualPlanningService.updatePriority.mockResolvedValue({})
    await renderPhone()
    const checks = screen.getAllByRole('button', { name: 'calendarPage.agenda.markDone' })
    await act(async () => {
      fireEvent.click(checks[1])
    })
    expect(annualPlanningService.updatePriority).toHaveBeenCalledWith('1', { is_completed: true })
    expect(calendarService.invalidateCache).toHaveBeenCalledWith('test-user')
  })

  it('ticking a milestone patches it by goal and milestone id with the milestone route’s own flag', async () => {
    annualPlanningService.updateMilestone.mockResolvedValue({})
    await renderPhone()
    const checks = screen.getAllByRole('button', { name: 'calendarPage.agenda.markDone' })
    await act(async () => {
      fireEvent.click(checks[2])
    })
    expect(annualPlanningService.updateMilestone).toHaveBeenCalledWith('g1', 'm1', { completed: true })
  })

  it('a rejected request puts the row back and raises the page alert', async () => {
    tasksService.update.mockRejectedValue(new Error('offline'))
    await renderPhone()
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'calendarPage.agenda.markDone' })[0])
    })
    expect(screen.getAllByRole('button', { name: 'calendarPage.agenda.markDone' })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'calendarPage.agenda.markUndone' })).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('calendarPage.error')
  })
})

// ─── PLAN-010: the year on screen, and the day dropped on ───────────────────

describe('PLAN-010: the year on screen and the local drop date', () => {
  const { calendarService } = require('@nowry/core/api/services/calendar.service')
  const { tasksService } = require('@nowry/core/api/services')
  // Tokyo, UTC+9: a local midnight is still yesterday in UTC. Faked through the
  // Date's own offset — Jest copies `process.env`, so a TZ set there never
  // reaches V8 and the test would run in the machine's zone instead.
  const TOKYO_OFFSET_MINUTES = -540

  const renderPage = async () => {
    const CalendarPage = require('../CalendarPage').default
    await act(async () => {
      render(<CalendarPage />)
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(TOKYO_OFFSET_MINUTES)
    mockIsMobile.mockReturnValue(false)
    mockUseCalendarFilters.mockReturnValue({
      filters: { habitsEnabled: false, activeTypes: ['task', 'priority', 'goal', 'milestone'], activeAreaIds: [] },
      setFilters: jest.fn(),
      resetFilters: jest.fn(),
      applyPreset: jest.fn()
    })
    calendarService.getAllEvents.mockResolvedValue({ events: [], focusAreas: [] })
  })

  // `resetMocks` clears mocks; it does not restore spies. Left in place, the
  // Tokyo offset reaches every suite after this one and skews its date keys.
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('fetches the year of the month on screen, and again when paging crosses into the next year', async () => {
    await renderPage()
    const thisYear = new Date().getFullYear()
    expect(calendarService.getAllEvents).toHaveBeenCalledWith('test-user', thisYear)

    const next = screen.getByRole('button', { name: 'calendarPage.nav.next' })
    for (let month = 0; month < 12; month += 1) {
      await act(async () => {
        fireEvent.click(next)
      })
    }
    // Twelve months on is the same month next year: one more fetch, for that year.
    expect(calendarService.getAllEvents).toHaveBeenCalledTimes(2)
    expect(calendarService.getAllEvents).toHaveBeenLastCalledWith('test-user', thisYear + 1)
  })

  it('writes the day dropped on as the local date, not the UTC one', async () => {
    tasksService.update.mockResolvedValue({})
    await renderPage()
    const { eventDrop } = mockFullCalendar.mock.calls.at(-1)[0]
    const revert = jest.fn()
    // Midnight on New Year's Day in Tokyo: `toISOString` says 2026-12-31.
    const start = new Date('2026-12-31T15:00:00Z')

    await act(async () => {
      await eventDrop({ event: { id: 'task-1', start, extendedProps: { type: 'task' } }, revert })
    })
    expect(tasksService.update).toHaveBeenCalledWith('1', { deadline: '2027-01-01' })
    expect(revert).not.toHaveBeenCalled()
  })
})

// ─── Event pill contrast ────────────────────────────────────────────────────

// Exercises the real `readableTextOn` against the real colours
// `calendar.service.js` emits, rather than mirroring either one. Mirroring the
// formula here would let the production helper change underneath these
// assertions and still pass, which is the failure mode the test exists to stop.
const { readableTextOn, contrastRatio } = require('@nowry/core/tokens/colorSchemeGenerator')

// The four fallbacks hardcoded in calendar.service.js. A user-defined
// focus-area colour replaces these, so they are the floor, not the whole space.
const SEEDED_EVENT_COLORS = {
  'task/priority fallback red': '#ef4444',
  'goal fallback green': '#10b981',
  'priority indigo': '#6366f1',
  amber: '#f59e0b'
}

// WCAG 2.2 AA for normal-size text. The pill label is `body-xs`, so the 3:1
// large-text allowance does not apply to it.
const AA_NORMAL_TEXT = 4.5

describe('CalendarPage — event pill label contrast (WCAG 2.2 AA)', () => {
  // Regression guard. Before this, `eventContent` rendered a Typography with no
  // colour, so the label inherited `text.primary` — a token that only knows
  // about the page surface, not the arbitrary focus-area fill behind it.
  // Measured then: every one of these failed AA in dark mode (#F0F4F8 on amber
  // reached 1.94:1), and indigo also failed in light mode at 3.91:1.
  const INHERITED_LIGHT = '#171A1C'
  const INHERITED_DARK = '#F0F4F8'

  Object.entries(SEEDED_EVENT_COLORS).forEach(([name, background]) => {
    it(`derives an AA-passing label colour for ${name} (${background})`, () => {
      const derived = readableTextOn(background)
      expect(contrastRatio(derived, background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })
  })

  it('beats the inherited text.primary it replaced, in whichever mode that token failed', () => {
    const failures = Object.values(SEEDED_EVENT_COLORS).filter((background) => {
      const worstInherited = Math.min(contrastRatio(INHERITED_LIGHT, background), contrastRatio(INHERITED_DARK, background))
      return worstInherited < AA_NORMAL_TEXT
    })

    // All four fail in at least one mode — if this ever drops to zero the
    // fixture has drifted and the regression guard below is no longer guarding.
    expect(failures).toHaveLength(4)

    failures.forEach((background) => {
      expect(contrastRatio(readableTextOn(background), background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })
  })

  it('never throws on a malformed focus-area colour from the database', () => {
    expect(() => readableTextOn(undefined)).not.toThrow()
    expect(() => readableTextOn('not-a-colour')).not.toThrow()
  })
})

// ─── PLAN-004: Day and Week time grids, blocks on the hours (ADR-045 §6) ────

describe('PLAN-004: the time grids, the blocks on them, and what the grid may write', () => {
  const { calendarService } = require('@nowry/core/api/services/calendar.service')
  const { localDateKey, addDaysKey, parseDateKey } = require('@nowry/core/domain/blocks')
  const { within } = require('@testing-library/react')

  const today = new Date()
  const todayKey = localDateKey(today)
  const tomorrowKey = addDaysKey(todayKey, 1)
  const at = (key, hours, minutes) => {
    const date = parseDateKey(key)
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  const study = {
    id: 'b1',
    title: 'Morning review',
    source: { type: 'study', id: null },
    start: '07:30',
    lengthMin: 20,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    date: null,
    areaId: null
  }
  const oneOff = {
    id: 'b2',
    title: 'Call the bank',
    source: { type: 'free', id: null },
    start: '15:00',
    lengthMin: 30,
    daysOfWeek: [],
    date: todayKey,
    areaId: null
  }
  const routine = (id, start) => ({
    id,
    title: `Routine ${id}`,
    source: { type: 'routine', id: null },
    start,
    lengthMin: 10,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    date: null,
    areaId: null
  })
  const occurrenceOf = (block, date = todayKey) => ({
    date,
    blockId: block.id,
    start: block.start,
    lengthMin: block.lengthMin,
    title: block.title,
    block,
    log: null
  })
  const task = {
    id: 'task-1',
    type: 'task',
    title: 'Finish Spanish deck',
    status: 'pending',
    color: '#6366f1',
    date: today,
    focusAreaId: null
  }

  const lastFc = () => mockFullCalendar.mock.calls.at(-1)[0]
  const blockEvents = () => lastFc().events.filter((event) => event.extendedProps.kind === 'block')
  const view = (name) => screen.getByRole('button', { name: `calendarPage.views.${name}` })

  const renderPage = async () => {
    const CalendarPage = require('../CalendarPage').default
    await act(async () => {
      render(<CalendarPage />)
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsMobile.mockReturnValue(false)
    mockUseCalendarFilters.mockReturnValue({
      filters: { habitsEnabled: false, activeTypes: ['task', 'priority', 'goal', 'milestone'], activeAreaIds: [] },
      setFilters: jest.fn(),
      resetFilters: jest.fn(),
      applyPreset: jest.fn()
    })
    calendarService.getAllEvents.mockResolvedValue({ events: [task], focusAreas: [] })
    armBlockHooks([occurrenceOf(study), occurrenceOf(oneOff)])
  })

  it('Day and Week are time grids from 06:00 to 22:00 on half-hour slots with the all-day row and the now line', async () => {
    await renderPage()
    expect(lastFc().initialView).toBe('dayGridMonth')
    expect(lastFc().plugins).toHaveLength(3)
    fireEvent.click(view('day'))
    expect(lastFc()).toMatchObject({
      initialView: 'timeGridDay',
      slotMinTime: '06:00:00',
      slotMaxTime: '22:00:00',
      slotDuration: '00:30:00',
      scrollTime: '07:00:00',
      allDaySlot: true,
      nowIndicator: true,
      locale: 'en'
    })
    fireEvent.click(view('week'))
    expect(lastFc().initialView).toBe('timeGridWeek')
  })

  it('deadlines stay all-day; occurrences become timed events on local strings carrying their occurrence', async () => {
    await renderPage()
    const deadline = lastFc().events.find((event) => event.id === 'task-1')
    expect(deadline.allDay).toBe(true)
    const [studyEvent] = blockEvents()
    expect(studyEvent).toMatchObject({ start: `${todayKey}T07:30:00`, end: `${todayKey}T07:50:00`, allDay: false })
    expect(studyEvent.extendedProps.occurrence.block).toBe(study)
    expect(lastFc().eventDurationEditable).toBe(false)
  })

  it('Week draws a run of routine items as one event; Day draws every item', async () => {
    armBlockHooks([occurrenceOf(routine('r1', '07:00')), occurrenceOf(routine('r2', '07:10')), occurrenceOf(routine('r3', '07:20'))])
    await renderPage()
    fireEvent.click(view('week'))
    const [run] = blockEvents()
    expect(blockEvents()).toHaveLength(1)
    expect(run.extendedProps.group).toMatchObject({ period: 'morning', count: 3 })
    fireEvent.click(view('day'))
    expect(blockEvents()).toHaveLength(3)
  })

  it('clicking a block opens the block sheet in edit mode; a run opens its Day', async () => {
    await renderPage()
    fireEvent.click(view('week'))
    const occurrence = occurrenceOf(study)
    await act(async () => {
      lastFc().eventClick({ event: { extendedProps: { kind: 'block', occurrence, group: null } } })
    })
    expect(mockBlockFormModal.mock.calls.at(-1)[0]).toMatchObject({ open: true, mode: 'edit', block: study, occurrence })
    expect(mockEventFormModal.mock.calls.at(-1)[0].open).toBe(false)

    const run = { kind: 'block', occurrence: occurrenceOf(routine('r1', '07:00'), tomorrowKey), group: { period: 'morning', count: 2 } }
    await act(async () => {
      lastFc().eventClick({ event: { extendedProps: run } })
    })
    expect(view('day')).toHaveAttribute('aria-pressed', 'true')
    expect(lastFc().initialDate.getDate()).toBe(parseDateKey(tomorrowKey).getDate())
  })

  it('a selection on the hours opens the block sheet as a one-off on the five-minute grid; on the all-day row it opens the event form', async () => {
    await renderPage()
    fireEvent.click(view('day'))
    await act(async () => {
      lastFc().select({ allDay: false, start: at(todayKey, 9, 2), end: at(todayKey, 9, 33) })
    })
    expect(mockBlockFormModal.mock.calls.at(-1)[0]).toMatchObject({
      open: true,
      mode: 'create',
      block: null,
      prefill: { date: todayKey, start: '09:00', lengthMin: 30 }
    })
    await act(async () => {
      lastFc().select({ allDay: true, start: at(todayKey, 0, 0), end: at(tomorrowKey, 0, 0) })
    })
    expect(mockEventFormModal.mock.calls.at(-1)[0]).toMatchObject({ open: true, mode: 'create', initialType: 'task' })
  })

  it('a dropped one-off writes its date and start; a recurring block writes its start within its weekday and reverts across one, saying why', async () => {
    await renderPage()
    const revert = jest.fn()
    await act(async () => {
      await lastFc().eventDrop({
        event: { extendedProps: { kind: 'block', occurrence: occurrenceOf(oneOff) }, start: at(tomorrowKey, 16, 0) },
        revert
      })
    })
    expect(mockUpdateBlock).toHaveBeenCalledWith({ id: 'b2', changes: { date: tomorrowKey, start: '16:00' } })

    await act(async () => {
      await lastFc().eventDrop({
        event: { extendedProps: { kind: 'block', occurrence: occurrenceOf(study) }, start: at(todayKey, 9, 0) },
        revert
      })
    })
    expect(mockUpdateBlock).toHaveBeenLastCalledWith({ id: 'b1', changes: { start: '09:00' } })
    expect(revert).not.toHaveBeenCalled()

    await act(async () => {
      await lastFc().eventDrop({
        event: { extendedProps: { kind: 'block', occurrence: occurrenceOf(study) }, start: at(tomorrowKey, 9, 0) },
        revert
      })
    })
    expect(revert).toHaveBeenCalledTimes(1)
    expect(mockUpdateBlock).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent('calendarPage.blocks.dragRuleKept')
  })

  it('a resize writes the length alone, in five-minute steps; a block never drops onto the all-day row', async () => {
    await renderPage()
    const revert = jest.fn()
    await act(async () => {
      await lastFc().eventResize({
        event: { extendedProps: { kind: 'block', occurrence: occurrenceOf(study) }, start: at(todayKey, 7, 30), end: at(todayKey, 8, 17) },
        revert
      })
    })
    expect(mockUpdateBlock).toHaveBeenCalledWith({ id: 'b1', changes: { lengthMin: 45 } })
    expect(revert).not.toHaveBeenCalled()

    const { eventAllow } = lastFc()
    const blockEvent = { extendedProps: { kind: 'block', occurrence: occurrenceOf(study), group: null } }
    expect(eventAllow({ allDay: false }, blockEvent)).toBe(true)
    expect(eventAllow({ allDay: true }, blockEvent)).toBe(false)
    expect(eventAllow({ allDay: false }, { extendedProps: { kind: 'block', occurrence: occurrenceOf(study), group: { count: 2 } } })).toBe(
      false
    )
    expect(eventAllow({ allDay: true }, { extendedProps: { type: 'task' } })).toBe(true)
    expect(eventAllow({ allDay: false }, { extendedProps: { type: 'task' } })).toBe(false)
  })

  it('Add is the page’s one solid key and opens a menu: Block first, then the four deadline types, each preselecting the event form', async () => {
    await renderPage()
    expect(document.querySelectorAll('.MuiButton-variantSolid')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.add' }))
    const items = await screen.findAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'calendarPage.blocks.menuBlock',
      'calendarModal.form.types.task',
      'calendarModal.form.types.priority',
      'calendarModal.form.types.goal',
      'calendarModal.form.types.milestone'
    ])
    fireEvent.click(items[0])
    expect(mockBlockFormModal.mock.calls.at(-1)[0]).toMatchObject({ open: true, mode: 'create', prefill: null })

    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.add' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'calendarModal.form.types.goal' }))
    expect(mockEventFormModal.mock.calls.at(-1)[0]).toMatchObject({ open: true, mode: 'create', initialType: 'goal' })
  })

  it('reads the range’s kept count and minutes beside the date on Day and Week, and not on Month', async () => {
    mockUseBlocksSummary.mockReturnValue({
      summary: { planned: 23, kept: 14, skipped: 3, partial: 0, minutes: 370 },
      loading: false,
      error: null
    })
    await renderPage()
    expect(screen.queryByTestId('calendar-blocks-summary')).toBeNull()
    expect(mockUseBlocksSummary.mock.calls.at(-1)[0].enabled).toBe(false)
    fireEvent.click(view('week'))
    expect(screen.getByTestId('calendar-blocks-summary')).toHaveTextContent(
      'calendarPage.blocks.summaryKept · calendarPage.blocks.hoursMinutes'
    )
    expect(mockUseBlocksSummary.mock.calls.at(-1)[0].enabled).toBe(true)
    fireEvent.click(view('month'))
    expect(screen.queryByTestId('calendar-blocks-summary')).toBeNull()
  })

  it('‹ › step by a day in Day, and the readout names the day', async () => {
    await renderPage()
    fireEvent.click(view('day'))
    const dayTitle = (date) =>
      new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
    expect(screen.getByText(dayTitle(today))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'calendarPage.nav.today' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.nav.next' }))
    expect(screen.getByText(dayTitle(parseDateKey(tomorrowKey)))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'calendarPage.nav.today' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('the agenda lists today’s blocks with their time before the deadlines, and the tick keeps one', async () => {
    await renderPage()
    fireEvent.click(view('agenda'))
    const agenda = screen.getByTestId('calendar-agenda')
    const rows = within(agenda).getAllByTestId('agenda-block-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('07:30')
    expect(rows[0]).toHaveTextContent('calendarPage.blocks.meta')
    // The block rows precede the task row in the document.
    const taskTitle = within(agenda).getByRole('button', { name: 'Finish Spanish deck' })
    expect(rows[1].compareDocumentPosition(taskTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await act(async () => {
      fireEvent.click(within(rows[0]).getByRole('button', { name: 'calendarPage.blocks.markKept' }))
    })
    expect(mockKeep).toHaveBeenCalledWith(occurrenceOf(study))
    expect(mockUseBlocks.mock.calls.at(-1)[0]).toMatchObject({ from: todayKey.slice(0, 8) + '01' })
  })
})
