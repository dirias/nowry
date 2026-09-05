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
const habit = { id: 'activity-1', type: 'activity', title: 'Morning run', status: 'active', color: '#10b981', date: today }

const todayGroup = (events) => ({ date: today, isToday: true, events })

const setup = (props = {}) =>
  render(
    <CalendarAgenda
      groups={[todayGroup([task, priority, goal, habit])]}
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
  it('renders on task and priority rows only', () => {
    setup()
    expect(screen.getAllByRole('button', { name: /calendarPage.agenda.mark/ })).toHaveLength(2)
  })

  it('names the action by the state it will move to, and carries the state as aria-pressed', () => {
    setup()
    expect(screen.getByRole('button', { name: 'calendarPage.agenda.markDone' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'calendarPage.agenda.markUndone' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('hands the row’s event to onToggleComplete', () => {
    const onToggleComplete = jest.fn()
    setup({ onToggleComplete })
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.agenda.markDone' }))
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
