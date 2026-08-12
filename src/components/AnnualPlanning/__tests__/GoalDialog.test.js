/**
 * FE-A4 — GoalDialog, title-first (goal-form-redesign UX-CONTRACT §3, §5, §7).
 *
 * The properties worth pinning at this level are compositional: what the form
 * shows when nobody has asked for anything, that opening it costs no network
 * request, and that the goal card's next-action rung 5 still lands the cursor
 * in an empty milestone row now that the form opens collapsed.
 */
jest.mock('../../../api/services', () => ({
  annualPlanningService: { createGoal: jest.fn(), updateGoal: jest.fn(), getActivities: jest.fn() }
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k),
    i18n: { language: 'en' }
  })
}))

import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import GoalDialog from '../GoalDialog'
import { annualPlanningService } from '../../../api/services'

const QUARTERLY_CONTEXT = { type: 'quarterly', quarter: 3 }

const open = (props = {}) =>
  render(<GoalDialog open onClose={jest.fn()} focusAreaId='area-1' onSuccess={jest.fn()} goal={QUARTERLY_CONTEXT} {...props} />)

// Joy's Modal runs a recurring interval, so runAllTimers never terminates.
// Advancing past the longest deferred effect (the 100ms scroll) is enough.
const runTimers = () => act(() => void jest.advanceTimersByTime(250))
const chipNames = () =>
  screen
    .getByRole('group', { name: 'annualPlanning.goal.detailRailAria' })
    .querySelectorAll('button')
const textboxes = () => screen.queryAllByRole('textbox')

beforeEach(() => {
  jest.useFakeTimers()
  // jsdom does not implement scrollIntoView; without a stub it throws inside
  // the deferred effect and the failure cascades into unrelated assertions.
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  annualPlanningService.createGoal.mockResolvedValue({ _id: 'g-new' })
  annualPlanningService.updateGoal.mockResolvedValue({ _id: 'g1' })
})
afterEach(() => {
  jest.useRealTimers()
})

describe('at rest (§3.1)', () => {
  it('shows a scope chip, the title field, the rail and the footer — and nothing else', () => {
    open()

    expect(screen.getByText('annualPlanning.goal.scopeQuarterly:{"quarter":3}')).toBeInTheDocument()
    expect(screen.getByText('annualPlanning.goal.title')).toBeInTheDocument()
    expect(chipNames()).toHaveLength(5)

    // None of the four optional groups is mounted.
    expect(screen.queryByText('annualPlanning.goal.keyResultsTitle')).toBeNull()
    expect(screen.queryByText('annualPlanning.goal.description')).toBeNull()
    expect(screen.queryByText('annualPlanning.goal.targetDate')).toBeNull()
    expect(screen.queryByText('annualPlanning.goal.imageUrl')).toBeNull()
  })

  it('issues no network request on open, in either mode', () => {
    open()
    open({ goal: { _id: 'g1', title: 'Existing', milestones: [] } })

    expect(annualPlanningService.getActivities).not.toHaveBeenCalled()
    expect(annualPlanningService.createGoal).not.toHaveBeenCalled()
    expect(annualPlanningService.updateGoal).not.toHaveBeenCalled()
  })

  it('renders the timeframe Select at rest on the context-free Add path', () => {
    open({ goal: null })
    expect(screen.getByText('annualPlanning.goal.timeframeQuestion')).toBeInTheDocument()
    // The scope chip is the alternative to it, never a sibling.
    expect(screen.queryByText('annualPlanning.goal.scopeYearly')).toBeNull()
  })

  it('focuses the title when no section was requested', () => {
    open()
    expect(document.activeElement).toBe(screen.getByPlaceholderText('annualPlanning.goal.titlePlaceholder'))
  })
})

describe('progressive disclosure', () => {
  it('reveals a group when its chip is used, and removes that chip', () => {
    open()
    fireEvent.click(screen.getByText('annualPlanning.goal.addDescription'))

    expect(screen.getByText('annualPlanning.goal.description')).toBeInTheDocument()
    expect(chipNames()).toHaveLength(4)
    expect(screen.queryByText('annualPlanning.goal.addDescription')).toBeNull()
  })

  it('moves focus into the revealed group rather than dropping it on <body>', () => {
    open()
    fireEvent.click(screen.getByText('annualPlanning.goal.addDescription'))
    runTimers()
    expect(document.activeElement).toBe(screen.getByPlaceholderText('annualPlanning.goal.descriptionPlaceholder'))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('unmounts the rail entirely once every group is revealed', () => {
    open()
    ;['addMilestones', 'addDescription', 'addTargetDate', 'addImage', 'changeTimeframe'].forEach((chip) =>
      fireEvent.click(screen.getByText(`annualPlanning.goal.${chip}`))
    )
    expect(screen.queryByRole('group', { name: 'annualPlanning.goal.detailRailAria' })).toBeNull()
  })

  it('opens an edit form with the groups the goal already has content for', () => {
    open({ goal: { _id: 'g1', title: 'T', description: 'why', milestones: [{ title: 'm', completed: false }] } })

    expect(screen.getByText('annualPlanning.goal.keyResultsTitle')).toBeInTheDocument()
    expect(screen.getByText('annualPlanning.goal.description')).toBeInTheDocument()
    // Only target date and image remain to offer.
    expect(chipNames()).toHaveLength(2)
  })
})

describe('ladder rung 5 — initialSection="milestones" (§5.1)', () => {
  it('reveals the group, seeds a blank row and puts the cursor in it, not the title', () => {
    open({ goal: { _id: 'g1', title: 'Increase muscle mass', milestones: [] }, initialSection: 'milestones' })
    runTimers()

    expect(screen.getByText('annualPlanning.goal.keyResultsTitle')).toBeInTheDocument()

    const milestoneInput = screen.getByPlaceholderText('annualPlanning.goal.milestonePlaceholder')
    expect(milestoneInput).toBeInTheDocument()
    expect(milestoneInput.value).toBe('')
    expect(document.activeElement).toBe(milestoneInput)
    expect(document.activeElement).not.toBe(screen.getByPlaceholderText('annualPlanning.goal.titlePlaceholder'))
  })

  it('scrolls the milestone section into view', () => {
    open({ goal: { _id: 'g1', title: 'T', milestones: [] }, initialSection: 'milestones' })
    runTimers()

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('leaves an existing milestone list alone when the card data was stale', () => {
    open({ goal: { _id: 'g1', title: 'T', milestones: [{ title: 'existing', completed: false }] }, initialSection: 'milestones' })
    runTimers()

    const inputs = screen.getAllByPlaceholderText('annualPlanning.goal.milestonePlaceholder')
    expect(inputs).toHaveLength(1)
    expect(inputs[0].value).toBe('existing')
  })
})

describe('validation (§7.2)', () => {
  it('explains an empty-title Save, focuses the title and fires no request', () => {
    open()
    fireEvent.click(screen.getByText('annualPlanning.goal.saveGoal'))
    runTimers()

    expect(screen.getByText('annualPlanning.goal.titleRequired')).toBeInTheDocument()
    expect(annualPlanningService.createGoal).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByPlaceholderText('annualPlanning.goal.titlePlaceholder'))
  })

  it('marks the input invalid and points it at the reason', () => {
    open()
    fireEvent.click(screen.getByText('annualPlanning.goal.saveGoal'))

    const input = screen.getByPlaceholderText('annualPlanning.goal.titlePlaceholder')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy)).toHaveTextContent('annualPlanning.goal.titleRequired')
  })

  it('clears the error as soon as the title is typed in', () => {
    open()
    fireEvent.click(screen.getByText('annualPlanning.goal.saveGoal'))
    expect(screen.getByText('annualPlanning.goal.titleRequired')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('annualPlanning.goal.titlePlaceholder'), { target: { value: 'M' } })
    expect(screen.queryByText('annualPlanning.goal.titleRequired')).toBeNull()
  })

  it('never disables Save for validation reasons', () => {
    open()
    expect(screen.getByText('annualPlanning.goal.saveGoal').closest('button')).not.toBeDisabled()
  })
})

describe('save', () => {
  it('creates a goal from a title alone — two interactions', async () => {
    const onSuccess = jest.fn()
    const onClose = jest.fn()
    render(
      <GoalDialog open onClose={onClose} focusAreaId='area-1' onSuccess={onSuccess} goal={QUARTERLY_CONTEXT} />
    )

    fireEvent.change(screen.getByPlaceholderText('annualPlanning.goal.titlePlaceholder'), {
      target: { value: 'Increase muscle mass' }
    })
    await act(async () => {
      fireEvent.click(screen.getByText('annualPlanning.goal.saveGoal'))
    })

    expect(annualPlanningService.createGoal).toHaveBeenCalledTimes(1)
    expect(annualPlanningService.createGoal.mock.calls[0][0].title).toBe('Increase muscle mass')
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('keeps the modal open with input preserved when the save fails', async () => {
    annualPlanningService.createGoal.mockRejectedValue({ response: { data: { detail: 'server said no' } } })
    const onClose = jest.fn()
    render(<GoalDialog open onClose={onClose} focusAreaId='area-1' onSuccess={jest.fn()} goal={QUARTERLY_CONTEXT} />)

    fireEvent.change(screen.getByPlaceholderText('annualPlanning.goal.titlePlaceholder'), { target: { value: 'T' } })
    await act(async () => {
      fireEvent.click(screen.getByText('annualPlanning.goal.saveGoal'))
    })

    expect(screen.getByRole('alert')).toHaveTextContent('server said no')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('annualPlanning.goal.titlePlaceholder').value).toBe('T')
  })
})
