/**
 * CAL-002 — the Agenda's rows and its check control (ADR-016, decisions 5 & 6).
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

import CalendarAgenda from '../CalendarAgenda'

const t = (key) => key
const today = new Date()

const task = { id: 'task-1', type: 'task', title: 'Finish Spanish deck', status: 'pending', color: '#6366f1', date: today }
const priority = { id: 'priority-1', type: 'priority', title: 'Q3 review', status: 'completed', color: '#f59e0b', date: today }
const goal = {
  id: 'goal-1',
  type: 'goal',
  title: 'Read twelve books',
  status: 'active',
  color: '#10b981',
  areaName: 'Learning',
  date: today
}
const milestone = {
  id: 'milestone-g1-0',
  type: 'milestone',
  title: 'Week 4',
  status: 'pending',
  color: '#10b981',
  goalId: 'g1',
  milestoneId: 'm1',
  date: today
}
const habit = { id: 'activity-1', type: 'activity', title: 'Morning run', status: 'active', color: '#10b981', date: today }

const todayGroup = (events) => ({ date: today, isToday: true, events })

const setup = (props = {}) =>
  render(
    <CalendarAgenda
      groups={[todayGroup([task, priority, milestone, goal, habit])]}
      cursor={today}
      loading={false}
      language='en'
      onSelectEvent={jest.fn()}
      onToggleComplete={jest.fn()}
      t={t}
      {...props}
    />
  )

describe('the check control', () => {
  it('renders on task, priority and milestone rows — never on a goal or a habit', () => {
    setup()
    expect(screen.getAllByRole('button', { name: /calendarPage.agenda.mark/ })).toHaveLength(3)
  })

  it('names the action by the state it will move to, and carries the state as aria-pressed', () => {
    setup()
    expect(screen.getAllByRole('button', { name: 'calendarPage.agenda.markDone' })[0]).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'calendarPage.agenda.markUndone' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('hands the row’s event to onToggleComplete', () => {
    const onToggleComplete = jest.fn()
    setup({ onToggleComplete })
    fireEvent.click(screen.getAllByRole('button', { name: 'calendarPage.agenda.markDone' })[0])
    expect(onToggleComplete).toHaveBeenCalledWith(task)
  })

  it('is absent when the surface passes no handler', () => {
    setup({ onToggleComplete: undefined })
    expect(screen.queryByRole('button', { name: /calendarPage.agenda.mark/ })).toBeNull()
  })
})

describe('the rows', () => {
  it('opens the editor from the title', () => {
    const onSelectEvent = jest.fn()
    setup({ onSelectEvent })
    fireEvent.click(screen.getByRole('button', { name: 'Read twelve books' }))
    expect(onSelectEvent).toHaveBeenCalledWith(goal)
  })

  it('captions a row with its area and type, and a type alone when there is no area', () => {
    setup()
    expect(screen.getByText('Learning · calendarPage.agenda.type.goal')).toBeInTheDocument()
    expect(screen.getByText('calendarPage.agenda.type.task')).toBeInTheDocument()
    expect(screen.getByText('calendarPage.agenda.type.activity')).toBeInTheDocument()
  })

  it('says Today is empty in one line rather than hiding the day', () => {
    setup({ groups: [todayGroup([])] })
    expect(screen.getByText('calendarPage.agenda.today')).toBeInTheDocument()
    expect(screen.getByText('calendarPage.agenda.emptyToday')).toBeInTheDocument()
  })

  it('uses the empty-state pattern for a month with nothing in it', () => {
    setup({ groups: [] })
    expect(screen.getByText('calendarPage.agenda.empty.title')).toBeInTheDocument()
    expect(screen.getByText('calendarPage.agenda.empty.body')).toBeInTheDocument()
  })

  it('shows skeleton rows while loading with nothing yet, never a page gate', () => {
    const { container } = setup({ groups: [], loading: true })
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
    expect(screen.queryByText('calendarPage.agenda.empty.title')).toBeNull()
  })
})

// ─── PLAN-004: a block on the day — time · tile · title · meta · tick ────────

describe('PLAN-004: block rows', () => {
  const { localDateKey } = require('@nowry/core/domain/blocks')
  const todayKey = localDateKey(today)
  const block = { id: 'b1', title: 'Morning review', source: { type: 'study', id: null }, start: '07:30', lengthMin: 20, areaId: null }
  const occurrence = { date: todayKey, blockId: 'b1', start: '07:30', lengthMin: 20, title: 'Morning review', block, log: null }
  const kept = { ...occurrence, log: { status: 'kept', minutes: 20 } }

  const setupBlocks = (blocks, props = {}) =>
    setup({
      groups: [{ date: today, isToday: true, events: [task], blocks }],
      onSelectBlock: jest.fn(),
      onToggleKept: jest.fn(),
      todayKey,
      nowMinutes: 0,
      ...props
    })

  it('draws the time as the left readout, the meta line, and sits before the deadlines', () => {
    setupBlocks([occurrence])
    const row = screen.getByTestId('agenda-block-row')
    expect(row).toHaveTextContent('07:30')
    expect(row).toHaveTextContent('calendarPage.blocks.meta')
    const taskTitle = screen.getByRole('button', { name: 'Finish Spanish deck' })
    expect(row.compareDocumentPosition(taskTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('the tick names the state it moves to, carries aria-pressed, and hands over the occurrence', () => {
    const onToggleKept = jest.fn()
    setupBlocks([occurrence], { onToggleKept })
    const tick = screen.getByRole('button', { name: 'calendarPage.blocks.markKept' })
    expect(tick).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(tick)
    expect(onToggleKept).toHaveBeenCalledWith(occurrence)
  })

  it('a kept block offers undo and is pressed', () => {
    setupBlocks([kept])
    expect(screen.getByRole('button', { name: 'calendarPage.blocks.undoKept' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens the block from its title', () => {
    const onSelectBlock = jest.fn()
    setupBlocks([occurrence], { onSelectBlock })
    fireEvent.click(screen.getByRole('button', { name: 'Morning review' }))
    expect(onSelectBlock).toHaveBeenCalledWith(occurrence)
  })

  it('a Today with blocks and nothing due is not called empty', () => {
    setup({ groups: [{ date: today, isToday: true, events: [], blocks: [occurrence] }], todayKey, nowMinutes: 0 })
    expect(screen.queryByText('calendarPage.agenda.emptyToday')).toBeNull()
    expect(screen.getByTestId('agenda-block-row')).toBeInTheDocument()
  })
})
