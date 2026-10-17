/**
 * BOARD-005 — what an item tile reads through its reference, and what the
 * `I` picker finds.
 */
import { readItem, searchItems } from '../itemReading'

const TASKS = [
  { _id: 't1', title: 'Biology essay draft', deadline: '2026-10-23T00:00:00', is_completed: false, is_priority: true },
  { _id: 't2', title: 'Return library books', is_completed: true }
]
const GOALS = [
  {
    _id: 'g1',
    title: 'Pass biology',
    focus_area_id: 'a1',
    target_date: '2026-12-20T00:00:00',
    status: 'in_progress',
    milestones: [
      { id: 'm1', title: 'Unit 3 test', due_date: '2026-11-02', completed: false },
      { id: 'm2', title: 'Lab report', completed: true }
    ]
  }
]
const DATA = { tasks: TASKS, goals: GOALS }

describe('readItem', () => {
  it('reads a task: title, due, done, priority', () => {
    expect(readItem({ kind: 'task', id: 't1' }, DATA)).toMatchObject({
      status: 'ready',
      title: 'Biology essay draft',
      due: '2026-10-23',
      done: false,
      priority: true
    })
  })

  it('reads a milestone through its goal, with the goal’s area', () => {
    expect(readItem({ kind: 'milestone', id: 'm1', goalId: 'g1' }, DATA)).toMatchObject({
      status: 'ready',
      title: 'Unit 3 test',
      due: '2026-11-02',
      done: false,
      areaId: 'a1',
      goalId: 'g1'
    })
    // A reference without its goal still finds the milestone.
    expect(readItem({ kind: 'milestone', id: 'm2', goalId: null }, DATA)).toMatchObject({ status: 'ready', done: true, goalId: 'g1' })
  })

  it('reads a goal', () => {
    expect(readItem({ kind: 'goal', id: 'g1' }, DATA)).toMatchObject({
      status: 'ready',
      title: 'Pass biology',
      areaId: 'a1',
      due: '2026-12-20'
    })
  })

  it('says loading, missing, or could-not-read', () => {
    expect(readItem({ kind: 'task', id: 't1' }, { ...DATA, loading: true }).status).toBe('loading')
    expect(readItem({ kind: 'task', id: 'gone' }, DATA).status).toBe('missing')
    expect(readItem({ kind: 'task', id: 'gone' }, { tasks: [], goals: [], error: new Error('x') }).status).toBe('error')
  })
})

describe('searchItems', () => {
  it('groups tasks, milestones and goals, open tasks first', () => {
    const groups = searchItems('', DATA)
    expect(groups.map((g) => g.kind)).toEqual(['task', 'milestone', 'goal'])
    expect(groups[0].rows.map((r) => r.title)).toEqual(['Biology essay draft', 'Return library books'])
    expect(groups[1].rows[0]).toMatchObject({ ref: { kind: 'milestone', id: 'm1', goalId: 'g1' }, goalTitle: 'Pass biology' })
  })

  it('matches every word, ignoring case and accents, and drops empty groups', () => {
    const groups = searchItems('BIOLÓGY', DATA)
    expect(groups.map((g) => g.kind)).toEqual(['task', 'milestone', 'goal'])
    expect(groups[0].rows.map((r) => r.title)).toEqual(['Biology essay draft'])
    // A milestone matches through its goal's title too.
    expect(groups[1].rows.map((r) => r.title)).toEqual(['Unit 3 test', 'Lab report'])
    expect(searchItems('library', DATA).map((g) => g.kind)).toEqual(['task'])
  })
})
