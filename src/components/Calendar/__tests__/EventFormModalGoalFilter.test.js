/**
 * Habit creation may only attach to a goal that can still take one.
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
  annualPlanningService: { createActivity: jest.fn() }
}))
jest.mock('../../../hooks/useAnnualPlan', () => ({
  useAnnualPlan: () => ({ plan: { _id: 'p1' }, areas: [], goals: mockGoals, loading: false })
}))

/**
 * Render the modal and switch it to the habit type, where the goal picker lives.
 * Joy renders a Chip's label as a span and its click target as a separate
 * overlay button, so the label itself is not clickable — reach the button
 * through the chip root or the type never changes and every assertion below
 * passes vacuously.
 */
const renderHabitForm = () => {
  const EventFormModal = require('../EventFormModal').default
  const utils = render(<EventFormModal open={true} onClose={jest.fn()} onSuccess={jest.fn()} mode='create' />)
  const chip = screen.getByText('calendarModal.form.types.activity').closest('.MuiChip-root')
  fireEvent.click(chip.querySelector('button'))
  return utils
}

const goal = (over) => ({ _id: 'g1', title: 'Active goal', status: 'in_progress', progress: 20, milestones: [], ...over })

describe('EventFormModal — habit goal picker only offers active goals', () => {
  beforeEach(() => {
    mockGoals = []
  })

  it('offers a goal that is neither completed nor at 100%', () => {
    mockGoals = [goal()]
    renderHabitForm()
    expect(screen.queryByText('calendarModal.form.noActiveGoals')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows the empty state when the only goal has status completed', () => {
    mockGoals = [goal({ status: 'completed' })]
    renderHabitForm()
    expect(screen.getByText('calendarModal.form.noActiveGoals')).toBeInTheDocument()
  })

  it('treats a goal at 100% stored progress as completed', () => {
    mockGoals = [goal({ progress: 100 })]
    renderHabitForm()
    expect(screen.getByText('calendarModal.form.noActiveGoals')).toBeInTheDocument()
  })

  it('treats a goal with every milestone done as completed, via calculateProgress', () => {
    mockGoals = [goal({ progress: 0, milestones: [{ completed: true }, { completed: true }] })]
    renderHabitForm()
    expect(screen.getByText('calendarModal.form.noActiveGoals')).toBeInTheDocument()
  })

  it('keeps a goal whose milestones are only partly done', () => {
    mockGoals = [goal({ progress: 0, milestones: [{ completed: true }, { completed: false }] })]
    renderHabitForm()
    expect(screen.queryByText('calendarModal.form.noActiveGoals')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows the empty state when there are no goals at all', () => {
    mockGoals = []
    renderHabitForm()
    expect(screen.getByText('calendarModal.form.noActiveGoals')).toBeInTheDocument()
  })
})
