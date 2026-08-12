/**
 * Regression guard — ladder rung 5 on the focus-area page (ADR-004 §Context 2,
 * goal-form-redesign UX-CONTRACT §0.2 defect 1 / FE-A5).
 *
 * FE-5 rewired FocusAreaView onto GoalCard without carrying the `initialSection`
 * prop that FE-3 had just added to GoalsTabView. The card's "Add a milestone to
 * track progress" prompt therefore opened the goal form with no section named,
 * leaving the milestone editor unrevealed on /annual-planning/area/:id while the
 * identical prompt on the Goals tab worked.
 *
 * Nothing in the suite asserted the wiring, so the bug shipped green. These tests
 * assert the prop contract at the seam: what FocusAreaView hands <GoalDialog>.
 * They render the real component and mock only its leaves.
 */

jest.mock('../../../api/services', () => ({
  annualPlanningService: {
    getQuarterReports: jest.fn(() => Promise.resolve([]))
  }
}))
jest.mock('../../../api/utils/cache', () => ({ apiCache: { clear: jest.fn() } }))
jest.mock('../../../hooks/useAnnualPlan', () => ({ useAnnualPlan: jest.fn() }))
jest.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }))
jest.mock('../../../hooks/useGoalCardModel', () => () => ({}))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))

jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'area-1' }),
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams(''), jest.fn()],
  Link: ({ children }) => <span>{children}</span>
}))

// GoalDialog is replaced by a prop recorder. The assertion target is the props
// FocusAreaView passes it, not anything the dialog renders.
const dialogProps = []
jest.mock('../GoalDialog', () => (props) => {
  dialogProps.push(props)
  return null
})

// GoalCard is replaced by the two ladder affordances under test, so the test
// drives the same callbacks the real card invokes.
jest.mock('../GoalCard', () => ({ goal, onAddMilestone, onEdit }) => (
  <div>
    <button type='button' onClick={() => onAddMilestone(goal)}>
      add-milestone-{goal._id}
    </button>
    <button type='button' onClick={() => onEdit(goal)}>
      edit-{goal._id}
    </button>
  </div>
))

jest.mock('../GoalRow', () => () => null)
jest.mock('../PriorityDialog', () => () => null)
jest.mock('../PriorityList', () => () => null)
jest.mock('../CloseQuarterModal', () => () => null)
jest.mock('../goal/GoalDetailDrawer', () => () => null)
jest.mock('../../Common/DeleteConfirmationModal', () => () => null)

import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import FocusAreaView from '../FocusAreaView'
import { useAnnualPlan } from '../../../hooks/useAnnualPlan'
import { annualPlanningService } from '../../../api/services'

// 2026-07-20 is in Q3, so a quarter-3 goal renders under the default filter.
const FIXED_NOW = new Date('2026-07-20T12:00:00')

const AREA = { _id: 'area-1', name: 'Health', color: '#4caf50' }

// Rung 5 fires only for a goal with no milestones — the case the prompt exists for.
const GOAL = {
  _id: 'goal-1',
  title: 'Increase muscle mass',
  type: 'quarterly',
  quarter: 3,
  focus_area_id: 'area-1',
  milestones: [],
  status: 'in_progress'
}

const renderView = () => {
  useAnnualPlan.mockReturnValue({
    plan: { _id: 'plan-1', year: 2026 },
    goals: [GOAL],
    priorities: [],
    areas: [AREA],
    activities: [],
    loading: false,
    reload: jest.fn()
  })
  return render(<FocusAreaView />)
}

// The quarter-report fetch resolves after mount; flush it so the act() warning
// does not mask a real failure.
const flush = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeAll(() => {
  jest.useFakeTimers()
})
afterAll(() => {
  jest.useRealTimers()
})

beforeEach(() => {
  jest.setSystemTime(FIXED_NOW)
  dialogProps.length = 0
  localStorage.setItem('goals_view_mode', 'grid')
  // CRA sets resetMocks:true, which strips implementations declared in the
  // jest.mock factory before every test. Reinstate them here.
  annualPlanningService.getQuarterReports.mockResolvedValue([])
})

const lastDialogProps = () => dialogProps[dialogProps.length - 1]

describe('FocusAreaView → GoalDialog initialSection wiring (FE-A5)', () => {
  test('passes initialSection="milestones" when the card asks for a first milestone', async () => {
    renderView()
    await flush()

    fireEvent.click(screen.getByText('add-milestone-goal-1'))

    const props = lastDialogProps()
    expect(props.open).toBe(true)
    expect(props.goal).toEqual(GOAL)
    // The defect: FocusAreaView opened the dialog with no section at all, so the
    // milestone group stayed collapsed and rung 5 was inert on this page.
    expect(props.initialSection).toBe('milestones')
  })

  test('passes initialSection=null when the card asks for a plain edit', async () => {
    renderView()
    await flush()

    fireEvent.click(screen.getByText('edit-goal-1'))

    const props = lastDialogProps()
    expect(props.open).toBe(true)
    expect(props.initialSection).toBeNull()
  })

  test('does not leak "milestones" from a previous rung-5 open into a later edit', async () => {
    renderView()
    await flush()

    fireEvent.click(screen.getByText('add-milestone-goal-1'))
    expect(lastDialogProps().initialSection).toBe('milestones')

    fireEvent.click(screen.getByText('edit-goal-1'))
    expect(lastDialogProps().initialSection).toBeNull()
  })

  test('always supplies the prop, so the dialog never sees undefined', async () => {
    renderView()
    await flush()

    expect(lastDialogProps()).toHaveProperty('initialSection')
    expect(lastDialogProps().initialSection).not.toBeUndefined()
  })
})
