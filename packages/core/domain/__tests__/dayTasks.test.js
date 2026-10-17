/**
 * PLAN-019 / PLAN-021 — the day panel's task lists, the When column and list
 * names (PRD-items D12, D13; ADR-021 amendment 2026-10-17).
 */
import { dayTasks, doneToday, listNameOf, upcomingTasks, whenOf, whenText } from '../taskQueue'

const now = new Date('2026-10-17T10:00:00')
const task = (id, extra) => ({ _id: id, title: id, ...extra })

describe('upcomingTasks', () => {
  it('lists open tasks not due by today, soonest first, undated last, flagged first within a day', () => {
    const tasks = [
      task('undated', {}),
      task('nov', { deadline: '2026-11-12T00:00:00' }),
      task('fri', { deadline: '2026-10-23T00:00:00' }),
      task('fri-flag', { deadline: '2026-10-23T00:00:00', is_priority: true }),
      task('late', { deadline: '2026-10-01T00:00:00' }),
      task('today', { deadline: '2026-10-17T00:00:00' }),
      task('done', { deadline: '2026-10-30T00:00:00', is_completed: true })
    ]
    expect(upcomingTasks(tasks, now).map((t) => t._id)).toEqual(['fri-flag', 'fri', 'nov', 'undated'])
  })
})

describe('doneToday', () => {
  it('reads the API’s zone-less UTC time as UTC, and keeps only today’s ticks', () => {
    const local = (h) => new Date(2026, 9, 17, h).toISOString().replace('Z', '')
    const tasks = [
      task('today', { is_completed: true, updated_at: local(9) }),
      task('yesterday', { is_completed: true, updated_at: new Date(2026, 9, 16, 9).toISOString() }),
      task('open', { is_completed: false, updated_at: local(9) }),
      task('never', { is_completed: true })
    ]
    expect(doneToday(tasks, now).map((t) => t._id)).toEqual(['today'])
  })
})

describe('dayTasks', () => {
  it('counts the open rows and gives the edge its ratio', () => {
    const tasks = [
      task('late', { deadline: '2026-10-01T00:00:00' }),
      task('done', { deadline: '2026-10-17T00:00:00', is_completed: true, updated_at: new Date().toISOString() }),
      task('later', { deadline: '2026-12-01T00:00:00' })
    ]
    const day = dayTasks(tasks, new Date())
    expect(day.upcoming.map((t) => t._id)).toEqual(['later'])
    expect(day.open.length + day.done.length).toBeGreaterThan(0)
    expect(dayTasks([], now)).toEqual({ open: [], upcoming: [], done: [], rate: 0 })
  })
})

describe('whenOf and whenText', () => {
  const t = (key) => ({ 'tasks.row.late': 'Late' })[key] ?? key
  it('says Late, nothing for today or no date, a weekday inside a week, a date beyond', () => {
    expect(whenOf(task('a', { deadline: '2026-10-01T00:00:00' }), now).kind).toBe('late')
    expect(whenText(task('a', { deadline: '2026-10-01T00:00:00' }), { now, t })).toBe('Late')
    expect(whenText(task('b', { deadline: '2026-10-17T00:00:00' }), { now, t })).toBe('')
    expect(whenText(task('c', {}), { now, t })).toBe('')
    expect(whenText(task('d', { deadline: '2026-10-23T00:00:00' }), { now, t, language: 'en' })).toBe('Fri')
    expect(whenText(task('e', { deadline: '2026-11-12T00:00:00' }), { now, t, language: 'en' })).toBe('Nov 12')
    expect(whenText(task('f', { deadline: '2027-01-05T00:00:00' }), { now, t, language: 'en' })).toBe('Jan 5, 27')
  })

  it('never calls a finished task late', () => {
    expect(whenOf(task('a', { deadline: '2026-10-01T00:00:00', is_completed: true }), now).kind).toBe('later')
  })
})

describe('listNameOf', () => {
  const lists = [{ id: '6a6b5f6e11d5b6cc24a77c32', name: 'Shopping list' }]
  it('names a list by its id, keeps a real word, and never shows an id', () => {
    expect(listNameOf(task('a', { category: '6a6b5f6e11d5b6cc24a77c32' }), lists)).toBe('Shopping list')
    expect(listNameOf(task('b', { category: 'study' }), lists)).toBe('study')
    expect(listNameOf(task('c', { category: '6a6b5f6e11d5b6cc24a77c99' }), lists)).toBeNull()
    expect(listNameOf(task('d', { category: 'LIST_1788662138438' }), lists)).toBeNull()
    expect(listNameOf(task('e', {}), lists)).toBeNull()
    expect(listNameOf(task('g', { category: 'general' }), lists)).toBeNull()
    expect(listNameOf(task('f', { category: '6a6b5f6e11d5b6cc24a77c32' }))).toBeNull()
  })
})
