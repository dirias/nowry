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
