/**
 * FE-2 — shared goal primitives (UX-CONTRACT §5.2).
 *
 * Carries forward the meaningful coverage from the two retired card/row suites
 * that belongs at this layer: any-order milestone toggling,
 * lock gating, keyboard toggling, and translated aria-labels on every
 * interactive element. Card/row-level behaviour is covered in GoalCard /
 * GoalRow's own suites.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k),
    i18n: { language: 'en' }
  })
}))

const GoalStatePill = require('../goal/GoalStatePill').default
const GoalProgressBar = require('../goal/GoalProgressBar').default
const GoalOverflowMenu = require('../goal/GoalOverflowMenu').default
const GoalMilestoneStepper = require('../goal/GoalMilestoneStepper').default
const GoalActivityList = require('../goal/GoalActivityList').default
const GoalCardSkeleton = require('../goal/GoalCardSkeleton').default
const GoalRowSkeleton = require('../goal/GoalRowSkeleton').default

const goalWithMilestones = {
  _id: 'g1',
  title: 'Test goal',
  status: 'in_progress',
  milestones: [
    { id: 'm1', title: 'M1', completed: true },
    { id: 'm2', title: 'M2', completed: false }
  ]
}

describe('GoalStatePill', () => {
  it('renders one soft chip carrying the state label — never colour alone', () => {
    render(<GoalStatePill state='behind' />)
    expect(screen.getByText('annualPlanning.goal.healthStatus.behind')).toBeInTheDocument()
  })

  it('labels the new not_started state', () => {
    render(<GoalStatePill state='not_started' />)
    expect(screen.getByText('annualPlanning.goal.healthStatus.notStarted')).toBeInTheDocument()
  })

  it('renders nothing for an unknown or missing state', () => {
    const { container } = render(<GoalStatePill state={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('GoalProgressBar', () => {
  it('exposes a determinate progressbar with a translated aria-label', () => {
    render(<GoalProgressBar percent={50} state='on_track' completed={1} total={2} isMilestoneBased />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-label', 'annualPlanning.goal.progress')
    expect(bar).toHaveAttribute('aria-valuenow', '50')
  })

  it('announces the milestone count, not the bare number', () => {
    render(<GoalProgressBar percent={57} state='at_risk' completed={4} total={7} isMilestoneBased />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'annualPlanning.goal.milestoneCount:{"completed":4,"total":7,"count":7}'
    )
  })

  it('renders the count caption below the bar', () => {
    render(<GoalProgressBar percent={57} state='at_risk' completed={4} total={7} isMilestoneBased />)
    expect(screen.getByText('annualPlanning.goal.milestoneCount:{"completed":4,"total":7,"count":7}')).toBeInTheDocument()
  })

  it('falls back to percentComplete for a goal with no milestones', () => {
    render(<GoalProgressBar percent={0} state='not_started' />)
    expect(screen.getByText('annualPlanning.goal.percentComplete:{"percent":0}')).toBeInTheDocument()
  })

  it('never renders the retired "X% Complete" literal', () => {
    render(<GoalProgressBar percent={57} state='at_risk' completed={4} total={7} isMilestoneBased />)
    expect(screen.queryByText(/% Complete/)).not.toBeInTheDocument()
  })

  it('drops the caption in dense (list-row) mode but keeps the bar', () => {
    render(<GoalProgressBar percent={50} state='on_track' completed={1} total={2} isMilestoneBased dense />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByText(/milestoneCount/)).not.toBeInTheDocument()
  })

  it('clamps an out-of-range percentage', () => {
    render(<GoalProgressBar percent={140} state='completed' />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })
})

describe('GoalOverflowMenu', () => {
  const openMenu = () => fireEvent.click(screen.getByRole('button'))

  it('labels the trigger with the goal title so five buttons stay distinguishable', () => {
    render(<GoalOverflowMenu goal={goalWithMilestones} />)
    expect(screen.getByLabelText('annualPlanning.goal.moreActions:{"title":"Test goal"}')).toBeInTheDocument()
  })

  it('offers Edit, Mark complete and Delete in that order for an open goal', () => {
    render(<GoalOverflowMenu goal={goalWithMilestones} />)
    openMenu()
    const items = screen.getAllByRole('menuitem').map((i) => i.textContent)
    expect(items).toEqual(['annualPlanning.goal.edit', 'annualPlanning.goal.markComplete', 'annualPlanning.goal.delete'])
  })

  it('swaps Mark complete for Reopen goal on a completed goal', () => {
    render(<GoalOverflowMenu goal={{ ...goalWithMilestones, status: 'completed' }} />)
    openMenu()
    expect(screen.getByText('annualPlanning.goal.reopen')).toBeInTheDocument()
    expect(screen.queryByText('annualPlanning.goal.markComplete')).not.toBeInTheDocument()
  })

  it('routes Edit and Delete to their handlers', () => {
    const onEdit = jest.fn()
    const onDelete = jest.fn()
    render(<GoalOverflowMenu goal={goalWithMilestones} onEdit={onEdit} onDelete={onDelete} />)
    openMenu()
    fireEvent.click(screen.getByText('annualPlanning.goal.edit'))
    expect(onEdit).toHaveBeenCalledWith(goalWithMilestones)
    openMenu()
    fireEvent.click(screen.getByText('annualPlanning.goal.delete'))
    expect(onDelete).toHaveBeenCalledWith(goalWithMilestones)
  })

  it('writes an explicit status from the menu — no click-cycle', () => {
    const onStatusChange = jest.fn()
    render(<GoalOverflowMenu goal={goalWithMilestones} onStatusChange={onStatusChange} />)
    openMenu()
    fireEvent.click(screen.getByText('annualPlanning.goal.markComplete'))
    expect(onStatusChange).toHaveBeenCalledWith(goalWithMilestones, 'completed')
  })

  it('reopens a completed goal to in_progress, keeping that status writable', () => {
    const onStatusChange = jest.fn()
    const completed = { ...goalWithMilestones, status: 'completed' }
    render(<GoalOverflowMenu goal={completed} onStatusChange={onStatusChange} />)
    openMenu()
    fireEvent.click(screen.getByText('annualPlanning.goal.reopen'))
    expect(onStatusChange).toHaveBeenCalledWith(completed, 'in_progress')
  })

  it('renders disabled rather than disappearing when the quarter is closed', () => {
    render(<GoalOverflowMenu goal={goalWithMilestones} locked />)
    const button = screen.getByRole('button', { name: 'annualPlanning.goal.moreActions:{"title":"Test goal"}' })
    expect(button).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('explains the lock through a tooltip rather than hiding the control', () => {
    render(<GoalOverflowMenu goal={goalWithMilestones} locked />)
    expect(screen.getByLabelText('annualPlanning.goal.lockedAction')).toBeInTheDocument()
  })

  it('opens no menu while locked', () => {
    render(<GoalOverflowMenu goal={goalWithMilestones} locked />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })
})

describe('GoalMilestoneStepper', () => {
  it('renders every milestone', () => {
    render(<GoalMilestoneStepper goal={goalWithMilestones} />)
    expect(screen.getByLabelText('M1')).toBeInTheDocument()
    expect(screen.getByLabelText('M2')).toBeInTheDocument()
  })

  it('toggles an incomplete milestone by index', () => {
    const onToggle = jest.fn()
    render(<GoalMilestoneStepper goal={goalWithMilestones} onToggle={onToggle} />)
    fireEvent.click(screen.getByLabelText('M2'))
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith(goalWithMilestones, 1)
  })

  it('allows un-ticking a completed milestone — no sequential-order enforcement', () => {
    const onToggle = jest.fn()
    render(<GoalMilestoneStepper goal={goalWithMilestones} onToggle={onToggle} />)
    fireEvent.click(screen.getByLabelText('M1'))
    expect(onToggle).toHaveBeenCalledWith(goalWithMilestones, 0)
  })

  it('gates every toggle when locked', () => {
    const onToggle = jest.fn()
    render(<GoalMilestoneStepper goal={goalWithMilestones} locked onToggle={onToggle} />)
    fireEvent.click(screen.getByLabelText('M2'))
    expect(onToggle).not.toHaveBeenCalled()
    expect(screen.getByLabelText('M2')).toHaveAttribute('tabindex', '-1')
  })

  it('toggles on Enter and on Space', () => {
    const onToggle = jest.fn()
    render(<GoalMilestoneStepper goal={goalWithMilestones} onToggle={onToggle} />)
    fireEvent.keyDown(screen.getByLabelText('M2'), { key: 'Enter' })
    fireEvent.keyDown(screen.getByLabelText('M2'), { key: ' ' })
    expect(onToggle).toHaveBeenCalledTimes(2)
  })

  it('ignores keyboard toggling when locked', () => {
    const onToggle = jest.fn()
    render(<GoalMilestoneStepper goal={goalWithMilestones} locked onToggle={onToggle} />)
    fireEvent.keyDown(screen.getByLabelText('M2'), { key: 'Enter' })
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('renders the due-date badge on an incomplete dated milestone', () => {
    const goal = { ...goalWithMilestones, milestones: [{ id: 'm1', title: 'M1', due_date: '2026-07-04', completed: false }] }
    render(<GoalMilestoneStepper goal={goal} />)
    expect(screen.getByText('Jul 4')).toBeInTheDocument()
  })

  it('hides the due-date badge once the milestone is complete', () => {
    const goal = { ...goalWithMilestones, milestones: [{ id: 'm1', title: 'M1', due_date: '2026-07-04', completed: true }] }
    render(<GoalMilestoneStepper goal={goal} />)
    expect(screen.queryByText('Jul 4')).not.toBeInTheDocument()
  })

  it('uses no emoji in the due-date badge', () => {
    const goal = { ...goalWithMilestones, milestones: [{ id: 'm1', title: 'M1', due_date: '2026-07-04', completed: false }] }
    const { container } = render(<GoalMilestoneStepper goal={goal} />)
    expect(container.textContent).not.toMatch(/🗓/)
  })

  it('renders the noMilestones copy when the goal has none', () => {
    render(<GoalMilestoneStepper goal={{ _id: 'g2', milestones: [] }} />)
    expect(screen.getByText('annualPlanning.goal.noMilestones')).toBeInTheDocument()
  })
})

describe('GoalActivityList', () => {
  it('renders nothing at all when the count is zero — no "(0)" control', () => {
    const { container } = render(<GoalActivityList activities={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when activities are absent', () => {
    const { container } = render(<GoalActivityList activities={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders title and translated frequency for each activity', () => {
    render(<GoalActivityList activities={[{ _id: 'a1', title: 'Morning run', frequency: 'daily', created_at: '2026-01-01T00:00:00Z' }]} />)
    expect(screen.getByText('Morning run')).toBeInTheDocument()
    expect(screen.getByText(/annualPlanning\.activity\.frequencies\.daily/)).toBeInTheDocument()
  })

  it('imports no service — activities arrive as a prop', () => {
    const fs = require('fs')
    const source = fs.readFileSync(require.resolve('../goal/GoalActivityList.js'), 'utf8')
    expect(source).not.toMatch(/api\/services|annualPlanningService/)
  })
})

describe('skeletons', () => {
  it('GoalCardSkeleton marks itself busy and labelled', () => {
    render(<GoalCardSkeleton />)
    const busy = screen.getByLabelText('annualPlanning.goals.loadingAria')
    expect(busy).toHaveAttribute('aria-busy', 'true')
  })

  it('GoalRowSkeleton marks itself busy and labelled', () => {
    render(<GoalRowSkeleton />)
    const busy = screen.getByLabelText('annualPlanning.goals.loadingAria')
    expect(busy).toHaveAttribute('aria-busy', 'true')
  })
})

describe('house rules over the new primitives', () => {
  const files = [
    'GoalStatePill.js',
    'GoalProgressBar.js',
    'GoalOverflowMenu.js',
    'GoalMilestoneStepper.js',
    'GoalActivityList.js',
    'GoalCardSkeleton.js',
    'GoalRowSkeleton.js'
  ]

  const read = (name) => require('fs').readFileSync(require.resolve(`../goal/${name}`), 'utf8')

  it.each(files)('%s contains no hex colour, rgba() or style={{}}', (name) => {
    const source = read(name)
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/rgba?\(/)
    expect(source).not.toMatch(/style=\{\{/)
  })

  it.each(files)('%s uses no numeric palette shade token', (name) => {
    // e.g. neutral.600 / primary.50 / success.400 — these break dark mode.
    expect(read(name)).not.toMatch(/(neutral|primary|success|warning|danger)\.[0-9]{2,3}\b/)
  })

  it.each(files)('%s uses no inline English t() fallback', (name) => {
    expect(read(name)).not.toMatch(/t\([^)]*,\s*['"][A-Z]/)
    expect(read(name)).not.toMatch(/defaultValue:/)
  })
})
