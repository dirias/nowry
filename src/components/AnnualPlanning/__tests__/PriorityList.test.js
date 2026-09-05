/**
 * Phase 24 Plan 03 — PriorityList tests (PRI-02, PRI-04).
 * Behaviors 1-4 (Task 2): is_active icon/chip rendering + toggle-click affordance.
 * Behaviors 5-7 (Task 3): draggable prop + SortablePriorityRow.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
  // PriorityList.js uses <Trans> for its delete-confirmation dialog. Without a
  // mock it resolves to undefined and React logs an invalid-element warning
  // on every render (WR-06).
  Trans: ({ i18nKey }) => i18nKey
}))
// PriorityList.js imports annualPlanningService from the barrel index
// ('../../api/services'), which eagerly re-exports every service module
// (books, cards, decks, etc.) and would otherwise pull in the real axios
// client. Mock the barrel directly to avoid loading unrelated services.
jest.mock('../../../api/services', () => ({
  annualPlanningService: {
    deletePriority: jest.fn()
  }
}))

const PriorityList = require('../PriorityList').default

const basePriority = {
  _id: 'p1',
  title: 'Test priority',
  is_completed: false,
  is_active: true
}

describe('Phase 24 PRI-02: PriorityList is_active rendering', () => {
  it('Test 1: inactive, non-completed priority renders Inactive chip', () => {
    const priority = { ...basePriority, is_active: false }
    render(<PriorityList priorities={[priority]} />)
    expect(screen.getByText('annualPlanning.priority.inactive')).toBeInTheDocument()
  })

  it('Test 2: active, non-completed priority renders no Inactive chip', () => {
    const priority = { ...basePriority, is_active: true }
    render(<PriorityList priorities={[priority]} />)
    expect(screen.queryByText('annualPlanning.priority.inactive')).not.toBeInTheDocument()
  })

  it('Test 3: clicking the flag icon on an inactive row calls onToggleActive with that priority', () => {
    const priority = { ...basePriority, is_active: false }
    const onToggleActive = jest.fn()
    render(<PriorityList priorities={[priority]} onToggleActive={onToggleActive} />)
    const flagButton = screen.getByLabelText('annualPlanning.priority.activate')
    fireEvent.click(flagButton)
    expect(onToggleActive).toHaveBeenCalledTimes(1)
    expect(onToggleActive).toHaveBeenCalledWith(priority)
  })

  it('Test 4: completed priority still renders Done chip regardless of is_active', () => {
    const priority = { ...basePriority, is_completed: true, is_active: false }
    render(<PriorityList priorities={[priority]} />)
    expect(screen.getByText('annualPlanning.priority.done')).toBeInTheDocument()
    expect(screen.queryByText('annualPlanning.priority.inactive')).not.toBeInTheDocument()
  })
})

describe('Phase 24 PRI-04: PriorityList draggable mode', () => {
  it('Test 5: draggable=false renders no drag handle', () => {
    render(<PriorityList priorities={[basePriority]} />)
    expect(screen.queryByLabelText('annualPlanning.priority.dragHandle')).not.toBeInTheDocument()
  })

  it('Test 6: draggable=true renders one drag handle per non-completed row', () => {
    render(
      <DndContext>
        <SortableContext items={[basePriority._id]}>
          <PriorityList priorities={[basePriority]} draggable />
        </SortableContext>
      </DndContext>
    )
    expect(screen.getAllByLabelText('annualPlanning.priority.dragHandle')).toHaveLength(1)
  })

  it('Test 7: draggable=true renders no drag handle on a completed-priority row', () => {
    const priority = { ...basePriority, is_completed: true }
    render(
      <DndContext>
        <SortableContext items={[priority._id]}>
          <PriorityList priorities={[priority]} draggable />
        </SortableContext>
      </DndContext>
    )
    expect(screen.queryByLabelText('annualPlanning.priority.dragHandle')).not.toBeInTheDocument()
  })
})

describe('ADR-015 PRIO-001: completion control in the leading slot, pause in the trailing cluster', () => {
  it('Test 8: an unfinished row renders a "Mark complete" control that calls onToggleComplete with the priority', () => {
    const onToggleComplete = jest.fn()
    render(<PriorityList priorities={[basePriority]} onToggleComplete={onToggleComplete} />)
    const control = screen.getByLabelText('annualPlanning.priority.markComplete')
    expect(control).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(control)
    expect(onToggleComplete).toHaveBeenCalledTimes(1)
    expect(onToggleComplete).toHaveBeenCalledWith(basePriority)
  })

  it('Test 9: a completed row renders a "Mark incomplete" control that reverts through the same handler', () => {
    const priority = { ...basePriority, is_completed: true }
    const onToggleComplete = jest.fn()
    render(<PriorityList priorities={[priority]} onToggleComplete={onToggleComplete} />)
    const control = screen.getByLabelText('annualPlanning.priority.markIncomplete')
    expect(control).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(control)
    expect(onToggleComplete).toHaveBeenCalledWith(priority)
    expect(screen.queryByLabelText('annualPlanning.priority.markComplete')).not.toBeInTheDocument()
  })

  it('Test 10: with no onToggleComplete the leading slot is static — nothing there is labelled or clickable', () => {
    render(<PriorityList priorities={[basePriority, { ...basePriority, _id: 'p2', is_completed: true }]} />)
    expect(screen.queryByLabelText('annualPlanning.priority.markComplete')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('annualPlanning.priority.markIncomplete')).not.toBeInTheDocument()
  })

  it('Test 11: a completed row offers no pause/resume action even when onToggleActive is provided', () => {
    const priority = { ...basePriority, is_completed: true, is_active: true }
    render(<PriorityList priorities={[priority]} onToggleActive={jest.fn()} onToggleComplete={jest.fn()} />)
    expect(screen.queryByLabelText('annualPlanning.priority.markInactive')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('annualPlanning.priority.activate')).not.toBeInTheDocument()
  })

  it('Test 12: an active, unfinished row renders the pause action and it calls onToggleActive', () => {
    const onToggleActive = jest.fn()
    render(<PriorityList priorities={[basePriority]} onToggleActive={onToggleActive} />)
    fireEvent.click(screen.getByLabelText('annualPlanning.priority.markInactive'))
    expect(onToggleActive).toHaveBeenCalledWith(basePriority)
  })

  it('Test 13: with no onToggleActive there is no pause action, so a read-only surface shows only the check', () => {
    render(<PriorityList priorities={[basePriority]} onToggleComplete={jest.fn()} showEditButton={false} showDeleteButton={false} />)
    expect(screen.queryByLabelText('annualPlanning.priority.markInactive')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})
