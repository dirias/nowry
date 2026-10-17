/**
 * BOARD-005 — a live item on the board (PRD D6): it reads the real record,
 * its tick writes done at once and goes back on a failure, a click opens the
 * item sheet (a goal opens its area), and a deleted item says so.
 */
import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import ItemNode from '../nodes/ItemNode'
import { BoardCanvasContext } from '../BoardCanvasContext'
import { BoardLinksContext } from '../../boardLinksContext'
import { readItem } from '../../itemReading'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.title ? `${key}:${options.title}` : options?.date ? `${key}:${options.date}` : key),
    i18n: { language: 'en' }
  })
}))
jest.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' }
}))

const TASKS = [{ _id: 't1', title: 'Biology essay draft', deadline: '2026-10-23', is_completed: false, is_priority: true }]
const GOALS = [
  {
    _id: 'g1',
    title: 'Pass biology',
    focus_area_id: 'a1',
    status: 'in_progress',
    milestones: [{ id: 'm1', title: 'Unit 3 test', completed: false }]
  }
]

const itemNode = (ref, title = 'Stored title') => ({
  id: 'i',
  kind: 'item',
  x: 0,
  y: 0,
  w: null,
  h: null,
  z: 1,
  text: null,
  color: null,
  size: null,
  title,
  ref,
  cardIds: []
})

const links = (over = {}) => {
  const data = { tasks: TASKS, goals: GOALS, loading: false, error: null, ...over }
  return {
    ...data,
    areas: [{ _id: 'a1', color: '#3366cc' }],
    read: (ref) => readItem(ref, data),
    setDone: jest.fn().mockResolvedValue(undefined),
    openItem: jest.fn(),
    ...over
  }
}

const mount = (ref, value = links()) => {
  const view = render(
    <CssVarsProvider>
      <BoardCanvasContext.Provider value={{}}>
        <BoardLinksContext.Provider value={value}>
          <ItemNode id='i' data={{ node: itemNode(ref), fresh: false }} selected={false} />
        </BoardLinksContext.Provider>
      </BoardCanvasContext.Provider>
    </CssVarsProvider>
  )
  return { ...view, value }
}

const tick = (name) => screen.getByRole('button', { name })

describe('a task tile', () => {
  it('reads the task: title, kind · due · priority', () => {
    mount({ kind: 'task', id: 't1', goalId: null })
    const tile = screen.getByTestId('board-item-i')
    expect(tile).toHaveTextContent('Biology essay draft')
    expect(tile).toHaveTextContent('boards.item.kind.task · items.readout.due:Oct 23 · items.readout.priority')
  })

  it('the tick shows done at once and writes it', async () => {
    const { value } = mount({ kind: 'task', id: 't1', goalId: null })
    fireEvent.click(tick('boards.item.markDone:Biology essay draft'))
    expect(tick('boards.item.markUndone:Biology essay draft')).toHaveAttribute('aria-pressed', 'true')
    await act(async () => {})
    expect(value.setDone).toHaveBeenCalledWith({ kind: 'task', id: 't1', goalId: null }, true, expect.objectContaining({ status: 'ready' }))
  })

  it('the tick goes back when the write fails', async () => {
    const value = links()
    value.setDone.mockRejectedValue(new Error('offline'))
    mount({ kind: 'task', id: 't1', goalId: null }, value)
    fireEvent.click(tick('boards.item.markDone:Biology essay draft'))
    expect(tick('boards.item.markUndone:Biology essay draft')).toHaveAttribute('aria-pressed', 'true')
    await act(async () => {})
    expect(tick('boards.item.markDone:Biology essay draft')).toHaveAttribute('aria-pressed', 'false')
  })

  it('a click on the tile opens the item sheet for it', () => {
    const { value } = mount({ kind: 'task', id: 't1', goalId: null })
    fireEvent.click(screen.getByRole('button', { name: 'boards.item.open:Biology essay draft' }))
    expect(value.openItem).toHaveBeenCalledWith({ kind: 'task', id: 't1', goalId: null }, expect.objectContaining({ record: TASKS[0] }))
  })
})

describe('a milestone tile', () => {
  it('reads the milestone and its tick writes done', async () => {
    const { value } = mount({ kind: 'milestone', id: 'm1', goalId: 'g1' })
    expect(screen.getByTestId('board-item-i')).toHaveTextContent('Unit 3 test')
    fireEvent.click(tick('boards.item.markDone:Unit 3 test'))
    await act(async () => {})
    expect(value.setDone).toHaveBeenCalledWith(
      { kind: 'milestone', id: 'm1', goalId: 'g1' },
      true,
      expect.objectContaining({ goalId: 'g1', areaId: 'a1' })
    )
  })
})

describe('a goal tile', () => {
  it('has no tick, and its click opens the goal', () => {
    const { value } = mount({ kind: 'goal', id: 'g1', goalId: null })
    expect(screen.queryByRole('button', { name: /boards\.item\.mark/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'boards.item.open:Pass biology' }))
    expect(value.openItem).toHaveBeenCalledWith({ kind: 'goal', id: 'g1', goalId: null }, expect.objectContaining({ areaId: 'a1' }))
  })
})

describe('states', () => {
  it('an item gone from the plan keeps its stored title, struck, and says so', () => {
    mount({ kind: 'task', id: 'deleted', goalId: null })
    const title = screen.getByText('Stored title')
    expect(title).toHaveStyle({ textDecoration: 'line-through' })
    expect(screen.getByText('boards.item.missing')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('loading: a skeleton line, no tick', () => {
    mount({ kind: 'task', id: 't1', goalId: null }, links({ loading: true }))
    expect(screen.queryByText('Biology essay draft')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
