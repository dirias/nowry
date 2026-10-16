/**
 * AllPrioritiesPage — the Priorities tab (PLAN-013, ADR-046 §5).
 *
 * A priority is a flag on a task or a milestone. The page lists the flagged
 * items in two groups, open and completed, and offers done and the flag off,
 * both optimistic through `usePriorityStatus`. Nothing is created here: there
 * is no Add key, no dialog, no drag, no inactive section.
 *
 * AllPrioritiesPage is a child route of AnnualPlanningLayout and reads plan
 * data from useOutletContext(). These tests mount it under a real router whose
 * parent route supplies the context. The `priorities`/`setPriorities` pair
 * lives in the harness because the layout owns that state.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts && opts.count !== undefined ? `${key}:${opts.count}` : key)
  })
}))

// usePriorityStatus imports annualPlanningService from the barrel index, which
// would otherwise pull in the real axios client (Jest ESM parse failure).
jest.mock('@nowry/core/api/services', () => ({
  annualPlanningService: {
    completePriority: jest.fn(),
    unflagPriority: jest.fn()
  }
}))

const { annualPlanningService } = require('@nowry/core/api/services')
const AllPrioritiesPage = require('../AllPrioritiesPage').default

const makePriority = (overrides) => ({
  _id: 'p1',
  title: 'Priority',
  is_completed: false,
  is_active: true,
  linked_entity_type: 'task',
  linked_entity_id: 'p1',
  focus_area_id: null,
  ...overrides
})

const basePriorities = [
  makePriority({ _id: 'open1', title: 'Open One', linked_entity_id: 'open1' }),
  makePriority({ _id: 'open2', title: 'Open Two', linked_entity_type: 'milestone', linked_entity_id: 'g1', focus_area_id: 'a1' }),
  makePriority({ _id: 'completed1', title: 'Completed One', linked_entity_id: 'completed1', is_completed: true })
]

/**
 * Stands in for AnnualPlanningLayout: owns the priorities state and hands it to
 * the tab through <Outlet context={...} />, which is exactly how the real shell
 * feeds this component.
 */
const ContextProvider = ({ initialPriorities, plan, reload }) => {
  const [priorities, setPriorities] = React.useState(initialPriorities)
  return (
    <Outlet
      context={{
        plan,
        areas: [{ _id: 'a1', name: 'Health', color: '#4caf50' }],
        priorities,
        setPriorities,
        loading: false,
        error: null,
        reload
      }}
    />
  )
}

const renderPage = ({ priorities = basePriorities, plan = { _id: 'plan1' }, reload = jest.fn() } = {}) =>
  render(
    <MemoryRouter initialEntries={['/annual-planning/priorities']}>
      <Routes>
        <Route path='/annual-planning' element={<ContextProvider initialPriorities={priorities} plan={plan} reload={reload} />}>
          <Route path='priorities' element={<AllPrioritiesPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )

beforeEach(() => {
  jest.clearAllMocks()
})

describe('two groups, nothing to add', () => {
  it('renders open rows first and completed rows under their own heading', () => {
    renderPage()
    expect(screen.getByText('Open One')).toBeInTheDocument()
    expect(screen.getByText('Open Two')).toBeInTheDocument()
    expect(screen.getByText('annualPlanning.priority.completedSection')).toBeInTheDocument()
    expect(screen.getByText('Completed One')).toBeInTheDocument()
  })

  it('has no Add key, no inactive section and no drag handle', () => {
    renderPage()
    expect(screen.queryByText('annualPlanning.priority.addPriority')).not.toBeInTheDocument()
    expect(screen.queryByText(/showInactive/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('annualPlanning.priority.dragHandle')).not.toBeInTheDocument()
    const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(names.every((name) => /markComplete|markIncomplete|unflag/.test(name))).toBe(true)
  })

  it('the empty state says where a priority comes from and offers no key', () => {
    renderPage({ priorities: [] })
    expect(screen.getByText('annualPlanning.priority.emptyTitle')).toBeInTheDocument()
    expect(screen.getByText('annualPlanning.priority.emptyBody')).toBeInTheDocument()
    expect(screen.queryByText('annualPlanning.priority.emptyCta')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('done, optimistically (ADR-015)', () => {
  it('ticking an open row moves it to Completed at once and writes done on the item', async () => {
    annualPlanningService.completePriority.mockResolvedValue({})
    renderPage()
    expect(screen.getAllByLabelText('annualPlanning.priority.markComplete')).toHaveLength(2)

    fireEvent.click(screen.getAllByLabelText('annualPlanning.priority.markComplete')[0])

    expect(screen.getAllByLabelText('annualPlanning.priority.markComplete')).toHaveLength(1)
    expect(screen.getAllByLabelText('annualPlanning.priority.markIncomplete')).toHaveLength(2)
    await waitFor(() =>
      expect(annualPlanningService.completePriority).toHaveBeenCalledWith(expect.objectContaining({ _id: 'open1' }), true)
    )
  })

  it('reverts to the open group when the write rejects', async () => {
    annualPlanningService.completePriority.mockRejectedValue(new Error('network error'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()
    fireEvent.click(screen.getAllByLabelText('annualPlanning.priority.markComplete')[0])
    expect(screen.getAllByLabelText('annualPlanning.priority.markIncomplete')).toHaveLength(2)

    await waitFor(() => expect(screen.getAllByLabelText('annualPlanning.priority.markComplete')).toHaveLength(2))
    console.error.mockRestore()
  })

  it('ticking a completed row reopens it', async () => {
    annualPlanningService.completePriority.mockResolvedValue({})
    renderPage()
    fireEvent.click(screen.getByLabelText('annualPlanning.priority.markIncomplete'))
    expect(screen.queryByLabelText('annualPlanning.priority.markIncomplete')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(annualPlanningService.completePriority).toHaveBeenCalledWith(expect.objectContaining({ _id: 'completed1' }), false)
    )
  })
})

describe('the flag off', () => {
  it('"Remove from priorities" drops the row at once and calls unflagPriority with the item', async () => {
    annualPlanningService.unflagPriority.mockResolvedValue({})
    renderPage()
    fireEvent.click(screen.getAllByLabelText('annualPlanning.priority.unflag')[1])
    expect(screen.queryByText('Open Two')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(annualPlanningService.unflagPriority).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'open2', linked_entity_type: 'milestone', linked_entity_id: 'g1' })
      )
    )
  })

  it('brings the row back when the write rejects', async () => {
    annualPlanningService.unflagPriority.mockRejectedValue(new Error('network error'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()
    fireEvent.click(screen.getAllByLabelText('annualPlanning.priority.unflag')[0])
    expect(screen.queryByText('Open One')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Open One')).toBeInTheDocument())
    console.error.mockRestore()
  })
})
