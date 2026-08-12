/**
 * FE-S3 — FormDisclosureRail (UX-CONTRACT §5.2).
 *
 * A parameterization of the shipped GoalDetailRail. These pin the properties
 * §5.2 says must carry over verbatim, so the goal form's later migration onto
 * this component cannot quietly change its behaviour.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tune as TuneIcon } from '@mui/icons-material'

import { cssFor } from '../__testHelpers__/cssRules'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } })
}))

const FormDisclosureRail = require('../FormDisclosureRail').default

const LABELS = {
  tags: 'cards.addTags',
  deck: 'cards.chooseDeck',
  explanation: 'cards.addExplanation'
}

const renderRail = (props = {}) =>
  render(<FormDisclosureRail available={['tags', 'deck']} labels={LABELS} onReveal={jest.fn()} {...props} />)

describe('FormDisclosureRail', () => {
  it('renders one named chip per available group, in the order given', () => {
    renderRail({ available: ['explanation', 'tags', 'deck'] })
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['cards.addExplanation', 'cards.addTags', 'cards.chooseDeck'])
  })

  it('takes its labels from the caller — nothing goal-specific is left in the file', () => {
    renderRail({ available: ['tags'], labels: { tags: 'books.addTags' } })
    expect(screen.getByRole('button')).toHaveTextContent('books.addTags')
  })

  it('falls back to the group name when a label is missing, rather than rendering an empty chip', () => {
    renderRail({ available: ['mystery'], labels: {} })
    expect(screen.getByRole('button')).toHaveTextContent('mystery')
  })

  it('renders real buttons, not the keyboard-dead clickable Boxes this pattern replaces', () => {
    renderRail({ available: ['tags'] })
    const chip = screen.getByRole('button')
    expect(chip.tagName).toBe('BUTTON')
    expect(chip).not.toHaveAttribute('tabindex', '-1')
  })

  it('uses the visible label as the accessible name — no redundant aria-label', () => {
    renderRail({ available: ['tags'] })
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-label')
    expect(screen.getByRole('button', { name: 'cards.addTags' })).toBeInTheDocument()
  })

  it('groups the chips and names the group through t()', () => {
    renderRail()
    expect(screen.getByRole('group', { name: 'form.detailRailAria' })).toBeInTheDocument()
  })

  it('accepts a surface-specific group label', () => {
    renderRail({ ariaLabelKey: 'decks.railAria' })
    expect(screen.getByRole('group', { name: 'decks.railAria' })).toBeInTheDocument()
  })

  it('reveals only its own group', () => {
    const onReveal = jest.fn()
    renderRail({ onReveal })
    fireEvent.click(screen.getByRole('button', { name: 'cards.chooseDeck' }))
    expect(onReveal).toHaveBeenCalledTimes(1)
    expect(onReveal).toHaveBeenCalledWith('deck')
  })

  it('unmounts entirely once spent — no empty container, no residual margin', () => {
    const { container } = renderRail({ available: [] })
    expect(container).toBeEmptyDOMElement()
  })

  it('unmounts when `available` is omitted altogether', () => {
    const { container } = render(<FormDisclosureRail onReveal={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('takes a per-group icon, so an override chip can read differently from an add chip', () => {
    const { container } = renderRail({
      available: ['timeframe'],
      labels: { timeframe: 'goal.changeTimeframe' },
      icons: { timeframe: TuneIcon }
    })
    expect(container.querySelector('[data-testid="TuneIcon"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="AddIcon"]')).toBeNull()
  })

  it('defaults to the add icon when no override is given', () => {
    const { container } = renderRail({ available: ['tags'] })
    expect(container.querySelector('[data-testid="AddIcon"]')).toBeTruthy()
  })

  // jsdom has no layout, so the rendered height cannot be measured. The
  // declaration that produces a 44px target is asserted instead.
  it('declares a 44px touch target at xs and relaxes it for pointer devices', () => {
    renderRail({ available: ['tags'] })
    expect(cssFor(screen.getByRole('button'))).toContain('min-height:44px')
  })

  it('styles focus-visible explicitly rather than relying on a default Joy resets', () => {
    renderRail({ available: ['tags'] })
    expect(cssFor(screen.getByRole('button'))).toContain('focus-visible')
  })
})
