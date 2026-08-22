/**
 * CalendarModal render regression test.
 *
 * calendarService.getAllEvents() returns { events, focusAreas } (Phase 16 D-01), but
 * CalendarModal's loadEvents() previously did `setEvents(data)` with the whole wrapper
 * object instead of destructuring `events` out of it, so `events.filter(...)` further
 * down threw a TypeError every time the modal opened and the fetch resolved.
 * CalendarModalStatusColor.test.js only greps CalendarModal.js as text and never renders
 * the component, so this class of bug had zero regression coverage.
 *
 * This suite renders <CalendarModal /> for real against a mocked getAllEvents() and
 * asserts it doesn't throw and that a fetched event actually surfaces in the day panel —
 * this fails against the pre-fix code (TypeError: events.filter is not a function) and
 * passes once `events` state receives the array.
 */
import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts && opts.defaultValue) || k })
}))

// CalendarModal reads userId from useAuth() to scope the getAllEvents() call —
// mocked here since this test has no AuthProvider wrapping it, following the
// convention already used in CalendarPage.test.js.
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } })
}))

// EventFormModal has its own heavy dependency tree (tasks/annualPlanning services,
// useAnnualPlan) — stubbed out like CalendarPage.test.js does, since it's irrelevant
// to this regression guard.
jest.mock('../EventFormModal', () => () => null)

const mockGetAllEvents = jest.fn()
jest.mock('../../../api/services/calendar.service', () => ({
  calendarService: {
    getAllEvents: (...args) => mockGetAllEvents(...args)
  }
}))

describe('CalendarModal — getAllEvents() return-shape regression guard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without throwing and surfaces a fetched event when getAllEvents resolves { events, focusAreas }', async () => {
    const today = new Date()
    mockGetAllEvents.mockResolvedValue({
      events: [
        {
          id: 'task-1',
          title: 'Finish regression test',
          date: today,
          type: 'task',
          color: '#6366f1',
          status: 'pending'
        }
      ],
      // Included to mirror the real service shape — CalendarModal has no
      // area-filter UI, so this should be safely ignored.
      focusAreas: [{ id: 'area-1', name: 'Learning', color: '#10b981' }]
    })

    const CalendarModal = require('../CalendarModal').default

    await act(async () => {
      render(<CalendarModal open={true} onClose={jest.fn()} />)
    })

    expect(mockGetAllEvents).toHaveBeenCalledWith('test-user')

    await waitFor(() => {
      expect(screen.getByText('Finish regression test')).toBeInTheDocument()
    })
  })

  it('renders without throwing when getAllEvents resolves an empty events list', async () => {
    mockGetAllEvents.mockResolvedValue({ events: [], focusAreas: [] })

    const CalendarModal = require('../CalendarModal').default

    await act(async () => {
      expect(() => render(<CalendarModal open={true} onClose={jest.fn()} />)).not.toThrow()
    })

    await waitFor(() => {
      expect(mockGetAllEvents).toHaveBeenCalled()
    })
  })
})
