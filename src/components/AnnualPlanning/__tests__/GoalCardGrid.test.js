/**
 * Phase 25 Plan 02 — GoalCardGrid tests (GOAL-01..GOAL-04).
 * Behaviors 1-6 (Task 1): dual status chips (D-01), milestone Stepper with
 * any-order toggle (D-12) and lock gating (D-14/D-15), i18n'd progress label,
 * Edit/Delete aria-labels.
 * Behaviors 7-12 (Task 2): controlled Activities accordion (D-09/D-10/D-11) —
 * collapsed summary, expand-click wiring, fetching/populated/empty/error states.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

const GoalCardGrid = require('../GoalCardGrid').default

const baseGoal = {
  _id: 'g1',
  title: 'Test goal',
  status: 'in_progress',
  progress: 50,
  milestones: [
    { title: 'M1', completed: true },
    { title: 'M2', completed: false }
  ],
  type: 'quarterly',
  quarter: 1
}

const makeProps = (overrides = {}) => ({
  goal: baseGoal,
  area: { _id: 'a1', name: 'Health', color: '#4caf50' },
  isQuarterClosed: false,
  expandedMilestones: new Set(),
  expandedGoals: new Set(),
  goalActivities: {},
  handleStatusChange: jest.fn(),
  handleEditGoal: jest.fn(),
  handleDeleteGoal: jest.fn(),
  handleToggleMilestones: jest.fn(),
  handleToggleMilestone: jest.fn(),
  handleToggleExpand: jest.fn(),
  calculateProgress: () => 50,
  getStatusConfig: (status) => ({ label: `annualPlanning.goal.status.${status}`, color: 'warning', icon: '🔄' }),
  getHealthStatus: () => 'behind',
  ...overrides
})

describe('Phase 25 GOAL-01/GOAL-02: dual status chips', () => {
  it('Test 1: renders lifecycle chip AND separate health-status chip simultaneously (D-01)', () => {
    render(<GoalCardGrid {...makeProps()} />)
    expect(screen.getByText('annualPlanning.goal.status.in_progress')).toBeInTheDocument()
    expect(screen.getByText('annualPlanning.goal.healthStatus.behind')).toBeInTheDocument()
  })
})

describe('Phase 25 GOAL-03: milestone Stepper toggle behavior', () => {
  it('Test 2: expanded Stepper renders both milestones; clicking incomplete milestone calls handleToggleMilestone(goal, 1)', () => {
    const props = makeProps({ expandedMilestones: new Set([baseGoal._id]) })
    render(<GoalCardGrid {...props} />)
    expect(screen.getByLabelText('M1')).toBeInTheDocument()
    const m2 = screen.getByLabelText('M2')
    fireEvent.click(m2)
    expect(props.handleToggleMilestone).toHaveBeenCalledTimes(1)
    expect(props.handleToggleMilestone).toHaveBeenCalledWith(baseGoal, 1)
  })

  it('Test 3: isQuarterClosed=true locks milestones — click does NOT call handleToggleMilestone', () => {
    const props = makeProps({ expandedMilestones: new Set([baseGoal._id]), isQuarterClosed: true })
    render(<GoalCardGrid {...props} />)
    fireEvent.click(screen.getByLabelText('M2'))
    expect(props.handleToggleMilestone).not.toHaveBeenCalled()
  })

  it('Test 4: completed milestone 0 is clickable when unlocked — no sequential-order enforcement (D-12)', () => {
    const props = makeProps({ expandedMilestones: new Set([baseGoal._id]) })
    render(<GoalCardGrid {...props} />)
    fireEvent.click(screen.getByLabelText('M1'))
    expect(props.handleToggleMilestone).toHaveBeenCalledTimes(1)
    expect(props.handleToggleMilestone).toHaveBeenCalledWith(baseGoal, 0)
  })
})

describe('Phase 25 GOAL-01: i18n and accessibility fixes', () => {
  it('Test 5: progress label uses the percentComplete i18n key, never the raw "% Complete" literal', () => {
    render(<GoalCardGrid {...makeProps()} />)
    expect(screen.getByText('annualPlanning.goal.percentComplete:{"percent":50}')).toBeInTheDocument()
    expect(screen.queryByText(/% Complete/)).not.toBeInTheDocument()
  })

  it('Test 6: Edit and Delete IconButtons expose translated aria-labels', () => {
    render(<GoalCardGrid {...makeProps()} />)
    expect(screen.getByLabelText('annualPlanning.goal.edit')).toBeInTheDocument()
    expect(screen.getByLabelText('annualPlanning.goal.delete')).toBeInTheDocument()
  })
})

describe('Phase 25 GOAL-04: Activities accordion (D-09/D-10/D-11)', () => {
  it('Test 7: collapsed accordion renders the summary with a (0) count', () => {
    render(<GoalCardGrid {...makeProps()} />)
    expect(screen.getByText('annualPlanning.goal.activities (0)')).toBeInTheDocument()
  })

  it('Test 8: clicking the AccordionSummary calls handleToggleExpand(goal._id) exactly once', () => {
    const props = makeProps()
    render(<GoalCardGrid {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /annualPlanning\.goal\.activities/ }))
    expect(props.handleToggleExpand).toHaveBeenCalledTimes(1)
    expect(props.handleToggleExpand).toHaveBeenCalledWith(baseGoal._id)
  })

  it('Test 9: expanded + activities undefined (still fetching) renders a Skeleton', () => {
    const props = makeProps({ expandedGoals: new Set([baseGoal._id]), goalActivities: {} })
    render(<GoalCardGrid {...props} />)
    expect(screen.getByTestId('activities-loading')).toBeInTheDocument()
  })

  it('Test 10: expanded + populated activities renders title and translated frequency', () => {
    const props = makeProps({
      expandedGoals: new Set([baseGoal._id]),
      goalActivities: {
        [baseGoal._id]: [{ _id: 'a1', title: 'Morning run', frequency: 'daily', created_at: '2026-01-01T00:00:00Z' }]
      }
    })
    render(<GoalCardGrid {...props} />)
    expect(screen.getByText('Morning run')).toBeInTheDocument()
    expect(
      screen.getByText(/annualPlanning\.activity\.frequencies\.daily:\{"defaultValue":"daily"\}/)
    ).toBeInTheDocument()
  })

  it('Test 11: expanded + empty activities array renders the noActivities message', () => {
    const props = makeProps({ expandedGoals: new Set([baseGoal._id]), goalActivities: { [baseGoal._id]: [] } })
    render(<GoalCardGrid {...props} />)
    expect(screen.getByText('annualPlanning.goal.noActivities')).toBeInTheDocument()
  })

  it('Test 12: expanded + null activities (fetch failed) renders the error message, not Skeleton or empty state', () => {
    const props = makeProps({ expandedGoals: new Set([baseGoal._id]), goalActivities: { [baseGoal._id]: null } })
    render(<GoalCardGrid {...props} />)
    expect(screen.getByText('annualPlanning.goal.activitiesError')).toBeInTheDocument()
    expect(screen.queryByTestId('activities-loading')).not.toBeInTheDocument()
    expect(screen.queryByText('annualPlanning.goal.noActivities')).not.toBeInTheDocument()
  })
})
