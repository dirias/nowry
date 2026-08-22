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

// ─── Phase 15: isKeyResult tests ─────────────────────────────────────────────

describe('calendarService — CAL-02: isKeyResult in milestone extendedProps', () => {
  const { tasksService } = require('./tasks.service')
  const { fetchAnnualPlanData } = require('./annualPlanning.service')

  // Base goal used across CAL-02 tests; milestones overridden per-test as needed
  const baseGoal = {
    _id: 'goal-cal02',
    title: 'CAL-02 goal',
    target_date: '2026-12-31',
    focus_area_id: null,
    status: 'active'
  }

  const { queryClient } = require('../queryClient')

  beforeEach(() => {
    queryClient.fetchQuery.mockImplementation(({ queryFn }) => queryFn())
    tasksService.getAll.mockResolvedValue([])
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('milestone event sets isKeyResult: true when ms.is_key_result is true', async () => {
    fetchAnnualPlanData.mockResolvedValue({
      plan: {},
      priorities: [],
      focusAreas: [],
      goals: [{ ...baseGoal, milestones: [{ title: 'KR milestone', due_date: '2026-06-01', is_key_result: true, completed: false }] }],
      activities: [],
      quarterReports: []
    })

    const { calendarService } = require('./calendar.service')
    const { events } = await calendarService.getAllEvents('user-1')
    const ms = events.find((e) => e.type === 'milestone')
    expect(ms).toBeDefined()
    expect(ms.isKeyResult).toBe(true)
  })

  it('milestone event sets isKeyResult: false when ms.is_key_result is false', async () => {
    fetchAnnualPlanData.mockResolvedValue({
      plan: {},
      priorities: [],
      focusAreas: [],
      goals: [
        { ...baseGoal, milestones: [{ title: 'Regular milestone', due_date: '2026-06-01', is_key_result: false, completed: false }] }
      ],
      activities: [],
      quarterReports: []
    })

    const { calendarService } = require('./calendar.service')
    const { events } = await calendarService.getAllEvents('user-1')
    const ms = events.find((e) => e.type === 'milestone')
    expect(ms).toBeDefined()
    expect(ms.isKeyResult).toBe(false)
  })

  it('milestone event sets isKeyResult: false when ms.is_key_result is undefined (pre-field legacy doc)', async () => {
    fetchAnnualPlanData.mockResolvedValue({
      plan: {},
      priorities: [],
      focusAreas: [],
      goals: [{ ...baseGoal, milestones: [{ title: 'Legacy milestone', due_date: '2026-06-01', completed: false }] }],
      activities: [],
      quarterReports: []
    })

    const { calendarService } = require('./calendar.service')
    const { events } = await calendarService.getAllEvents('user-1')
    const ms = events.find((e) => e.type === 'milestone')
    expect(ms).toBeDefined()
    expect(ms.isKeyResult).toBe(false)
  })
})
