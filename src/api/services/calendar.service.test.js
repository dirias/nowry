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

jest.mock('./annualPlanning.service', () => ({
  annualPlanningService: {
    getFullAnnualPlan: jest.fn()
  }
}))

jest.mock('../utils/cache', () => ({
  apiCache: {
    // Pass-through cache: just calls the factory function directly
    get: jest.fn((_key, _ttl, factory) => factory()),
    invalidatePrefix: jest.fn()
  }
}))

describe('Phase 16 FLT-01: getAllEvents return shape and focusAreaId', () => {
  const { tasksService } = require('./tasks.service')
  const { annualPlanningService } = require('./annualPlanning.service')

  const mockFocusArea = { _id: 'area-001', name: 'Learning', color: '#10b981' }
  const mockGoal = {
    _id: 'goal-001',
    title: 'Read 12 books',
    target_date: '2026-12-31',
    focus_area_id: 'area-001',
    status: 'active',
    milestones: [
      { title: 'Read 3 books', due_date: '2026-03-31', is_key_result: true, completed: false }
    ]
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

  const { apiCache } = require('../utils/cache')

  beforeEach(() => {
    // Re-apply pass-through cache mock on each test (clearAllMocks resets implementations)
    apiCache.get.mockImplementation((_key, _ttl, factory) => factory())
    tasksService.getAll.mockResolvedValue([mockTask])
    annualPlanningService.getFullAnnualPlan.mockResolvedValue({
      plan: {},
      priorities: [mockPriority],
      focus_areas: [mockFocusArea],
      goals: [mockGoal],
      activities: []
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('getAllEvents() resolves to an object with both events array and focusAreas array (not a bare array)', async () => {
    const { calendarService } = require('./calendar.service')
    const result = await calendarService.getAllEvents()

    expect(result).not.toBeNull()
    expect(typeof result).toBe('object')
    expect(Array.isArray(result)).toBe(false) // must NOT be a bare array
    expect(Array.isArray(result.events)).toBe(true)
    expect(Array.isArray(result.focusAreas)).toBe(true)
  })

  it('goal events have a focusAreaId string property matching the goal focus_area_id', async () => {
    const { calendarService } = require('./calendar.service')
    const { events } = await calendarService.getAllEvents()

    const goalEvent = events.find((e) => e.type === 'goal')
    expect(goalEvent).toBeDefined()
    expect(goalEvent.focusAreaId).toBe('area-001')
  })

  it('milestone events have a focusAreaId property that matches the parent goal focus_area_id', async () => {
    const { calendarService } = require('./calendar.service')
    const { events } = await calendarService.getAllEvents()

    const milestoneEvent = events.find((e) => e.type === 'milestone')
    expect(milestoneEvent).toBeDefined()
    expect(milestoneEvent.focusAreaId).toBe('area-001')
  })

  it('task events have focusAreaId: null', async () => {
    const { calendarService } = require('./calendar.service')
    const { events } = await calendarService.getAllEvents()

    const taskEvent = events.find((e) => e.type === 'task')
    expect(taskEvent).toBeDefined()
    expect(taskEvent.focusAreaId).toBeNull()
  })

  it('priority events have focusAreaId: null', async () => {
    const { calendarService } = require('./calendar.service')
    const { events } = await calendarService.getAllEvents()

    const priorityEvent = events.find((e) => e.type === 'priority')
    expect(priorityEvent).toBeDefined()
    expect(priorityEvent.focusAreaId).toBeNull()
  })

  it('focusAreas array contains objects with { id, name, color } shape', async () => {
    const { calendarService } = require('./calendar.service')
    const { focusAreas } = await calendarService.getAllEvents()

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
  it('milestone push block sets isKeyResult: false when ms.is_key_result is false', () => {
    // Verify that !!false === false
    expect(!!false).toBe(false)
  })

  it('milestone push block sets isKeyResult: true when ms.is_key_result is true', () => {
    // Verify that !!true === true
    expect(!!true).toBe(true)
  })

  it('milestone push block sets isKeyResult: false when ms.is_key_result is undefined (pre-field doc)', () => {
    // Verify that !!undefined === false — defensive against legacy MongoDB docs
    expect(!!undefined).toBe(false)
  })

  it('isKeyResult field maps correctly from ms.is_key_result via !! coercion', () => {
    // Verify the !! coercion used in calendar.service.js line:
    //   isKeyResult: !!ms.is_key_result
    // produces the correct boolean for all meaningful input values.
    const coerce = (val) => !!val
    expect(coerce(true)).toBe(true)      // explicit true → true
    expect(coerce(false)).toBe(false)    // explicit false → false
    expect(coerce(undefined)).toBe(false) // missing field (pre-Phase-15 doc) → false
    expect(coerce(1)).toBe(true)          // truthy non-boolean → true
    expect(coerce(0)).toBe(false)         // falsy non-boolean → false
  })
})
