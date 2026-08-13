/**
 * FE-3 — GoalDetailDrawer (UX-CONTRACT §1.2, §4, §8).
 * The surface that replaces two per-card accordions: full Stepper, activities,
 * description, and a labelled lifecycle Select in place of the click-cycle.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k),
    i18n: { language: 'en' }
  })
}))

// jsdom has no matchMedia; the drawer only uses it to choose its anchor.
let mediaMatches = true
beforeAll(() => {
  window.matchMedia = (query) => ({
    matches: mediaMatches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
})

const GoalDetailDrawer = require('../goal/GoalDetailDrawer').default

const goal = {
  _id: 'g1',
  title: 'Ship the redesign',
  description: 'Land ADR-003 end to end.',
  status: 'in_progress',
  milestones: [
    { id: 'm1', title: 'M1', completed: true },
    { id: 'm2', title: 'M2', completed: false }
  ]
}

const model = {
  state: 'at_risk',
  color: 'warning',
  progress: { percent: 50, completed: 1, total: 2, isMilestoneBased: true },
  activities: [],
  activityCount: 0,
  isLocked: false
}

const renderDrawer = (props = {}) => render(<GoalDetailDrawer open goal={goal} model={model} {...props} />)

describe('content', () => {
  it('renders the title, state pill and description', () => {
    renderDrawer()
    expect(screen.getByText('Ship the redesign')).toBeInTheDocument()
    expect(screen.getByText('annualPlanning.goal.healthStatus.atRisk')).toBeInTheDocument()
    expect(screen.getByText('Land ADR-003 end to end.')).toBeInTheDocument()
  })

  it('falls back to the noDescription copy on an empty description', () => {
    renderDrawer({ goal: { ...goal, description: '' } })
    expect(screen.getByText('annualPlanning.goal.detail.noDescription')).toBeInTheDocument()
  })

  it('renders the full milestone Stepper — the thing the accordion used to hide', () => {
    renderDrawer()
    expect(screen.getByLabelText('M1')).toBeInTheDocument()
    expect(screen.getByLabelText('M2')).toBeInTheDocument()
  })

  it('toggles a milestone from the Stepper', () => {
    const onToggleMilestone = jest.fn()
    renderDrawer({ onToggleMilestone })
    fireEvent.click(screen.getByLabelText('M2'))
    expect(onToggleMilestone).toHaveBeenCalledWith(goal, 1)
  })

  it('renders nothing at all for goal detail when there is no goal', () => {
    const { container } = render(<GoalDetailDrawer open goal={null} model={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('activities section', () => {
  it('is omitted entirely when the count is zero', () => {
    renderDrawer()
    expect(screen.queryByText('annualPlanning.goal.activities')).not.toBeInTheDocument()
  })

  it('renders when there is something to show, from the prop — no fetch', () => {
    renderDrawer({
      model: {
        ...model,
        activityCount: 1,
        activities: [{ _id: 'a1', title: 'Morning run', frequency: 'daily', created_at: '2026-01-01T00:00:00Z' }]
      }
    })
    expect(screen.getByText('annualPlanning.goal.activities')).toBeInTheDocument()
    expect(screen.getByText('Morning run')).toBeInTheDocument()
  })
})

describe('lifecycle Select — replaces the click-cycle', () => {
  it('is labelled', () => {
    renderDrawer()
    expect(screen.getByText('annualPlanning.goal.detail.lifecycleLabel')).toBeInTheDocument()
  })

  it('offers all three status values, each with an explicit label', () => {
    renderDrawer()
    fireEvent.click(screen.getByRole('combobox'))
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual([
      'annualPlanning.goal.status.notStarted',
      'annualPlanning.goal.status.inProgress',
      'annualPlanning.goal.status.completed'
    ])
  })

  it('writes the chosen status explicitly', () => {
    const onStatusChange = jest.fn()
    renderDrawer({ onStatusChange })
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('annualPlanning.goal.status.completed'))
    expect(onStatusChange).toHaveBeenCalledWith(goal, 'completed')
  })

  it('is disabled when the goal’s quarter is closed', () => {
    renderDrawer({ model: { ...model, isLocked: true } })
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})

describe('actions', () => {
  it('routes Edit and Delete out to the container', () => {
    const onEdit = jest.fn()
    const onDelete = jest.fn()
    renderDrawer({ onEdit, onDelete })
    fireEvent.click(screen.getByText('annualPlanning.goal.edit'))
    fireEvent.click(screen.getByText('annualPlanning.goal.delete'))
    expect(onEdit).toHaveBeenCalledWith(goal)
    expect(onDelete).toHaveBeenCalledWith(goal)
  })

  it('exposes a translated close affordance', () => {
    renderDrawer()
    expect(screen.getByLabelText('common.close')).toBeInTheDocument()
  })
})

describe('the four states', () => {
  it('Loading renders per-section skeletons, never a region gate', () => {
    // The Drawer portals out of `container`, so assert against the whole document.
    const { baseElement } = renderDrawer({ loading: true })
    expect(baseElement.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(1)
    // A spinner standing in for the whole panel is the pattern the house rules ban.
    expect(baseElement.querySelector('.MuiCircularProgress-root')).not.toBeInTheDocument()
  })

  it('Error renders an inline soft danger Alert with retry', () => {
    const onRetry = jest.fn()
    renderDrawer({ error: new Error('nope'), onRetry })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('annualPlanning.goal.statusUpdateError')).toBeInTheDocument()
    fireEvent.click(screen.getByText('common.retry'))
    expect(onRetry).toHaveBeenCalled()
  })

  it('Empty renders the noMilestones copy rather than an empty Stepper', () => {
    renderDrawer({ goal: { ...goal, milestones: [] } })
    expect(screen.getByText('annualPlanning.goal.noMilestones')).toBeInTheDocument()
  })
})

describe('house rules', () => {
  const source = () => require('fs').readFileSync(require.resolve('../goal/GoalDetailDrawer.js'), 'utf8')

  it('uses no hex colour, rgba(), style={{}} or numeric palette shade', () => {
    expect(source()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source()).not.toMatch(/rgba?\(/)
    expect(source()).not.toMatch(/style=\{\{/)
    expect(source()).not.toMatch(/(neutral|primary|success|warning|danger)\.[0-9]{2,3}\b/)
  })

  it('uses no inline English t() fallback and imports no service', () => {
    expect(source()).not.toMatch(/t\([^)]*,\s*['"][A-Z]/)
    expect(source()).not.toMatch(/defaultValue:/)
    expect(source()).not.toMatch(/api\/services|annualPlanningService/)
  })
})
