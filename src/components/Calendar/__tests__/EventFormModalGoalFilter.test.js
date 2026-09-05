/**
 * Milestone creation may only attach to a goal that can still take one.
 * (This rule guarded the habit type until CAL-003 / ADR-017 replaced Habit
 * with Milestone in the form; the picker and the rule are the same.)
 *
 * `calendarModal.form.noActiveGoals` shipped in the en bundle long before any
 * code referenced it, so the picker offered completed goals and the string sat
 * unused. These tests pin both halves of that fix, and they exercise the real
 * `goalDerivation.calculateProgress` rather than restating its formula — a
 * mirrored rule would keep passing if the shared helper changed underneath it.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

let mockGoals = []

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k })
}))
jest.mock('../../../api/services/tasks.service', () => ({
  tasksService: { create: jest.fn(), update: jest.fn() }
}))
jest.mock('../../../api/services/annualPlanning.service', () => ({
  annualPlanningService: { createMilestone: jest.fn() }
}))
jest.mock('../../../hooks/useAnnualPlan', () => ({
  useAnnualPlan: () => ({ plan: { _id: 'p1' }, areas: [], goals: mockGoals, loading: false })
}))

/** Render the modal and switch it to the milestone type, where the goal picker lives. */
const renderMilestoneForm = () => {
  const EventFormModal = require('../EventFormModal').default
  const utils = render(<EventFormModal open={true} onClose={jest.fn()} onSuccess={jest.fn()} mode='create' />)
  fireEvent.click(screen.getByRole('button', { name: 'calendarModal.form.types.milestone' }))
  return utils
}

const goal = (over) => ({ _id: 'g1', title: 'Active goal', status: 'in_progress', progress: 20, milestones: [], ...over })

describe('EventFormModal — milestone goal picker only offers open goals', () => {
  beforeEach(() => {
    mockGoals = []
  })

  it('offers a goal that is neither completed nor at 100%', () => {
    mockGoals = [goal()]
    renderMilestoneForm()
    expect(screen.queryByText('calendarModal.form.noActiveGoals')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows the empty state when the only goal has status completed', () => {
    mockGoals = [goal({ status: 'completed' })]
    renderMilestoneForm()
    expect(screen.getByText('calendarModal.form.noActiveGoals')).toBeInTheDocument()
  })

  it('treats a goal at 100% stored progress as completed', () => {
    mockGoals = [goal({ progress: 100 })]
    renderMilestoneForm()
    expect(screen.getByText('calendarModal.form.noActiveGoals')).toBeInTheDocument()
  })

  it('treats a goal with every milestone done as completed, via calculateProgress', () => {
    mockGoals = [goal({ progress: 0, milestones: [{ completed: true }, { completed: true }] })]
    renderMilestoneForm()
    expect(screen.getByText('calendarModal.form.noActiveGoals')).toBeInTheDocument()
  })

  it('keeps a goal whose milestones are only partly done', () => {
    mockGoals = [goal({ progress: 0, milestones: [{ completed: true }, { completed: false }] })]
    renderMilestoneForm()
    expect(screen.queryByText('calendarModal.form.noActiveGoals')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows the empty state when there are no goals at all', () => {
    mockGoals = []
    renderMilestoneForm()
    expect(screen.getByText('calendarModal.form.noActiveGoals')).toBeInTheDocument()
  })
})
