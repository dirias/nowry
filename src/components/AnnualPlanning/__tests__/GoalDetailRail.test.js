/**
 * FE-A3 — GoalDetailRail (goal-form-redesign UX-CONTRACT §4).
 *
 * The rail is the one genuinely new pattern this phase introduces: grep found
 * no Joy Collapse usage and only one unrelated Accordion consumer, so there was
 * no precedent to follow. These tests pin the properties §4.2 argues for — each
 * chip names its own payload, chips are real focusable buttons rather than the
 * clickable <Box>es this form used to ship, and the rail unmounts entirely once
 * it has been spent.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } })
}))

const GoalDetailRail = require('../goal/GoalDetailRail').default

const ALL = ['milestones', 'description', 'targetDate', 'image', 'timeframe']

describe('GoalDetailRail', () => {
  it('renders one named chip per available group, in the order given', () => {
    render(<GoalDetailRail available={ALL} onReveal={jest.fn()} />)
    const labels = screen.getAllByRole('button').map((b) => b.textContent)
    expect(labels).toEqual([
      'annualPlanning.goal.addMilestones',
      'annualPlanning.goal.addDescription',
      'annualPlanning.goal.addTargetDate',
      'annualPlanning.goal.addImage',
      'annualPlanning.goal.changeTimeframe'
    ])
  })

  it('renders real buttons — not the keyboard-dead clickable Boxes this replaces', () => {
    render(<GoalDetailRail available={['image']} onReveal={jest.fn()} />)
    const chip = screen.getByRole('button')
    expect(chip.tagName).toBe('BUTTON')
    expect(chip).not.toHaveAttribute('tabindex', '-1')
  })

  it('groups the chips under a translated label for screen readers', () => {
    render(<GoalDetailRail available={['image']} onReveal={jest.fn()} />)
    expect(screen.getByRole('group', { name: 'annualPlanning.goal.detailRailAria' })).toBeInTheDocument()
  })

  it('reports the activated group to the parent', () => {
    const onReveal = jest.fn()
    render(<GoalDetailRail available={ALL} onReveal={onReveal} />)
    fireEvent.click(screen.getByText('annualPlanning.goal.addTargetDate'))
    expect(onReveal).toHaveBeenCalledWith('targetDate')
  })

  it('renders nothing at all when every group is revealed', () => {
    const { container } = render(<GoalDetailRail available={[]} onReveal={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('defaults to rendering nothing when given no groups', () => {
    const { container } = render(<GoalDetailRail onReveal={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shrinks as groups are spent', () => {
    const { rerender } = render(<GoalDetailRail available={ALL} onReveal={jest.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(5)

    rerender(<GoalDetailRail available={['image']} onReveal={jest.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('adds no redundant aria-label — the visible text is the accessible name', () => {
    render(<GoalDetailRail available={['milestones']} onReveal={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'annualPlanning.goal.addMilestones' })).toBeInTheDocument()
  })
})
