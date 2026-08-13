/**
 * FE-3 — the next-action ladder (UX-CONTRACT §3).
 * The ladder's contract is that it resolves in a fixed priority order and always
 * renders exactly one rung: never two, never zero.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k),
    i18n: { language: 'en' }
  })
}))

const GoalNextAction = require('../goal/GoalNextAction').default

const nextMilestone = { milestone: { title: 'Draft the spec' }, index: 2, isOverdue: false }
const overdueMilestone = { ...nextMilestone, isOverdue: true }

/** Every rung's distinguishing copy, so "exactly one" can be asserted. */
const RUNG_KEYS = [
  'annualPlanning.goal.next.completed',
  'annualPlanning.goal.next.overdue',
  'annualPlanning.goal.next.label',
  'annualPlanning.goal.next.readyToComplete',
  'annualPlanning.goal.next.addMilestone'
]

const renderedRungs = (container) => RUNG_KEYS.filter((key) => container.textContent.includes(key))

describe('ladder priority — exactly one rung, always', () => {
  const cases = [
    [
      'rung 1: completed wins over everything',
      { state: 'completed', next: overdueMilestone, hasMilestones: true },
      'annualPlanning.goal.next.completed'
    ],
    [
      'rung 2: overdue beats a plain next milestone',
      { state: 'behind', next: overdueMilestone, hasMilestones: true },
      'annualPlanning.goal.next.overdue'
    ],
    ['rung 3: an incomplete milestone', { state: 'on_track', next: nextMilestone, hasMilestones: true }, 'annualPlanning.goal.next.label'],
    [
      'rung 4: all milestones done, goal still open',
      { state: 'on_track', next: null, hasMilestones: true },
      'annualPlanning.goal.next.readyToComplete'
    ],
    ['rung 5: no milestones at all', { state: 'not_started', next: null, hasMilestones: false }, 'annualPlanning.goal.next.addMilestone']
  ]

  it.each(cases)('%s', (_name, props, expectedKey) => {
    const { container } = render(<GoalNextAction {...props} />)
    expect(renderedRungs(container)).toEqual([expectedKey])
  })

  it('renders a rung for every reachable combination — never zero', () => {
    const combos = [
      { state: 'completed', next: null, hasMilestones: false },
      { state: 'not_started', next: null, hasMilestones: false },
      { state: 'at_risk', next: nextMilestone, hasMilestones: true },
      { state: 'behind', next: null, hasMilestones: true }
    ]
    combos.forEach((props) => {
      const { container, unmount } = render(<GoalNextAction {...props} />)
      expect(renderedRungs(container)).toHaveLength(1)
      unmount()
    })
  })
})

describe('rung 2/3 — the one-tap action', () => {
  it('interpolates the milestone title into the label', () => {
    render(<GoalNextAction state='on_track' next={nextMilestone} hasMilestones />)
    expect(screen.getByText('annualPlanning.goal.next.label:{"title":"Draft the spec"}')).toBeInTheDocument()
  })

  it('toggles the next milestone by its index', () => {
    const onToggleMilestone = jest.fn()
    render(<GoalNextAction state='on_track' next={nextMilestone} hasMilestones onToggleMilestone={onToggleMilestone} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggleMilestone).toHaveBeenCalledWith(2)
  })

  it('names the checkbox after the milestone it ticks', () => {
    render(<GoalNextAction state='on_track' next={nextMilestone} hasMilestones />)
    expect(screen.getByLabelText('annualPlanning.goal.next.toggleAria:{"title":"Draft the spec"}')).toBeInTheDocument()
  })

  it('puts that name on the input itself, not on a wrapper span', () => {
    // Joy forwards a bare `aria-label` prop to the Checkbox root <span>, which
    // leaves the <input> carrying role=checkbox nameless to a screen reader.
    // getByLabelText would still pass by walking ancestors, so assert the
    // element directly.
    render(<GoalNextAction state='on_track' next={nextMilestone} hasMilestones />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-label', 'annualPlanning.goal.next.toggleAria:{"title":"Draft the spec"}')
  })

  it('renders the checkbox unchecked — it is an action, not a state mirror', () => {
    render(<GoalNextAction state='on_track' next={nextMilestone} hasMilestones />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('disables the checkbox while a write is in flight', () => {
    render(<GoalNextAction state='on_track' next={nextMilestone} hasMilestones busy />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('disables the checkbox when the quarter is closed', () => {
    render(<GoalNextAction state='on_track' next={nextMilestone} hasMilestones locked />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })
})

describe('time context', () => {
  const withDeadline = (daysLeft, extra = {}) =>
    render(
      <GoalNextAction state='on_track' next={nextMilestone} hasMilestones deadline={{ daysLeft, isOverdue: daysLeft < 0 }} {...extra} />
    )

  it('appears at the edge of the 30-day nudge window', () => {
    withDeadline(30)
    expect(screen.getByText('annualPlanning.goal.daysLeftShort:{"count":30}')).toBeInTheDocument()
  })

  it('is suppressed beyond 30 days, where a countdown is noise', () => {
    withDeadline(31)
    expect(screen.queryByText(/daysLeftShort/)).not.toBeInTheDocument()
  })

  it('is suppressed for an elapsed window rather than rendering a negative count', () => {
    withDeadline(-5)
    expect(screen.queryByText(/daysLeftShort/)).not.toBeInTheDocument()
  })

  it('renders on the overdue rung too', () => {
    render(<GoalNextAction state='behind' next={overdueMilestone} hasMilestones deadline={{ daysLeft: 3, isOverdue: false }} />)
    expect(screen.getByText('annualPlanning.goal.daysLeftShort:{"count":3}')).toBeInTheDocument()
  })

  it('never renders on rung 1', () => {
    render(<GoalNextAction state='completed' deadline={{ daysLeft: 5, isOverdue: false }} />)
    expect(screen.queryByText(/daysLeftShort/)).not.toBeInTheDocument()
  })

  it('never renders on rung 4', () => {
    render(<GoalNextAction state='on_track' next={null} hasMilestones deadline={{ daysLeft: 5, isOverdue: false }} />)
    expect(screen.queryByText(/daysLeftShort/)).not.toBeInTheDocument()
  })

  it('never renders on rung 5', () => {
    render(<GoalNextAction state='not_started' next={null} hasMilestones={false} deadline={{ daysLeft: 5, isOverdue: false }} />)
    expect(screen.queryByText(/daysLeftShort/)).not.toBeInTheDocument()
  })
})

describe('rungs 4 and 5 — the investment rungs', () => {
  it('rung 4 routes to onComplete', () => {
    const onComplete = jest.fn()
    render(<GoalNextAction state='on_track' next={null} hasMilestones onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('rung 5 routes to onAddMilestone', () => {
    const onAddMilestone = jest.fn()
    render(<GoalNextAction state='not_started' next={null} hasMilestones={false} onAddMilestone={onAddMilestone} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onAddMilestone).toHaveBeenCalledTimes(1)
  })

  it('both are disabled when the quarter is closed', () => {
    const { unmount } = render(<GoalNextAction state='on_track' next={null} hasMilestones locked />)
    expect(screen.getByRole('button')).toBeDisabled()
    unmount()
    render(<GoalNextAction state='not_started' next={null} hasMilestones={false} locked />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('house rules', () => {
  const source = () => require('fs').readFileSync(require.resolve('../goal/GoalNextAction.js'), 'utf8')

  it('uses no hex colour, rgba(), style={{}} or numeric palette shade', () => {
    expect(source()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source()).not.toMatch(/rgba?\(/)
    expect(source()).not.toMatch(/style=\{\{/)
    expect(source()).not.toMatch(/(neutral|primary|success|warning|danger)\.[0-9]{2,3}\b/)
  })

  it('uses no inline English t() fallback', () => {
    expect(source()).not.toMatch(/t\([^)]*,\s*['"][A-Z]/)
    expect(source()).not.toMatch(/defaultValue:/)
  })
})
