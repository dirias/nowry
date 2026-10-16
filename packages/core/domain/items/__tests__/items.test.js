import {
  blockForTask,
  dateKeyOf,
  factsFrom,
  itemFromSources,
  keyLabel,
  missingIn,
  needsTask,
  readingOf,
  readoutParts,
  scheduledDate,
  sourceFor,
  writesFor
} from '../index'

const weekdays = { start: '07:30', lengthMin: 20, daysOfWeek: [0, 1, 2, 3, 4], date: null }
const once = { start: '13:00', lengthMin: 50, daysOfWeek: [], date: null }

describe('readingOf (PRD D2): the kind follows the facts', () => {
  it('due only is a task; nothing at all is a task', () => {
    expect(readingOf(factsFrom({ title: 'Essay', due: '2026-10-16' }))).toBe('task')
    expect(readingOf(factsFrom({ title: 'Note' }))).toBe('task')
  })
  it('scheduled on repeat and not due is a routine item', () => {
    expect(readingOf(factsFrom({ title: 'Read', scheduled: weekdays }))).toBe('routine')
  })
  it('due AND scheduled on repeat is still a task — the date is what it is for', () => {
    expect(readingOf(factsFrom({ title: 'Essay', due: '2026-10-16', scheduled: weekdays }))).toBe('task')
  })
  it('part of a goal is a milestone whatever else is set', () => {
    expect(readingOf(factsFrom({ title: 'Draft', goalId: 'g1', scheduled: weekdays }))).toBe('milestone')
  })
  it('made from the Study Center is the study time', () => {
    expect(readingOf(factsFrom({ title: 'Morning review', origin: 'study', scheduled: weekdays }))).toBe('study')
  })
  it('priority is never a kind', () => {
    expect(readingOf(factsFrom({ title: 'X', priority: true }))).toBe('task')
    expect(readingOf(factsFrom({ title: 'X', priority: true, scheduled: weekdays }))).toBe('routine')
  })
})

describe('scheduledDate and missingIn (D3)', () => {
  it('a once item with no day picked is scheduled on its due day', () => {
    expect(scheduledDate(factsFrom({ due: '2026-10-16', scheduled: once }))).toBe('2026-10-16')
    expect(scheduledDate(factsFrom({ scheduled: { ...once, date: '2026-10-15' } }))).toBe('2026-10-15')
    expect(scheduledDate(factsFrom({ scheduled: weekdays }))).toBeNull()
  })
  it('a once item with neither a day nor a due date is missing its date; an empty title is missing', () => {
    expect(missingIn(factsFrom({ title: ' ', scheduled: once }))).toEqual(['title', 'date'])
    expect(missingIn(factsFrom({ title: 'Call', due: '2026-10-16', scheduled: once }))).toEqual([])
    expect(missingIn(factsFrom({ title: 'Read', scheduled: weekdays }))).toEqual([])
  })
})

describe('writesFor (D7): nothing merges underneath', () => {
  it('due only → a task document and no block', () => {
    const plan = writesFor(factsFrom({ title: ' Essay ', due: '2026-10-16' }))
    expect(plan).toEqual({
      reading: 'task',
      task: { title: 'Essay', deadline: '2026-10-16', is_priority: false },
      milestone: null,
      block: null
    })
  })
  it('due and scheduled once → a task and a block sourced to it, on the due day', () => {
    const plan = writesFor(factsFrom({ title: 'Essay', due: '2026-10-16', priority: true, scheduled: once }), { taskId: 't1' })
    expect(plan.task).toEqual({ title: 'Essay', deadline: '2026-10-16', is_priority: true })
    expect(plan.block).toMatchObject({
      title: 'Essay',
      source: { type: 'task', id: 't1' },
      start: '13:00',
      lengthMin: 50,
      daysOfWeek: [],
      date: '2026-10-16'
    })
  })
  it('scheduled on repeat, nothing else → one routine block and no task', () => {
    const plan = writesFor(factsFrom({ title: 'Read', scheduled: { ...weekdays, daysOfWeek: [2, 0] } }))
    expect(plan.task).toBeNull()
    expect(plan.block).toMatchObject({ source: { type: 'routine', id: null }, daysOfWeek: [0, 2], date: null })
  })
  it('a routine item flagged as priority gets a task to hold the flag, and the block points at it', () => {
    const facts = factsFrom({ title: 'Read', priority: true, scheduled: weekdays })
    expect(needsTask(facts)).toBe(true)
    expect(writesFor(facts, { taskId: 't9' }).block.source).toEqual({ type: 'task', id: 't9' })
    expect(sourceFor(facts)).toEqual({ type: 'routine', id: null })
  })
  it('part of a goal → a milestone, and a block sourced to the goal with its area', () => {
    const plan = writesFor(factsFrom({ title: 'Draft', due: '2026-11-01', goalId: 'g1', scheduled: once }), { areaId: 'a1' })
    expect(plan.task).toBeNull()
    expect(plan.milestone).toEqual({ title: 'Draft', due_date: '2026-11-01', is_priority: false })
    expect(plan.block).toMatchObject({ source: { type: 'goal', id: 'g1' }, areaId: 'a1', date: '2026-11-01' })
  })
  it('the study time → a study block only', () => {
    const plan = writesFor(factsFrom({ title: 'Morning review', origin: 'study', scheduled: weekdays }))
    expect(plan).toMatchObject({ reading: 'study', task: null, milestone: null, block: { source: { type: 'study', id: null } } })
  })
  it('scheduled once with no due and no flag → a free block only', () => {
    const plan = writesFor(factsFrom({ title: 'Call the bank', scheduled: { ...once, date: '2026-10-16' } }))
    expect(plan.task).toBeNull()
    expect(plan.block.source).toEqual({ type: 'free', id: null })
  })
})

describe('itemFromSources: edit mode reads any document, and the ones the item spans', () => {
  const task = { _id: 't1', title: 'Essay', deadline: '2026-10-16T00:00:00', is_priority: true }
  const taskBlock = {
    id: 'b1',
    title: 'Essay',
    source: { type: 'task', id: 't1' },
    start: '13:00',
    lengthMin: 50,
    daysOfWeek: [],
    date: '2026-10-15'
  }

  it('a task with its block opens with due, priority and scheduled', () => {
    expect(itemFromSources({ task, blocks: [taskBlock] })).toEqual(
      factsFrom({
        title: 'Essay',
        due: '2026-10-16',
        priority: true,
        scheduled: { start: '13:00', lengthMin: 50, daysOfWeek: [], date: '2026-10-15', reminderMin: null, afterBlockId: null }
      })
    )
    expect(blockForTask(task, [taskBlock])).toBe(taskBlock)
  })
  it('a block sourced to a task opens as that task', () => {
    expect(itemFromSources({ block: taskBlock, tasks: [task] }).due).toBe('2026-10-16')
  })
  it('a routine block opens as a scheduled item; a study block keeps its origin; a goal block its goal', () => {
    const routine = {
      id: 'b2',
      title: 'Read',
      source: { type: 'routine', id: null },
      start: '07:30',
      lengthMin: 20,
      daysOfWeek: [0, 1],
      date: null
    }
    expect(itemFromSources({ block: routine })).toMatchObject({
      title: 'Read',
      due: null,
      goalId: null,
      origin: null,
      scheduled: { start: '07:30', daysOfWeek: [0, 1] }
    })
    expect(itemFromSources({ block: { ...routine, source: { type: 'study', id: null } } }).origin).toBe('study')
    expect(itemFromSources({ block: { ...routine, source: { type: 'goal', id: 'g1' } } }).goalId).toBe('g1')
  })
  it('a milestone opens with its goal and the block titled like it under that goal', () => {
    const milestone = { id: 'm1', title: 'Draft', due_date: '2026-11-01', is_priority: false }
    const goalBlock = {
      id: 'b3',
      title: 'Draft',
      source: { type: 'goal', id: 'g1' },
      start: '09:00',
      lengthMin: 30,
      daysOfWeek: [],
      date: '2026-11-01'
    }
    expect(itemFromSources({ milestone, goalId: 'g1', blocks: [goalBlock] })).toMatchObject({
      goalId: 'g1',
      due: '2026-11-01',
      scheduled: { start: '09:00' }
    })
  })
  it('reads a date key from a datetime, a date, or nothing', () => {
    expect(dateKeyOf('2026-10-16')).toBe('2026-10-16')
    expect(dateKeyOf(new Date(2026, 9, 16, 23, 30))).toBe('2026-10-16')
    expect(dateKeyOf(null)).toBeNull()
    expect(dateKeyOf('nope')).toBeNull()
  })
})

describe('labels: the sheet says the reading back', () => {
  it('names the key by the reading, and Save in edit', () => {
    expect(keyLabel(factsFrom({ title: 'x', scheduled: weekdays }))).toEqual({ key: 'items.key.add.routine' })
    expect(keyLabel(factsFrom({ title: 'x', goalId: 'g' }))).toEqual({ key: 'items.key.add.milestone' })
    expect(keyLabel(factsFrom({ title: 'x' }), { edit: true })).toEqual({ key: 'items.key.save' })
  })
  it('reads the facts out in order: reading, priority, due, scheduled', () => {
    expect(readoutParts(factsFrom({ title: 'x', due: '2026-10-16', priority: true, scheduled: once })).map((p) => p.key)).toEqual([
      'items.reading.task',
      'items.readout.priority',
      'items.readout.due',
      'items.readout.once'
    ])
    expect(readoutParts(factsFrom({ title: 'x', scheduled: weekdays })).at(-1)).toEqual({
      key: 'items.readout.weekdays',
      params: { time: '07:30' }
    })
    expect(readoutParts(factsFrom({ title: 'x', scheduled: { ...weekdays, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] } })).at(-1).key).toBe(
      'items.readout.everyDay'
    )
    expect(readoutParts(factsFrom({ title: 'x', scheduled: { ...weekdays, daysOfWeek: [5, 6] } })).at(-1)).toEqual({
      key: 'items.readout.someDays',
      params: { time: '07:30', count: 2 }
    })
    expect(readoutParts(factsFrom({ title: 'x', scheduled: once })).at(-1)).toEqual({
      key: 'items.readout.onceNoDay',
      params: { time: '13:00' }
    })
  })
})

describe('sourceFromEvent: a calendar event names the documents it stands for', () => {
  const { sourceFromEvent } = require('../index')

  it('a task event → its task, with the date as the deadline and done as is_completed', () => {
    expect(sourceFromEvent({ id: 'task-t1', type: 'task', title: 'Essay', date: new Date(2026, 9, 16), status: 'completed' })).toEqual({
      task: { _id: 't1', title: 'Essay', deadline: '2026-10-16', is_completed: true, is_priority: false }
    })
  })
  it('a milestone event → the milestone under its goal', () => {
    expect(
      sourceFromEvent({
        id: 'milestone-g1-0',
        type: 'milestone',
        title: 'Draft',
        date: '2026-11-01',
        goalId: 'g1',
        milestoneId: 'm1',
        status: 'pending'
      })
    ).toEqual({
      milestone: { id: 'm1', title: 'Draft', due_date: '2026-11-01', completed: false, is_priority: false },
      goalId: 'g1'
    })
  })
  it('a flagged item → the task or the milestone the flag sits on, flagged', () => {
    expect(
      sourceFromEvent({ id: 'priority-t1', type: 'priority', title: 'Essay', date: null, linkedType: 'task', linkedId: 't1' })
    ).toEqual({
      task: { _id: 't1', title: 'Essay', deadline: null, is_completed: false, is_priority: true }
    })
    expect(sourceFromEvent({ id: 'priority-m1', type: 'priority', title: 'Draft', linkedType: 'milestone', linkedId: 'g1' })).toEqual({
      milestone: { id: 'm1', title: 'Draft', due_date: null, completed: false, is_priority: true },
      goalId: 'g1'
    })
  })
  it('a goal or a habit is not an item', () => {
    expect(sourceFromEvent({ id: 'goal-g1', type: 'goal' })).toBeNull()
    expect(sourceFromEvent({ id: 'activity-a1', type: 'activity' })).toBeNull()
    expect(sourceFromEvent(null)).toBeNull()
  })
})
