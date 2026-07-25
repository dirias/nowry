/**
 * Phase 25 Plan 03 — GoalRowList tests (GOAL-01..GOAL-04).
 * Behaviors 1-5 (Task 1): dual status chips, Milestones toggle button,
 * vertical Stepper reveal + milestone toggle click, lock gating, Edit/Delete aria-labels.
 * Behaviors 6-11 (Task 2): Activities AccordionGroup — collapsed summary/count,
 * expand-click fetch trigger, Skeleton/populated/empty/error states (D-09/D-10/D-11).
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

const GoalRowList = require('../GoalRowList').default

const baseGoal = {
  _id: 'g1',
  title: 'Test goal',
  status: 'not_started',
  progress: 0,
  type: 'quarterly',
  quarter: 1,
  milestones: [
    { title: 'M1', completed: true },
    { title: 'M2', completed: false }
  ]
}

const makeProps = (overrides = {}) => ({
  goal: baseGoal,
  area: null,
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
  getStatusConfig: (status) => ({ label: `annualPlanning.goal.status.${status}`, color: 'neutral', icon: '⭕' }),
  getHealthStatus: () => 'on_track',
  ...overrides
})

describe('Phase 25 GOAL-01/D-01: dual status chips', () => {
  it('Test 1: renders lifecycle chip AND separate health-status chip simultaneously', () => {
    render(<GoalRowList {...makeProps()} />)
    expect(screen.getByText('annualPlanning.goal.status.not_started')).toBeInTheDocument()
    expect(screen.getByText('annualPlanning.goal.healthStatus.onTrack')).toBeInTheDocument()
  })
})

describe('Phase 25 GOAL-04: Milestones toggle + vertical Stepper', () => {
  it('Test 2: collapsed — renders Milestones toggle button, no Stepper; click calls handleToggleMilestones(goal._id)', () => {
    const props = makeProps()
    render(<GoalRowList {...props} />)
    const toggle = screen.getByText('annualPlanning.milestone.label:{"completed":1,"total":2}')
    // Stepper hidden: milestone titles not rendered
    expect(screen.queryByText('M1')).not.toBeInTheDocument()
    expect(screen.queryByText('M2')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(props.handleToggleMilestones).toHaveBeenCalledTimes(1)
    expect(props.handleToggleMilestones).toHaveBeenCalledWith('g1')
  })

  it('Test 3: expanded — renders Stepper with 2 steps; clicking incomplete milestone calls handleToggleMilestone(goal, 1)', () => {
    const props = makeProps({ expandedMilestones: new Set(['g1']) })
    render(<GoalRowList {...props} />)
    expect(screen.getByText('M1')).toBeInTheDocument()
    expect(screen.getByText('M2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'M2' }))
    expect(props.handleToggleMilestone).toHaveBeenCalledTimes(1)
    expect(props.handleToggleMilestone).toHaveBeenCalledWith(baseGoal, 1)
  })

  it('Test 4: expanded + isQuarterClosed — clicking incomplete milestone does NOT call handleToggleMilestone', () => {
    const props = makeProps({ expandedMilestones: new Set(['g1']), isQuarterClosed: true })
    render(<GoalRowList {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'M2' }))
    expect(props.handleToggleMilestone).not.toHaveBeenCalled()
  })
})

describe('Phase 25 a11y: Edit/Delete IconButton aria-labels', () => {
  it('Test 5: Edit and Delete IconButtons have translated aria-labels', () => {
    render(<GoalRowList {...makeProps()} />)
    expect(screen.getByLabelText('annualPlanning.goal.edit')).toBeInTheDocument()
    expect(screen.getByLabelText('annualPlanning.goal.delete')).toBeInTheDocument()
  })
})

describe('Phase 25 D-09/D-10/D-11: Activities AccordionGroup', () => {
  const getActivitiesSummary = () => screen.getByRole('button', { name: /annualPlanning\.goal\.activities/ })

  it('Test 6: not expanded — Accordion renders collapsed with activities label and (0) count', () => {
    render(<GoalRowList {...makeProps()} />)
    const summary = getActivitiesSummary()
    expect(summary).toHaveAttribute('aria-expanded', 'false')
    expect(summary.textContent).toContain('annualPlanning.goal.activities')
    expect(summary.textContent).toContain('(0)')
  })

  it('Test 7: clicking the AccordionSummary calls handleToggleExpand(goal._id) exactly once', () => {
    const props = makeProps()
    render(<GoalRowList {...props} />)
    fireEvent.click(getActivitiesSummary())
    expect(props.handleToggleExpand).toHaveBeenCalledTimes(1)
    expect(props.handleToggleExpand).toHaveBeenCalledWith('g1')
  })

  it('Test 8: expanded + activities undefined (not yet fetched) — renders a Skeleton', () => {
    const { container } = render(<GoalRowList {...makeProps({ expandedGoals: new Set(['g1']), goalActivities: {} })} />)
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument()
  })

  it('Test 9: expanded + populated activities — renders the activity title', () => {
    const goalActivities = {
      g1: [{ _id: 'a1', title: 'Morning run', frequency: 'daily', created_at: '2026-01-01T00:00:00Z' }]
    }
    render(<GoalRowList {...makeProps({ expandedGoals: new Set(['g1']), goalActivities })} />)
    expect(screen.getByText('Morning run')).toBeInTheDocument()
  })

  it('Test 10: expanded + fetched-and-empty — renders the noActivities message', () => {
    render(<GoalRowList {...makeProps({ expandedGoals: new Set(['g1']), goalActivities: { g1: [] } })} />)
    expect(screen.getByText('annualPlanning.goal.noActivities')).toBeInTheDocument()
  })

  it('Test 11: expanded + fetch failed (null) — renders error message, no Skeleton, no noActivities', () => {
    const { container } = render(<GoalRowList {...makeProps({ expandedGoals: new Set(['g1']), goalActivities: { g1: null } })} />)
    expect(screen.getByText('annualPlanning.goal.activitiesError')).toBeInTheDocument()
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeInTheDocument()
    expect(screen.queryByText('annualPlanning.goal.noActivities')).not.toBeInTheDocument()
  })
})
