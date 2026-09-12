import {
  ROUTINE_PERIODS,
  activitiesForPeriod,
  completedToday,
  currentPeriod,
  routineItem,
  routineItemTitle,
  routineItems,
  routineProgress,
  slottedActivities,
  todayKey,
  toggledCompletions,
  withRenamedRoutineItem,
  withRoutineIds,
  withRoutineItem,
  withoutRoutineItem
} from '../dailyRoutine'

const now = new Date('2026-09-12T20:00:00')
const routine = {
  morning_routine: [{ id: 'm1' }, { id: 'm2' }],
  afternoon_routine: [],
  evening_routine: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }],
  daily_completions: { '2026-09-12': ['m1', 'e2'], '2026-09-11': ['m1', 'm2'] }
}

describe('the API shape, read once', () => {
  it('finds the items under `<period>_routine`', () => {
    // The first pass on the phone assumed `routine.morning.items`, a shape the
    // server has never sent — the readout simply never appeared (MOB-075).
    expect(routineItems(routine, 'morning').map((i) => i.id)).toEqual(['m1', 'm2'])
    expect(routineItems(routine, 'afternoon')).toEqual([])
    expect(routineItems(undefined, 'evening')).toEqual([])
  })

  it("reads today's ticks from the flat id array, not from a flag on the item", () => {
    expect([...completedToday(routine, now)]).toEqual(['m1', 'e2'])
  })

  it('keys today the way the server does, in local time', () => {
    // `toISOString().slice(0, 10)` is the web's version and is UTC: at 20:00 in
    // a UTC-6 zone it is still today, but at 20:00 in UTC+6 it is tomorrow's
    // key and every tick lands on the wrong day.
    expect(todayKey(new Date('2026-09-12T23:30:00'))).toBe('2026-09-12')
    expect(todayKey(new Date('2026-01-05T00:10:00'))).toBe('2026-01-05')
  })

  it('ignores yesterday', () => {
    expect(completedToday(routine, new Date('2026-09-13T09:00:00')).size).toBe(0)
  })
})

describe('currentPeriod', () => {
  it("is the web's own boundaries: noon and six", () => {
    expect(currentPeriod(new Date('2026-09-12T06:00:00'))).toBe('morning')
    expect(currentPeriod(new Date('2026-09-12T11:59:00'))).toBe('morning')
    expect(currentPeriod(new Date('2026-09-12T12:00:00'))).toBe('afternoon')
    expect(currentPeriod(new Date('2026-09-12T17:59:00'))).toBe('afternoon')
    expect(currentPeriod(new Date('2026-09-12T18:00:00'))).toBe('evening')
    expect(ROUTINE_PERIODS).toEqual(['morning', 'afternoon', 'evening'])
  })
})

describe('routineProgress', () => {
  it('counts every period together', () => {
    expect(routineProgress(routine, now)).toEqual({ done: 2, total: 5 })
  })

  it('is null for no routine at all, and a zero for one with nothing ticked', () => {
    expect(routineProgress(null, now)).toBeNull()
    expect(routineProgress({}, now)).toBeNull()
    expect(routineProgress({ morning_routine: [] }, now)).toBeNull()
    expect(routineProgress({ morning_routine: [{ id: 'a' }] }, now)).toEqual({ done: 0, total: 1 })
  })
})

describe('toggledCompletions', () => {
  it('adds one that was not ticked and removes one that was', () => {
    expect(toggledCompletions(routine, 'e1', now).sort()).toEqual(['e1', 'e2', 'm1'])
    expect(toggledCompletions(routine, 'm1', now).sort()).toEqual(['e2'])
  })

  it('sends the whole day, because the endpoint takes a set and not a delta', () => {
    expect(toggledCompletions({ daily_completions: {} }, 'x', now)).toEqual(['x'])
  })
})

describe('routineItemTitle', () => {
  it('reads either key an item can carry its label under', () => {
    expect(routineItemTitle({ title: 'Stretch' })).toBe('Stretch')
    expect(routineItemTitle({ text: 'Stretch' })).toBe('Stretch')
    // `title` wins, so an item carrying both never shows the stale one.
    expect(routineItemTitle({ title: 'Stretch', text: 'Walk' })).toBe('Stretch')
    expect(routineItemTitle(undefined)).toBe('')
  })
})

describe('the write side', () => {
  it('appends to one period and leaves the rest of the document alone', () => {
    const next = withRoutineItem(routine, 'afternoon', routineItem('a1', 'Walk'))
    expect(next.afternoon_routine).toEqual([{ id: 'a1', title: 'Walk', type: 'custom' }])
    // The PUT replaces the whole document, so everything else has to survive.
    expect(next.morning_routine).toBe(routine.morning_routine)
    expect(next.daily_completions).toBe(routine.daily_completions)
    expect(routine.afternoon_routine).toEqual([])
  })

  it('renames one item, writing `title` and dropping the older `text`', () => {
    const mixed = { morning_routine: [{ id: 'm1', text: 'Old', type: 'custom' }] }
    const next = withRenamedRoutineItem(mixed, 'morning', 'm1', 'New')
    expect(next.morning_routine).toEqual([{ id: 'm1', title: 'New', type: 'custom' }])
    expect(routineItemTitle(next.morning_routine[0])).toBe('New')
  })

  it('leaves the items it was not asked about untouched', () => {
    const next = withRenamedRoutineItem(routine, 'morning', 'm2', 'New')
    expect(next.morning_routine.map((item) => item.id)).toEqual(['m1', 'm2'])
    expect(next.morning_routine[0]).toBe(routine.morning_routine[0])
  })

  it('removes one item by id', () => {
    expect(withoutRoutineItem(routine, 'evening', 'e2').evening_routine.map((item) => item.id)).toEqual(['e1', 'e3'])
    expect(withoutRoutineItem(routine, 'evening', 'nobody').evening_routine).toHaveLength(3)
  })

  it('builds a routine out of nothing, which is what a new account has', () => {
    expect(withRoutineItem(null, 'morning', routineItem('m1', 'Water')).morning_routine).toHaveLength(1)
  })
})

describe('activitiesForPeriod', () => {
  const activities = [{ _id: '1', time_of_day: 'morning' }, { _id: '2', time_of_day: 'evening' }, { _id: '3' }]

  it('gives a period the activities slotted into it', () => {
    expect(activitiesForPeriod(activities, 'morning').map((a) => a._id)).toEqual(['1'])
  })

  it('shows an unslotted activity under no period, as the web does', () => {
    // Its default is `anytime`, which is not one of the three.
    expect(ROUTINE_PERIODS.flatMap((period) => activitiesForPeriod(activities, period)).map((a) => a._id)).toEqual(['1', '2'])
    expect(activitiesForPeriod(undefined, 'morning')).toEqual([])
  })
})

describe('slottedActivities', () => {
  const goals = [{ _id: 'g1', title: 'Run a half', focus_area_id: 'f1' }]
  const areas = [{ _id: 'f1', color: '#2E7D32' }]

  it('carries the goal and its area colour onto the row', () => {
    const activities = [{ _id: 'a1', title: 'Easy 5k', goal_id: 'g1', time_of_day: 'morning' }]
    expect(slottedActivities(activities, goals, areas, 'morning')).toEqual([
      { id: 'a1', title: 'Easy 5k', goalTitle: 'Run a half', color: '#2E7D32' }
    ])
  })

  it('unwraps a reference that arrived populated rather than as an id', () => {
    const activities = [{ _id: 'a1', title: 'Easy 5k', goal_id: { _id: 'g1' }, time_of_day: 'morning' }]
    expect(slottedActivities(activities, [{ _id: 'g1', title: 'Run a half', focus_area_id: { _id: 'f1' } }], areas, 'morning')).toEqual([
      { id: 'a1', title: 'Easy 5k', goalTitle: 'Run a half', color: '#2E7D32' }
    ])
  })

  it('drops an activity whose goal is gone, as the web planner does', () => {
    const activities = [{ _id: 'a1', title: 'Easy 5k', goal_id: 'gone', time_of_day: 'morning' }]
    expect(slottedActivities(activities, goals, areas, 'morning')).toEqual([])
  })

  it('keeps a goal whose focus area is gone, which only costs it a colour', () => {
    const activities = [{ _id: 'a1', title: 'Easy 5k', goal_id: 'g1', time_of_day: 'morning' }]
    expect(slottedActivities(activities, goals, [], 'morning')).toEqual([
      { id: 'a1', title: 'Easy 5k', goalTitle: 'Run a half', color: null }
    ])
  })
})

describe('withRoutineIds', () => {
  const ids = () => {
    let n = 0
    return () => `new${++n}`
  }

  it('says nothing to do when every item already has an id', () => {
    expect(withRoutineIds(routine, ids())).toBeNull()
    expect(withRoutineIds({}, ids())).toBeNull()
  })

  it('gives an id to the items that have none and leaves the rest alone', () => {
    const legacy = { morning_routine: [{ title: 'Water' }, { id: 'm2', title: 'Stretch' }] }
    const next = withRoutineIds(legacy, ids())
    expect(next.morning_routine).toEqual([
      { id: 'new1', title: 'Water' },
      { id: 'm2', title: 'Stretch' }
    ])
  })
})

describe('an item addressed by an id it does not have', () => {
  /*
   * Before the guard, `undefined` matched every item that also had no id — so
   * one delete removed all of them and one rename retitled all of them.
   */
  const legacy = { morning_routine: [{ title: 'Water' }, { title: 'Stretch' }] }

  it('removes nothing', () => {
    expect(withoutRoutineItem(legacy, 'morning', undefined).morning_routine).toHaveLength(2)
  })

  it('renames nothing', () => {
    expect(withRenamedRoutineItem(legacy, 'morning', undefined, 'New').morning_routine).toEqual(legacy.morning_routine)
  })
})
