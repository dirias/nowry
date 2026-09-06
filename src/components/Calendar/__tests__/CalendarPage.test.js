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

// Mock FullCalendar packages (not yet installed in Wave 0)
jest.mock('@fullcalendar/react', () => () => null, { virtual: true })
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
jest.mock('../../../hooks/useCalendarFilters', () => ({
  useCalendarFilters: (...args) => mockUseCalendarFilters(...args)
}))
const mockIsMobile = jest.fn(() => false)
jest.mock('../../../hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile()
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } })
}))
jest.mock('../../../api/services/calendar.service', () => ({
  calendarService: { getAllEvents: jest.fn(), invalidateCache: jest.fn() }
}))
jest.mock('../../../api/services', () => ({
  tasksService: { update: jest.fn() },
  annualPlanningService: { updatePriority: jest.fn(), updateGoal: jest.fn(), updateMilestone: jest.fn() }
}))
jest.mock('../EventFormModal', () => () => null)
// CalendarPage now reads userId from useAuth() to scope the ['calendarEvents', userId,
// year] React Query key (CACHE-008 / ADR-008) — mocked here since this test has no
// AuthProvider wrapping it, following the convention from DailyRoutinePlanner.test.js.
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } })
}))

const { filterCalendarEvents } = require('../calendarFilters')

// Default mock return value for existing Phase 15 tests
beforeEach(() => {
  mockUseCalendarFilters.mockReturnValue({
    filters: { habitsEnabled: false, activeTypes: ['task', 'priority', 'goal', 'milestone'], activeAreaIds: [] },
    setFilters: jest.fn(),
    resetFilters: jest.fn(),
    applyPreset: jest.fn()
  })
})

// ─── Icon logic unit tests (pure logic, no render needed) ────────────────────

// Mirrors EVENT_ICON_MAP in CalendarPage.js: one glyph per type. The star for a
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
  const { calendarService } = require('../../../api/services/calendar.service')

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

  it('offers Month, Week and Agenda as one object on desktop', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: 'calendarPage.views.month' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'calendarPage.views.week' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'calendarPage.views.day' })).toBeNull()
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
  const { calendarService } = require('../../../api/services/calendar.service')
  const { tasksService, annualPlanningService } = require('../../../api/services')

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

// ─── Event pill contrast ────────────────────────────────────────────────────

// Exercises the real `readableTextOn` against the real colours
// `calendar.service.js` emits, rather than mirroring either one. Mirroring the
// formula here would let the production helper change underneath these
// assertions and still pass, which is the failure mode the test exists to stop.
const { readableTextOn, contrastRatio } = require('../../../theme/colorSchemeGenerator')

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
