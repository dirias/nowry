/**
 * FocusBar — Home's band of areas and priorities (PLAN-013, ADR-046 §5).
 *
 * A priority is a flag on a task or a milestone, so flagging is the choice:
 * the band shows the first four flagged open items, deadline first, and offers
 * no picker. The real `watchedPriorities` runs here; only the plan hook is
 * mocked, so the mapping from flagged items to what the user sees is exercised
 * rather than assumed.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts && opts.count !== undefined ? `${k}:${opts.count}` : k) })
}))

let mockPlan
jest.mock('@nowry/core/hooks/useAnnualPlan', () => ({
  __esModule: true,
  default: () => mockPlan,
  useAnnualPlan: () => mockPlan
}))

const FocusBar = require('../FocusBar').default

const inDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const flagged = (id, title, overrides = {}) => ({
  _id: id,
  title,
  is_completed: false,
  deadline: null,
  linked_entity_type: 'task',
  linked_entity_id: id,
  focus_area_id: null,
  ...overrides
})

const areas = [{ _id: 'a1', name: 'Health', color: '#4caf50', progress: 40 }]

const renderBar = (plan) => {
  mockPlan = { focusAreas: areas, goals: [], priorities: [], loading: false, ...plan }
  return render(
    <MemoryRouter>
      <FocusBar />
    </MemoryRouter>
  )
}

describe('the band watches the flag', () => {
  it('shows the first four flagged open items by deadline, and no picker', () => {
    renderBar({
      priorities: [
        flagged('p1', 'No date'),
        flagged('p2', 'In a week', { deadline: inDays(7) }),
        flagged('p3', 'Tomorrow', { deadline: inDays(1) }),
        flagged('p4', 'Done already', { deadline: inDays(2), is_completed: true }),
        flagged('p5', 'In a month', { deadline: inDays(30) }),
        flagged('p6', 'Also no date')
      ]
    })
    const titles = ['Tomorrow', 'In a week', 'In a month', 'No date', 'Also no date', 'Done already'].filter((title) =>
      screen.queryByText(title)
    )
    expect(titles).toEqual(['Tomorrow', 'In a week', 'In a month', 'No date'])
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('focusBar.choosePrioritiesTooltip')).not.toBeInTheDocument()
  })

  it('a flagged milestone links to its goal area; a task links to the Priorities tab', () => {
    renderBar({
      priorities: [
        flagged('m1', 'Week 4', { linked_entity_type: 'milestone', linked_entity_id: 'g1', focus_area_id: 'a1' }),
        flagged('t1', 'Essay')
      ]
    })
    expect(screen.getByText('Week 4').closest('a')).toHaveAttribute('href', '/annual-planning/area/a1')
    expect(screen.getByText('Essay').closest('a')).toHaveAttribute('href', '/annual-planning/priorities')
  })

  it('with areas but nothing flagged, says where a priority comes from and offers no key', () => {
    renderBar({ priorities: [] })
    expect(screen.getByText('focusBar.flagHint')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('focusBar.createPriority')).not.toBeInTheDocument()
  })

  it('renders nothing at all without areas or flagged items', () => {
    const { container } = renderBar({ focusAreas: [], priorities: [] })
    expect(container).toBeEmptyDOMElement()
  })
})
