/**
 * Phase 17 — EventFormModal tests (MOB-03): smoke tests at open=true/false.
 * CAL-003 (ADR-017) — the form on the shared sheet: one segmented type object
 * (Milestone in, Habit out), title first, an action named after what it makes
 * that is never disabled and fails loudly, the milestone payload, and the
 * edit-mode subtitle.
 */
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k })
}))
jest.mock('../../../api/services/tasks.service', () => ({
  tasksService: { create: jest.fn(), update: jest.fn() }
}))
jest.mock('../../../api/services/annualPlanning.service', () => ({
  annualPlanningService: {
    createPriority: jest.fn(),
    updatePriority: jest.fn(),
    createGoal: jest.fn(),
    updateGoal: jest.fn(),
    createMilestone: jest.fn(),
    createActivity: jest.fn(),
    updateActivity: jest.fn()
  }
}))
let mockPlan = {
  plan: { _id: 'plan-1' },
  areas: [{ _id: 'a1', name: 'Health' }],
  goals: [{ _id: 'g1', title: 'Run a half marathon', status: 'in_progress', progress: 20, milestones: [] }],
  loading: false
}
jest.mock('../../../hooks/useAnnualPlan', () => ({
  useAnnualPlan: () => mockPlan
}))

const { tasksService } = require('../../../api/services/tasks.service')
const { annualPlanningService } = require('../../../api/services/annualPlanning.service')

const open = (props = {}) => {
  const EventFormModal = require('../EventFormModal').default
  return render(<EventFormModal open onClose={jest.fn()} onSuccess={jest.fn()} mode='create' {...props} />)
}

const segment = (type) => screen.getByRole('button', { name: `calendarModal.form.types.${type}` })
const primary = (type) => screen.getByRole('button', { name: `calendarModal.form.addAction.${type}` })

describe('Phase 17 MOB-03: EventFormModal smoke tests', () => {
  it('renders without crashing when open=true', () => {
    expect(() => open()).not.toThrow()
  })

  it('renders without crashing when open=false', () => {
    const EventFormModal = require('../EventFormModal').default
    expect(() => render(<EventFormModal open={false} onClose={jest.fn()} onSuccess={jest.fn()} mode='create' />)).not.toThrow()
  })
})

describe('CAL-003: the type object', () => {
  beforeEach(() => jest.clearAllMocks())

  it('offers Task, Priority, Goal and Milestone as pressed segments, and no Habit', () => {
    open()
    ;['task', 'priority', 'goal', 'milestone'].forEach((type) =>
      expect(segment(type)).toHaveAttribute('aria-pressed', type === 'task' ? 'true' : 'false')
    )
    expect(screen.queryByRole('button', { name: 'calendarModal.form.types.activity' })).toBeNull()
  })

  it('sits on the shared sheet, with a close control', () => {
    open()
    expect(screen.getByRole('button', { name: 'common.close' })).toBeInTheDocument()
    expect(screen.getByText('calendarModal.form.addTitle')).toBeInTheDocument()
  })

  it('names the primary action after the chosen type', () => {
    open()
    expect(primary('task')).toBeInTheDocument()
    fireEvent.click(segment('milestone'))
    expect(primary('milestone')).toBeInTheDocument()
    expect(primary('milestone')).not.toBeDisabled()
  })

  it('puts the title before the picker a type needs', () => {
    open()
    fireEvent.click(segment('goal'))
    const title = screen.getByLabelText(/calendarModal.form.title/)
    const picker = screen.getByRole('combobox')
    expect(title.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('CAL-003: loud failure instead of a disabled button', () => {
  beforeEach(() => jest.clearAllMocks())

  it('pressing Add with an empty title calls nothing and explains under the field', async () => {
    open()
    await act(async () => {
      fireEvent.click(primary('task'))
    })
    expect(tasksService.create).not.toHaveBeenCalled()
    expect(screen.getByText('calendarModal.form.titleRequired')).toBeInTheDocument()
    expect(screen.getByLabelText(/calendarModal.form.title/)).toHaveFocus()
  })

  it('a goal without a focus area errors under the picker, not on the button', async () => {
    open()
    fireEvent.click(segment('goal'))
    fireEvent.change(screen.getByLabelText(/calendarModal.form.title/), { target: { value: 'Read more' } })
    await act(async () => {
      fireEvent.click(primary('goal'))
    })
    expect(annualPlanningService.createGoal).not.toHaveBeenCalled()
    expect(screen.getByText('form.requiredField')).toBeInTheDocument()
  })

  it('a rejected request shows the banner and keeps the form', async () => {
    tasksService.create.mockRejectedValue(new Error('offline'))
    open()
    fireEvent.change(screen.getByLabelText(/calendarModal.form.title/), { target: { value: 'Buy stamps' } })
    await act(async () => {
      fireEvent.click(primary('task'))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('calendarModal.form.saveErrorTitle')
    expect(screen.getByDisplayValue('Buy stamps')).toBeInTheDocument()
  })
})

describe('CAL-003: what each type sends', () => {
  beforeEach(() => jest.clearAllMocks())

  it('a task sends its title and the prefilled date', async () => {
    tasksService.create.mockResolvedValue({})
    const onSuccess = jest.fn()
    open({ defaultDate: new Date(2026, 8, 5), onSuccess })
    fireEvent.change(screen.getByLabelText(/calendarModal.form.title/), { target: { value: 'Buy stamps' } })
    await act(async () => {
      fireEvent.click(primary('task'))
    })
    expect(tasksService.create).toHaveBeenCalledWith({ title: 'Buy stamps', deadline: '2026-09-05' })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('a milestone goes to its goal with the key-result flag once the chip is used', async () => {
    annualPlanningService.createMilestone.mockResolvedValue({})
    open({ defaultDate: new Date(2026, 8, 12) })
    fireEvent.click(segment('milestone'))
    fireEvent.change(screen.getByLabelText(/calendarModal.form.title/), { target: { value: 'Week 4 long run' } })
    // Joy's Select opens a listbox; pick the goal through it.
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: 'Run a half marathon' }))
    fireEvent.click(screen.getByRole('button', { name: 'calendarModal.form.markKeyResult' }))
    expect(screen.getByRole('checkbox')).toBeChecked()
    await act(async () => {
      fireEvent.click(primary('milestone'))
    })
    expect(annualPlanningService.createMilestone).toHaveBeenCalledWith('g1', {
      title: 'Week 4 long run',
      due_date: '2026-09-12',
      is_key_result: true
    })
  })

  it('a priority offers its description as a rail chip, not a permanent field', () => {
    open()
    fireEvent.click(segment('priority'))
    expect(screen.queryByLabelText(/calendarModal.form.description/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'calendarModal.form.addDescription' }))
    expect(screen.getByLabelText(/calendarModal.form.description/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'calendarModal.form.addDescription' })).toBeNull()
  })
})

describe('CAL-003: edit mode', () => {
  beforeEach(() => jest.clearAllMocks())

  it('states the fixed type in the subtitle and shows no type object', () => {
    open({ mode: 'edit', event: { id: 'task-9', type: 'task', title: 'Buy stamps', date: new Date(2026, 8, 5) } })
    expect(screen.queryByRole('group')).toBeNull()
    expect(screen.getByText('calendarModal.form.types.task')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'calendarModal.form.saveChanges' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Buy stamps')).toBeInTheDocument()
  })

  it('a milestone cannot be edited from here and says so', () => {
    open({ mode: 'edit', event: { id: 'milestone-g1-0', type: 'milestone', title: 'Week 4', date: new Date() } })
    expect(screen.getByText('calendarModal.form.milestoneReadOnly')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'calendarModal.form.saveChanges' })).toBeNull()
  })
})
