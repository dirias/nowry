/**
 * PriorityList — a row per flagged item (PLAN-013, ADR-046 §5).
 *
 * A priority is a flag on a task or a milestone, so a row is the item's tile,
 * its title with the kind and the deadline underneath, the done tick, and
 * "Remove from priorities". Nothing here edits, deletes, pauses or reorders.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts && opts.count !== undefined ? `${k}:${opts.count}` : k) })
}))

const PriorityList = require('../PriorityList').default

const task = {
  _id: 't1',
  title: 'Write the essay',
  is_completed: false,
  deadline: '2026-10-30',
  linked_entity_type: 'task',
  linked_entity_id: 't1',
  focus_area_id: null
}
const milestone = {
  _id: 'm1',
  title: 'Week 4 long run',
  is_completed: false,
  deadline: null,
  linked_entity_type: 'milestone',
  linked_entity_id: 'g1',
  focus_area_id: 'a1'
}
const areas = [{ _id: 'a1', name: 'Health', color: '#4caf50' }]

describe('the row', () => {
  it('reads the kind on the meta line, with the deadline when there is one', () => {
    render(<PriorityList priorities={[task, milestone]} areas={areas} />)
    expect(screen.getByText(/annualPlanning\.priority\.kind\.task · /)).toBeInTheDocument()
    expect(screen.getByText('annualPlanning.priority.kind.milestone')).toBeInTheDocument()
  })

  it('draws one identity tile per row', () => {
    render(<PriorityList priorities={[task, milestone]} areas={areas} />)
    expect(screen.getAllByTestId('priority-tile')).toHaveLength(2)
  })

  it('offers no edit, delete, pause or drag — a read-only surface shows only the check', () => {
    render(<PriorityList priorities={[task]} onToggleComplete={jest.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByLabelText('annualPlanning.priority.dragHandle')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('annualPlanning.priority.markInactive')).not.toBeInTheDocument()
  })

  it('a completed row renders the Done chip', () => {
    render(<PriorityList priorities={[{ ...task, is_completed: true }]} />)
    expect(screen.getByText('annualPlanning.priority.done')).toBeInTheDocument()
  })
})

describe('the done tick (ADR-015 point 1)', () => {
  it('an unfinished row renders a "Mark complete" control that calls onToggleComplete with the priority', () => {
    const onToggleComplete = jest.fn()
    render(<PriorityList priorities={[task]} onToggleComplete={onToggleComplete} />)
    const control = screen.getByLabelText('annualPlanning.priority.markComplete')
    expect(control).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(control)
    expect(onToggleComplete).toHaveBeenCalledWith(task)
  })

  it('a completed row renders a "Mark incomplete" control that reverts through the same handler', () => {
    const priority = { ...task, is_completed: true }
    const onToggleComplete = jest.fn()
    render(<PriorityList priorities={[priority]} onToggleComplete={onToggleComplete} />)
    const control = screen.getByLabelText('annualPlanning.priority.markIncomplete')
    expect(control).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(control)
    expect(onToggleComplete).toHaveBeenCalledWith(priority)
  })

  it('with no onToggleComplete the leading slot is static — nothing there is labelled or clickable', () => {
    render(<PriorityList priorities={[task, { ...task, _id: 't2', is_completed: true }]} />)
    expect(screen.queryByLabelText('annualPlanning.priority.markComplete')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('annualPlanning.priority.markIncomplete')).not.toBeInTheDocument()
  })
})

describe('the flag off', () => {
  it('"Remove from priorities" calls onUnflag with the priority', () => {
    const onUnflag = jest.fn()
    render(<PriorityList priorities={[task]} onUnflag={onUnflag} />)
    fireEvent.click(screen.getByLabelText('annualPlanning.priority.unflag'))
    expect(onUnflag).toHaveBeenCalledWith(task)
  })

  it('is not offered when the surface passes no handler', () => {
    render(<PriorityList priorities={[task]} />)
    expect(screen.queryByLabelText('annualPlanning.priority.unflag')).not.toBeInTheDocument()
  })
})

describe('filterable surfaces', () => {
  it('hide completed rows by default and show them behind the All segment', () => {
    render(<PriorityList priorities={[task, { ...milestone, is_completed: true }]} filterable />)
    expect(screen.queryByText('Week 4 long run')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('annualPlanning.priority.filterAll:2'))
    expect(screen.getByText('Week 4 long run')).toBeInTheDocument()
  })

  it('show no toggle when nothing is hidden', () => {
    render(<PriorityList priorities={[task]} filterable />)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })
})
