/**
 * Phase 15 — calendar.service.js tests (CAL-02 service wiring).
 * Phase 16 — FLT-01: getAllEvents return shape and focusAreaId.
 * Stubs written in Wave 0; un-skipped after Plan 01 Task 2 completes.
 */

// Mock @fullcalendar/* packages to prevent import errors in Jest
jest.mock('@fullcalendar/react', () => () => null, { virtual: true })

// ─── Phase 16 FLT-01: getAllEvents return shape and focusAreaId ───────────────

// Mock the service dependencies so we can call getAllEvents() directly
jest.mock('./tasks.service', () => ({
  tasksService: {
    getAll: jest.fn()
  }
}))

// fetchAnnualPlanData is the shared queryFn calendar.service.js and useAnnualPlan.js
// both read through under the ['annualPlan', userId, year] key (CACHE-008 / ADR-008).
// Mocked directly (rather than the raw getFullAnnualPlan it wraps) so these tests feed
// it its own normalized output shape: { plan, focusAreas, goals, activities, priorities,
// quarterReports } — see annualPlanning.service.js for the transform.
jest.mock('./annualPlanning.service', () => ({
  annualPlanningService: {
    getFullAnnualPlan: jest.fn()
  },
  fetchAnnualPlanData: jest.fn()
}))

// Pass-through queryClient: fetchQuery just calls the factory directly, mirroring the
// old apiCache.get pass-through mock — these tests exercise the transform logic, not
// React Query's caching semantics.
jest.mock('../queryClient', () => ({
  queryClient: {
    fetchQuery: jest.fn(({ queryFn }) => queryFn()),
    invalidateQueries: jest.fn()
  }
}))

describe('Phase 16 FLT-01: getAllEvents return shape and focusAreaId', () => {
  const { tasksService } = require('./tasks.service')
  const { fetchAnnualPlanData } = require('./annualPlanning.service')

  const mockFocusArea = { _id: 'area-001', name: 'Learning', color: '#10b981' }
  const mockGoal = {
    _id: 'goal-001',
    title: 'Read 12 books',
    target_date: '2026-12-31',
    focus_area_id: 'area-001',
    status: 'active',
    milestones: [{ title: 'Read 3 books', due_date: '2026-03-31', is_key_result: true, completed: false }]
  }
  const mockTask = {
    _id: 'task-001',
    title: 'Buy supplies',
    deadline: '2026-06-30',
    is_completed: false,
    category: null
  }
  const mockPriority = {
    _id: 'prio-001',
    title: 'Launch MVP',
    deadline: '2026-09-30',
    status: 'active'
  }

  const { queryClient } = require('../queryClient')

  beforeEach(() => {
    // Re-apply pass-through queryClient mock on each test (CRA resets mock
    // implementations before every test, same reason the old apiCache.get mock
    // was re-applied here too).
    queryClient.fetchQuery.mockImplementation(({ queryFn }) => queryFn())
    tasksService.getAll.mockResolvedValue([mockTask])
    // fetchAnnualPlanData returns its already-normalized shape (see
    // annualPlanning.service.js) — focusAreas/goals/activities, not raw focus_areas.
    fetchAnnualPlanData.mockResolvedValue({
      plan: {},
      priorities: [mockPriority],
      focusAreas: [mockFocusArea],
      goals: [mockGoal],
      activities: [],
      quarterReports: []
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('getAllEvents() resolves to an object with both events array and focusAreas array (not a bare array)', async () => {
    const { calendarService } = require('./calendar.service')
    const result = await calendarService.getAllEvents('user-1')

    expect(result).not.toBeNull()
    expect(typeof result).toBe('object')
    expect(Array.isArray(result)).toBe(false) // must NOT be a bare array
    expect(Array.isArray(result.events)).toBe(true)
    expect(Array.isArray(result.focusAreas)).toBe(true)
  })

  it('goal events have a focusAreaId string property matching the goal focus_area_id', async () => {
    const { calendarService } = require('./calendar.service')
    const { events } = await calendarService.getAllEvents('user-1')

    const goalEvent = events.find((e) => e.type === 'goal')
    expect(goalEvent).toBeDefined()
    expect(goalEvent.focusAreaId).toBe('area-001')
  })

  it('milestone events have a focusAreaId property that matches the parent goal focus_area_id', async () => {
    const { calendarService } = require('./calendar.service')
    const { events } = await calendarService.getAllEvents('user-1')

    const milestoneEvent = events.find((e) => e.type === 'milestone')
    expect(milestoneEvent).toBeDefined()
    expect(milestoneEvent.focusAreaId).toBe('area-001')
  })

  it('task events have focusAreaId: null', async () => {
    const { calendarService } = require('./calendar.service')
    const { events } = await calendarService.getAllEvents('user-1')

    const taskEvent = events.find((e) => e.type === 'task')
    expect(taskEvent).toBeDefined()
    expect(taskEvent.focusAreaId).toBeNull()
  })

  it('priority events have focusAreaId: null', async () => {
    const { calendarService } = require('./calendar.service')
    const { events } = await calendarService.getAllEvents('user-1')

    const priorityEvent = events.find((e) => e.type === 'priority')
    expect(priorityEvent).toBeDefined()
    expect(priorityEvent.focusAreaId).toBeNull()
  })

  it('focusAreas array contains objects with { id, name, color } shape', async () => {
    const { calendarService } = require('./calendar.service')
    const { focusAreas } = await calendarService.getAllEvents('user-1')

    expect(focusAreas.length).toBeGreaterThanOrEqual(1)
    const area = focusAreas[0]
    expect(area).toHaveProperty('id')
    expect(area).toHaveProperty('name')
    expect(area).toHaveProperty('color')
    expect(area.id).toBe('area-001')
    expect(area.name).toBe('Learning')
    expect(area.color).toBe('#10b981')
  })
})

// ─── CAL-002: a finished priority reads as `completed` ───────────────────────

describe('calendarService — CAL-002: priority completion surfaces as status', () => {
  const { tasksService } = require('./tasks.service')
  const { fetchAnnualPlanData } = require('./annualPlanning.service')
  const { queryClient } = require('../queryClient')
  const { calendarService } = require('./calendar.service')

  const plan = (priorities) => ({ plan: {}, priorities, focusAreas: [], goals: [], activities: [], quarterReports: [] })

  beforeEach(() => {
    queryClient.fetchQuery.mockImplementation(({ queryFn }) => queryFn())
    tasksService.getAll.mockResolvedValue([])
  })

  it('a priority with is_completed: true arrives as status "completed", the word tasks already use', async () => {
    fetchAnnualPlanData.mockResolvedValue(
      plan([{ _id: 'p1', title: 'Launch MVP', deadline: '2026-09-30', status: 'active', is_completed: true }])
    )
    const { events } = await calendarService.getAllEvents('user-1')
    expect(events.find((e) => e.type === 'priority').status).toBe('completed')
  })

  it('an unfinished priority keeps whatever status the plan says, defaulting to "active"', async () => {
    fetchAnnualPlanData.mockResolvedValue(
      plan([
        { _id: 'p1', title: 'A', deadline: '2026-09-30', status: 'active', is_completed: false },
        { _id: 'p2', title: 'B', deadline: '2026-10-30' }
      ])
    )
    const { events } = await calendarService.getAllEvents('user-1')
    expect(events.filter((e) => e.type === 'priority').map((e) => e.status)).toEqual(['active', 'active'])
  })
})

// ─── CAL-004: a milestone event carries the address its PATCH route needs ──────

describe('calendarService — CAL-004: milestone events carry goalId and milestoneId', () => {
  const { tasksService } = require('./tasks.service')
  const { fetchAnnualPlanData } = require('./annualPlanning.service')
  const { queryClient } = require('../queryClient')
  const { calendarService } = require('./calendar.service')

  beforeEach(() => {
    queryClient.fetchQuery.mockImplementation(({ queryFn }) => queryFn())
    tasksService.getAll.mockResolvedValue([])
  })

  it("exposes the goal id and the milestone's own id beside the index-based event id", async () => {
    fetchAnnualPlanData.mockResolvedValue({
      plan: {},
      priorities: [],
      focusAreas: [{ _id: 'area-1', name: 'Health', color: '#14b8a6' }],
      goals: [
        {
          _id: 'goal-7',
          title: 'Run',
          focus_area_id: 'area-1',
          milestones: [{ id: 'ms-42', title: 'Week 4', due_date: '2026-09-12', completed: false }]
        }
      ],
      activities: [],
      quarterReports: []
    })
    const { events } = await calendarService.getAllEvents('user-1')
    const milestone = events.find((e) => e.type === 'milestone')
    expect(milestone.id).toBe('milestone-goal-7-0')
    expect(milestone.goalId).toBe('goal-7')
    expect(milestone.milestoneId).toBe('ms-42')
  })
})

// ─── CAL-006: a completed milestone stays on the calendar ─────────────────────

describe('calendarService — CAL-006: completed milestones are kept, as completed', () => {
  const { tasksService } = require('./tasks.service')
  const { fetchAnnualPlanData } = require('./annualPlanning.service')
  const { queryClient } = require('../queryClient')
  const { calendarService } = require('./calendar.service')

  beforeEach(() => {
    queryClient.fetchQuery.mockImplementation(({ queryFn }) => queryFn())
    tasksService.getAll.mockResolvedValue([])
  })

  it('includes a completed milestone with status "completed" instead of dropping it', async () => {
    fetchAnnualPlanData.mockResolvedValue({
      plan: {},
      priorities: [],
      focusAreas: [],
      goals: [
        {
          _id: 'g',
          title: 'Run',
          milestones: [
            { id: 'a', title: 'Done one', due_date: '2026-09-01', completed: true },
            { id: 'b', title: 'Open one', due_date: '2026-09-08' }
          ]
        }
      ],
      activities: [],
      quarterReports: []
    })
    const { events } = await calendarService.getAllEvents('user-1')
    expect(events.filter((e) => e.type === 'milestone').map((e) => e.status)).toEqual(['completed', 'pending'])
  })
})
