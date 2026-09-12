import { dueTodayCount, isDueBy, taskCategory, taskDueState, tasksDueToday } from '../taskQueue'

const now = new Date('2026-09-12T10:00:00')
const task = (id, extra) => ({ _id: id, title: id, ...extra })

describe('tasksDueToday', () => {
  const tasks = [
    task('later', { deadline: '2026-11-01' }),
    task('today-low', { deadline: '2026-09-12', priority: 'low' }),
    task('overdue', { deadline: '2026-09-09', priority: 'low' }),
    task('today-high', { deadline: '2026-09-12T23:00:00', priority: 'high' }),
    task('done', { deadline: '2026-09-12', is_completed: true }),
    task('undated', {})
  ]

  it('is today and before it, never the future', () => {
    // The heading says "today", so the filter has to match it. The web's own
    // card sorted every open task and took five, which put a November task
    // under that heading.
    expect(tasksDueToday(tasks, { now }).map((t) => t._id)).toEqual(['overdue', 'today-high', 'today-low'])
  })

  it('drops what is finished and what has no date', () => {
    const ids = tasksDueToday(tasks, { now }).map((t) => t._id)
    expect(ids).not.toContain('done')
    expect(ids).not.toContain('undated')
  })

  it('ranks a task with no level with the middle one', () => {
    const pair = [task('none', { deadline: '2026-09-12' }), task('low', { deadline: '2026-09-12', priority: 'low' })]
    expect(tasksDueToday(pair, { now }).map((t) => t._id)).toEqual(['none', 'low'])
  })

  it('takes a limit, and survives an absent list', () => {
    expect(tasksDueToday(tasks, { now, limit: 2 }).map((t) => t._id)).toEqual(['overdue', 'today-high'])
    expect(tasksDueToday(undefined, { now })).toEqual([])
  })

  it('counts the same set it lists', () => {
    expect(dueTodayCount(tasks, now)).toBe(3)
  })

  it('reads a deadline later today as due today, not as tomorrow', () => {
    expect(isDueBy(task('x', { deadline: '2026-09-12T23:59:00' }), now)).toBe(true)
    expect(isDueBy(task('x', { deadline: '2026-09-13T00:01:00' }), now)).toBe(false)
    expect(isDueBy(task('x', {}), now)).toBe(false)
  })
})

describe('taskCategory', () => {
  it('keeps a real name', () => {
    expect(taskCategory({ category: 'study' })).toBe('study')
    expect(taskCategory({ category: '  Home  ' })).toBe('Home')
  })

  it('says nothing for a generated list id', () => {
    // Task lists live only in the web's localStorage while their tasks sync,
    // so `category` can hold an id no device has a name for. The web renders
    // it raw; a row says nothing instead (MOB-074).
    expect(taskCategory({ category: 'list_1788662138438' })).toBeNull()
    expect(taskCategory({ category: 'LIST-1788662138438' })).toBeNull()
  })

  it('says nothing for no category at all', () => {
    expect(taskCategory({})).toBeNull()
    expect(taskCategory({ category: '   ' })).toBeNull()
    expect(taskCategory(undefined)).toBeNull()
  })

  it('does not mistake a short word beginning with list for an id', () => {
    expect(taskCategory({ category: 'listening' })).toBe('listening')
    expect(taskCategory({ category: 'list_2' })).toBe('list_2')
  })
})

describe('tasksDueToday, by status', () => {
  const tasks = [
    { _id: 'a', title: 'Overdue and open', deadline: '2026-09-08T00:00:00Z' },
    { _id: 'b', title: 'Done today', deadline: '2026-09-12T00:00:00Z', is_completed: true },
    { _id: 'c', title: 'Open today', deadline: '2026-09-12T00:00:00Z' },
    { _id: 'd', title: 'Next week', deadline: '2026-09-20T00:00:00Z' }
  ]
  const now = new Date('2026-09-12T10:00:00')

  it('shows what is still to do, by default', () => {
    expect(tasksDueToday(tasks, { now }).map((task) => task._id)).toEqual(['a', 'c'])
  })

  it('shows what was ticked, so a tick can be taken back', () => {
    expect(tasksDueToday(tasks, { now, status: 'completed' }).map((task) => task._id)).toEqual(['b'])
  })

  it('shows both, and never a task that is not due yet', () => {
    expect(
      tasksDueToday(tasks, { now, status: 'all' })
        .map((task) => task._id)
        .sort()
    ).toEqual(['a', 'b', 'c'])
  })

  it('counts only what is outstanding', () => {
    expect(dueTodayCount(tasks, now)).toBe(2)
  })
})

describe('taskDueState', () => {
  const now = new Date('2026-09-12T10:00:00')

  it('calls a task from an earlier day late', () => {
    expect(taskDueState({ deadline: '2026-09-08T00:00:00Z' }, now)).toBe('overdue')
  })

  it("calls today's task today, whatever hour it carries", () => {
    expect(taskDueState({ deadline: '2026-09-12T23:00:00' }, now)).toBe('today')
    expect(taskDueState({ deadline: '2026-09-12T01:00:00' }, now)).toBe('today')
  })

  it('says nothing about a task that is not due yet', () => {
    expect(taskDueState({ deadline: '2026-09-20T00:00:00Z' }, now)).toBeNull()
  })

  it('says nothing about a task with no deadline at all', () => {
    expect(taskDueState({ title: 'Someday' }, now)).toBeNull()
    expect(taskDueState(null, now)).toBeNull()
  })

  it('agrees with the order the list is already sorted in', () => {
    const tasks = [
      { _id: 'today', deadline: '2026-09-12T00:00:00Z' },
      { _id: 'late', deadline: '2026-09-09T00:00:00Z' }
    ]
    const [first] = tasksDueToday(tasks, { now })
    expect(taskDueState(first, now)).toBe('overdue')
  })
})
