import { WATCHED_DEFAULT, deadlineReadout, watchablePriorities, watchedPriorities } from '../priorityWatch'

const goals = [{ _id: 'g1', focus_area_id: 'health' }]
const priorities = [
  { _id: 'p1', title: 'Running 5k', deadline: '2026-09-20', linked_entity_type: 'goal', linked_entity_id: 'g1' },
  { _id: 'p2', title: 'Emergency fund', deadline: '2026-09-12', focus_area_id: 'finance' },
  { _id: 'p3', title: 'No date' },
  { _id: 'p4', title: 'Done', deadline: '2026-09-01', is_completed: true },
  { _id: 'p5', title: 'Also no date' },
  { _id: 'p6', title: 'Later', deadline: '2026-12-01' }
]

describe('watchablePriorities', () => {
  it('drops the completed ones', () => {
    expect(watchablePriorities(priorities, goals).map((p) => p._id)).not.toContain('p4')
  })

  it('puts deadlines first, by date, then the ones with none in their own order', () => {
    expect(watchablePriorities(priorities, goals).map((p) => p._id)).toEqual(['p2', 'p1', 'p6', 'p3', 'p5'])
  })

  it('borrows the area from the goal a priority is linked to', () => {
    // The priority itself carries no `focus_area_id` when it points at a goal,
    // so a row reading the priority alone shows no area for exactly the
    // priorities that have one.
    expect(watchablePriorities(priorities, goals).find((p) => p._id === 'p1').focus_area_id).toBe('health')
  })

  it('leaves a priority alone when its goal is unknown or it links to nothing', () => {
    expect(
      watchablePriorities([{ _id: 'x', linked_entity_type: 'goal', linked_entity_id: 'missing' }], goals)[0].focus_area_id
    ).toBeUndefined()
    expect(watchablePriorities([{ _id: 'y', focus_area_id: 'kept' }], goals)[0].focus_area_id).toBe('kept')
  })

  it('survives an absent list', () => {
    expect(watchablePriorities(undefined, undefined)).toEqual([])
  })
})

describe('watchedPriorities', () => {
  it('shows the first four when the user has never chosen', () => {
    expect(watchedPriorities(priorities, goals).map((p) => p._id)).toEqual(['p2', 'p1', 'p6', 'p3'])
    expect(WATCHED_DEFAULT).toBe(4)
  })

  it('shows exactly what was chosen, still deadline-first', () => {
    expect(watchedPriorities(priorities, goals, ['p6', 'p2']).map((p) => p._id)).toEqual(['p2', 'p6'])
  })

  it('ignores a chosen id that is completed or gone', () => {
    expect(watchedPriorities(priorities, goals, ['p4', 'p2', 'nope']).map((p) => p._id)).toEqual(['p2'])
  })
})

describe('deadlineReadout', () => {
  const now = new Date('2026-09-12T10:00:00')

  it('says overdue, today, and a count of days inside a week', () => {
    expect(deadlineReadout({ deadline: '2026-09-10' }, now)).toEqual({ key: 'focusBar.overdue', params: {} })
    expect(deadlineReadout({ deadline: '2026-09-12T23:00:00' }, now)).toEqual({ key: 'study.dates.today', params: {} })
    expect(deadlineReadout({ deadline: '2026-09-13' }, now)).toEqual({ key: 'focusBar.daysLeft', params: { count: 1 } })
    expect(deadlineReadout({ deadline: '2026-09-19' }, now)).toEqual({ key: 'focusBar.daysLeft', params: { count: 7 } })
  })

  it('hands back the date itself beyond a week, for the caller to format', () => {
    // A key of null means "there is no phrase for this"; the date is the
    // readout, and only the caller knows the user's locale.
    expect(deadlineReadout({ deadline: '2026-10-01' }, now)).toEqual({ key: null, params: { date: '2026-10-01' } })
  })

  it('is null for no deadline and for a broken one', () => {
    expect(deadlineReadout({}, now)).toBeNull()
    expect(deadlineReadout({ deadline: 'not a date' }, now)).toBeNull()
    expect(deadlineReadout(undefined, now)).toBeNull()
  })

  it('compares whole days, not hours', () => {
    // A deadline at 00:30 tomorrow is one day away, not fourteen hours.
    expect(deadlineReadout({ deadline: '2026-09-13T00:30:00' }, now)).toEqual({ key: 'focusBar.daysLeft', params: { count: 1 } })
  })
})
