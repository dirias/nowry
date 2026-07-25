/**
 * Phase 24 Plan 04 — AllPrioritiesPage tests (PRI-01, PRI-03, PRI-04).
 * Task 1 (behaviors 1-4): active/inactive/completed split, optimistic is_active
 * toggle + revert-on-error, drag-end reorder scoped to active-only ids.
 * Task 2: Show/Hide inactive toggle visibility + 3-section render (covered by
 * the same DOM assertions since the split/toggle state drives what renders).
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts && opts.count !== undefined ? `${key}:${opts.count}` : key)
  }),
  // PriorityList.js (rendered by every test here) also uses <Trans> for its
  // delete-confirmation dialog. Without a mock it resolves to undefined and
  // React logs an invalid-element warning on every render (WR-06).
  Trans: ({ i18nKey }) => i18nKey
}))

// AllPrioritiesPage.js imports annualPlanningService from the barrel index
// ('../../api/services'), which eagerly re-exports every service module and
// would otherwise pull in the real axios client (Jest ESM parse failure) —
// same issue documented in PriorityList.test.js (24-03).
jest.mock('../../../api/services', () => ({
  annualPlanningService: {
    updatePriority: jest.fn(),
    reorderPriorities: jest.fn(),
    deletePriority: jest.fn()
  }
}))

jest.mock('../../../hooks/useAnnualPlan', () => ({
  useAnnualPlan: jest.fn()
}))

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-user' } })
}))

// PriorityDialog and AnnualPlanningTabBar are pre-existing, unchanged
// components out of scope for this plan (PriorityDialog pulls in
// tasksService via a direct submodule import that bypasses the barrel
// mock above; AnnualPlanningTabBar needs a Router context). Stub both.
jest.mock('../PriorityDialog', () => () => null)
jest.mock('../AnnualPlanningTabBar', () => () => null)

let capturedOnDragEnd = null
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }) => {
    capturedOnDragEnd = onDragEnd
    return children
  },
  closestCenter: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => [])
}))

jest.mock('@dnd-kit/sortable', () => ({
  // Mirrors dnd-kit's own arrayMove semantics (splice-based move) without
  // pulling in the real package, which imports KeyboardCode from
  // '@dnd-kit/core' at module scope — incompatible with the '@dnd-kit/core'
  // mock above.
  arrayMove: (array, from, to) => {
    const result = array.slice()
    const [item] = result.splice(from, 1)
    result.splice(to, 0, item)
    return result
  },
  verticalListSortingStrategy: 'vertical',
  SortableContext: ({ children }) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null
  })
}))

const { useAnnualPlan } = require('../../../hooks/useAnnualPlan')
const { annualPlanningService } = require('../../../api/services')
const AllPrioritiesPage = require('../AllPrioritiesPage').default

const makePriority = (overrides) => ({
  _id: 'p1',
  title: 'Priority',
  is_completed: false,
  is_active: true,
  ...overrides
})

const basePriorities = [
  makePriority({ _id: 'active1', title: 'Active One', is_active: true, is_completed: false }),
  makePriority({ _id: 'active2', title: 'Active Two', is_active: true, is_completed: false }),
  makePriority({ _id: 'inactive1', title: 'Inactive One', is_active: false, is_completed: false }),
  makePriority({ _id: 'completed1', title: 'Completed One', is_active: true, is_completed: true })
]

const mockHook = (overrides = {}) => {
  useAnnualPlan.mockReturnValue({
    plan: { _id: 'plan1' },
    areas: [],
    priorities: basePriorities,
    loading: false,
    error: null,
    reload: jest.fn(),
    ...overrides
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  capturedOnDragEnd = null
})

describe('Phase 24 PRI-01/PRI-03: active/inactive/completed split + inactive toggle', () => {
  it('Test 1: active priorities render immediately, inactive is hidden behind the toggle, completed renders inline', () => {
    mockHook()
    render(<AllPrioritiesPage />)

    expect(screen.getByText('Active One')).toBeInTheDocument()
    expect(screen.getByText('Active Two')).toBeInTheDocument()
    expect(screen.getByText('Completed One')).toBeInTheDocument()
    expect(screen.queryByText('Inactive One')).not.toBeInTheDocument()
    expect(screen.getByText('annualPlanning.priority.showInactive:1')).toBeInTheDocument()
  })

  it('clicking Show inactive (N) reveals the inactive section and flips the label to Hide inactive', () => {
    mockHook()
    render(<AllPrioritiesPage />)

    fireEvent.click(screen.getByText('annualPlanning.priority.showInactive:1'))

    expect(screen.getByText('Inactive One')).toBeInTheDocument()
    expect(screen.getByText('annualPlanning.priority.hideInactive')).toBeInTheDocument()

    fireEvent.click(screen.getByText('annualPlanning.priority.hideInactive'))

    expect(screen.queryByText('Inactive One')).not.toBeInTheDocument()
    expect(screen.getByText('annualPlanning.priority.showInactive:1')).toBeInTheDocument()
  })

  it('the toggle is not rendered when there are no inactive priorities', () => {
    mockHook({
      priorities: [makePriority({ _id: 'active1', title: 'Active One', is_active: true, is_completed: false })]
    })
    render(<AllPrioritiesPage />)

    expect(screen.queryByText(/showInactive/)).not.toBeInTheDocument()
  })
})

describe('Phase 24 PRI-01 (D-04): optimistic is_active toggle', () => {
  it('Test 2: clicking the flag icon flips local is_active immediately (the row leaves the active section) and calls updatePriority', async () => {
    mockHook({
      priorities: [makePriority({ _id: 'active1', title: 'Active One', is_active: true, is_completed: false })]
    })
    annualPlanningService.updatePriority.mockResolvedValue({})
    render(<AllPrioritiesPage />)

    fireEvent.click(screen.getByLabelText('annualPlanning.priority.markInactive'))

    // Optimistic flip happens synchronously, before the awaited call resolves: the
    // priority is now inactive and moves out of the active section into the
    // (collapsed by default) inactive bucket.
    expect(screen.queryByLabelText('annualPlanning.priority.markInactive')).not.toBeInTheDocument()
    expect(screen.getByText('annualPlanning.priority.showInactive:1')).toBeInTheDocument()

    await waitFor(() => expect(annualPlanningService.updatePriority).toHaveBeenCalledWith('active1', { is_active: false }))
  })

  it('Test 3: reverts local is_active when updatePriority rejects, restoring the priority to the active section', async () => {
    mockHook({
      priorities: [makePriority({ _id: 'active1', title: 'Active One', is_active: true, is_completed: false })]
    })
    annualPlanningService.updatePriority.mockRejectedValue(new Error('network error'))
    render(<AllPrioritiesPage />)

    fireEvent.click(screen.getByLabelText('annualPlanning.priority.markInactive'))
    expect(screen.queryByLabelText('annualPlanning.priority.markInactive')).not.toBeInTheDocument()

    await waitFor(() => expect(annualPlanningService.updatePriority).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByLabelText('annualPlanning.priority.markInactive')).toBeInTheDocument())
  })
})

describe('Phase 24 PRI-04 (D-07, D-08): drag-to-reorder active priorities only', () => {
  it('Test 4: dragging an active priority calls reorderPriorities with only active, non-completed ids in the new order', async () => {
    mockHook()
    annualPlanningService.reorderPriorities.mockResolvedValue({})
    render(<AllPrioritiesPage />)

    expect(capturedOnDragEnd).toBeInstanceOf(Function)
    await capturedOnDragEnd({ active: { id: 'active2' }, over: { id: 'active1' } })

    await waitFor(() => expect(annualPlanningService.reorderPriorities).toHaveBeenCalledWith('plan1', ['active2', 'active1']))
  })

  it('does not call reorderPriorities when dropped in the same position', async () => {
    mockHook()
    render(<AllPrioritiesPage />)

    await capturedOnDragEnd({ active: { id: 'active1' }, over: { id: 'active1' } })

    expect(annualPlanningService.reorderPriorities).not.toHaveBeenCalled()
  })
})
