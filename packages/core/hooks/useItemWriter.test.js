/**
 * PLAN-012 — the item sheet's writes: the facts become the documents they
 * call for, each through its own service; an edit patches what exists.
 */
import { renderHook, act } from '@testing-library/react'

const mockCreateBlock = jest.fn()
const mockUpdateBlock = jest.fn()
const mockRemoveBlock = jest.fn()
jest.mock('./useBlocks', () => ({
  useBlocks: () => ({ create: mockCreateBlock, update: mockUpdateBlock, remove: mockRemoveBlock })
}))
jest.mock('../api/services/tasks.service', () => ({
  tasksService: { create: jest.fn(), update: jest.fn(), delete: jest.fn() }
}))
jest.mock('../api/services/annualPlanning.service', () => ({
  annualPlanningService: { createMilestone: jest.fn(), updateMilestone: jest.fn(), deleteMilestone: jest.fn() }
}))
jest.mock('../api/queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() } }))
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))

const { tasksService } = require('../api/services/tasks.service')
const { annualPlanningService } = require('../api/services/annualPlanning.service')
const { queryClient } = require('../api/queryClient')
const { useItemWriter } = require('./useItemWriter')
const { factsFrom } = require('../domain/items')

const weekdays = { start: '07:30', lengthMin: 20, daysOfWeek: [0, 1, 2, 3, 4], date: null }
const once = { start: '13:00', lengthMin: 50, daysOfWeek: [], date: null }

const writer = () => renderHook(() => useItemWriter()).result.current

beforeEach(() => {
  jest.clearAllMocks()
  tasksService.create.mockResolvedValue({ _id: 't-new' })
  tasksService.update.mockResolvedValue({})
  annualPlanningService.createMilestone.mockResolvedValue({ id: 'm-new' })
  mockCreateBlock.mockResolvedValue({})
  mockUpdateBlock.mockResolvedValue({})
  mockRemoveBlock.mockResolvedValue({})
})

describe('saveItem, create', () => {
  it('due only → one task; the caches for tasks and the calendar are invalidated', async () => {
    const w = writer()
    await act(() => w.saveItem(factsFrom({ title: 'Essay', due: '2026-10-16' })))
    expect(tasksService.create).toHaveBeenCalledWith({ title: 'Essay', deadline: '2026-10-16', is_priority: false, category: null, is_completed: false })
    expect(mockCreateBlock).not.toHaveBeenCalled()
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks', 'u1'] })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['calendarEvents', 'u1'] })
  })

  it('due and scheduled → the task first, then a block sourced to the task it made', async () => {
    const w = writer()
    const out = await act(() => w.saveItem(factsFrom({ title: 'Essay', due: '2026-10-16', scheduled: once })))
    expect(tasksService.create).toHaveBeenCalledTimes(1)
    expect(mockCreateBlock).toHaveBeenCalledWith(expect.objectContaining({ source: { type: 'task', id: 't-new' }, date: '2026-10-16' }))
    expect(out).toEqual({ taskId: 't-new', reading: 'task' })
  })

  it('scheduled on repeat, nothing else → one routine block and no task', async () => {
    const w = writer()
    await act(() => w.saveItem(factsFrom({ title: 'Read', scheduled: weekdays })))
    expect(tasksService.create).not.toHaveBeenCalled()
    expect(mockCreateBlock).toHaveBeenCalledWith(expect.objectContaining({ source: { type: 'routine', id: null } }))
  })

  it('part of a goal → a milestone on the goal, and its block carries the area', async () => {
    const w = writer()
    await act(() => w.saveItem(factsFrom({ title: 'Draft', due: '2026-11-01', goalId: 'g1', scheduled: once }), null, { areaId: 'a1' }))
    expect(annualPlanningService.createMilestone).toHaveBeenCalledWith('g1', {
      title: 'Draft',
      due_date: '2026-11-01',
      is_priority: false,
      completed: false
    })
    expect(tasksService.create).not.toHaveBeenCalled()
    expect(mockCreateBlock).toHaveBeenCalledWith(expect.objectContaining({ source: { type: 'goal', id: 'g1' }, areaId: 'a1' }))
  })
})

describe('saveItem, edit', () => {
  const task = { _id: 't1', title: 'Essay', deadline: '2026-10-16' }
  const block = {
    id: 'b1',
    title: 'Essay',
    source: { type: 'task', id: 't1' },
    start: '13:00',
    lengthMin: 50,
    daysOfWeek: [],
    date: '2026-10-16'
  }

  it('patches the task (with done when given) and the block it already has', async () => {
    const w = writer()
    await act(() =>
      w.saveItem(
        factsFrom({ title: 'Essay v2', due: '2026-10-17', priority: true, scheduled: { ...once, start: '14:00' } }),
        { task, block },
        { done: true }
      )
    )
    expect(tasksService.update).toHaveBeenCalledWith('t1', {
      title: 'Essay v2',
      deadline: '2026-10-17',
      is_priority: true,
      category: null,
      is_completed: true
    })
    expect(mockUpdateBlock).toHaveBeenCalledWith({
      id: 'b1',
      changes: expect.objectContaining({ title: 'Essay v2', start: '14:00', source: { type: 'task', id: 't1' } })
    })
    expect(tasksService.create).not.toHaveBeenCalled()
    expect(mockCreateBlock).not.toHaveBeenCalled()
  })

  it('clearing Scheduled removes the block; a task that loses its date stays, undated (D1)', async () => {
    const w = writer()
    await act(() => w.saveItem(factsFrom({ title: 'Essay' }), { task, block }))
    expect(mockRemoveBlock).toHaveBeenCalledWith('b1')
    expect(tasksService.update).toHaveBeenCalledWith('t1', { title: 'Essay', deadline: null, is_priority: false, category: null })
    expect(tasksService.delete).not.toHaveBeenCalled()
  })

  it('a routine block that gains a due date gains a task, and the block is re-sourced to it', async () => {
    const routine = { id: 'b2', title: 'Read', source: { type: 'routine', id: null }, ...weekdays }
    const w = writer()
    await act(() => w.saveItem(factsFrom({ title: 'Read', due: '2026-10-20', scheduled: weekdays }), { block: routine }))
    expect(tasksService.create).toHaveBeenCalledWith({ title: 'Read', deadline: '2026-10-20', is_priority: false, category: null, is_completed: false })
    expect(mockUpdateBlock).toHaveBeenCalledWith({ id: 'b2', changes: expect.objectContaining({ source: { type: 'task', id: 't-new' } }) })
  })

  it('a milestone keeps its goal and is patched by its own id, with done when given', async () => {
    const milestone = { id: 'm1', title: 'Draft', due_date: '2026-11-01' }
    const w = writer()
    await act(() => w.saveItem(factsFrom({ title: 'Draft', due: '2026-11-02', goalId: null }), { milestone, goalId: 'g1' }, { done: true }))
    expect(annualPlanningService.updateMilestone).toHaveBeenCalledWith('g1', 'm1', {
      title: 'Draft',
      due_date: '2026-11-02',
      is_priority: false,
      completed: true
    })
    expect(tasksService.create).not.toHaveBeenCalled()
  })
})

describe('saveItem, a block that points at a task the sheet did not receive', () => {
  it('patches that task by the block’s source id and keeps the block pointed at it', async () => {
    const block = { id: 'b1', title: 'Essay', source: { type: 'task', id: 't1' }, ...once, date: '2026-10-16' }
    const w = writer()
    await act(() => w.saveItem(factsFrom({ title: 'Essay', scheduled: { ...once, date: '2026-10-17' } }), { block }))
    expect(tasksService.update).toHaveBeenCalledWith('t1', { title: 'Essay', deadline: null, is_priority: false })
    expect(tasksService.create).not.toHaveBeenCalled()
    expect(mockUpdateBlock).toHaveBeenCalledWith({
      id: 'b1',
      changes: expect.objectContaining({ source: { type: 'task', id: 't1' }, date: '2026-10-17' })
    })
  })
})

describe('saveItem, a goal block that has no milestone', () => {
  it('patches the block and adds no step to the goal, however often it is saved', async () => {
    const block = {
      id: 'b9',
      title: 'Running',
      source: { type: 'goal', id: 'g1' },
      start: '08:00',
      lengthMin: 60,
      daysOfWeek: [],
      date: '2026-10-17'
    }
    const w = writer()
    await act(() =>
      w.saveItem(factsFrom({ title: 'Running', goalId: 'g1', scheduled: { ...once, start: '08:00', lengthMin: 60, date: '2026-10-17' } }), {
        block
      })
    )
    await act(() =>
      w.saveItem(factsFrom({ title: 'Running', goalId: 'g1', scheduled: { ...once, start: '08:30', lengthMin: 60, date: '2026-10-17' } }), {
        block
      })
    )
    expect(annualPlanningService.createMilestone).not.toHaveBeenCalled()
    expect(tasksService.create).not.toHaveBeenCalled()
    expect(mockUpdateBlock).toHaveBeenLastCalledWith({
      id: 'b9',
      changes: expect.objectContaining({ start: '08:30', source: { type: 'goal', id: 'g1' } })
    })
  })
})

describe('deleteItem', () => {
  it('removes everything the item spans', async () => {
    const w = writer()
    await act(() => w.deleteItem({ task: { _id: 't1' }, block: { id: 'b1' }, milestone: { id: 'm1' }, goalId: 'g1' }))
    expect(mockRemoveBlock).toHaveBeenCalledWith('b1')
    expect(tasksService.delete).toHaveBeenCalledWith('t1')
    expect(annualPlanningService.deleteMilestone).toHaveBeenCalledWith('g1', 'm1')
  })
})
