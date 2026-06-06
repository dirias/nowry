/**
 * Phase 8 — CalendarPage tests.
 * Stubs written in Wave 0; implementations follow in 08-04-PLAN.
 * All suites use describe.skip — will be enabled when CalendarPage.js exists.
 */

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
